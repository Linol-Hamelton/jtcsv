# Recipe 10: CLI automation and batch processing
Current version: 3.1.0

## Goal
Automate CSV/JSON conversion in scripts and CI.

## Batch conversion
```bash
# Convert all CSV files to JSON in a folder
npx jtcsv batch csv-to-json "data/*.csv" output/

# Convert all JSON files to CSV
npx jtcsv batch json-to-csv "data/*.json" output/
```

## Streaming CLI
```bash
# Stream JSON to CSV
npx jtcsv stream json-to-csv input.json output.csv

# Stream CSV to JSON
npx jtcsv stream csv-to-json input.csv output.json
```

## Scripted usage (Node.js)
```js
const { execSync } = require('child_process');

execSync('npx jtcsv csv-to-json data.csv output.json --parse-numbers', {
  stdio: 'inherit'
});
```

## Optional TUI
```bash
npx jtcsv tui
```

## Notes
- Use `--dry-run` to validate commands without writing files.
- See `docs/CLI.md` for full options.

## Navigation
- Previous: [Database import/export with Prisma](09-database-import-prisma.md)
