/**
 * The one CSV field tokenizer.
 *
 * This existed twice, character for character, in csv-to-json.ts and
 * stream-csv-to-json.ts — and the two had already drifted: the RFC 4180 repair
 * that removed the `i + 2 === line.length` special case landed in the batch
 * parser and was never carried across to the streaming one. Fuzzing quote
 * patterns across the two found 41 inputs out of 120 where they disagreed.
 * Splitting records is not affected — splitCsvRecords and takeCompleteRecords
 * only ever tracked `"` — so this covers fields alone.
 *
 * Two defects are fixed here rather than reproduced:
 *
 * 1. `'` was treated as a quote character alongside `"`. No CSV dialect does
 *    that — not Excel, not Papa Parse, not RFC 4180 — and it meant an
 *    apostrophe in ordinary data opened a quoted field that never closed:
 *    `O'Brien` raised "Unclosed quotes". The fast path has its own tokenizer
 *    and was unaffected, which hid it, but the fast path disables itself as
 *    soon as the input contains an escaped quote. So a file holding both a
 *    name and a quotation — `O'Brien,"he said ""hi"""` — threw on default
 *    options. It is no longer a quote character.
 *
 * 2. A backslash escaped the following character. RFC 4180 has no escape
 *    character, and neither does the browser build of this library, so
 *    `C:\Users\Dmitry` silently arrived as `C:UsersDmitry` in Node and intact
 *    in the browser. Silent data loss, and the two halves of the library
 *    disagreeing about what a CSV is. It now depends on the dialect, and the
 *    default dialect leaves backslashes alone.
 */
import { ParsingError } from '../../errors';

/**
 * Which CSV dialect to tokenize as.
 *
 * `rfc4180Compliant` is already declared in CsvToJsonOptions and documented as
 * defaulting to true, but the parser never read it — it only ever affected
 * line endings on the serialiser side. Reading it here is what makes the
 * option mean something on the way in.
 */
export interface TokenizerDialect {
  /**
   * When false, a backslash escapes the character after it, the way the
   * pre-5.0 parser behaved. Kept for files produced by tools that use the
   * MySQL/Postgres convention.
   */
  rfc4180Compliant?: boolean;
}

/**
 * Splits one CSV record into its fields.
 *
 * The record must already be whole: callers split on unquoted newlines first,
 * so a quoted value spanning lines arrives here as a single string.
 */
export function parseCsvLine(
  line: string,
  delimiter: string,
  trim: boolean,
  lineNumber?: number,
  dialect?: TokenizerDialect
): string[] {
  const backslashEscapes = dialect?.rfc4180Compliant === false;

  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (backslashEscapes) {
      if (escapeNext) {
        currentField += char;
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
    }

    if (!inQuotes && char === delimiter) {
      result.push(trim ? currentField.trim() : currentField);
      currentField = '';
    } else if (!inQuotes && char === '"') {
      inQuotes = true;
    } else if (inQuotes && char === '"' && line[i + 1] === '"') {
      // A doubled quote is always an escaped quote. Closing the field when it
      // happened to end the line mis-parsed every record whose quoted value
      // ended with an escaped quote before a newline.
      currentField += char;
      i++;
    } else if (inQuotes && char === '"') {
      inQuotes = false;
    } else {
      currentField += char;
    }
  }

  if (escapeNext) {
    currentField += '\\';
  }

  result.push(trim ? currentField.trim() : currentField);

  if (inQuotes) {
    throw ParsingError.unclosedQuotes(
      lineNumber ?? null,
      null,
      line.substring(0, 100)
    );
  }

  return result;
}
