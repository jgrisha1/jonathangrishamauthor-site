# CLAUDE.md

Project instructions for AI assistants working on jonathangrishamauthor.com.

## What this is
A static author site for Jonathan Grisham (extreme horror / splatterpunk, East Tennessee), served by a single Cloudflare Worker with static assets. No build step, no framework. Plain HTML, one shared style.css, per book page in /books, plus a Worker (_worker.js) that handles form POSTs.

## Stack
- Hosting: Cloudflare Workers (assets-based). Worker name: jonathangrishamauthor.
- Deploy: Cloudflare Workers Builds connected to GitHub repo jgrisha1/jonathangrishamauthor. Every push to main auto-runs `npx wrangler deploy`. No local commands required.
- Forms: _worker.js routes /api/contact, /api/signed-copy, /api/press. Turnstile + email (SES or Resend).
- DNS/CDN: Cloudflare. Domain jonathangrishamauthor.com.

## Hard rules
- Zero added monthly cost. Do not enable paid services (Bedrock model calls, paid APIs, paid storage) without explicit approval.
- Preserve the dark Appalachian extreme-horror identity. Do not lighten the theme.
- Voice: keep existing lines. No corporate copy, no generic horror cliches, no em dashes in site copy.
- Bio language: "lay leader in the United Methodist Church", "active member of New Life UMC". Never "lay minister", "lay pastor", or ordination/discernment language.
- Never commit secrets. Secrets live as Cloudflare Worker secrets and GitHub Actions secrets only.

## How to make a change
1. Edit files (root HTML/CSS, /books pages, etc.).
2. Commit to main on GitHub (web upload or editor is fine).
3. Workers Builds deploys automatically in a couple minutes.
4. Verify on https://jonathangrishamauthor.com.

## Layout
- index.html — homepage (books grid, about, music, contact forms).
- style.css — shared styles (book pages add a small inline <style> for per-book theme vars).
- books/*.html — one page per book.
- _worker.js — form handler (excluded from served assets via .assetsignore).
- scripts/sync-books.js + .github/workflows/sync-books.yml — nightly Amazon book sync.
- .assetsignore — keeps _worker.js, .git, configs, docs out of the public asset bundle.

See DEPLOYMENT.md, FORMS.md, ENVIRONMENT-VARIABLES.md, R2-ASSETS.md, BACKUP-PLAN.md, CONTENT-UPDATES.md.
