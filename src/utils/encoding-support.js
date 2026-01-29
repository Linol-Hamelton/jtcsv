/**
 * Encoding detection and conversion utilities.
 * 
 * Provides basic auto‑detection of UTF‑8, UTF‑16LE, UTF‑16BE with BOM,
 * and fallback to a default encoding.
 * 
 * @example
 * const { detectEncoding, convertToUtf8 } = require('./encoding-support');
 * 
 * const buffer = fs.readFileSync('data.csv');
 * const encoding = detectEncoding(buffer, { fallback: 'utf8' });
 * const utf8Text = convertToUtf8(buffer, encoding);
 */

const { ValidationError } = require('../errors');

/**
 * Detects encoding from buffer based on BOM.
 * 
 * @param {Buffer} buffer - Input buffer
 * @param {Object} options - Detection options
 * @param {string} options.fallback - Fallback encoding if detection fails (default: 'utf8')
 * @returns {string} Detected encoding: 'utf8', 'utf16le', 'utf16be', or fallback
 */
function detectEncoding(buffer, options = {}) {
  const { fallback = 'utf8' } = options;
  
  if (!Buffer.isBuffer(buffer)) {
    throw new ValidationError('Input must be a Buffer');
  }
  
  // Check BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }
  
  // No BOM detected, use fallback
  return fallback;
}

/**
 * Converts buffer to UTF‑8 string using detected encoding.
 * Strips BOM if present.
 * 
 * @param {Buffer} buffer - Input buffer
 * @param {string} encoding - Source encoding ('utf8', 'utf16le', 'utf16be')
 * @returns {string} UTF‑8 string without BOM
 */
function convertToUtf8(buffer, encoding = 'utf8') {
  if (!Buffer.isBuffer(buffer)) {
    throw new ValidationError('Input must be a Buffer');
  }
  
  let offset = 0;
  
  // Skip BOM
  if (encoding === 'utf8' && buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    offset = 3;
  } else if (encoding === 'utf16be' && buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    offset = 2;
  } else if (encoding === 'utf16le' && buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    offset = 2;
  }
  
  const slice = buffer.slice(offset);
  return slice.toString(encoding);
}

/**
 * Auto‑detects encoding and converts buffer to UTF‑8 string.
 * 
 * @param {Buffer} buffer - Input buffer
 * @param {Object} options - Options
 * @param {string} options.fallback - Fallback encoding (default: 'utf8')
 * @returns {{ encoding: string, text: string }} Detected encoding and converted text
 */
function autoDetectAndConvert(buffer, options = {}) {
  const encoding = detectEncoding(buffer, options);
  const text = convertToUtf8(buffer, encoding);
  return { encoding, text };
}

/**
 * Creates a wrapper around csvToJson that accepts Buffer or string with encoding detection.
 * 
 * @param {Buffer|string} input - CSV as Buffer or string
 * @param {Object} parseOptions - Options for csvToJson
 * @param {string} parseOptions.encoding - Explicit encoding (default: 'auto')
 * @param {string} parseOptions.fallbackEncoding - Fallback if auto detection fails (default: 'utf8')
 * @returns {Promise<Array>} Parsed JSON data
 */
async function csvToJsonWithEncoding(input, parseOptions = {}) {
  const { csvToJson } = require('../index');
  const { encoding = 'auto', fallbackEncoding = 'utf8', ...restOptions } = parseOptions;
  
  let text;
  if (Buffer.isBuffer(input)) {
    if (encoding === 'auto') {
      const detected = autoDetectAndConvert(input, { fallback: fallbackEncoding });
      text = detected.text;
    } else {
      text = convertToUtf8(input, encoding);
    }
  } else if (typeof input === 'string') {
    text = input;
  } else {
    throw new ValidationError('Input must be a Buffer or string');
  }
  
  return csvToJson(text, restOptions);
}

module.exports = {
  detectEncoding,
  convertToUtf8,
  autoDetectAndConvert,
  csvToJsonWithEncoding
};