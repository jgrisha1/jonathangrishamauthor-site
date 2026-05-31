# DEPLOYMENT.md

## How deploys work
The Worker is connected to GitHub via Cloudflare Workers Builds.
- Trigger: any push/commit to the `main` branch of jgrisha1/jonathangrishamauthor.
- Cloudflare checks out the repo and runs the deploy command `npx wrangler deploy`.
- wrangler reads wrangler.toml (assets directory = ./, main = _worker.js) and uploads.
- Worker secrets are preserved across deploys; they are never wiped by a deploy.
- Live in ~1-3 minutes. Verify at https://jonathangrishamauthor.com.

## To deploy a change (no terminal needed)
1. On GitHub, edit the file (or Add file > Upload files) in the repo.
2. Commit to main.
3. Watch Workers & Pages > jonathangrishamauthor > Deployments for the new version.

## Manual deploy (optional, needs a terminal)
```
cd path/to/site_redesign
npx wrangler deploy
```
Uses CLOUDFLARE_API_TOKEN from the environment or `npx wrangler login`.

## Rollback
Cloudflare keeps version history (up to 100). Workers & Pages > jonathangrishamauthor > Deployments > pick a previous version > roll back. Use this if a deploy regresses the site.

## What is NOT served
.assetsignore excludes _worker.js, .env, .git, .github, .wrangler, scripts, *.md docs, wrangler.toml. This keeps source/config/secrets off the public site. Confirm /.git/config returns 404 after any change to .assetsignore.
