# Deploying kpipolitical.com — handoff

Everything needed to put this site into production. Written for the person doing
the deploy; no build tools or site frameworks are involved.

**Approved to deploy by Adam Wise, 2026-09-14.**
Questions about content go to Adam; nothing in this repo needs further sign-off.

---

## 1. What this is

A **fully static site**. No build step, no server-side code, no database, no
external dependencies (fonts, CSS, and JavaScript are all self-hosted in
`assets/`). Any web server or static host that can serve files can run it.

- **Source of truth:** this Git repository, branch `main`. As of handoff the
  launch state is commit `19932eb` ("Merge r188"); deploy that or the current
  `main` tip.
- **Size:** ~8.5 MB total.
- **Preview of exactly what you're deploying:**
  https://awise882.github.io/kpi-site-preview/

### The pages (9)

| File | Page |
|---|---|
| `index.html` | Home |
| `monitoring.html` | Monitoring |
| `platform.html` | The Platform |
| `week.html` | For Buyers & Sellers |
| `polling.html` | Voter Opinion |
| `questions.html` | Question Library |
| `press.html` | Newsroom |
| `contact.html` | Request the Walkthrough |
| `privacy.html` | Privacy |

Plus: `404.html`, `robots.txt`, `sitemap.xml`, `favicon.ico`, and the whole
`assets/` tree (css, js, fonts, img, data, media, reports, apps). `.nojekyll`
is for GitHub Pages only — harmless anywhere else; copy it or skip it.

## 2. Deploy steps

1. Get the files:
   ```
   git clone https://github.com/awise882/kpi-site-preview.git
   cd kpi-site-preview && git checkout 19932eb   # the r188 launch commit on main
   ```
2. Copy **everything except `.git/`** to the web root, preserving structure:
   ```
   rsync -av --delete --exclude='.git' --exclude='DEPLOY.md' ./ user@host:/var/www/kpipolitical.com/
   ```
   (Or connect the host directly to the repo's `main` branch — Netlify,
   Cloudflare Pages, S3+CloudFront, GitHub Pages with a custom domain all work
   with zero build configuration. Publish directory = repository root.)
3. Point the domain (section 3), apply the server settings (section 4), then
   run the smoke test (section 6).

**Rollback:** redeploy the previous webroot copy, or `git checkout` the prior
commit on `main` and rsync again. Nothing else to unwind — no migrations, no
caches to purge beyond the CDN if one is in front.

## 3. Domain, TLS, redirects

- Canonical host baked into the pages (`og:url`, `<link rel=canonical>`,
  `sitemap.xml`, `robots.txt`) is the **apex**: `https://kpipolitical.com`.
- Serve the site at the apex and **301 `www.` → apex**. If you'd rather serve
  on `www.`, flip the baked URLs first — one command from the repo root, then
  redeploy:
  ```
  grep -rl 'https://kpipolitical.com' *.html sitemap.xml robots.txt | \
    xargs sed -i 's|https://kpipolitical.com|https://www.kpipolitical.com|g'
  ```
- **HTTPS required** (redirect http → https). Let's Encrypt is fine.
- `portal.kpipolitical.com` (the client login link in the nav) is a separate
  system — just confirm it resolves before launch day.

## 4. Server settings

- **MIME types** — make sure these serve correctly (defaults on nginx/Apache/
  CDNs are usually fine): `.woff2` `font/woff2` · `.webp` `image/webp` ·
  `.svg` `image/svg+xml` · `.json` `application/json` · `.pdf`
  `application/pdf` · `.ico` `image/x-icon`.
- **Compression:** enable gzip or brotli for `.html .css .js .svg .json .xml`.
- **Caching:**
  - `*.html` → `Cache-Control: max-age=300` (or no-cache). HTML must revalidate
    so content updates land.
  - `assets/**` → `Cache-Control: max-age=31536000, immutable`. Safe: every
    stylesheet/script reference carries a `?v=rNNN` version that changes on
    each release.
- **404:** serve `/404.html` (with status 404) for unknown paths. It is fully
  self-contained and renders from any path.
- No directory listings; no other rewrites needed — every URL is a real file.

## 5. The contact form (read this one)

`contact.html` submits by JavaScript to **`POST /api/contact`** (same origin,
JSON). The page is built to work **with or without** that endpoint:

- **No backend (day-one default):** on a static host the POST fails and the
  page automatically falls back to a pre-filled **mailto** draft addressed to
  `info@kpipolitical.com`, with everything the visitor typed. Nothing to
  configure — but **confirm that inbox is live and watched** before launch.
- **Optional upgrade — implement `/api/contact`:** any small handler (nginx →
  tiny service, serverless function, form relay) that:
  - accepts `POST`, `Content-Type: application/json`, body:
    `{ "name": "...", "email": "...", "subject": "...", "description": "..." }`
    (name/email/subject ≤150 chars, description ≤1000 — enforce server-side too);
  - forwards it as an email to `info@kpipolitical.com`;
  - responds `200` with `{"success": true}` on success;
    `400` with `{"errors": {"field": "message"}}` for validation;
    anything else with `{"message": "..."}` (the page shows it);
  - add basic rate limiting and a spam check — the endpoint will be public.
  Same-origin path, so no CORS setup if it lives on the same host.

## 6. Post-deploy smoke test

1. Load all 9 pages over https — no mixed-content warnings, fonts render (the
   serif headlines are the tell; if you see Times New Roman, `woff2` isn't
   being served).
2. `https://kpipolitical.com/robots.txt` and `/sitemap.xml` return 200.
3. A made-up URL (e.g. `/nope`) returns the branded 404 with status 404.
4. Home page animations run on scroll; the streaming ticker on Monitoring
   populates (it reads `assets/data/*.json` — if it's empty, JSON isn't being
   served).
5. Submit the contact form with a test entry: either the API answers "sent"
   (if you built it) or an email draft opens addressed to
   `info@kpipolitical.com` (static default). Both are correct.
6. Click the client-login link → `portal.kpipolitical.com` loads.
7. The one PDF (`assets/reports/`) downloads from the Newsroom page.
8. After DNS is live, paste `https://kpipolitical.com` into LinkedIn's Post
   Inspector (linkedin.com/post-inspector) — the share card should show the
   navy "most complete political ad intelligence platform" image.
9. Check one page on a phone.
10. Optional: submit `sitemap.xml` in Google Search Console.

## 7. Explicitly out of scope for this deploy

- The LinkedIn launch reel and post kit — Adam posts those natively on
  LinkedIn; they are not files on this site.
- The live send-test of the contact inbox — Adam runs that himself.
- Analytics: none is installed, by choice. If one is wanted later it's a
  one-line addition per page — through Adam.
