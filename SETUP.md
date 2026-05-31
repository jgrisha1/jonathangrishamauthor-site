# jonathangrishamauthor.com — Setup Guide

## One-time setup checklist

---

### 1. Amazon Product Advertising API (PA API)

The PA API is what lets the site automatically detect new books you publish.

**Requirements:**
- An active Amazon Associates account with `220500b-20` as your tag
- At least 3 qualifying sales in the past 180 days (Amazon requirement to keep API access)

**Steps:**
1. Go to: https://affiliate-program.amazon.com/assoc_credentials/home
2. Click **Add credentials** under Product Advertising API
3. Copy your **Access Key ID** and **Secret Access Key**
4. Add them as GitHub secrets (see section 3 below)

> Note: If your account has fewer than 3 sales, you can still apply but Amazon may restrict access until you hit the threshold.

---

### 2. AWS SES (email from contact forms)

**Steps:**
1. Go to AWS Console → SES → Verified identities
2. Add and verify `jonathan.grisham1990@gmail.com` as an email identity
3. If still in sandbox mode, either request production access or add your email as a verified destination
4. Create an IAM user with this policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ses:SendEmail", "ses:SendRawEmail"],
       "Resource": "*"
     }]
   }
   ```
5. Copy the IAM Access Key ID and Secret Access Key

**Set in Cloudflare dashboard** (Workers & Pages → jonathangrishamauthor → Settings → Variables & Secrets):
| Variable | Value |
|---|---|
| `EMAIL_PROVIDER` | `ses` |
| `AWS_ACCESS_KEY_ID` | your IAM key |
| `AWS_SECRET_ACCESS_KEY` | your IAM secret |
| `AWS_REGION` | `us-east-1` |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret (see below) |
| `TO_EMAIL` | `jonathan.grisham1990@gmail.com` |
| `FROM_EMAIL` | `forms@jonathangrishamauthor.com` (or your verified email) |

---

### 3. Cloudflare Turnstile (spam protection on forms)

1. Go to: https://dash.cloudflare.com → Turnstile
2. Add site: `jonathangrishamauthor.com`
3. Copy the **Site Key** (public — already in the HTML as `0x4AAAAAAABkMYinukE8nkZt`, replace if different)
4. Copy the **Secret Key** → add to Cloudflare Workers secrets as `TURNSTILE_SECRET`

---

### 4. GitHub Secrets (for the auto-sync workflow)

Go to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret name | Where to get it |
|---|---|
| `AMAZON_ACCESS_KEY` | PA API credentials page |
| `AMAZON_SECRET_KEY` | PA API credentials page |
| `AMAZON_PARTNER_TAG` | `220500b-20` (your existing tag) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |

---

### 5. Cloudflare R2 media bucket (optional but recommended)

1. Go to Cloudflare dashboard → R2 → Create bucket
2. Name: `jonathangrishamauthor-media`
3. Upload book covers, author photos, album art using this structure:
   ```
   books/covers/
   books/sample-chapters/
   books/press-kits/
   music/album-art/
   music/audio-previews/
   media/author-photos/
   site/og-images/
   ```
4. When ready to serve assets from R2, uncomment the `[r2_buckets]` block in `wrangler.toml` and redeploy

---

### 6. How the auto-sync works

Every night at 3am ET, GitHub Actions:
1. Searches Amazon for "Jonathan Grisham horror" via PA API
2. Checks results against `books.json` manifest
3. If a new book is found, generates a full book page, adds it to the homepage grid and sitemap
4. Commits the changes and redeploys to Cloudflare

You can also trigger it manually any time:
- Go to GitHub repo → Actions → "Sync Books from Amazon" → Run workflow

**After a new book is auto-added:**
The generated page will have a placeholder synopsis ("Synopsis coming soon"). You should go in and write the real synopsis using the voice established in the existing book pages. The automation handles structure and wiring; the writing is still yours.

---

### 7. Updating books.json ASINs

The current `books.json` has placeholder ASINs for some books. To fix:
1. Find each book on Amazon and copy the ASIN from the URL: `amazon.com/dp/ASIN_HERE`
2. Update `books.json` with the correct ASINs
3. Commit and push — the sync workflow will use these going forward

