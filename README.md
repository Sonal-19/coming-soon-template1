# GMC – Coming Soon

Interactive coming-soon page for **GenXMeta Corporation** (genxmeta.io), shown while the main
dApp (`gmc-dapp`) is being finished. Built with Vite + TypeScript, no framework, no runtime
dependencies. Works on phones, tablets and desktop.

## What's on the page

| Section | What it does |
|---|---|
| **Loader → sound check** | After the gold loader, the page tries to start the teaser **with sound** on its own. If the browser allows it (e.g. Chrome for returning visitors), the page opens straight onto the playing teaser. If the browser blocks sound without a click (Safari, most first visits), the ivory-and-gold **ENTER** screen appears instead, and clicking ENTER starts the teaser with sound. Add `?skip` to the URL while developing to bypass both (teaser plays muted). |
| **Hero** | "Coming Soon" in gold, plus the GMC Experience teaser playing in a gold phone frame. The frame tilts with the mouse on desktop, has a sound toggle and a progress bar. Optional countdown. |
| **Marquee** | Scrolling band: GNX Token ✦ MITO C-Care ✦ Lifetime Rewards ✦ … |
| **Previews** | The 4 posters. A 4-column grid with tilt and shine on desktop, a swipe carousel with dots and arrows on mobile. Tap to open the full-screen viewer (swipe, arrow keys, Esc). |
| **Teasers** | The 3 videos as vertical reels. They autoplay muted when scrolled into view and pause when they leave. Tap to pause, speaker for sound (one at a time). |
| **What's coming** | Wellness (MITO C-Care), GNX Token, The GMC Journey, The Exchange, with the disclaimer line from the posters. |
| **Notify** | Optional email form, plus a Share button (native share sheet on phones, copy link on desktop). |

Reduced-motion users get a calm version: no autoplay, particles or marquee.

## Commands

```bash
npm install
npm run dev       # http://localhost:7320 (also on your LAN, so you can test on your phone)
npm run build     # → dist/
npm run preview   # serve dist/ on :7321
npm run media     # regenerate optimized images after replacing a poster/video (needs ffmpeg)
```

## Settings: `.env`

Copy `.env.example` to `.env` and fill in what you need. Every setting is optional.

| Variable | Effect |
|---|---|
| `VITE_SITE_URL` | Absolute site URL for the share preview (`og:image`) and canonical link. Default `https://genxmeta.io`. |
| `VITE_LAUNCH_DATE` | e.g. `2026-12-01T10:00:00+05:30`. Shows a live countdown and "Launching 1 December 2026". Empty = "Launching soon". |
| `VITE_NOTIFY_ENDPOINT` | URL that accepts `POST {"email": "...", "source": "coming-soon"}` (JSON). Empty = form hidden. Must allow CORS from the site's domain. |

Rebuild after changing them.

## Media

- Originals stay in `assets/` and `assets/coming-soon/` and are never modified.
- `npm run media` writes web-sized WebP copies to `assets/coming-soon/web/` (≈190 KB per poster
  instead of ≈850 KB), plus `public/og-image.jpg`, `public/apple-touch-icon.png` and `public/favicon.ico`.
- The MP4s are already web-ready (H.264, fast-start) and are used as-is. Reels load only when they
  scroll into view.
- Only files the page uses end up in `dist/`. The other images in `assets/` are not shipped.

To swap a poster or video, replace the file with the same name and run `npm run media`.

## Deploy

`dist/` is plain static files that any host can serve (nginx, Cloudflare Pages, Netlify…).

**beta.genxmeta.io (one command):**

```bash
bun run deploy    # or: npm run deploy
```

This builds the page and rsyncs `dist/` to `php:/var/www/gmc/beta`, the folder nginx serves for
https://beta.genxmeta.io. The live dApp at genxmeta.io (`/var/www/gmc/front-end`) is never touched,
and the script refuses to deploy there.

One-time setup on your machine: Tailscale on and signed in to the **ravionline333** tailnet, and this
in `~/.ssh/config`:

```
Host php
  HostName srv1753994
  User root
  HostKeyAlias php
```

On the server, the nginx site is `/etc/nginx/conf.d/beta.genxmeta.io.conf` (Let's Encrypt SSL via
certbot, auto-renewing). DNS is an `A beta → 168.231.114.8` record in Cloudflare, proxied.

**Cloudflare Pages:** build command `npm run build`, output directory `dist`.
