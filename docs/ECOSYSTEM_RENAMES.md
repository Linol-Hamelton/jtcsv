---
title: Ecosystem Renames
description: Master plan for renaming @jtcsv/* sibling packages to unscoped jtcsv-* and shipping them on npm.
---

# Ecosystem Renames — @jtcsv/* → jtcsv-*

## Why

The `@jtcsv` npm scope is owned by an unrelated user. Attempts to publish under `@jtcsv/<name>` would fail (or, worse, succeed only if the squatter grants access). To ship the ecosystem without depending on a scope we don't control, every sibling package renames to the unscoped form `jtcsv-<segment>`.

This is a one-way rename per package — once a name is published, it stays.

## Status (as of 2026-06-13)

| Current name              | Target name             | Version | Status            | Owner | Notes |
|---------------------------|-------------------------|---------|-------------------|-------|-------|
| jtcsv                     | jtcsv                   | 3.2.3   | shipped           | @fomenkoruslan | The core; no rename. |
| jtcsv-codemod             | jtcsv-codemod           | 0.1.1   | shipped (Week 5)  | @fomenkoruslan | Already unscoped from day one. |
| @jtcsv/excel              | jtcsv-excel             | 2.1.0   | renamed Week 9 (this milestone) | @fomenkoruslan | First @jtcsv/* → jtcsv-* migration. |
| @jtcsv/validator          | jtcsv-validator         | 2.0.0   | planned Phase 5 W13 | @fomenkoruslan | Currently private. |
| @jtcsv/tui                | jtcsv-tui               | 3.0.0   | planned Phase 5 W14 | @fomenkoruslan | Currently private. |
| @jtcsv/express-middleware | jtcsv-express           | 2.0.0   | planned Phase 5 W13 | @fomenkoruslan | Drop "-middleware" suffix; the name implies it. |
| @jtcsv/fastify            | jtcsv-fastify           | 2.0.0   | planned Phase 5 W13 | @fomenkoruslan | Note: private flag accidentally OFF — verify before any publish. |
| @jtcsv/hono               | jtcsv-hono              | 2.0.0   | planned Phase 5 W14 | @fomenkoruslan | Currently private. |
| @jtcsv/nestjs             | jtcsv-nestjs            | 2.0.0   | planned Phase 5 W14 | @fomenkoruslan | Currently private. |
| @jtcsv/nextjs             | jtcsv-nextjs            | 2.0.0   | planned Phase 5 W14 | @fomenkoruslan | Currently private. Directory is plugins/nextjs-api. |

Future-reserve (404 on npm as of audit, available for our use):
- jtcsv-react · jtcsv-vue · jtcsv-svelte · jtcsv-angular · jtcsv-next · jtcsv-stream · jtcsv-cli · jtcsv-types

## Per-package checklist

Each rename requires a coordinated set of edits. Use this checklist for every package:

1. **package.json**
   - Change `name` from `@jtcsv/<x>` to `jtcsv-<x>`.
   - Remove `private: true` (or set to `false`).
   - Bump version (treat the rename as a feature release — minor bump from the prior @jtcsv/* version).
   - Loosen `peerDependencies.jtcsv` to `^<current-major>.<current-minor>.0 || ^<next-major>.0.0`.
   - Add `engines.node: ">=18.17"`.
   - Add `type: "commonjs"` explicitly.
   - Ensure `files` array includes `README.md`, `CHANGELOG.md`, `LICENSE`.
   - Confirm `publishConfig: { access: "public", provenance: true }` is present.

2. **Source code**
   - Replace any `require('../../../dist/index.js')` / `require('../../../index.ts')` with `require('jtcsv')`.
   - Replace any `require('../../../src/<x>')` either by inlining the dependency into the package or by exporting from `jtcsv` and re-importing.
   - Run `npm pack --dry-run` and inspect — anything referencing the parent monorepo path will break.

3. **LICENSE** — copy the root LICENSE into the package dir (npm requires a file, not just the field).

4. **CHANGELOG.md** — add a `## <version> (yyyy-mm-dd)` entry listing the rename and any other changes.

5. **README.md** — replace install instructions, badge URLs, "Why" hook, and any references to the old name. Document a brief migration section for anyone who had the @jtcsv/* private prerelease.

6. **Tests** — minimum: a smoke suite that imports the public surface and exercises every exported entry. Wire `jest` + `ts-jest` + the package's runtime deps into `devDependencies`.

7. **Changeset**
   - Create `.changeset/<package-name>-<version>.md` with the rename note.
   - Verify `.changeset/config.json#ignore` does NOT list the new unscoped name; remove the @jtcsv/* form if present.
   - Run `npm run verify:changeset-ignore` from the repo root.

8. **Verify**
   - `cd <package-dir> && npm test` → green.
   - `cd <package-dir> && npm pack --dry-run` → inspect: only intended files, dist size < 1 MB unless documented.
   - At repo root: `npm run tsc:check` and `npm run test:unit` must remain green.

9. **Publish** (done from CI by the release pipeline; manually only in emergency):
   - The changeset auto-bumps to the version in the changeset file.
   - Release workflow runs `npm publish --provenance` for each.

## Known traps

- **`@jtcsv/fastify` is currently `private: false`** in the working tree. This was a slip — it has never been published (404 on npm). Before any of the parallel renames lands, the `private:false` MUST be reviewed: either confirm publish-readiness, or flip it back to `private: true` until the rename happens.

- **plugins/nextjs-api directory name** does NOT match the package name (which is `@jtcsv/nextjs`). Keep the directory name as-is — npm publishes use the `name` field, not the dir name.

- **Workspaces array** in the root `package.json` references directories by path, NOT by package name. Renaming a package does not require any change to the root workspaces list.

- **`@jtcsv/excel`** was always private — no migration burden for users. For packages that were previously shipped privately to internal consumers, post a one-line npm DEPRECATE notice on the @jtcsv/* form pointing to the new name (we cannot do this for @jtcsv/excel since we never owned the scope; just document in the README that the package was renamed).

## Future considerations

- A `jtcsv-types` package containing the shared TypeScript declarations would let consumers depend on types without pulling the runtime; reserved but not scheduled.
- A `jtcsv-cli` standalone package (separate from the in-core CLI binary) is reserved for a future "thin CLI" release; not scheduled.

## Verifying availability

The full audit was run on 2026-06-13. All 15 candidate names were 404 on npm. Re-check before publishing — npm namespaces are first-come-first-served, and a delay between audit and publish opens a small window where a squatter could grab a name.

Run:
```bash
for name in jtcsv-excel jtcsv-validator jtcsv-react jtcsv-vue jtcsv-svelte jtcsv-angular jtcsv-next jtcsv-express jtcsv-fastify jtcsv-nestjs jtcsv-hono jtcsv-tui jtcsv-stream jtcsv-cli jtcsv-types; do
  npm view "$name" 2>&1 | head -1
done
```
