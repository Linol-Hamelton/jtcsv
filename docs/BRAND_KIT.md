---
title: Brand Kit
description: Logo usage, color tokens, typography, voice, and the surfaces where jtcsv brand assets live.
---

# jtcsv Brand Kit

> Last updated: Phase 5 Week 15. The mark is hand-authored in SVG and ships under docs/public/ — no external designer cycle was used for the 0.x cut. A designer iteration is planned for Phase 6 once domain + social handles are confirmed.

## Wordmark

The name is **jtcsv**, always lowercase. Never "JTCSV", "JtCsv", "Jtcsv", or "JT-CSV". The dash separator ("JT/CSV") is also off-brand.

When paired with a tagline, use the locked POSITIONING phrasing:
> "JSON ↔ CSV toolkit for Node.js and browser. ~18 KB gz core. Streaming, NDJSON/TSV, worker threads, TypeScript-native. Zero runtime deps in core."

## Mark

The geometric mark is a rounded teal square with two horizontal row bars and a bidirectional arrow between them — visually anchoring the "two formats, one toolkit, one process" idea.

Why a rounded square: it evokes a single CSV cell (the smallest unit of the format we serve) while reading well at 16×16 as a favicon. Sharp corners read as harsher and lose the cell metaphor at small sizes.

Why two row bars + an arrow: the two bars represent the two formats (CSV row / JSON row), the bidirectional arrow is the toolkit's actual job. Anything less than two bars loses the duality; anything more than two starts to look like a tabular icon (which papaparse, csvtojson, fast-csv all use — we deliberately avoid that crowded visual space).

Files (under docs/public/):

| Asset                     | Use                                                       |
|---------------------------|-----------------------------------------------------------|
| logo.svg                  | Primary 64×64 mark. README hero, favicon SVG.            |
| logo-wordmark.svg         | Horizontal 360×72 mark + wordmark. Site header.          |
| favicon.svg               | Tight 32×32 version of the mark. Browser tab.            |
| brand-mark.svg            | Inverted (teal-on-white) for dark hero strips.           |
| og-image.svg              | 1200×630 social card. og:image, twitter:image.           |

Do NOT recreate or modify the SVGs by hand outside docs/public/ — they're the canonical source. If a raster (PNG) is needed for a venue that doesn't render SVG (some Slack previews), export from the SVG with the source as the master.

### Clear space and minimum sizes

Reserve a clear-space buffer equal to one row-bar width around the mark in every layout. Don't crowd the mark with adjacent badges, body text, or competing icons inside that buffer.

Minimum render sizes:
- Mark alone: 16×16 (favicon territory). Below 16×16 the row bars merge into a blob — use a single-letter `j` lettermark if you need 8×8.
- Mark + wordmark lockup: 120×24. Below that the wordmark becomes unreadable.

### Lockup variants

Three approved lockups. Don't invent new ones:

1. **Hero lockup** — mark left, wordmark right, baseline-aligned. Used in README hero, VitePress homepage, og-image. Mark is 2× the wordmark's cap height.
2. **Stacked lockup** — mark on top, wordmark below, centered. Reserved for narrow vertical slots (sidebar avatars, mobile splash). Mark is 1.5× the wordmark's cap height.
3. **Mark only** — for favicon, npm package icon, and any context where the surrounding UI already names the project.

## Palette

Locked colors. Don't introduce new shades without updating this table first.

| Token         | Hex      | Role                                                       |
|---------------|----------|------------------------------------------------------------|
| Primary       | #0EA5A4  | Mark fill, accent links, primary CTA backgrounds.          |
| Primary dark  | #0F766E  | Text on light surfaces, hover state, secondary accent.     |
| Primary light | #99F6E4  | Subtle backgrounds (info callout, hero card).              |
| Accent        | #F59E0B  | Warning / attention / CSV-injection-guard signal.          |
| Ink           | #0F172A  | Body text on light.                                        |
| Mist          | #94A3B8  | Muted text, dividers.                                      |
| Paper         | #FFFFFF  | Default surface.                                           |
| Card          | #F8FAFC  | Soft surface for cards / nested blocks.                    |

Contrast notes:
- Primary #0EA5A4 on Paper passes WCAG AA for large text, NOT for small (4.5:1 fails). Use Primary dark #0F766E for body links over Paper.
- Ink on Primary light passes AA for body.
- Mist #94A3B8 on Paper is dividers / muted secondary text ONLY — fails AA for body text. Never use for content the reader has to actually read.
- Accent #F59E0B on Paper is warning-state ONLY. Don't bleed it into general accent use; it dilutes the warning signal.

### CSS custom properties

Drop this into VitePress' theme override or any consumer site:

