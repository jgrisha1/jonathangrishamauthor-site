# ENVIRONMENT-VARIABLES.md

Never commit any of these values. Set them as Cloudflare Worker secrets (Workers & Pages > jonathangrishamauthor > Settings > Variables and Secrets) and, where noted, as GitHub Actions secrets.

## Cloudflare Worker secrets (runtime, for forms)
- TURNSTILE_SECRET        Turnstile secret key (spam protection)
- TO_EMAIL                destination inbox (jonathan.grisham1990@gmail.com)
- FROM_EMAIL              verified sender (forms@jonathangrishamauthor.com)
- EMAIL_PROVIDER          "ses" or "resend"
- AWS_ACCESS_KEY_ID       IAM key with ses:SendEmail (if provider = ses)
- AWS_SECRET_ACCESS_KEY   IAM secret (if provider = ses)
- AWS_REGION              e.g. us-east-1 (if provider = ses)
- RESEND_API_KEY          only if provider = resend

All seven SES-path secrets are currently set in Cloudflare.

## GitHub Actions secrets (nightly Amazon sync)
- CLOUDFLARE_API_TOKEN    deploy/sync token. ROTATE THIS: it was previously committed in README and exposed via /.git. Roll it in Cloudflare (My Profile > API Tokens) and update this secret.
- AMAZON_ACCESS_KEY       PA API key (when Associates account is approved)
- AMAZON_SECRET_KEY       PA API secret
- AMAZON_PARTNER_TAG      220500b-20

## Security notes
- .assetsignore excludes .env, .git, and configs from the public bundle.
- Confirm https://jonathangrishamauthor.com/.git/config returns 404.
