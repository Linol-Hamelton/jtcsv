# JTCSV Command Line Interface

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g jtcsv
```

### Local Installation
```bash
npm install jtcsv
# Then use with npx:
npx jtcsv [command]
```

## 🚀 Quick Start

### Convert CSV to JSON
```bash
jtcsv csv-to-json data.csv output.json
```

### Convert JSON to CSV
```bash
jtcsv json-to-csv data.json output.csv
```

### Auto-detect delimiter
```bash
jtcsv csv-to-json data.csv output.json --auto-detect
```

## 📋 Commands

### `csv-to-json`
Convert CSV file to JSON format.

**Alias:** `csv2json` (for backward compatibility)

**Usage:**
```bash
jtcsv csv-to-json <input-file> <output-file> [options]
```

**Examples:**
```bash
# Basic conversion
jtcsv csv-to-json data.csv output.json

# With custom delimiter
jtcsv csv-to-json data.csv output.json --delimiter=,

# Parse numbers and booleans
jtcsv csv-to-json data.csv output.json --parse-numbers --parse-booleans

# Auto-detect delimiter
jtcsv csv-to-json data.csv output.json --auto-detect

# Rename columns
jtcsv csv-to-json data.csv output.json --rename='{"id":"ID","name":"Full Name"}'

# Limit rows
jtcsv csv-to-json large.csv output.json --max-rows=1000
```

### `json-to-csv`
Convert JSON file to CSV format.

**Alias:** `json2csv` (for backward compatibility)

**Usage:**
```bash
jtcsv json-to-csv <input-file> <output-file> [options]
```

**Examples:**
```bash
# Basic conversion
jtcsv json-to-csv data.json output.csv

# With custom delimiter
jtcsv json-to-csv data.json output.csv --delimiter=\t

# Without headers
jtcsv json-to-csv data.json output.csv --no-headers

# Column order template
jtcsv json-to-csv data.json output.csv --template='{"id":null,"name":null}'

# Disable CSV injection protection
jtcsv json-to-csv data.json output.csv --no-injection-protection
```

### `stream`
Streaming conversion for large files.

**Usage:**
```bash
jtcsv stream <subcommand> <input-file> <output-file> [options]
```

**Subcommands:**
- `json-to-csv`: Stream JSON to CSV
- `csv-to-json`: Stream CSV to JSON

**Examples:**
```bash
# Stream JSON to CSV
jtcsv stream json-to-csv large.json output.csv

# Stream CSV to JSON
jtcsv stream csv-to-json large.csv output.json
```

### `tui`
Launch Terminal User Interface (requires blessed).

**Usage:**
```bash
jtcsv tui
```

**Note:** Requires `blessed` and `blessed-contrib` packages.

### `help`
Show help message.

**Usage:**
```bash
jtcsv help
jtcsv --help
jtcsv -h
```

### `version`
Show version information.

**Usage:**
```bash
jtcsv version
jtcsv --version
jtcsv -v
```

## ⚙️ Options

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `--delimiter=CHAR` | CSV delimiter character | `;` |
| `--auto-detect` | Auto-detect delimiter | `true` |
| `--candidates=LIST` | Delimiter candidates (comma-separated) | `;, \t, \|` |
| `--no-headers` | Exclude headers from CSV output | `false` |
| `--parse-numbers` | Parse numeric values in CSV | `false` |
| `--parse-booleans` | Parse boolean values in CSV | `false` |
| `--no-trim` | Don't trim whitespace from CSV values | `false` |
| `--rename=JSON` | Rename columns (JSON map) | `{}` |
| `--template=JSON` | Column order template (JSON object) | `{}` |
| `--no-injection-protection` | Disable CSV injection protection | `false` |
| `--no-rfc4180` | Disable RFC 4180 compliance | `false` |
| `--max-records=N` | Maximum records to process | `no limit` |
| `--max-rows=N` | Maximum rows to process | `no limit` |
| `--pretty` | Pretty print JSON output | `false` |
| `--silent` | Suppress all output except errors | `false` |
| `--verbose` | Show detailed progress information | `false` |

### JSON-specific Options

| Option | Description | Default |
|--------|-------------|---------|
| `--pretty` | Pretty print JSON output | `false` |

### CSV-specific Options

| Option | Description | Default |
|--------|-------------|---------|
| `--delimiter=CHAR` | CSV delimiter character | `;` |
| `--no-headers` | Exclude headers from CSV output | `false` |
| `--parse-numbers` | Parse numeric values | `false` |
| `--parse-booleans` | Parse boolean values | `false` |
| `--no-trim` | Don't trim whitespace | `false` |

## 🔒 Security Features

JTCSV includes built-in security features:

### CSV Injection Protection
Prevents formula injection attacks by automatically escaping cells starting with `=`, `+`, `-`, or `@`.

**Example:**
```bash
# Input CSV with potential injection:
# =cmd|' /C calc'!A0
# +cmd|' /C calc'!A0
# -cmd|' /C calc'!A0
# @cmd|' /C calc'!A0