```css
:root {
  --jt-primary: #0EA5A4;
  --jt-primary-dark: #0F766E;
  --jt-primary-light: #99F6E4;
  --jt-accent: #F59E0B;
  --jt-ink: #0F172A;
  --jt-mist: #94A3B8;
  --jt-paper: #FFFFFF;
  --jt-card: #F8FAFC;
}
```

### Dark-mode mapping

For dark theme surfaces, swap surfaces but keep the brand teal in the same role:

| Light token   | Dark equivalent | Hex      |
|---------------|-----------------|----------|
| Paper         | Slate 950       | #020617  |
| Card          | Slate 900       | #0F172A  |
| Ink           | Slate 50        | #F8FAFC  |
| Primary       | Primary         | #0EA5A4  |
| Primary dark  | Primary light   | #99F6E4  |

Primary teal works on both modes without a sibling — that's by design.

## Typography

The wordmark + code listings use a monospace stack:

```css
font-family: 'JetBrains Mono', 'DM Mono', 'Fira Code', ui-monospace,
             SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

Body text inherits VitePress' default stack (Inter / system sans). Don't ship a custom webfont — perf budget.

Type-scale reference (the values VitePress already uses; documenting for parity in external surfaces):

| Role            | Size      | Weight | Color tokens              |
|-----------------|-----------|--------|---------------------------|
| Hero title      | 48 / 56px | 700    | Ink                       |
| Section title   | 32px      | 700    | Ink                       |
| Subsection      | 24px      | 600    | Ink                       |
| Body            | 16px      | 400    | Ink                       |
| Caption / meta  | 14px      | 400    | Mist                      |
| Inline code     | 14px      | 500    | Primary dark on Card      |
| Block code      | 14px      | 400    | Ink on Card               |

## Voice & writing rules

Already locked in [POSITIONING.md](/POSITIONING) — repeated here for brand surfaces (README, dev.to articles, slide decks):

1. **Numbers over adjectives.** "~18 KB gz" beats "lightweight". "Zero runtime deps in core" beats "minimal dependencies".
2. **Lock the canonical wedge phrases.** Bundle: `~18 KB gz`. Direction: `JSON ↔ CSV`. Deps: `Zero runtime deps in core`. Age: `~5 months`. Subpaths: `9`. Papaparse comparison: `~35 KB minified`. See [POSITIONING.md](/POSITIONING) for full list.
3. **No marketing-blurb adjectives.** Banned: "Complete", "Powerful", "Modern", "Lightning-fast", "Seamless", "Cutting-edge". Replace with concrete numbers or specific behaviour.
4. **Bidirectional everywhere.** Title says `JSON ↔ CSV`, not `CSV → JSON` or `CSV/JSON`.

## Surfaces & where the brand lives

| Surface                     | Source of truth                              |
|-----------------------------|----------------------------------------------|
| README.md (root)            | This repo                                    |
| docs/.vitepress/            | This repo (deploys via DOCS M7 workflow)    |
| npm description / package   | package.json#description (locked W11)        |
| Repository social preview   | GitHub repo Settings → Social preview (manual upload of og-image.png) |
| dev.to / hashnode posts     | Author them with the wordmark; no separate brand kit needed |

## Operator follow-up (W15 + Phase 6)

These items require credentials / payment / external accounts and cannot be completed automatically. Track each here and tick off when done.

- [ ] **Register jtcsv.dev domain.** Currently referenced in POSITIONING.md and CODE_OF_CONDUCT.md (security@jtcsv.dev) but not registered. Operator should register via a registrar (Cloudflare / Namecheap / Porkbun), set up DNS, point at the GitHub Pages site once DOCS M7 deploy lands. Approx cost: $15-25/year.
- [ ] **Reserve @jtcsv social handles.** Networks to claim, in priority order: GitHub org (already at `Linol-Hamelton` — consider renaming the org or creating a `jtcsv` org), Bluesky (`@jtcsv.bsky.social`), Mastodon/fosstodon (`@jtcsv@fosstodon.org`), Twitter/X (`@jtcsv` — likely squatted, check availability), npm org (`jtcsv` — currently the package owner is the personal account `fomenkoruslan`; creating an org is preferred for long-term maintenance).
- [ ] **Designer-iteration logo (Phase 6 — budgeted $300 in the original 16-week plan).** Brief any designer with this doc + the SVG mark; ask for: a refined mark addressing visual weight, an animated SVG variant for the docs hero, and a PNG raster pack at 1×/2×/3× plus 16×16 / 32×32 / 64×64 / 128×128 / 256×256 favicon sizes. Replace docs/public/ assets when delivered; don't delete the hand-crafted SVGs (keep them as fallbacks / version history).
- [ ] **Upload og-image.png to GitHub.** GitHub's social preview only accepts raster. Convert docs/public/og-image.svg to a 1200×630 PNG with any SVG-to-PNG tool (Inkscape, rsvg-convert, or browser screenshot). Upload via repo Settings → Social preview.

## Brand do's and don'ts

✓ DO use the mark + wordmark in the same lockup at the README hero level. Wordmark alone at low resolution.

✓ DO keep the mark on a white or teal-light background; the white version is for dark surfaces only (see brand-mark.svg).

✗ DON'T re-color the mark to any other hue. The teal IS the brand cue.

✗ DON'T add a tagline INSIDE the mark — taglines live in markdown next to it.

✗ DON'T add a drop shadow / gradient to the mark in 0.x. Keep it flat — designer iteration may revisit.

✗ DON'T use ASCII `<->` anywhere the brand surfaces. Always Unicode `↔`.

✗ DON'T animate the mark in 0.x. Static SVG only — the Phase 6 designer pass owns the animated variant.

✗ DON'T place the mark on a photographic background. White, teal-light, or solid-color slate only.

## Asset checklist (sister-agent handoff)

The W15 sister agent is producing these files. Verify each lands under docs/public/ before the W15 milestone ticks off:

- [ ] docs/public/logo.svg (64×64, primary mark, teal on transparent)
- [ ] docs/public/logo-wordmark.svg (360×72, mark + wordmark lockup)
- [ ] docs/public/favicon.svg (32×32, mark only, optimized for tab rendering)
- [ ] docs/public/brand-mark.svg (white-on-teal inverse for dark hero strips)
- [ ] docs/public/og-image.svg (1200×630, hero lockup + canonical tagline)

Each SVG should:
- Have a `viewBox` and no fixed `width`/`height` attributes (lets CSS size them).
- Use `<title>` and `<desc>` for accessibility (e.g., `<title>jtcsv — JSON ↔ CSV toolkit</title>`).
- Be hand-written and human-readable (no Illustrator metadata cruft).
- Validate via `svgo` (lossless pass, no `removeViewBox`).

## Integration recipes

### VitePress site header

The site header logo is wired through `themeConfig.logo` in `docs/.vitepress/config.mts`:

```ts
themeConfig: {
  logo: { src: '/logo.svg', alt: 'jtcsv' },
  siteTitle: 'jtcsv',
}
```

### Social card meta

Add to `head[]` in `docs/.vitepress/config.mts`:

```ts
head: [
  ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ['meta', { property: 'og:type', content: 'website' }],
  ['meta', { property: 'og:title', content: 'jtcsv — JSON ↔ CSV toolkit' }],
  ['meta', { property: 'og:description', content: '~18 KB gz core. Streaming, NDJSON/TSV, worker threads, TypeScript-native. Zero runtime deps in core.' }],
  ['meta', { property: 'og:image', content: 'https://jtcsv.dev/og-image.svg' }],
  ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ['meta', { name: 'twitter:image', content: 'https://jtcsv.dev/og-image.svg' }],
],
```

(The `og:image` host swaps to `jtcsv.dev` once the operator follow-up registers the domain; until then, leave as-is — most crawlers resolve relative URLs against the page origin.)

### README hero

The repo README hero references the wordmark via raw GitHub:

```md
<p align="center">
  <img src="https://raw.githubusercontent.com/Linol-Hamelton/jtcsv/main/docs/public/logo-wordmark.svg" alt="jtcsv" width="360">
