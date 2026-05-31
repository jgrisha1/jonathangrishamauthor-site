# CONTENT-UPDATES.md

How to make common content changes. All changes go live by committing to main (auto-deploys).

## Add or edit a book page
1. Copy an existing file in /books (e.g. books/spur.html) to books/<slug>.html.
2. Update: <title>, meta description, canonical/OG URLs, JSON-LD Book block, cover <img>, metadata rows, synopsis, themes, content warnings.
3. Add the cover image to the repo root (e.g. cover-<slug>.jpg). Keep it small: max ~800px wide, JPEG quality ~82, under ~250 KB.
4. Add a card for it in index.html (books grid) and to the "Also Available" related grids on other book pages.
5. Commit to main.

## Edit homepage copy (hero, about, music, fair warning)
Edit index.html. Preserve voice and the dark theme. Keep the bio language exactly: "lay leader in the United Methodist Church", "active member of New Life UMC". No ordination wording. No em dashes.

## Update music section
Edit the music block in index.html (album title, tracklist, streaming links). Album art can live in the repo or R2.

## Image rules (performance)
- Covers: <= 800px wide, optimized JPEG/PNG, under ~250 KB.
- Add width and height attributes and loading="lazy" to off-screen images.
- Big media goes to R2 (see R2-ASSETS.md), not the repo.

## After any change
Verify on https://jonathangrishamauthor.com and check the page on mobile width.
