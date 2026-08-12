# Releasing jtcsv

Releases are managed by [changesets](https://github.com/changesets/changesets).
Every released package is signed with [npm provenance](https://docs.npmjs.com/generating-provenance-statements).

## Day-to-day: recording an intent

When you make a change a consumer would care about (new API, bug fix,
deprecation), record a changeset alongside the PR:

```bash
npx changeset
```

The interactive prompt asks which packages are affected and at what
bump level (`patch` / `minor` / `major`), then writes a markdown file
to `.changeset/`. Commit that file along with the PR.

## Cutting 3.2.0 manually

The first 3.2.0 release is tracked by `.changeset/3-2-0-release.md`.

> **Why minor on `jtcsv` but major on each `@jtcsv/*`?**
> The sub-packages bump major because their `peerDependencies.jtcsv`
> range changes from `^3.1.0 || ^4.0.0` to a tighter range — that's
> breaking for any consumer pinned to an older jtcsv. The behavior of
> the sub-package itself is unchanged. If you'd rather they stay 1.x,
> edit `.changeset/3-2-0-release.md` to mark them `patch` instead.

### Bash / sh / Linux / macOS

```bash
npx changeset status
npm run release:version
git diff
git add -A && git commit -m "chore: version packages for 3.2.0"
npm run build && npm test && npm run size && npm run tsc:check-strict:count
npm run release:publish:signed     # cross-env NPM_CONFIG_PROVENANCE=true
git tag jtcsv@3.2.0 && git push origin main --tags
```

### Windows PowerShell (5.1 or 7)

PowerShell 5.1 doesn't have `&&`/`||` chain operators, and env vars are
set with `$env:NAME = '…'` rather than the bash `NAME=… cmd` prefix:

```powershell
# 1. See what's pending
npx changeset status

# 2. Apply bumps + write CHANGELOG.md (consumes .changeset/*.md).
#    NOTE: needs `$env:GITHUB_TOKEN` ONLY if your config uses
#    @changesets/changelog-github (it doesn't by default — see
#    .changeset/config.json).
npm run release:version

# 3. Review
git diff

# 4. Commit (chain via ; — every step is independent on success)
git add -A
git commit -m "chore: version packages for 3.2.0"

# 5. Run all gates one more time. Use ';' between steps; if any fails,
#    later ones still run, so check exit codes / status afterwards.
npm run build
npm test
npm run size
npm run tsc:check-strict:count

# 6. Publish with provenance. Use the cross-platform script that wraps
#    NPM_CONFIG_PROVENANCE=true via `cross-env` (works the same on PS,
#    cmd, bash):
npm run release:publish:signed

# 7. Tag and push
git tag jtcsv@3.2.0
git push origin main --tags
```

### Pre-publish checklist

Before step 6 (`npm run release:publish`), make sure:

1. **You're logged in to npm with publish access:**
   ```bash
   npm whoami           # should print your username
   npm login            # if not, log in first
   ```
2. **`NPM_TOKEN` is NOT in scope locally** (it's a CI-only thing).
   `npm publish` from your machine uses your `~/.npmrc` auth.
3. **2FA is enabled on your npm account** — npm will prompt for a code.
4. The Git working tree is clean (commit step 4 is done) and you're on
   `main` (or whatever branch you intend to tag).

### What gets published

`npm run release:publish` runs `changeset publish`, which iterates over
every workspace package whose version was bumped in step 2 and runs
`npm publish` against each. The order is deterministic (dependencies
first), so `jtcsv` publishes before `@jtcsv/express-middleware` etc.

## Cutting from CI (the normal path)

`.github/workflows/release.yml` does the above automatically:

1. Push your changeset(s) to `main`.
2. CI opens a PR titled "chore: version packages" with `npm run
   release:version` already applied.
3. Review the PR. Merge it.
4. CI publishes every bumped package with `--provenance` and creates
   a GitHub Release with the changelog body.

The CI flow uses `secrets.NPM_TOKEN` (an automation token with
publish-access) and `id-token: write` (mints the Sigstore certificate
per-publish). No other secrets are required.

## What's in the 3.2.0 changeset

- `jtcsv`: minor — bundle diet, ES2022/Node 18, subpath imports,
  worker threads, deprecation warnings, strict-TS ratchet.
- `@jtcsv/express-middleware`, `@jtcsv/fastify`, `@jtcsv/nextjs`,
  `@jtcsv/hono`, `@jtcsv/nestjs`: minor — peer-dep updated to
  `^3.1.0 || ^4.0.0`, framework version ranges widened, provenance enabled.
- `@jtcsv/excel`, `@jtcsv/tui`, `@jtcsv/validator`: minor — same
  peer-dep + provenance treatment.

`@jtcsv/codemod` is **not** in this changeset because it's a brand-new
0.1.0 package that ships independently — its first publish is just
`cd packages/jtcsv-codemod && npm publish --provenance` (or via the
same CI release flow once it gets its own changeset).

## Verifying a release after publish

The automated check runs six diagnostics in one command:

```bash
npm run verify:release           # uses package.json#version
npm run verify:release 3.2.2     # check a specific version
```

It checks:

1. `npm view jtcsv@<v>` resolves — the version actually published.
2. `dist.fileCount` and `dist.unpackedSize` match `npm pack --dry-run`
   for the local working tree (±3 file slack, ±2 KB slack).
3. `dist.signatures` is non-empty (Sigstore attestation present).
4. `npm audit signatures jtcsv@<v>` exits 0 in a clean temp directory.
5. `bin/jtcsv.ts` VERSION constant matches the version under test.
6. `CHANGELOG.md` has a `## <v>` heading.

If all green: ship-it. If any fail: see "Rollback procedure" below.

Manual smoke test in a clean environment (5 min):

```bash
mkdir /tmp/jtcsv-smoke && cd /tmp/jtcsv-smoke
npm init -y
npm install jtcsv
node -e "const j = require('jtcsv'); console.log(j.csvToJson('a,b\\n1,2'))"
# expected: [{ a: '1', b: '2' }]
```

The Sigstore transparency log entry for each package is linked from
its npm page (the "provenance" pill below the version number).

## Rollback procedure

A rollback decision happens within a 72-hour window — npm allows
`npm unpublish` only on versions less than 72 hours old. After that,
the tarball is permanent on the registry and you must use deprecation
+ a fixed follow-on release instead.

### Decision tree

```
Did `npm run verify:release` fail?
├── No → fine; the release stands.
└── Yes → which check failed?
    ├── "Registry resolves" failed
    │     → publish step never reached npm (likely auth/network).
    │     → No rollback needed. Re-run the workflow.
    │
    ├── "Sigstore signatures" empty
    │     → provenance never attached. Likely missing id-token:write
    │       on the workflow, or NPM_CONFIG_PROVENANCE=false.
    │     → If within 72h: unpublish, fix the workflow, re-publish.
    │     → If after 72h: ship a fixed 3.x.(x+1) and deprecate the
    │       unsigned one.
    │
    ├── "File count drift" or "Unpacked size drift" failed
    │     → tarball does not match the source tree. Likely cause: a
    │       file got into dist/ that should not have, OR build was
    │       skipped. Compare `npm pack --dry-run --json` locally vs
    │       `npm view jtcsv@<v> dist.fileCount` to see the delta.
    │     → If within 72h: unpublish + re-publish with clean dist.
    │
    ├── "bin/jtcsv.ts VERSION" mismatch
    │     → the version-sync step did not run. The CLI's --version
    │       output is wrong but the library still works.
    │     → DON'T unpublish for this alone. Ship a patch with the
    │       sync wired correctly.
    │
    └── "npm audit signatures" failed in the temp dir
          → registry returned the tarball but signature verification
            errored. Likely transient (Sigstore log lag). Wait 10 min,
            re-run. If persistent, contact npm support.
```

### Hard rollback (within 72h)

```bash
# unpublish — destructive, blocks the version forever on npm
npm unpublish jtcsv@<v> --force

# verify it's gone
npm view jtcsv@<v>     # should error with E404

# delete the matching git tag locally + on origin
git tag -d jtcsv@<v>
git push origin :jtcsv@<v>

# delete the GitHub release page
gh release delete jtcsv@<v> --yes
```

### Soft rollback (>72h, or sub-package was depended on)

```bash
# Mark the bad version as deprecated. Consumers installing it will
# see the message in `npm install` output.
npm deprecate jtcsv@<v> "broken: see CHANGELOG.md for <next-version>"

# Ship the fix as the next patch — Phase 0 of every release-cycle is
# version-sync + verify, so this never compounds.
```

### What to NOT do

- **Don't unpublish a version that anyone already installed.**
  Within 72h, unpublish removes the tarball but leaves dependent
  lockfiles broken. Prefer deprecate + new patch if `npm view
  jtcsv@<v>` shows download stats.
- **Don't republish the same version number** (npm blocks it
  permanently — that's deliberate, do not request manual override
  from npm support unless absolutely necessary).
- **Don't skip the verify step** to "save time" — every release-cycle
  step is cheap; the cost of a broken release is hours of cleanup.

## Beta channel (next dist-tag)

Stable releases of `jtcsv` flow over the default `latest` dist-tag —
that's what `npm install jtcsv` resolves to. Beta releases use the
parallel `next` dist-tag, so adventurous consumers can opt in without
disturbing anyone who pins to `latest`.

### Consumer install commands

> **No beta has been cut yet.** The registry currently carries only
> `latest`, so `npm install jtcsv@next` fails until the first beta ships.
> The sequence below is the process, not a description of live state.

A consumer who wants to try a beta once one exists:

```bash
# install the highest version tagged `next`
npm install jtcsv@next

# see every dist-tag the registry knows about
npm dist-tag ls jtcsv
# latest: 3.2.3
# next:   3.3.0-beta.0   <- example output, once a beta is published
```

The package on disk is the same shape as a stable release — same
entry points, same provenance attestation, same Sigstore signature.
Only the dist-tag and the `-beta.N` suffix differ.

### Operator workflow (cutting a beta)

The full sequence from a clean `main` to a published `3.3.0-beta.0`:

```bash
# 1. Enter prerelease mode. This writes .changeset/pre.json which
#    tells `changeset version` to add the -beta.N suffix and tells
#    `changeset publish` to use --tag next.
npx changeset pre enter next

# 2. Record any new changesets for behaviour the beta introduces.
#    (Same UX as a normal release — interactive prompt.)
npx changeset

# 3. Apply bumps. With pre.json present, this produces e.g.
#    3.3.0-beta.0 (or 3.3.0-beta.1 if a beta already exists).
npm run release:version:beta

# 4. Sanity-check what got written.
git diff
git diff CHANGELOG.md
```

```bash
# 5. Commit and push. CI takes over from here.
git add -A
git commit -m "chore(release): 3.3.0-beta.0"
git push origin main
```

CI (`.github/workflows/release.yml`) detects the version bump, runs
the full gate (build + tests + size + tsc) and invokes
`release:publish:beta`, which is `changeset publish --tag next`. The
tarball is published with `--provenance` exactly like a stable
release.

Once CI is green, verify from a separate shell:

```bash
# confirm the dist-tag landed
npm view jtcsv@next version
# 3.3.0-beta.0

# run the post-publish checks against the beta version
node scripts/verify-release.js 3.3.0-beta.0
```

Check 6 (CHANGELOG heading) uses a whitespace-or-EOL lookahead, so a
stable `## 3.3.0` heading does NOT accidentally match when we're
verifying `3.3.0-beta.0`.

### Graduating beta to stable

When the beta is ready to become the official `3.3.0`:

```bash
# Exits prerelease mode. The next `changeset version` will drop the
# -beta.N suffix and re-stage the queued changesets as a normal bump.
npx changeset pre exit

npm run release:version           # writes 3.3.0
git add -A && git commit -m "chore(release): 3.3.0"
git push origin main
```

CI publishes 3.3.0 to `latest` and the `next` tag is left pointing at
the last beta until the next prerelease cycle moves it forward.

### Testing a beta as a consumer

Smoke-test the beta in a clean directory before announcing it:

```bash
mkdir /tmp/jtcsv-beta-smoke && cd /tmp/jtcsv-beta-smoke
npm init -y
npm install jtcsv@next
node -e "const j = require('jtcsv'); console.log(j.csvToJson('a,b\\n1,2'))"
# expected: [{ a: '1', b: '2' }]
```

If `csvToJson` throws, or if `require('jtcsv')` is missing an export
that 3.2.x had, the beta is broken — yank with `npm dist-tag rm jtcsv
next` rather than unpublishing (the version stays on the registry,
but no consumer running `npm install jtcsv@next` will pick it up).

### Pre-publish guardrail

`prepublishOnly` runs `npm run prerelease:check` before the test
suite. The script reads `package.json#version` and asserts:

```bash
npm run prerelease:check
# [prerelease:check] OK — version=3.2.3, mode=stable (latest)
```

Failure modes the guardrail catches:

- Version is `3.3.0-beta.0` but `.changeset/pre.json` is missing →
  `changeset publish` would tag this as `latest`, breaking everyone
  pinned to `latest`. Fix: `npx changeset pre enter next`.
- Version is `3.3.0` (clean) but `.changeset/pre.json` is still
  present → `changeset publish` would tag the stable release as
  `next`, hiding it from `npm install jtcsv`. Fix: `npx changeset
  pre exit`.

### What a beta MAY contain

- New public APIs that are forward-compatible with the current major.
- Behaviour changes that are opt-in (new option, new function,
  feature flag).
- Performance refactors that don't alter observable output.
- Internal restructuring that is invisible to consumers (build
  reorganisation, dependency moves between dev/runtime/peer, etc.).

### What a beta MUST NOT contain

- **Breaking changes within the same major.** Betas of `3.x` exist to
  preview new `3.x` features, not to slip-stream a `4.x` worth of
  removals. Breaking changes get their own pre-major cycle (e.g.
  `4.0.0-beta.0`).
- **Silent peer-dependency floor changes.** If a beta requires Node
  20+ where stable is Node 18+, that's a breaking change for
  consumers — promote it to a `4.0.0-beta.N` instead.
- **Unsigned tarballs.** Every publish — stable or beta — goes
  through `--provenance`. There is no "quick local beta" path; if you
  need to test something locally, use `npm pack` and install the
  tarball directly, never publish unsigned.

## Operator follow-ups (Phase 5 W15 brand-visuals)

These steps require credentials / payment / external accounts and cannot be automated. See docs/BRAND_KIT.md → "Operator follow-up" for the full list:
- Register the jtcsv.dev domain.
- Reserve @jtcsv social handles (Bluesky, Mastodon/fosstodon, GitHub org, npm org).
- Upload docs/public/og-image.svg (converted to 1200×630 PNG) to GitHub repo → Settings → Social preview.
- Optional: brief a designer for an iteration on docs/public/logo.svg (~$300 budget — Phase 6 plan).

## Phase 6 W16 marketing rollout

The launch content + run-book lives under marketing/:
  dev-to/01-migrating-from-papaparse.md
  dev-to/02-shipping-csv-under-18kb.md
  dev-to/03-csv-injection-default-on.md
  hn/launch-post.md
  reddit/r-javascript.md
  reddit/r-node.md
  reddit/r-typescript.md
  blog/jtcsv-vs-papaparse-vs-csv-parse.md
  LAUNCH_CHECKLIST.md  ← READ THIS FIRST

The launch is operator-driven: marketing/LAUNCH_CHECKLIST.md has the timing, posting order, and decision criteria. Every draft references docs/BRAND_KIT.md for voice consistency.