</p>
```

GitHub raw-content SVGs render in README previews and on npmjs.com. Once jtcsv.dev is live, swap the src to the CDN URL for a faster fetch.

## Version history

- **W15 (this doc)** — initial brand kit lockdown. SVG mark + wordmark + favicon + og-image, palette tokens, voice rules, operator follow-up checklist.
- **W11** — npm description + README hero settled on the "~18 KB gz core / Zero runtime deps" canonical phrasing (see POSITIONING.md).
- **W6** — POSITIONING.md framework first authored: numbers-over-adjectives writing voice locked.
- **Pre-W6** — no brand discipline; README varied in tone across releases.

## Questions to resolve in Phase 6

These don't block W15 but should be answered before any external designer brief:

1. Do we want a single mark or a small "family" (e.g., a sibling mark for `jtcsv-excel`, `jtcsv-codemod`, `@jtcsv/cli`)? Current stance: single mark, sibling packages get a small text-only badge.
2. Animation: a 1-second loop on the bidirectional arrow would reinforce the message but adds weight. Defer to designer.
3. Light/dark mode auto-switching for SVGs via `prefers-color-scheme` media query inside the SVG itself — supported by modern browsers but inconsistent in GitHub-rendered Markdown. Defer.
4. Trademark posture: do we file? At < 1k weekly downloads, no. Revisit at 10k weekly. Track in a separate operator note.
