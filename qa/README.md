# Control test

Exercises the public surface of the **installed** package the way a consumer
does — a packed tarball in `node_modules`, not the source tree — so anything
the build or the exports map gets wrong shows up here instead of being hidden
by path aliases.

Every check asserts on the value. "Did not throw" proves nothing: the failure
mode this project has actually shipped is a function returning corrupted data
while reporting success.

```bash
npm pack
mkdir -p /tmp/jtcsv-qa && cd /tmp/jtcsv-qa
npm init -y && npm install /path/to/jtcsv-<version>.tgz
node /path/to/jtcsv/qa/control-test.js
```

Writes `report.txt` and `report.json` beside itself and exits non-zero on any
failure. `last-run.txt` in this directory is the most recent result.
