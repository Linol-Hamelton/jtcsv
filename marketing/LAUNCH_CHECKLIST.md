# jtcsv launch checklist (Phase 6 W16)

The operator run-book for shipping the launch content set. Every step is
opt-in for a human — the launch is operator-driven, not automated. Read the
whole file once before T-14, then work top-to-bottom from there.

Voice is locked in `docs/POSITIONING.md` (W3) and `docs/BRAND_KIT.md` (W15).
The wedge sentence — `~18 KB gz tree-shakable subpath imports vs papaparse
~35 KB minified — half the bundle for the same workhorse` — must appear
unchanged across every surface. The Unicode arrow `JSON ↔ CSV` is the only
allowed direction notation.

## T-minus 14 days (pre-flight)

- [ ] Register jtcsv.dev domain (see docs/BRAND_KIT.md → Operator follow-up).
- [ ] Reserve social handles: @jtcsv on Bluesky, Mastodon (fosstodon.org), GitHub org. Verify Twitter/X availability.
- [ ] Upload docs/public/og-image.svg → 1200×630 PNG to GitHub repo → Settings → Social preview.
- [ ] Switch GitHub Pages source to "GitHub Actions" (Settings → Pages). DOCS M7 deploy workflow is ready.
- [ ] Read all 5 launch-content drafts under marketing/ and edit voice per docs/BRAND_KIT.md.
- [ ] Set canonical_url on dev.to drafts to the eventual jtcsv.dev/blog/<slug> URL.
- [ ] Spot-check every draft for banned words (Complete, Powerful, Modern, Lightning-fast, Seamless, Cutting-edge, Robust, Cool, Awesome). Replace with numbers.
- [ ] Verify every bundle-size mention says `~18 KB gz` — never bare `18 KB`, never `~18 KB minified`. Papaparse comparison must say `~35 KB minified`.
- [ ] Verify direction notation is `JSON ↔ CSV` (Unicode arrow) everywhere, never `CSV/JSON` or ASCII `<->`.
- [ ] Verify subpath count reads `9 subpaths` and age reference (if used) reads `~5 months old`.
- [ ] Confirm the codemod invocation example matches: `npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'` (single-quoted glob).

## T-minus 7 days (gating tests + tag)

- [ ] Verify all green:
  - npm run test:unit
  - npm run tsc:check
  - npm run tsc:check-strict:count
  - npm run test:packages
  - npm run audit:regex
  - npm run prerelease:check (current: stable)
  - npm run examples:smoke
  - npx vitepress build docs
- [ ] Run the full release rehearsal from RELEASING.md → Beta channel.
- [ ] If shipping 3.3.0 stable (not just the beta), exit prerelease mode: `npx changeset pre exit` and re-run `changeset version` to get a clean 3.3.0.
- [ ] Verify the GitHub Pages deploy on the docs.yml workflow is green.
- [ ] Confirm `821 unit tests + 49 package tests = 870 total tests` still matches `npm run test:unit` + `npm run test:packages` output. Update content if drift.
- [ ] Confirm `~68% lines` still matches `npm run test:coverage` summary. Adjust copy if drift.
- [ ] Sister-package staging check — confirm `jtcsv-excel 2.1.0`, `jtcsv-react 0.1.0`, `jtcsv-vue 0.1.0`, `jtcsv-codemod 0.2.0` are queued on the `next` dist-tag and NOT yet on `latest`.

## T-minus 1 day

