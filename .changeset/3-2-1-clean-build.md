---
'jtcsv': patch
---

## jtcsv 3.2.1 — clean dist before build (tarball 4.1 MB → 2.4 MB)

3.2.0 shipped a 4.1 MB tarball / 125 files because rollup's
hash-named shared chunks (`dist/_shared/csv-to-json-XXXXXXXX.cjs.js`
etc.) accumulated across rebuilds without removal. Each `npm run build`
left old hash variants behind; the publish picked them all up.

Fix
- New `npm run clean` script (`rimraf dist`), wired into `build` and
  `build:prod` as the first step. Every build now starts from an empty
  `dist/` so only the latest hashed chunks ship.
- `rimraf` added as a dev dependency for cross-platform clean (cmd
  doesn't have `rm -rf`).

Result: `npm pack --dry-run`
  package size:    637.4 kB → 403.5 kB  (−37%)
  unpacked:        4.1 MB   → 2.4 MB    (−41%)
  total files:     125      → 96        (−23%)
