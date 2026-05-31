# FORMS.md

Three forms POST to the Worker. All are server-validated and spam-protected.

## Endpoints (_worker.js)
- POST /api/contact      — name, email, message
- POST /api/signed-copy  — name, email, book, inscription (opt), address, notes (opt)
- POST /api/press        — name, email, outlet (opt), inquiry type, details

## Protections in place
- Cloudflare Turnstile token required and server-verified on every submit.
- CORS locked to jonathangrishamauthor.com (+ the workers.dev origin).
- Rate limit: 3 submissions per minute per IP (in-memory per isolate).
- Input sanitized: angle brackets stripped, trimmed, capped at 2000 chars.
- Required-field validation server-side; visitor email set as Reply-To.
- No public email address exposed in the page; everything routes to the Worker.

## Email delivery
Controlled by EMAIL_PROVIDER secret:
- "ses"    — AWS SES via SigV4 (current setting). Needs a verified sender identity in SES.
- "resend" — Resend API (free tier 3000/mo) as a fallback.

## One manual action required
AWS SES sender (FROM_EMAIL or its domain) must be verified in the SES console, and the account must be out of the SES sandbox to email arbitrary recipients. Until then, form email will not send. Test by submitting the contact form at /#signed and confirming an email arrives at TO_EMAIL.

## Possible future hardening (optional, still free)
- Move the rate limiter to a KV namespace for limits that survive isolate restarts.
- Add a honeypot field as a second spam layer.