- [ ] Final read-through of marketing/dev-to/*.md and marketing/blog/*.md.
- [ ] Capture the actual bundle-size number from `npm run size` and update any "~18 KB" mentions to the EXACT measured number if it has drifted.
- [ ] Schedule the dev.to drafts (don't publish yet) — dev.to allows scheduled posts.
- [ ] Prep the announce-toot / announce-skeet text in marketing/social/ — keep them short.
- [ ] Verify the HN account has > 30 days of activity. Brand-new accounts get auto-flagged on Show HN.
- [ ] Verify each Reddit account has positive karma in the target sub. r/javascript and r/node enforce subreddit-karma minimums.
- [ ] Pin a top-level "I'm the author, AMA on jtcsv" comment draft under each post draft file. First-comment-from-OP is the lowest-friction way to start a thread.

## Launch day — order matters

Recommended posting order (tested by people who've launched on HN before):

**Day 0, 06:00 UTC (08:00 CEST / 22:00 PT prev day)**
- [ ] npm publish (or merge the version PR — CI runs the publish).
- [ ] Verify via `npm view jtcsv@latest` (or @next if beta).
- [ ] Run `scripts/verify-release.js <version>` — all 6 checks must pass.
- [ ] Confirm Sigstore provenance shows on the npm page (the "provenance" pill below the version number).
- [ ] Smoke-install in a clean temp dir: `mkdir /tmp/jtcsv-launch && cd /tmp/jtcsv-launch && npm init -y && npm install jtcsv && node -e "const j = require('jtcsv'); console.log(j.csvToJson('a,b\\n1,2'))"`.

**Day 0, 14:00 UTC (07:00 PT)**
- [ ] Post to Hacker News — use marketing/hn/launch-post.md verbatim.
- [ ] Submit project URL; first comment with the body draft.
- [ ] Reply to early comments within 30 min — first hour is the make-or-break window.
- [ ] Watch the new/ranked transition. If the post is on page 2 of /new after 20 min with no upvotes, the title isn't pulling — don't repost, just let it ride.

**Day 0, 16:00 UTC (09:00 PT)**
- [ ] Post r/javascript using marketing/reddit/r-javascript.md.
- [ ] Use the "Show & Tell" or "Project" flair if the sub requires one.

**Day 0, 17:00 UTC (10:00 PT)**
- [ ] Post r/node using marketing/reddit/r-node.md (1-hour gap from r/javascript so Reddit doesn't shadow-throttle the same project across subs in 15 min).

**Day 0, 18:00 UTC (11:00 PT)**
- [ ] Post r/typescript using marketing/reddit/r-typescript.md.

**Day 0, evening**
- [ ] Publish dev.to article 1 (migration codemod).
- [ ] Cross-link from the HN comment thread (only if HN is still alive).
- [ ] Tag the dev.to post with `javascript`, `typescript`, `webdev`, `node` — four tag maximum.

**Day 1**
- [ ] Publish dev.to article 2 (~18 KB gz bundle architecture).
- [ ] Check HN ranking + Reddit upvote ratios from Day 0. Reply to anything that landed overnight.

**Day 3**
- [ ] Publish dev.to article 3 (CSV injection by default).
- [ ] Skim r/programming and Hacker News /newest for spillover threads. Only comment if the thread is on-topic — don't seed.

**Day 7**
- [ ] Publish the comparison long-form (marketing/blog/jtcsv-vs-papaparse-vs-csv-parse.md) on jtcsv.dev/blog/ AND mirror to dev.to with canonical_url pointing at jtcsv.dev.

## What NOT to do

- DON'T post on a Friday afternoon — HN/Reddit go quiet over weekends.
- DON'T ask for upvotes anywhere. Both HN and Reddit detect and downrank this.
- DON'T post the same content verbatim across multiple subs — Reddit treats cross-posts as spam unless you use the "crosspost" button.
- DON'T reply defensively to negative comments. Acknowledge, fix in next release, link to the issue.
- DON'T claim numbers that aren't in CHANGELOG/README/POSITIONING. The wedge holds if the supporting facts hold.
- DON'T promise unreleased features. The product is what shipped through Phase 5; `3.3.0-beta.0` is staged but the launch copy must not over-claim.
- DON'T mention starting downloads (`14 weekly`) unless framing it explicitly as the honest W0 baseline. Vague "growth" claims read as inflation.
- DON'T cite "thousands of users" or invent testimonials. The honesty in POSITIONING.md is the credibility moat.
- DON'T add tracking pixels or referral parameters to the URLs you share. Plain `https://jtcsv.dev/...` reads better and survives copy-paste.
- DON'T edit a Reddit/HN post body after it has upvotes — the timestamp moves you off the front of /new.

## Metrics to watch

- npm weekly downloads (npmjs.com/package/jtcsv → Downloads tab). Baseline at W0 = 14/week.
- GitHub stars. Vanity but useful for HN credibility threshold.
- HN points + position on the front page (T+1h, T+3h, T+6h checkpoints).
- Reddit upvote ratio (under 70% means content didn't land — read the comments).
- dev.to reactions + reading time.
- Sigstore-attested install counts on the `latest` and `next` dist-tags — sanity check that consumers are pulling stable, not the beta by accident.
- Issue tracker velocity. A 10× spike on the day of launch is normal; a 0× spike usually means nobody read past the title.

## Decision criteria — abort vs continue

The launch is reversible up to the point of the HN submission. Use these
gates:

- HN /new for 30 min with 0 points + 0 comments → the title isn't landing. Do NOT resubmit; let it scroll. The Reddit posts can still go (they're independent audiences).
- HN front page top-30 by T+1h → ride it. Cancel the r/typescript queue if the conversation is already saturating r/javascript; one big thread beats three small ones.
- HN flagged or [dead] → post to the contact form once, then move on. Do not create a second account to re-post.
- `npm view jtcsv@latest version` mismatch with intended release → STOP. Roll back per RELEASING.md → "Hard rollback" before doing any social posting.

## After launch (T+30 days)

- [ ] Write a "30 days later" reflection. Honest post about what worked and what didn't.
- [ ] Triage every issue + PR that landed during the launch.
- [ ] Audit the wedge claims — has anyone found a methodology mistake? Fix POSITIONING.md if so.
- [ ] Decide on Phase 7 priorities based on actual user feedback.
- [ ] Re-measure bundle size and coverage. If `~18 KB gz` or `~68% lines` has drifted by more than 5%, update README + POSITIONING.md and note the change in the next CHANGELOG entry.
- [ ] Snapshot the weekly download chart at T+7, T+14, T+30. Save the PNGs in `marketing/metrics/` so the next launch retrospective has a clean before/after.

## Reference — locked facts (DO NOT contradict in copy)

These come from CHANGELOG.md / package.json / Phase 1–5 work. Every draft
under marketing/ MUST be consistent with them. If reality drifts, update
the facts here AND the source files together — never just the copy.

- Core version: `3.2.3` stable; `3.3.0-beta.0` staged on the npm `next` dist-tag.
- Tests: `821 unit tests + 49 package tests = 870 total tests`.
- Coverage: `~68% lines` (orange band, honest baseline).
- Sigstore-signed provenance on every release ≥ 3.0.
- SHA-pinned GitHub Actions (16 actions), Dependabot weekly, OpenSSF Scorecard nightly.
- Three formats in one package — CSV, NDJSON, TSV — all first-class via subpath imports.
- Worker threads (Node) opt-in via `useWorkers`; Web Workers (browser) via the `jtcsv-workers` subpath.
- CSV injection guard ON by default (`preventCsvInjection: true` covers `=`, `+`, `-`, `@` per OWASP CSV Formula Injection).
- Migration codemod: `npx jtcsv-codemod papaparse|csvtojson` rewrites imports + call sites.
- Sister packages staged for npm publish on the `next` dist-tag: `jtcsv-excel 2.1.0`, `jtcsv-react 0.1.0`, `jtcsv-vue 0.1.0`, `jtcsv-codemod 0.2.0`.

## File inventory

The launch content lives under `marketing/`:

```
marketing/
  LAUNCH_CHECKLIST.md            ← this file, the run-book
  dev-to/
    01-migrating-from-papaparse.md
    02-shipping-csv-under-18kb.md
    03-csv-injection-default-on.md
  hn/
    launch-post.md
  reddit/
    r-javascript.md
    r-node.md
    r-typescript.md
  blog/
    jtcsv-vs-papaparse-vs-csv-parse.md
```

Every draft references `docs/BRAND_KIT.md` for voice and
`docs/POSITIONING.md` for the wedge framing. If a draft contradicts
either of those, the source docs win.

## Per-surface posting notes

Each surface has its own quirks. Treat these as defaults; deviate only
with cause.

### Hacker News

- Title format: `Show HN: jtcsv – ~18 KB gz JSON ↔ CSV with subpath imports` (≤80 chars, hyphen separator, Unicode arrow). The `Show HN:` prefix is required for the Show category. Do NOT add emoji.
- URL field: link to `https://jtcsv.dev` (or the GitHub README until the domain is live). Do NOT link directly to npm — HN downranks "marketing" pages.
- First comment: the body of `marketing/hn/launch-post.md` verbatim, posted from the OP account within 60 seconds of submission. This is the conversation anchor.
- Reply policy: every comment in the first 90 minutes. After that, every top-level comment, plus replies that ask a direct question. Don't argue style preferences.
- Edits: HN allows title edits for 2h, body edits for ~1h. Fix typos within the window; don't restructure the post.

### Reddit (r/javascript, r/node, r/typescript)

- r/javascript flair: "Showoff Saturday" if posting on a Saturday; otherwise "I made this" or the closest equivalent. Check the sub's current flair list — it rotates.
- r/node tolerates direct links to GitHub but prefers a writeup. Mirror the body of `marketing/reddit/r-node.md` into a self-post, then put the GitHub URL in the first paragraph.
- r/typescript wants type-system content. Lead with the strict-TS baseline (0 errors locked) and the typed subpath imports, not the bundle size.
- Comment seeding: post the "I'm the author" comment immediately after submission, then wait. Don't reply to your own post to bump it.

### dev.to

- Tag with `javascript`, `typescript`, `webdev`, `node` — four-tag maximum. Skip `tutorial` unless the article is step-by-step.
- Cover image: 1000×420 PNG from the brand kit. The og-image SVG renders well at that ratio.
- `canonical_url`: set to `https://jtcsv.dev/blog/<slug>` once the domain is live. If the blog isn't live yet, leave it unset and add it later — dev.to honors edits.
- Series: group the three dev.to posts under a "jtcsv launch" series so readers find the next article.

### jtcsv.dev/blog (self-hosted long-form)

- The comparison post lives here primarily. dev.to gets a mirror with `canonical_url` pointing back, so search engines credit the canonical.
- Use the VitePress blog template wired in W6. Keep the file under `docs/blog/<slug>.md`.
- Internal links to `/api/csv` etc. should be relative so the staging deploy doesn't 404.

## Risk register

Known risks for the launch window, with mitigations:

- **Sigstore log lag.** `npm audit signatures` occasionally fails for 5–10 min after publish. Mitigation: wait + re-run; don't unpublish.
- **dev.to scheduled-publish silently failing.** Mitigation: set the scheduled posts 24h in advance, log in 1h before the scheduled time to confirm they're queued.
- **HN account shadow-ban.** If the `Show HN` post never appears under `/show`, the account is shadow-banned. Mitigation: contact hn@ycombinator.com once, then accept the outcome. Do not create alts.
- **Reddit automod removes the post.** Mitigation: each sub's automod rules are public — read them before posting. r/javascript blocks new accounts and link-only posts.
- **Bundle drift between copy and reality.** Mitigation: re-run `npm run size` at T-1; if the gzipped size has moved outside `17.5–18.5 KB`, update every "~18 KB gz" mention in the launch copy AND in `docs/POSITIONING.md` BEFORE posting.
- **Coverage drift.** If `npm run test:coverage` reports under 65% lines, hold the launch and investigate. The "~68%" claim is the credibility floor.

## Communication channels during launch

- Primary: the GitHub issue tracker. Pin a "Launch day — report issues here" issue at T-0.
- Secondary: the HN/Reddit threads themselves. Respond in-place.
- Tertiary: feldhausthorsen@gmail.com for anything sensitive (security reports, vendor outreach).
- Status page: a simple `/status` page on jtcsv.dev that says "all green" or "investigating <issue>". One-line edits via the docs repo.

## Rollback paths during launch

If something breaks AFTER the launch goes live, time matters. Use this:

1. **Bad tarball on npm, < 72h.** Hard-rollback per RELEASING.md → "Hard rollback". Edit the HN/Reddit posts to note "withdrawn, fix in 3.3.1 shortly" — don't delete the threads.
2. **Bad tarball on npm, > 72h.** Soft-rollback (deprecate + ship a patch). The launch posts stay; add a top-level comment linking to the patched version.
3. **Bad copy on launch surfaces.** Edit the post within the platform's edit window. Outside the window, add a comment correction — do NOT delete and re-post.
4. **Vulnerability disclosed in the launch window.** Stop active promotion. Publish the patch first, then resume per the dev.to schedule.

The wedge stays the wedge regardless of which path you're on:
`~18 KB gz tree-shakable subpath imports vs papaparse ~35 KB minified —
half the bundle for the same workhorse`. If the wedge is wrong, fix
POSITIONING.md before the next launch — never sand it down.

## Talking points (cribsheet for live replies)

Pre-baked, voice-locked answers for the questions that always come up
on HN/Reddit during a parser launch. Quote these directly; don't
improvise.

- **"Why another CSV library?"** — Three formats in one package — CSV, NDJSON, TSV — via 9 subpaths. `import { csvToJson } from 'jtcsv/csv'` costs `~18 KB gz`. papaparse is `~35 KB minified` for the same workhorse. Zero runtime deps in core.
- **"How does it compare to csv-parse / fast-csv?"** — See marketing/blog/jtcsv-vs-papaparse-vs-csv-parse.md. Methodology is in the post. Numbers came from the CI bench on every push to main.
- **"Why should I trust a ~5 months old library?"** — 870 total tests (821 unit + 49 package), ~68% lines coverage, Sigstore-signed provenance on every release ≥ 3.0, SHA-pinned GitHub Actions, OpenSSF Scorecard nightly. Honest baseline, ratcheting up.
- **"Browser support?"** — `jtcsv/browser` subpath; `jtcsv-workers` subpath for Web Workers. Node 18.17+ on the server side, ES2022 target.
- **"Streaming?"** — Yes: `jtcsv/streams`. Worker threads (Node) opt-in via `useWorkers`; thresholded so small inputs stay sync.
- **"Security?"** — CSV injection guard ON by default. `preventCsvInjection: true` covers `=`, `+`, `-`, `@` per OWASP CSV Formula Injection. Web-server module is dev-only (see ADR-002).
- **"Migration from papaparse?"** — `npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'`. The codemod also covers `csvtojson` call sites.
- **"License?"** — MIT.
- **"How do I report a bug?"** — github.com/<org>/jtcsv/issues, or feldhausthorsen@gmail.com for anything security-sensitive.

## Sign-off — author checklist

Before pressing publish on the HN/Reddit posts, the operator confirms:

- [ ] All 870 tests green on `main`.
- [ ] `~18 KB gz` matches today's `npm run size` output (±0.5 KB).
- [ ] `~68% lines` matches today's coverage report (±2%).
- [ ] Sigstore provenance shows on the npm page.
- [ ] The wedge sentence is byte-identical across HN / Reddit / dev.to / blog.
- [ ] No banned words anywhere in the copy.
- [ ] `JSON ↔ CSV` direction notation everywhere; no `CSV/JSON`, no ASCII `<->`.
- [ ] No fabricated user counts, no invented testimonials, no unreleased features promised.

If all eight boxes are ticked, the launch is go.

## Appendix A — timing rationale

Why 14:00 UTC for HN? It's 07:00 PT, the earliest the US west-coast
HN audience reads in volume, and 16:00 CEST — still inside the
European workday. Posts that go up before 06:00 PT tend to age out of
/new before the front-page algorithm sees enough early upvotes.

Why a 1-hour stagger between r/javascript and r/node? Reddit's
spam-detection lumps simultaneous cross-sub posts into a single
fingerprint. A 60-min gap is the smallest interval that's
consistently treated as separate submissions.

Why publish dev.to articles on Day 0 evening, Day 1, Day 3, Day 7?
Each article needs its own ranking cycle on dev.to (~24h to peak).
Stacking them on the same day fragments attention; spreading them
out compounds the launch into a week of consistent presence.

## Appendix B — content drift policy

The launch content was written against the locked facts as of W16.
If `npm run size`, `npm run test:unit`, or `npm run test:coverage`
output drifts BEFORE the launch:

1. Update `docs/POSITIONING.md` first — that's the canonical source.
2. Update `docs/BRAND_KIT.md` if the voice/tone copy needs to follow.
3. Re-run the T-7 gates.
4. Search-and-replace in every `marketing/**/*.md` for the affected
   number. The wedge sentence is the single highest-priority match.
5. Re-read the launch posts top-to-bottom once more.

DO NOT skip step 4 on the assumption that "it's close enough". The
credibility of the launch rides on the numbers matching reality.

## Appendix C — what success looks like

The honest baseline at W16 is:

- npm weekly downloads: ~14 (W0 starting state).
- GitHub stars: low double digits.
- HN: zero past Show HN attempts; clean slate.

A successful launch by Phase 6 W20 (T+30):

- npm weekly downloads: 100–1000 range. Anything above is a bonus,
  anything below means the title/positioning needs another pass.
- GitHub stars: 200–1000 range. Below 100 = the wedge didn't land
  with the HN audience. Above 1000 = the wedge landed and the
  Phase 7 roadmap should accelerate.
- Issue tracker: 10–40 issues opened, ~70% of them legitimate
  (the rest noise / duplicates).
- Coverage trend: still ≥ 68% lines. New tests added during the
  launch window should not regress the coverage band.

If the launch lands flat (stars under 50, downloads under 30/week
by T+30), don't repost the same content — re-cut the wedge and
ship a second launch in Phase 7 with a sharper hook. The locked
facts won't change; the framing might.
