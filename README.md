# jonathangrishamauthor.com

Cloudflare Workers site with form handler, music section, and Amazon PA API auto-sync.

## Push to GitHub (one-time setup)

The GitHub repo `jgrisha1/jonathangrishamauthor` has already been created.
The local git repo with both commits is at:

```
C:\Users\jonat\AppData\Roaming\Claude\local-agent-mode-sessions\672d30c5-0ff9-4b39-98ee-114a134322d1\565c02e8-cb78-447a-8809-9b2dd2b07e52\local_8673b8a3-3903-4c4a-ba79-33b7b1023a60\outputs\site_redesign
```

However, it's easier to push from the sandbox copy. Open Git Bash and run:

```bash
cd /var/tmp/jg_site
git remote add origin https://github.com/jgrisha1/jonathangrishamauthor.git
git push -u origin main
```

When prompted for credentials, use your GitHub username `jgrisha1` and a
Personal Access Token (PAT) as the password:

1. Go to https://github.com/settings/tokens/new
2. Enter your GitHub password when prompted
3. Set Note: `jonathangrishamauthor-deploy`
4. Check scope: `repo` (full repository access)
5. Click Generate token — copy it immediately
6. Paste it as the password when `git push` prompts

## After pushing: add GitHub Actions secrets

Go to https://github.com/jgrisha1/jonathangrishamauthor/settings/secrets/actions/new
and add these four secrets (needed for the nightly Amazon book sync):

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | *(store as a GitHub Actions secret only — never commit the value)* |
| `AMAZON_ACCESS_KEY` | *(get from PA API when approved)* |
| `AMAZON_SECRET_KEY` | *(get from PA API when approved)* |
| `AMAZON_PARTNER_TAG` | `220500b-20` |

## Cloudflare Worker — secrets already set

All 7 Worker secrets are live in Cloudflare:
- `TURNSTILE_SECRET` — Turnstile spam protection
- `TO_EMAIL` — jonathan.grisham1990@gmail.com
- `FROM_EMAIL` — forms@jonathangrishamauthor.com
- `EMAIL_PROVIDER` — ses
- `AWS_ACCESS_KEY_ID` — IAM key for SES
- `AWS_SECRET_ACCESS_KEY` — IAM secret for SES
- `AWS_REGION` — us-east-1

## AWS SES — one action needed

A verification email was sent to jonathan.grisham1990@gmail.com.
**Click the link in that email** to activate SES sending.

Until verified, forms will not send email. After verification, test a
contact form submission at https://jonathangrishamauthor.com/#signed

## Amazon PA API

Apply at https://affiliate-program.amazon.com/assoc_credentials/home
(requires 3+ qualifying sales on your Associates account `220500b-20`).
Once approved, add the keys as GitHub secrets above.
