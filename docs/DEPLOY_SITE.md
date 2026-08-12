---
title: Deploying jtcsv.online
description: Bring the documentation site live on the project's own domain via GitHub Pages.
---

# Deploying the docs site to jtcsv.online

The VitePress site in `/docs` is built by
[`.github/workflows/docs.yml`](../.github/workflows/docs.yml) on every push
to `main` and uploaded as a Pages artifact. Everything below is one-time
setup that has **not** been done yet — until it is, the workflow builds
successfully but has nowhere to deploy.

## Current state

| Piece | State |
|---|---|
| VitePress build | working (`npm run site:build`) |
| TypeDoc API build | working (`npm run docs`) |
| `docs/public/CNAME` | present, contains `jtcsv.online` |
| `sitemap.hostname` | set to `https://jtcsv.online` |
| GitHub Pages on the repo | **not enabled** |
| DNS for `jtcsv.online` | **not pointed at GitHub** |
| `gh-pages` branch (bench chart) | **does not exist** |

## 1. Enable GitHub Pages

Repository → Settings → Pages → **Source: GitHub Actions**.

Do not pick "Deploy from a branch" — `docs.yml` uses
`actions/deploy-pages`, which requires the Actions source. The workflow
already declares the `github-pages` environment and the
`pages: write` / `id-token: write` permissions it needs.

## 2. Point DNS at GitHub Pages

For the apex domain `jtcsv.online`, create four `A` records and four
`AAAA` records at your DNS provider:

```
A     @   185.199.108.153
A     @   185.199.109.153
A     @   185.199.110.153
A     @   185.199.111.153

AAAA  @   2606:50c0:8000::153
AAAA  @   2606:50c0:8001::153
AAAA  @   2606:50c0:8002::153
AAAA  @   2606:50c0:8003::153
```

Optionally add `CNAME  www  linol-hamelton.github.io.` so `www.jtcsv.online`
redirects to the apex.

## 3. Set the custom domain

Settings → Pages → Custom domain → `jtcsv.online` → Save, then wait for
the DNS check to pass and tick **Enforce HTTPS**.

`docs/public/CNAME` already carries the domain, so every deploy re-asserts
it — the setting will not be lost when the site is rebuilt.

## 4. Seed the `gh-pages` branch (benchmark chart, optional)

`benchmark-vs-competitors.yml` publishes its history through
`benchmark-action/github-action-benchmark`, which fetches — and does not
create — a `gh-pages` branch. Seed it once:

```bash
git switch --orphan gh-pages
git commit --allow-empty -m "chore: seed gh-pages for benchmark history"
git push -u origin gh-pages
git switch main
```

Then remove the `continue-on-error: true` from the "Publish to gh-pages
chart" step so a genuine publish failure is visible again. `docs.yml`
already mirrors `gh-pages:/dev/bench` into the Pages artifact, so the
chart lands at `https://jtcsv.online/dev/bench/`.

## 5. Update the outward-facing URLs

Once the site actually answers on HTTPS, switch these from the GitHub
fallbacks to the domain — not before, or they point at nothing:

- `package.json#homepage` → `https://jtcsv.online`
- GitHub repo → Settings → **Website** field
- README badge / doc links that currently reference `github.com/...#readme`

## Social preview image

`og:image` and `twitter:image` point at `og-image.png` (1200×630), served
from `raw.githubusercontent.com` so the card resolves even before the
domain is live. Once `jtcsv.online` answers over HTTPS you can switch both
tags to `https://jtcsv.online/og-image.png`, which VitePress already
publishes from `docs/public/`.

To regenerate the PNG after editing `og-image.svg`:

```bash
node -e "
const sharp=require('sharp'),fs=require('fs');
sharp(fs.readFileSync('docs/public/og-image.svg'),{density:144})
  .resize(1200,630,{fit:'fill'}).png({compressionLevel:9})
  .toFile('docs/public/og-image.png');
"
```

Keep the SVG's own metrics conservative: its labels are sized against a
monospace advance of ~0.62em, because the `JetBrains Mono` at the head of
the font stack is absent on most machines and every rasteriser. Sizing to
JetBrains Mono is what pushed the sub-line and the third pill past their
bounds in the first place.
