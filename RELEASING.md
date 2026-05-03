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
To cut it from your machine:

```bash
# 1. Sanity check what changesets sees
npx changeset status

# 2. Apply the version bumps + write CHANGELOG.md entries.
#    This modifies every package.json that has a pending changeset
#    AND consumes (deletes) the .changeset/*.md files.
npm run release:version

# 3. Review the diff. Pay attention to the peer-dep ranges in the
#    @jtcsv/* sub-packages: changesets will widen `^3.1.0 || ^4.0.0`
#    to `^3.2.0 || ^4.0.0` automatically since the parent bumped.
git diff

# 4. Commit
git add -A
git commit -m "chore: version packages for 3.2.0"

# 5. Build + run all gates one more time
npm run build
npm test
npm run size
npm run tsc:check-strict:count

# 6. Publish. With NPM_CONFIG_PROVENANCE=true, every package gets a
#    Sigstore attestation; consumers can verify with
#    `npm audit signatures`.
NPM_CONFIG_PROVENANCE=true npm run release:publish

# 7. Tag and push
git tag jtcsv@3.2.0
git push origin main --tags
```

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

```bash
npm view jtcsv@3.2.0 dist
npm audit signatures jtcsv@3.2.0
# expected: "audited 1 package... all signatures verified"
```

The Sigstore transparency log entry for each package is linked from
its npm page (the "provenance" pill below the version number).

## Rollback

If a published version is broken:
- Within 72h, you can `npm unpublish jtcsv@3.2.0` (npm allows
  unpublish of versions less than 72h old; after that, contact npm
  support).
- Otherwise: bump 3.2.1 with the fix and `npm deprecate jtcsv@3.2.0
  "broken: see CHANGELOG.md"`.