# JTCSV automatically escapes these:
jtcsv csv-to-json malicious.csv safe.json
```

To disable this protection (not recommended):
```bash
jtcsv csv-to-json data.csv output.json --no-injection-protection
```

### Path Traversal Protection
Prevents directory traversal attacks in file paths.

### Input Validation
All input is validated before processing to prevent malformed data attacks.

## 📊 Performance Tips

### For Large Files (>100MB)
Use streaming mode to avoid memory issues:
```bash
jtcsv stream csv-to-json huge.csv output.json
```

### For Optimal Performance
```bash
# Disable auto-detect if you know the delimiter
jtcsv csv-to-json data.csv output.json --delimiter=, --auto-detect=false

# Disable parsing if not needed
jtcsv csv-to-json data.csv output.json --parse-numbers=false --parse-booleans=false

# Use silent mode for batch processing
jtcsv csv-to-json data.csv output.json --silent
```

## 🎯 Real-World Examples

### Example 1: Process Log Files
```bash
# Convert server logs from CSV to JSON
jtcsv csv-to-json server_logs.csv logs.json \
  --delimiter=, \
  --parse-numbers \
  --rename='{"timestamp":"time","level":"severity"}'
```

### Example 2: Export Database Data
```bash
# Convert database export to CSV
jtcsv json-to-csv users.json users.csv \
  --template='{"id":null,"name":null,"email":null,"created_at":null}' \
  --delimiter=,
```

### Example 3: Batch Processing
```bash
# Process multiple files
for file in *.csv; do
  jtcsv csv-to-json "$file" "${file%.csv}.json" --silent
done
```

### Example 4: Integration with Other Tools
```bash
# Pipe data through JTCSV
cat data.csv | jtcsv csv-to-json - output.json

# Use with jq for filtering
jtcsv csv-to-json data.csv - | jq '.[] | select(.age > 30)' | jtcsv json-to-csv - filtered.csv
```

## 🐛 Troubleshooting

### Common Issues

#### "Command not found: jtcsv"
```bash
# Reinstall globally
npm uninstall -g jtcsv
npm install -g jtcsv

# Or use npx
npx jtcsv --version
```

#### "Invalid JSON in --rename option"
Make sure to properly escape JSON in the command line:
```bash
# Wrong:
jtcsv csv-to-json data.csv output.json --rename='{id:ID,name:Name}'

# Right:
jtcsv csv-to-json data.csv output.json --rename='{"id":"ID","name":"Name"}'

# Or use a file:
echo '{"id":"ID","name":"Name"}' > rename.json
jtcsv csv-to-json data.csv output.json --rename="$(cat rename.json)"
```

#### "Memory error on large files"
Use streaming mode:
```bash
jtcsv stream csv-to-json large.csv output.json
```

Or increase Node.js memory limit:
```bash
node --max-old-space-size=4096 $(which jtcsv) csv-to-json large.csv output.json
```

### Debug Mode
Enable verbose output to see what's happening:
```bash
jtcsv csv-to-json data.csv output.json --verbose
```

## 🔗 Related Documentation

- [GitHub Repository](https://github.com/Linol-Hamelton/jtcsv)
- [API Documentation](./README.md)
- [Security Guidelines](./SECURITY.md)
- [Testing Guide](./TESTING.md)
- [TypeScript Definitions](./index.d.ts)

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/Linol-Hamelton/jtcsv) for contribution guidelines.

## 🐛 Reporting Issues

Found a bug? Please report it on the [GitHub Issues](https://github.com/Linol-Hamelton/jtcsv/issues) page.




