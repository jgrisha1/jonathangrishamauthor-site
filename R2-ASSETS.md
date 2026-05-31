# R2-ASSETS.md

R2 is Cloudflare object storage (free tier: 10 GB storage, 1M Class A ops, 10M Class B ops per month). Use it as a media vault, not as the site engine. The site itself stays as static assets on the Worker.

## When to use R2
Large or rarely-changing media: hi-res cover art, press kits, audio previews, sample chapters, video, social graphics. Keep small page images in the repo; push big files to R2.

## Suggested bucket and structure
Bucket: jonathangrishamauthor-media
```
books/covers        books/sample-chapters   books/press-kits   books/content-notes
music/album-art     music/audio-previews     music/lyrics        music/press-kit
media/author-photos media/interviews         media/social-graphics  media/videos
site/og-images      site/backgrounds         site/downloads
```
Use SEO-friendly filenames (kept-warm-for-the-mountain-cover.jpg, not IMG_1234.jpg).

## To wire it up (when needed)
1. Create the bucket in Cloudflare R2.
2. Uncomment the [r2_buckets] block in wrangler.toml (binding MEDIA).
3. Commit to main; Workers Builds redeploys with the binding.
4. Optionally enable an R2 public URL or serve via the Worker.

## Cost guardrail
Stay within free tier. Do not enable Class A heavy workflows or paid egress add-ons without approval.
