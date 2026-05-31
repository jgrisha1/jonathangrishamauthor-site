# BACKUP-PLAN.md

## Source of truth
GitHub repo jgrisha1/jonathangrishamauthor (private). Every deploy comes from here, so the repo IS the backup of the site code. Cloudflare also keeps the last 100 deployed versions for rollback.

## Recommended routine
- Code: rely on Git history. Tag releases occasionally (e.g. v1.0) for easy reference.
- Local copy: keep the working folder (Downloads/site_redesign) in sync by pulling from GitHub, or clone fresh when needed.
- Media: anything stored only in R2 should also live in the repo or a local archive; R2 is not a backup by itself.
- Secrets: store securely in a password manager, never in the repo. They are also held as Cloudflare/GitHub secrets.

## Disaster recovery
1. Site broken by a bad deploy: roll back in Cloudflare Deployments.
2. Repo lost locally: re-clone from GitHub.
3. Repo lost entirely: restore from latest local clone; re-create the GitHub repo; reconnect Workers Builds; re-add secrets from your password manager.
4. Cloudflare account issue: the repo + secrets are enough to redeploy to a new Worker.

## Free, optional extras
- Enable GitHub secret scanning and Dependabot (free for the repo).
- Periodically download a repo zip from GitHub as an offline snapshot.
