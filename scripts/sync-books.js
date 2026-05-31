#!/usr/bin/env node
/**
 * sync-books.js
 * Uses Amazon Creators API v3.x to search for Jonathan Grisham books.
 * Requires v3.1 credentials from affiliate-program.amazon.com/creatorsapi
 *
 * GitHub Actions secrets needed:
 *   AMAZON_ACCESS_KEY   -- Creators API v3.x client ID
 *   AMAZON_SECRET_KEY   -- Creators API v3.x client secret
 *   AMAZON_PARTNER_TAG  -- Associate tag (220500b-20)
 *
 * Note: PA API access requires 10 qualifying sales in trailing 30 days.
 * Script exits cleanly with "AssociateNotEligible" if threshold not met.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const CLIENT_ID   = process.env.AMAZON_CLIENT_ID || process.env.AMAZON_ACCESS_KEY;
const CLIENT_SEC  = process.env.AMAZON_CLIENT_SECRET || process.env.AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || '220500b-20';
const TOKEN_URL   = 'https://api.amazon.com/auth/o2/token';
const API_BASE    = 'https://creatorsapi.amazon';

if (!CLIENT_ID || !CLIENT_SEC) {
  console.error('Missing AMAZON_ACCESS_KEY or AMAZON_SECRET_KEY');
  process.exit(1);
}

// ---- OAUTH2 TOKEN (v3.x LwA) ----
async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SEC,
      scope: 'creatorsapi::default',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token error ' + res.status + ': ' + JSON.stringify(data));
  return data.access_token;
}

// ---- CREATORS API SEARCH ----
async function searchByAuthor(keywords, token) {
  const res = await fetch(API_BASE + '/catalog/v1/searchItems', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'x-marketplace': 'www.amazon.com',
    },
    body: JSON.stringify({
      keywords: keywords,
      searchIndex: 'Books',
      marketplace: 'www.amazon.com',
      partnerTag: PARTNER_TAG,
      partnerType: 'Associates',
      resources: [
        'itemInfo.title',
        'itemInfo.byLineInfo',
        'itemInfo.classifications',
        'images.primary.large',
        'offersV2.listings.price',
      ],
      itemCount: 10,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = (data.errors && data.errors[0] && data.errors[0].code) || data.reason || '';
    if (code === 'AssociateNotEligible') {
      console.log('PA API not yet active (needs 10 qualifying sales in last 30 days). Exiting cleanly.');
      process.exit(0);
    }
    throw new Error('API error ' + res.status + ': ' + JSON.stringify(data));
  }
  return data;
}

// ---- SLUG HELPER ----
function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// ---- GENRE -> DEFAULT VISUAL THEME ----
function genreToEffect(genre) {
  const g = (genre || '').toLowerCase();
  if (g.includes('satire') || g.includes('political')) return 'orangeGooSignal';
  if (g.includes('appalach') || g.includes('mountain')) return 'frostWindow';
  if (g.includes('religious') || g.includes('memoir'))  return 'churchPaperTrauma';
  if (g.includes('occult'))                             return 'occultVeil';
  return 'emberHollow';
}

// ---- GENERATE BOOK PAGE ----
function generateBookPage(item) {
  const title  = (item.itemInfo && item.itemInfo.title && item.itemInfo.title.displayValue) || 'Untitled';
  const asin   = item.asin;
  const slug   = slugify(title);
  const imgUrl = (item.images && item.images.primary && item.images.primary.large && item.images.primary.large.url) || '';
  const amzUrl = 'https://www.amazon.com/dp/' + asin + '/?tag=' + PARTNER_TAG;
  const genre  = (item.itemInfo && item.itemInfo.classifications && item.itemInfo.classifications.productGroup && item.itemInfo.classifications.productGroup.displayValue) || 'Horror Fiction';
  const effect = genreToEffect(genre);

  const html =
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '  <title>' + title + ' | Jonathan Grisham</title>\n' +
    '  <meta name="description" content="' + title + ' by Jonathan Grisham -- extreme horror from East Tennessee." />\n' +
    '  <link rel="canonical" href="https://jonathangrishamauthor.com/books/' + slug + '" />\n' +
    '  <link rel="stylesheet" href="../style.css" />\n' +
    '  <link rel="stylesheet" href="../book-effects.css" />\n' +
    '  <script src="../book-effects.js" defer></script>\n' +
    '</head>\n' +
    '<body data-book-effect="' + effect + '" data-effect-accent="#8c5a1e">\n' +
    '  <header class="site-header" role="banner">\n' +
    '    <div class="container header-inner">\n' +
    '      <a href="/" style="text-decoration:none;">\n' +
    '        <div class="brand-wrap"><div class="brand-name">Jonathan Grisham</div><span class="brand-sub">East Tennessee</span></div>\n' +
    '      </a>\n' +
    '      <nav aria-label="Main navigation">\n' +
    '        <a href="../index.html#books">Books</a>\n' +
    '        <a href="../index.html#about">About</a>\n' +
    '        <a href="../index.html#music">Music</a>\n' +
    '        <a href="../index.html#signed">Contact</a>\n' +
    '      </nav>\n' +
    '    </div>\n' +
    '  </header>\n' +
    '  <main><div class="container">\n' +
    '    <div class="book-page-grid">\n' +
    '      <aside class="book-page-cover">\n' +
    (imgUrl ? '        <img src="' + imgUrl + '" alt="' + title + '" width="340" height="510" loading="lazy" />\n' : '') +
    '        <div class="book-page-meta">\n' +
    '          <div class="meta-row"><span class="meta-key">Author</span><span class="meta-val">Jonathan Grisham</span></div>\n' +
    '          <div class="meta-row"><span class="meta-key">Genre</span><span class="meta-val">' + genre + '</span></div>\n' +
    '        </div>\n' +
    '        <div class="buy-stack">\n' +
    '          <a class="btn btn-blood" href="' + amzUrl + '" target="_blank" rel="noreferrer">Buy on Amazon</a>\n' +
    '          <a class="btn btn-ghost" href="../index.html#signed">Request Signed Copy</a>\n' +
    '        </div>\n' +
    '      </aside>\n' +
    '      <article>\n' +
    '        <span class="label">' + genre + '</span>\n' +
    '        <h1 class="book-page-title">' + title + '</h1>\n' +
    '        <p class="book-page-byline">By Jonathan Grisham</p>\n' +
    '        <div class="book-page-synopsis"><h2>About the Book</h2>\n' +
    '          <p>Synopsis coming soon. Find full details on the Amazon listing.</p>\n' +
    '        </div>\n' +
    '      </article>\n' +
    '    </div>\n' +
    '  </div></main>\n' +
    '  <footer><div class="container"><div class="footer-inner">\n' +
    '    <div class="footer-brand"><div class="brand-name">Jonathan Grisham</div><div class="brand-sub">East Tennessee</div></div>\n' +
    '    <nav class="footer-links"><a href="../index.html#books">Books</a><a href="../index.html#about">About</a><a href="../index.html#music">Music</a><a href="../index.html#signed">Contact</a></nav>\n' +
    '  </div>\n' +
    '  <div class="footer-legal"><span>&copy; <span id="yr">2025</span> Jonathan Grisham. All rights reserved.</span><a href="/privacy">Privacy Policy</a></div>\n' +
    '  </div></footer>\n' +
    '  <script>document.getElementById("yr").textContent=new Date().getFullYear();</script>\n' +
    '</body></html>';

  return { slug, asin, title, genre, imgUrl, amzUrl, page: 'books/' + slug + '.html', html };
}

// ---- UPDATE HOMEPAGE GRID ----
function addBookToGrid(indexHtml, book) {
  const card =
    '\n            <!-- AUTO-ADDED: ' + book.title + ' (ASIN ' + book.asin + ') -->\n' +
    '            <article class="book-card">\n' +
    '              <div class="book-cover-wrap"><img src="' + book.imgUrl + '" alt="' + book.title + '" loading="lazy" /></div>\n' +
    '              <div class="book-card-top"><div><div class="book-genre">' + book.genre + '</div><h3 class="book-title">' + book.title + '</h3></div></div>\n' +
    '              <div class="book-card-actions">\n' +
    '                <a class="btn btn-blood" href="' + book.page + '">Full Details</a>\n' +
    '                <a class="btn btn-ghost" href="' + book.amzUrl + '" target="_blank" rel="noreferrer">Buy on Amazon</a>\n' +
    '              </div>\n' +
    '            </article>';
  return indexHtml.replace(/(<\/div>\s*\n?\s*<\/section>\s*\n?\s*<!--\s*ABOUT TAB)/, card + '\n\n          $1');
}

// ---- UPDATE SITEMAP ----
function addToSitemap(sitemap, slug) {
  const today = new Date().toISOString().slice(0, 10);
  const entry =
    '\n  <url>\n' +
    '    <loc>https://jonathangrishamauthor.com/books/' + slug + '</loc>\n' +
    '    <lastmod>' + today + '</lastmod>\n' +
    '    <changefreq>monthly</changefreq>\n' +
    '    <priority>0.8</priority>\n' +
    '  </url>';
  return sitemap.replace('</urlset>', entry + '\n</urlset>');
}

// ---- MAIN ----
async function main() {
  console.log('Getting Creators API access token...');
  const token = await getAccessToken();
  console.log('Token acquired. Searching for books...');

  const data = await searchByAuthor('Jonathan Grisham horror', token);
  const results = (data.searchResult && data.searchResult.items) || [];
  console.log('Found ' + results.length + ' results.');

  const manifestPath = path.join(ROOT, 'books.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const knownAsins = new Set(manifest.books.map(function(b) { return b.asin; }));

  const newBooks = results.filter(function(item) {
    const contributors = (item.itemInfo && item.itemInfo.byLineInfo && item.itemInfo.byLineInfo.contributors) || [];
    const isJG = contributors.some(function(c) { return c.name && c.name.toLowerCase().includes('grisham'); });
    return isJG && !knownAsins.has(item.asin);
  });

  if (newBooks.length === 0) {
    console.log('No new books. Manifest is up to date.');
    process.exit(0);
  }

  console.log('New books: ' + newBooks.map(function(b) { return b.asin; }).join(', '));

  let indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  let sitemap   = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');

  for (const item of newBooks) {
    const book = generateBookPage(item);
    console.log('Writing: ' + book.page);
    fs.writeFileSync(path.join(ROOT, book.page), book.html, 'utf8');
    manifest.books.push({ asin: book.asin, slug: book.slug, title: book.title });
    indexHtml = addBookToGrid(indexHtml, book);
    sitemap   = addToSitemap(sitemap, book.slug);
  }

  fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Done. ' + newBooks.length + ' book(s) added.');
}

main().catch(function(err) {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
