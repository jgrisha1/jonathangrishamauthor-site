#!/usr/bin/env node
/**
 * Discovers possible Jonathan Grisham books through Amazon Creators API.
 *
 * This script is intentionally read-only. New results are written to a review
 * report and must be integrated through books.json and the normal site checks.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLIENT_ID = process.env.AMAZON_CLIENT_ID || process.env.AMAZON_ACCESS_KEY;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET || process.env.AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || '220500b-20';
const REPORT_PATH = process.env.BOOK_SYNC_REPORT || '';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon';
const SEARCHES = [
  'Jonathan Grisham',
  'Jonathan Grisham horror',
  'Jonathan Grisham theology',
  'Jonathan Grisham religious trauma',
  'Jonathan Grisham nonfiction',
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing Amazon Creators API credentials.');
  process.exit(1);
}

async function getAccessToken() {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'creatorsapi::default',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Token request failed (${response.status}).`);
  return data.access_token;
}

async function searchItems(keywords, token) {
  const response = await fetch(`${API_BASE}/catalog/v1/searchItems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-marketplace': 'www.amazon.com',
    },
    body: JSON.stringify({
      keywords,
      searchIndex: 'Books',
      marketplace: 'www.amazon.com',
      partnerTag: PARTNER_TAG,
      partnerType: 'Associates',
      itemCount: 10,
      resources: [
        'itemInfo.title',
        'itemInfo.byLineInfo',
        'itemInfo.classifications',
        'images.primary.large',
        'offersV2.listings.price',
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const code = data.errors?.[0]?.code || data.reason || '';
    if (code === 'AssociateNotEligible') {
      console.log('Amazon Creators API access is not currently eligible. No catalog changes were made.');
      return [];
    }
    throw new Error(`Amazon search failed (${response.status}) for ${keywords}.`);
  }
  return data.searchResult?.items || [];
}

function contributorNames(item) {
  return (item.itemInfo?.byLineInfo?.contributors || [])
    .map((contributor) => contributor.name || '')
    .filter(Boolean);
}

function isJonathanGrishamBook(item) {
  return contributorNames(item).some((name) => name.trim().toLowerCase() === 'jonathan grisham');
}

function toCandidate(item) {
  const title = item.itemInfo?.title?.displayValue || 'Untitled';
  const productGroup = item.itemInfo?.classifications?.productGroup?.displayValue || '';
  const image = item.images?.primary?.large?.url || '';
  return {
    asin: item.asin,
    title,
    contributors: contributorNames(item),
    productGroup,
    image,
    amazonUrl: `https://www.amazon.com/dp/${item.asin}/?tag=${PARTNER_TAG}`,
  };
}

function writeReport(report) {
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (REPORT_PATH) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, serialized, 'utf8');
    console.log(`Review report written to ${REPORT_PATH}`);
  } else {
    console.log(serialized);
  }
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'books.json'), 'utf8'));
  const knownAsins = new Set(manifest.books.map((book) => book.asin));
  const token = await getAccessToken();
  const discovered = new Map();

  for (const keywords of SEARCHES) {
    console.log(`Searching Amazon for: ${keywords}`);
    const items = await searchItems(keywords, token);
    for (const item of items) {
      if (item.asin && isJonathanGrishamBook(item)) discovered.set(item.asin, item);
    }
  }

  const candidates = [...discovered.values()]
    .filter((item) => !knownAsins.has(item.asin))
    .map(toCandidate)
    .sort((a, b) => a.title.localeCompare(b.title));

  writeReport({
    checkedAt: new Date().toISOString(),
    knownBookCount: knownAsins.size,
    discoveredBookCount: discovered.size,
    candidateCount: candidates.length,
    candidates,
    note: 'Candidates require manual metadata and catalog review. This script never edits or deploys the site.',
  });

  if (candidates.length) {
    console.log(`Found ${candidates.length} candidate book(s) requiring review.`);
  } else {
    console.log('No new candidate books found.');
  }
}

main().catch((error) => {
  console.error(`Book discovery failed: ${error.message}`);
  process.exit(1);
});
