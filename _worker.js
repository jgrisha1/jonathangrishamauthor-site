/**
 * jonathangrishamauthor.com -- Cloudflare Worker
 * Handles POST /api/contact, /api/signed-copy, /api/press, /api/newsletter
 *
 * Required env vars (Cloudflare dashboard):
 *   TURNSTILE_SECRET, TO_EMAIL, FROM_EMAIL
 *   EMAIL_PROVIDER = "resend" (default) or "ses"
 *   If resend: RESEND_API_KEY
 *   If ses:    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *
 * KV bindings (wrangler.toml):
 *   SUBSCRIBERS — jonathangrishamauthor-subscribers (id: bec9fd09bf414595ae5731283ddcb2af)
 *   Stores newsletter signups as key=email, value=ISO timestamp.
 *   Export: Cloudflare dashboard > KV > jonathangrishamauthor-subscribers > View
 */

const ALLOWED_ORIGINS = [
  'https://jonathangrishamauthor.com',
  'https://jonathangrishamauthor.jonathan-grisham1990.workers.dev',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin);
}

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip || '' }),
  });
  const data = await res.json();
  return data.success === true;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

// ---- RESEND EMAIL ----
async function sendViaResend({ apiKey, from, to, replyTo, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo || undefined, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// ---- AWS SES EMAIL (SigV4 signed) ----
async function hmacSHA256(key, message) {
  const encoder = new TextEncoder();
  const keyBuf = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return toHex(new Uint8Array(buf));
}

async function sendViaAWSSES({ accessKeyId, secretAccessKey, region, from, to, replyTo, subject, html }) {
  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const body = JSON.stringify({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    },
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = ['POST', '/v2/email/outbound-emails', '',
    canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope,
    await sha256Hex(canonicalRequest)].join('\n');

  const kDate    = await hmacSHA256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion  = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  const kSigning = await hmacSHA256(kService, 'aws4_request');
  const signature = toHex(await hmacSHA256(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      Authorization: authHeader,
    },
    body,
  });
  if (!res.ok) throw new Error(`SES ${res.status}: ${await res.text()}`);
}

async function sendEmail(env, { subject, html, replyTo }) {
  const from = env.FROM_EMAIL || 'forms@jonathangrishamauthor.com';
  const to   = env.TO_EMAIL   || 'jonathan.grisham1990@gmail.com';
  const provider = (env.EMAIL_PROVIDER || 'resend').toLowerCase();

  if (provider === 'ses') {
    await sendViaAWSSES({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION || 'us-east-1',
      from, to, replyTo, subject, html,
    });
  } else {
    await sendViaResend({ apiKey: env.RESEND_API_KEY, from, to, replyTo, subject, html });
  }
}

// ---- EMAIL TEMPLATES ----
function row(label, value) {
  return '<tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:bold;width:160px;white-space:nowrap">' + escapeHtml(label) + '</td><td style="padding:6px 12px">' + value + '</td></tr>';
}
function emailWrap(title, rows) {
  return '<h2 style="font-family:sans-serif;color:#1a1a1a">' + escapeHtml(title) + '</h2>' +
    '<table style="font-family:sans-serif;font-size:15px;line-height:1.6;border-collapse:collapse;width:100%">' + rows + '</table>';
}

function contactHtml(d) {
  return emailWrap('New contact message - jonathangrishamauthor.com',
    row('Name', escapeHtml(d.name)) +
    row('Email', '<a href="mailto:' + escapeHtml(d.email) + '">' + escapeHtml(d.email) + '</a>') +
    row('Message', '<span style="white-space:pre-wrap">' + escapeHtml(d.message) + '</span>') +
    row('Submitted', escapeHtml(d.ts)));
}
function signedCopyHtml(d) {
  return emailWrap('New signed copy request - jonathangrishamauthor.com',
    row('Name', escapeHtml(d.name)) +
    row('Email', '<a href="mailto:' + escapeHtml(d.email) + '">' + escapeHtml(d.email) + '</a>') +
    row('Book', escapeHtml(d.book)) +
    row('Inscription', escapeHtml(d.inscription || 'None')) +
    row('Address', '<span style="white-space:pre-wrap">' + escapeHtml(d.address) + '</span>') +
    row('Notes', escapeHtml(d.message || 'None')) +
    row('Submitted', escapeHtml(d.ts)));
}
function pressHtml(d) {
  return emailWrap('New press inquiry - jonathangrishamauthor.com',
    row('Name', escapeHtml(d.name)) +
    row('Email', '<a href="mailto:' + escapeHtml(d.email) + '">' + escapeHtml(d.email) + '</a>') +
    row('Outlet', escapeHtml(d.outlet || 'Not specified')) +
    row('Inquiry Type', escapeHtml(d.inquiry)) +
    row('Details', '<span style="white-space:pre-wrap">' + escapeHtml(d.message) + '</span>') +
    row('Submitted', escapeHtml(d.ts)));
}

// ---- RATE LIMITER (per-isolate; Turnstile is primary gate) ----
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now(), window = 60000, max = 3;
  const e = rateLimitMap.get(ip) || { count: 0, reset: now + window };
  if (now > e.reset) { rateLimitMap.set(ip, { count: 1, reset: now + window }); return true; }
  if (e.count >= max) return false;
  rateLimitMap.set(ip, { count: e.count + 1, reset: e.reset });
  return true;
}

function jsonResp(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ---- MAIN ----
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ip     = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

    if (!url.pathname.startsWith('/api/')) {
      const res = await env.ASSETS.fetch(request);
      const newRes = new Response(res.body, res);
      newRes.headers.set('X-Content-Type-Options', 'nosniff');
      newRes.headers.set('X-Frame-Options', 'DENY');
      newRes.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      newRes.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      newRes.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      newRes.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      newRes.headers.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://challenges.cloudflare.com; " +
        "frame-src https://challenges.cloudflare.com; " +
        "frame-ancestors 'none';"
      );
      const ct = newRes.headers.get('Content-Type') || '';
      if (ct.includes('text/html')) {
        // No caching for HTML so security headers are always fresh
        newRes.headers.set('Cache-Control', 'no-store');
      } else if (ct.includes('image/') || ct.includes('font/') || ct.includes('text/css') || ct.includes('javascript')) {
        // Long cache for immutable assets (filenames don't change, CF serves fresh on deploy)
        newRes.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return newRes;
    }

    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!isAllowedOrigin(origin)) return new Response('Forbidden', { status: 403 });
    if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405, origin);
    if (!checkRateLimit(ip)) return jsonResp({ error: 'Too many requests. Try again in a minute.' }, 429, origin);

    let body;
    try { body = await request.json(); }
    catch { return jsonResp({ error: 'Invalid request body.' }, 400, origin); }

    const token = body['cf-turnstile-response'];
    if (!token) return jsonResp({ error: 'Missing spam protection token.' }, 400, origin);

    const ok = await verifyTurnstile(token, env.TURNSTILE_SECRET, ip);
    if (!ok) return jsonResp({ error: 'Spam check failed. Please try again.' }, 403, origin);

    const ts = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' });

    try {
      if (url.pathname === '/api/contact') {
        const name    = sanitize(body.name);
        const email   = sanitize(body.email);
        const message = sanitize(body.message);
        if (!name || !email || !message) return jsonResp({ error: 'Name, email, and message are required.' }, 400, origin);
        if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email address.' }, 400, origin);
        await sendEmail(env, {
          subject: 'New contact message from jonathangrishamauthor.com',
          html: contactHtml({ name, email, message, ts }),
          replyTo: email,
        });

      } else if (url.pathname === '/api/signed-copy') {
        const name        = sanitize(body.name);
        const email       = sanitize(body.email);
        const book        = sanitize(body.book);
        const inscription = sanitize(body.inscription);
        const address     = sanitize(body.address);
        const message     = sanitize(body.message);
        if (!name || !email || !book || !address) return jsonResp({ error: 'Name, email, book, and address are required.' }, 400, origin);
        if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email address.' }, 400, origin);
        await sendEmail(env, {
          subject: 'New signed copy request from jonathangrishamauthor.com',
          html: signedCopyHtml({ name, email, book, inscription, address, message, ts }),
          replyTo: email,
        });

      } else if (url.pathname === '/api/press') {
        const name    = sanitize(body.name);
        const email   = sanitize(body.email);
        const outlet  = sanitize(body.outlet);
        const inquiry = sanitize(body.inquiry);
        const message = sanitize(body.message);
        if (!name || !email || !inquiry || !message) return jsonResp({ error: 'Name, email, inquiry type, and details are required.' }, 400, origin);
        if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email address.' }, 400, origin);
        await sendEmail(env, {
          subject: 'New press inquiry from jonathangrishamauthor.com',
          html: pressHtml({ name, email, outlet, inquiry, message, ts }),
          replyTo: email,
        });

      } else if (url.pathname === '/api/newsletter') {
        const email = sanitize(body.email);
        if (!email) return jsonResp({ error: 'Email is required.' }, 400, origin);
        if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email address.' }, 400, origin);

        // Check for duplicate before storing
        const existing = env.SUBSCRIBERS ? await env.SUBSCRIBERS.get(email) : null;
        if (existing) {
          // Already subscribed — return ok silently (no double-email)
          return jsonResp({ ok: true }, 200, origin);
        }

        // Persist to KV — key=email, value=signup timestamp
        if (env.SUBSCRIBERS) {
          await env.SUBSCRIBERS.put(email, ts, { metadata: { signedUp: ts } });
        }

        // Notify Jonathan
        await sendEmail(env, {
          subject: 'New mailing list signup - jonathangrishamauthor.com',
          html: `<h2 style="font-family:sans-serif;color:#1a1a1a">New mailing list subscriber</h2><p style="font-family:sans-serif;font-size:15px"><strong>${escapeHtml(email)}</strong> signed up at ${escapeHtml(ts)}.</p><p style="font-family:sans-serif;font-size:13px;color:#666">Subscriber saved to KV. Export the full list any time from the Cloudflare dashboard &rsaquo; KV &rsaquo; jonathangrishamauthor-subscribers.</p>`,
          replyTo: email,
        });

      } else {
        return jsonResp({ error: 'Not found.' }, 404, origin);
      }

      return jsonResp({ ok: true }, 200, origin);
    } catch (err) {
      console.error('Form handler error:', err.message);
      return jsonResp({ error: 'Something went wrong. Please try again or contact directly.' }, 500, origin);
    }
  },
};
