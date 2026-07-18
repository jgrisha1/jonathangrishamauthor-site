#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'private', '.wrangler'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function relative(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function parseJsonLd(file, html) {
  const documents = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      documents.push(JSON.parse(match[1]));
    } catch (error) {
      fail(`${file}: invalid JSON-LD (${error.message})`);
    }
  }
  return documents;
}

function hasType(value, expectedType) {
  if (!value || typeof value !== 'object') return false;
  if (value['@type'] === expectedType || (Array.isArray(value['@type']) && value['@type'].includes(expectedType))) return true;
  return Object.values(value).some((child) => Array.isArray(child)
    ? child.some((item) => hasType(item, expectedType))
    : hasType(child, expectedType));
}

function localTargetExists(sourceFile, rawTarget) {
  if (!rawTarget || rawTarget.startsWith('#') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('tel:') || rawTarget.startsWith('javascript:')) return true;
  if (/^https?:\/\//i.test(rawTarget) || rawTarget.startsWith('//')) return true;

  const cleanTarget = rawTarget.split('#')[0].split('?')[0];
  if (!cleanTarget || cleanTarget.startsWith('/api/')) return true;

  let target;
  try {
    target = decodeURIComponent(cleanTarget);
  } catch {
    fail(`${sourceFile}: malformed local URL ${rawTarget}`);
    return true;
  }

  let candidate = target.startsWith('/')
    ? path.join(ROOT, target.slice(1))
    : path.resolve(path.dirname(path.join(ROOT, sourceFile)), target);

  if (target === '/') candidate = path.join(ROOT, 'index.html');
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return true;
  if (!path.extname(candidate) && fs.existsSync(`${candidate}.html`)) return true;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory() && fs.existsSync(path.join(candidate, 'index.html'))) return true;
  return false;
}

function validateForms(file, html) {
  const expected = {
    'contact-form': '/api/contact',
    'signed-copy-form': '/api/signed-copy',
    'press-form': '/api/press',
    'newsletter-form': '/api/newsletter',
    'unsubscribe-form': '/api/unsubscribe',
  };

  for (const match of html.matchAll(/<form\b([^>]*)>/gi)) {
    const attributes = match[1];
    const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (!id || !expected[id]) continue;
    const method = attributes.match(/\bmethod=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const action = attributes.match(/\baction=["']([^"']+)["']/i)?.[1];
    if (method !== 'post') fail(`${file}: ${id} must use method="post"`);
    if (action !== expected[id]) fail(`${file}: ${id} must post to ${expected[id]}`);
  }
}

const manifest = JSON.parse(read('books.json'));
const books = manifest.books || [];
if (!books.length) fail('books.json: no books found');

for (const field of ['asin', 'slug', 'title', 'page', 'genre', 'category', 'displayOrder', 'status', 'signedCopyAvailable']) {
  for (const book of books) {
    if (book[field] === undefined || book[field] === '') fail(`books.json: ${book.title || book.slug || 'unknown book'} is missing ${field}`);
  }
}

for (const field of ['asin', 'slug', 'page', 'displayOrder']) {
  const values = books.map((book) => String(book[field]));
  if (new Set(values).size !== values.length) fail(`books.json: duplicate ${field}`);
}

const today = new Date().toISOString().slice(0, 10);
for (const book of books) {
  if (!['fiction', 'nonfiction'].includes(book.category)) fail(`books.json: invalid category for ${book.title}`);
  if (!['available', 'preorder', 'forthcoming'].includes(book.status)) fail(`books.json: invalid status for ${book.title}`);
  if (book.status === 'preorder' && book.releaseDate && book.releaseDate < today) fail(`books.json: expired preorder for ${book.title}`);
  if (!fs.existsSync(path.join(ROOT, book.page))) fail(`books.json: missing page ${book.page}`);
}

const allFiles = walk(ROOT);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
for (const fullPath of htmlFiles) {
  const bytes = fs.readFileSync(fullPath);
  if (bytes.includes(0)) fail(`${relative(fullPath)}: contains null bytes`);
}

for (const fullPath of htmlFiles) {
  const file = relative(fullPath);
  const html = fs.readFileSync(fullPath, 'utf8');
  parseJsonLd(file, html);
  validateForms(file, html);

  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attributePattern)) {
    if (!localTargetExists(file, match[1])) fail(`${file}: missing local target ${match[1]}`);
  }
}

const requiredSurfaces = ['index.html', 'books.html', 'about.html', 'press.html'];
const surfaceHtml = Object.fromEntries(requiredSurfaces.map((file) => [file, read(file)]));
const sitemap = read('sitemap.xml');
const signedOptions = [...read('index.html').matchAll(/<option(?:\s[^>]*)?>([\s\S]*?)<\/option>/gi)].map((match) => stripTags(match[1]));

for (const book of books) {
  for (const [file, html] of Object.entries(surfaceHtml)) {
    if (!html.includes(book.title)) fail(`${file}: missing catalog title ${book.title}`);
  }
  if (!sitemap.includes(`https://jonathangrishamauthor.com/books/${book.slug}`)) fail(`sitemap.xml: missing ${book.slug}`);
  if (book.signedCopyAvailable && !signedOptions.includes(book.title)) fail(`index.html: signed-copy selector missing ${book.title}`);

  const pageHtml = read(book.page);
  const pageJsonLd = parseJsonLd(book.page, pageHtml);
  if (!pageJsonLd.some((document) => hasType(document, 'Book'))) fail(`${book.page}: missing Book structured data`);
  if (!pageHtml.includes(`https://jonathangrishamauthor.com/books/${book.slug}`)) fail(`${book.page}: canonical book URL is missing`);
  if (book.status === 'available' && /schema\.org\/PreOrder|\bpre-?order\b/i.test(pageHtml)) fail(`${book.page}: available book still contains preorder state`);

  const relatedSection = pageHtml.match(/<div class=["']related-grid["']>([\s\S]*?)<\/section>/i)?.[1] || '';
  const relatedSlugs = new Set([...relatedSection.matchAll(/href=["']\/books\/([^"'#?]+)["']/gi)].map((match) => match[1]));
  const expectedRelated = books.filter((other) => other.slug !== book.slug).map((other) => other.slug);
  for (const slug of expectedRelated) {
    if (!relatedSlugs.has(slug)) fail(`${book.page}: related-books grid missing ${slug}`);
  }
  if (relatedSlugs.has(book.slug)) fail(`${book.page}: related-books grid links to itself`);
}

const redirectFile = read('_redirects');
for (const obsolete of ['/books/kept-warm ', '/books/the-devil ', '/books/growing-up ', '/books/when-obedience ']) {
  if (!redirectFile.includes(obsolete)) fail(`_redirects: missing redirect for ${obsolete.trim()}`);
}

const assetsIgnore = read('.assetsignore').split(/\r?\n/).map((line) => line.trim());
for (const pattern of ['.env*', '*.bat', '*.log', 'deploy-log.txt', 'private', 'private/**', 'what-is-appalachian-splatterpunk.html']) {
  if (!assetsIgnore.includes(pattern)) fail(`.assetsignore: missing private-file rule ${pattern}`);
}

const workerConfig = read('wrangler.toml');
for (const route of ['"/"', '"/api/*"', '"/books/*"']) {
  if (!workerConfig.includes(route)) fail(`wrangler.toml: run_worker_first is missing ${route}`);
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site validation passed: ${books.length} books, ${htmlFiles.length} HTML files, ${allFiles.length} files checked.`);
