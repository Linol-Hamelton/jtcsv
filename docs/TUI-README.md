# JTCSV TUI

Terminal UI for JSON <-> CSV conversion.

## Install
```bash
npm install -g jtcsv
# or
npm install @jtcsv/tui
```

## Run
```bash
jtcsv tui
# or
npx jtcsv-tui
```

## What it supports
- JSON -> CSV and CSV -> JSON conversion
- Preprocess JSON (deep unwrap)
- Batch convert files from a directory
- Load input from a file path
- Save output to a file path
- Settings for delimiter, parsing, and CSV injection protection

## Notes
- File Browser is still a placeholder.

## Keys
- F1: help
- F2 or Ctrl+O: load file
- F3 or Ctrl+R: convert/run
- F4 or Ctrl+P: save output
- Esc or Ctrl+B: back to main menu
- Ctrl+Q / Ctrl+C: quit
- Tab / Shift+Tab / F6: focus next/previous
