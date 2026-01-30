/**
 * BOM (Byte Order Mark) Utilities for jtcsv
 * 
 * Provides functions to detect and strip BOM characters from UTF-8, UTF-16 LE/BE,
 * and UTF-32 encoded strings/buffers.
 * 
 * @module bom-utils
 */

/**
 * BOM signatures for different encodings
 */
const BOM_SIGNATURES = {
  'utf-8': Buffer.from([0xEF, 0xBB, 0xBF]),
  'utf-16le': Buffer.from([0xFF, 0xFE]),
  'utf-16be': Buffer.from([0xFE, 0xFF]),
  'utf-32le': Buffer.from([0xFF, 0xFE, 0x00, 0x00]),
  'utf-32be': Buffer.from([0x00, 0x00, 0xFE, 0xFF])
};

/**
 * Detects if a buffer or string starts with a BOM
 * 
 * @param {Buffer|string} input - Input to check for BOM
 * @returns {Object|null} Detection result or null if no BOM found
 * @property {string} encoding - Detected encoding ('utf-8', 'utf-16le', etc.)
 * @property {number} bomLength - Length of BOM in bytes
 */
function detectBom(input) {
  if (!input) {
    return null;
  }
  
  let buffer;
  if (typeof input === 'string') {
    buffer = Buffer.from(input, 'utf8');
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    return null;
  }
  
  // Check each BOM signature
  for (const [encoding, signature] of Object.entries(BOM_SIGNATURES)) {
    if (buffer.length >= signature.length) {
      if (buffer.slice(0, signature.length).equals(signature)) {
        return {
          encoding,
          bomLength: signature.length,
          hasBom: true
        };
      }
    }
  }
  
  return null;
}

/**
 * Strips BOM from a buffer or string
 * 
 * @param {Buffer|string} input - Input to strip BOM from
 * @returns {Buffer|string} Input without BOM
 */
function stripBom(input) {
  if (!input) {
    return input;
  }
  
  const bomInfo = detectBom(input);
  if (!bomInfo) {
    return input;
  }
  
  if (Buffer.isBuffer(input)) {
    return input.slice(bomInfo.bomLength);
  }
  
  if (typeof input === 'string') {
    // Convert to buffer, strip BOM, then convert back to string
    const buffer = Buffer.from(input, 'utf8');
    const strippedBuffer = buffer.slice(bomInfo.bomLength);
    
    // Determine correct encoding for conversion
    let encoding = 'utf8';
    if (bomInfo.encoding === 'utf-16le') {
      encoding = 'utf16le';
    } else if (bomInfo.encoding === 'utf-16be') {
      encoding = 'utf16be';
    }
    
    return strippedBuffer.toString(encoding);
  }
  
  return input;
}

/**
 * Strips BOM from a string (optimized for strings)
 * 
 * @param {string} str - String to strip BOM from
 * @returns {string} String without BOM
 */
function stripBomFromString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Check for UTF-8 BOM (most common)
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  
  // Check for UTF-8 BOM bytes as characters
  if (str.length >= 3 && 
      str.charCodeAt(0) === 0xEF && 
      str.charCodeAt(1) === 0xBB && 
      str.charCodeAt(2) === 0xBF) {
    return str.slice(3);
  }
  
  return str;
}

/**
 * Creates a transform stream that strips BOM from incoming data
 * 
 * @returns {Transform} Transform stream
 */
function createBomStripStream() {
  const { Transform } = require('stream');
  let bomStripped = false;
  
  return new Transform({
    transform(chunk, encoding, callback) {
      if (!bomStripped) {
        const bomInfo = detectBom(chunk);
        if (bomInfo) {
          // Strip BOM from first chunk
          chunk = chunk.slice(bomInfo.bomLength);
          bomStripped = true;
        } else {
          bomStripped = true; // No BOM found, but we've checked
        }
      }
      
      this.push(chunk);
      callback();
    }
  });
}

/**
 * Reads a file and automatically handles BOM
 * 
 * @param {string} filePath - Path to file
 * @param {Object} options - Read options
 * @returns {Promise<{data: Buffer|string, encoding: string, hadBom: boolean}>}
 */
async function readFileWithBomHandling(filePath, options = {}) {
  const fs = require('fs').promises;
  const buffer = await fs.readFile(filePath);
  
  const bomInfo = detectBom(buffer);
  const hadBom = !!bomInfo;
  
  let data;
  let encoding = options.encoding || 'utf8';
  
  if (bomInfo) {
    // Strip BOM
    data = buffer.slice(bomInfo.bomLength);
    
    // Use detected encoding if not specified
    if (!options.encoding) {
      encoding = bomInfo.encoding;
    }
  } else {
    data = buffer;
  }
  
  // Convert to string if encoding is specified
  if (options.encoding || bomInfo) {
    data = data.toString(encoding);
  }
  
  return {
    data,
    encoding,
    hadBom,
    bomInfo: bomInfo || null
  };
}

/**
 * Checks if a file has BOM (synchronous)
 * 
 * @param {string} filePath - Path to file
 * @returns {Object|null} BOM info or null
 */
function fileHasBomSync(filePath) {
  const fs = require('fs');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  if (bytesRead < 2) {
    return null;
  }
  
  return detectBom(buffer.slice(0, bytesRead));
}

/**
 * Normalizes CSV input by stripping BOM and ensuring proper encoding
 * 
 * @param {string|Buffer} csvInput - CSV input
 * @param {Object} options - Processing options
 * @returns {string} Normalized CSV string
 */
function normalizeCsvInput(csvInput, options = {}) {
  if (!csvInput) {
    return '';
  }
  
  let normalized;
  
  if (Buffer.isBuffer(csvInput)) {
    const bomInfo = detectBom(csvInput);
    if (bomInfo) {
      normalized = csvInput.slice(bomInfo.bomLength).toString(bomInfo.encoding);
    } else {
      normalized = csvInput.toString(options.encoding || 'utf8');
    }
  } else if (typeof csvInput === 'string') {
    normalized = stripBomFromString(csvInput);
  } else {
    throw new Error('CSV input must be a string or Buffer');
  }
  
  // Ensure proper line endings
  if (options.normalizeLineEndings !== false) {
    normalized = normalized.replace(/\r\n|\r/g, '\n');
  }
  
  return normalized;
}

module.exports = {
  detectBom,
  stripBom,
  stripBomFromString,
  createBomStripStream,
  readFileWithBomHandling,
  fileHasBomSync,
  normalizeCsvInput,
  BOM_SIGNATURES
};