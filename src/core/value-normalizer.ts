/**
 * The one rule for turning a raw CSV field into a JSON value.
 *
 * jtcsv ships one library for two runtimes, and until this module existed each
 * had its own idea of what a field means. Node used the closure below; the
 * browser used a small `coerceField` that ignored `trim`, never implemented
 * `parseBooleans` at all, matched numbers with a stricter pattern (so "1e5",
 * "+5" and ".5" stayed strings there and became numbers here), and did not
 * unescape the apostrophe that `preventCsvInjection` writes in front of a
 * formula — which meant `jsonToCsv` -> `csvToJson` round-tripped in Node and
 * silently did not in the browser.
 *
 * Nothing here touches a Node built-in, so both builds import it directly
 * rather than keeping two copies in step by hand.
 */

/**
 * Builds the field normaliser for one conversion.
 *
 * A factory rather than a plain function because this runs once per field of
 * every row: the option lookups are hoisted out of the hot loop.
 */
export function createValueNormalizer(
  trim: boolean,
  parseNumbers: boolean,
  parseBooleans: boolean
): (_value: any) => any {
  return (value: any): any => {
    let normalized = value;
    if (trim && typeof normalized === 'string') {
      normalized = normalized.trim();
    }
    if (typeof normalized === 'string') {
      if (normalized === '') {
        return null;
      }
      // The inverse of preventCsvInjection: a leading apostrophe in front of a
      // formula character is the neutraliser this library writes, so reading it
      // back drops it and the value survives the round trip.
      if (normalized[0] === "'" && normalized.length > 1) {
        const candidate = normalized.slice(1);
        const leading = trim ? candidate.trimStart() : candidate;
        const firstChar = leading[0];
        if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
          normalized = candidate;
        }
      }
    }
    if (parseNumbers && typeof normalized === 'string') {
      // Requiring a numeric first character keeps "Infinity", "NaN" and
      // leading-whitespace values as strings, which Number() would otherwise
      // accept and turn into surprises.
      const firstChar = normalized[0];
      if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '+' || firstChar === '.') {
        const numValue = Number(normalized);
        if (!Number.isNaN(numValue)) {
          normalized = numValue;
        }
      }
    }
    if (parseBooleans && typeof normalized === 'string') {
      const firstChar = normalized[0];
      if (firstChar === 't' || firstChar === 'T' || firstChar === 'f' || firstChar === 'F') {
        const lowerValue = normalized.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
          normalized = lowerValue === 'true';
        }
      }
    }
    return normalized;
  };
}
