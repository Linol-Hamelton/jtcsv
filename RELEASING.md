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
