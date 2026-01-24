# JTCSV Command Line Interface

## Install
```bash
npm install -g jtcsv
# or
npx jtcsv --help
```

## Usage
```bash
jtcsv <command> [options] <input> <output>
```

## Commands
### json-to-csv
```bash
jtcsv json-to-csv input.json output.csv
```

### csv-to-json
```bash
jtcsv csv-to-json input.csv output.json
```

### save-json
Save JSON to a file (pretty printing optional).
```bash
jtcsv save-json input.json output.json --pretty
```

### preprocess
Preprocess JSON with deep unwrapping.
```bash
jtcsv preprocess input.json output.json --max-depth=3 --unwrap-arrays
```

### stream
```bash
jtcsv stream json-to-csv input.json output.csv
jtcsv stream csv-to-json input.csv output.json
jtcsv stream file-to-csv input.json output.csv
jtcsv stream file-to-json input.csv output.json
```

### batch
```bash
jtcsv batch json-to-csv "data/*.json" output/
jtcsv batch csv-to-json "data/*.csv" output/
```
Note: `batch process` is a placeholder and currently prints a "coming soon" message.

### tui
```bash
jtcsv tui
```

### help / version
```bash
jtcsv help
jtcsv --help
jtcsv --version
```

## Options
### Conversion options
- --delimiter=CHAR (default: ';')
- --auto-detect / --auto-detect=false
- --candidates=LIST (comma-separated, default: ;,\t,|)
- --no-headers
- --parse-numbers
- --parse-booleans
- --no-trim
- --no-fast-path
- --fast-path-mode=objects|compact
- --rename=JSON
- --template=JSON
- --no-injection-protection
- --no-rfc4180
- --max-records=N
- --max-rows=N
- --pretty

### Preprocess options
- --max-depth=N
- --unwrap-arrays
- --stringify-objects

### Streaming options
- --chunk-size=N
- --buffer-size=N
- --add-bom

### Batch options
- --recursive
- --pattern=GLOB
- --output-dir=DIR
- --overwrite
- --parallel=N

### General options
- --silent
- --verbose
- --debug
- --dry-run

### Reserved
- --schema=JSON
- --transform=JS

These two are parsed by the CLI but are not wired to any behavior yet.

## Examples
```bash
jtcsv csv-to-json data.csv output.json --parse-numbers --auto-detect
jtcsv json-to-csv data.json output.csv --delimiter=,
```
