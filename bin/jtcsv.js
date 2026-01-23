#!/usr/bin/env node

/**
 * jtcsv CLI - Complete Command Line Interface
 * 
 * Full-featured command-line interface for JSON↔CSV conversion
 * with streaming, batch processing, and all security features.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const jtcsv = require('../index.js');

const VERSION = require('../package.json').version;

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function color(text, colorName) {
  return colors[colorName] + text + colors.reset;
}

function showHelp() {
  console.log(`
${color('jtcsv CLI v' + VERSION, 'cyan')}
${color('The Complete JSON↔CSV Converter for Node.js', 'dim')}

${color('USAGE:', 'bright')}
  jtcsv [command] [options] [file...]

${color('MAIN COMMANDS:', 'bright')}
  ${color('json-to-csv', 'green')}     Convert JSON to CSV (alias: json2csv)
  ${color('csv-to-json', 'green')}     Convert CSV to JSON (alias: csv2json)
  ${color('save-json', 'yellow')}      Save data as JSON file
  ${color('stream', 'yellow')}         Streaming conversion for large files
  ${color('batch', 'yellow')}          Batch process multiple files
  ${color('preprocess', 'magenta')}    Preprocess JSON with deep unwrapping
  ${color('tui', 'magenta')}           Launch Terminal User Interface
  ${color('help', 'blue')}             Show this help message
  ${color('version', 'blue')}          Show version information

${color('STREAMING SUBCOMMANDS:', 'bright')}
  ${color('stream json-to-csv', 'dim')}    Stream JSON to CSV
  ${color('stream csv-to-json', 'dim')}    Stream CSV to JSON
  ${color('stream file-to-csv', 'dim')}    Stream file to CSV
  ${color('stream file-to-json', 'dim')}   Stream file to JSON

${color('BATCH SUBCOMMANDS:', 'bright')}
  ${color('batch json-to-csv', 'dim')}     Batch convert JSON files to CSV
  ${color('batch csv-to-json', 'dim')}     Batch convert CSV files to JSON
  ${color('batch process', 'dim')}         Process mixed file types

${color('EXAMPLES:', 'bright')}
  ${color('Convert JSON file to CSV:', 'dim')}
  jtcsv json-to-csv input.json output.csv --delimiter=,

  ${color('Convert CSV file to JSON:', 'dim')}
  jtcsv csv-to-json input.csv output.json --parse-numbers --auto-detect

  ${color('Save data as JSON file:', 'dim')}
  jtcsv save-json data.json output.json --pretty

  ${color('Stream large JSON file to CSV:', 'dim')}
  jtcsv stream json-to-csv large.json output.csv --max-records=1000000

  ${color('Stream CSV file to JSON:', 'dim')}
  jtcsv stream csv-to-json large.csv output.json --max-rows=500000

  ${color('Preprocess complex JSON:', 'dim')}
  jtcsv preprocess complex.json simplified.json --max-depth=3

  ${color('Batch convert JSON files:', 'dim')}
  jtcsv batch json-to-csv "data/*.json" "output/" --delimiter=;

  ${color('Launch TUI interface:', 'dim')}
  jtcsv tui

${color('CONVERSION OPTIONS:', 'bright')}
  ${color('--delimiter=', 'cyan')}CHAR    CSV delimiter (default: ;)
  ${color('--auto-detect', 'cyan')}        Auto-detect delimiter (default: true)
  ${color('--candidates=', 'cyan')}LIST    Delimiter candidates (default: ;,\t|)
  ${color('--no-headers', 'cyan')}         Exclude headers from CSV output
  ${color('--parse-numbers', 'cyan')}      Parse numeric values in CSV
  ${color('--parse-booleans', 'cyan')}     Parse boolean values in CSV
  ${color('--no-trim', 'cyan')}            Don't trim whitespace from CSV values
  ${color('--no-fast-path', 'cyan')}       Disable fast-path parser (force quote-aware)
  ${color('--fast-path-mode=', 'cyan')}MODE  Fast path output mode (objects|compact)
  ${color('--rename=', 'cyan')}JSON       Rename columns (JSON map)
  ${color('--template=', 'cyan')}JSON      Column order template (JSON object)
  ${color('--no-injection-protection', 'cyan')}  Disable CSV injection protection
  ${color('--no-rfc4180', 'cyan')}         Disable RFC 4180 compliance
  ${color('--max-records=', 'cyan')}N      Maximum records to process
  ${color('--max-rows=', 'cyan')}N         Maximum rows to process
  ${color('--pretty', 'cyan')}             Pretty print JSON output
  ${color('--schema=', 'cyan')}JSON        JSON schema for validation
  ${color('--transform=', 'cyan')}JS       Custom transform function (JavaScript file)

${color('PREPROCESS OPTIONS:', 'bright')}
  ${color('--max-depth=', 'cyan')}N        Maximum recursion depth (default: 5)
  ${color('--unwrap-arrays', 'cyan')}      Unwrap arrays to strings
  ${color('--stringify-objects', 'cyan')}  Stringify complex objects

${color('STREAMING OPTIONS:', 'bright')}
  ${color('--chunk-size=', 'cyan')}N       Chunk size in bytes (default: 65536)
  ${color('--buffer-size=', 'cyan')}N      Buffer size in records (default: 1000)
  ${color('--add-bom', 'cyan')}            Add UTF-8 BOM for Excel compatibility

${color('BATCH OPTIONS:', 'bright')}
  ${color('--recursive', 'cyan')}          Process directories recursively
  ${color('--pattern=', 'cyan')}GLOB       File pattern to match
  ${color('--output-dir=', 'cyan')}DIR     Output directory for batch processing
  ${color('--overwrite', 'cyan')}          Overwrite existing files
  ${color('--parallel=', 'cyan')}N         Parallel processing limit (default: 4)

${color('GENERAL OPTIONS:', 'bright')}
  ${color('--silent', 'cyan')}             Suppress all output except errors
  ${color('--verbose', 'cyan')}            Show detailed progress information
  ${color('--debug', 'cyan')}              Show debug information
  ${color('--dry-run', 'cyan')}            Show what would be done without actually doing it

${color('SECURITY FEATURES:', 'bright')}
  • CSV injection protection (enabled by default)
  • Path traversal protection
  • Input validation and sanitization
  • Size limits to prevent DoS attacks
  • Schema validation support

${color('PERFORMANCE FEATURES:', 'bright')}
  • Streaming for files >100MB
  • Batch processing with parallel execution
  • Memory-efficient preprocessing
  • Configurable buffer sizes

${color('LEARN MORE:', 'dim')}
  GitHub: https://github.com/Linol-Hamelton/jtcsv
  Issues: https://github.com/Linol-Hamelton/jtcsv/issues
  Documentation: https://github.com/Linol-Hamelton/jtcsv#readme
  `);
}

function showVersion() {
  console.log(`jtcsv v${VERSION}`);
  console.log(`Node.js ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

async function convertJsonToCsv(inputFile, outputFile, options) {
  const startTime = Date.now();
  
  try {
    // Read input file
    const inputData = await fs.promises.readFile(inputFile, 'utf8');
    const jsonData = JSON.parse(inputData);
    
    if (!Array.isArray(jsonData)) {
      throw new Error('JSON data must be an array of objects');
    }
    
    if (!options.silent) {
      console.log(color(`Converting ${jsonData.length.toLocaleString()} records...`, 'dim'));
    }
    
    // Prepare options for jtcsv
    const jtcsvOptions = {
      delimiter: options.delimiter,
      includeHeaders: options.includeHeaders,
      renameMap: options.renameMap,
      template: options.template,
      maxRecords: options.maxRecords,
      preventCsvInjection: options.preventCsvInjection,
      rfc4180Compliant: options.rfc4180Compliant
    };
    
    // Convert to CSV
    const csvData = jtcsv.jsonToCsv(jsonData, jtcsvOptions);
    
    // Write output file
    await fs.promises.writeFile(outputFile, csvData, 'utf8');
    
    const elapsed = Date.now() - startTime;
    if (!options.silent) {
      console.log(color(`✓ Converted ${jsonData.length.toLocaleString()} records in ${elapsed}ms`, 'green'));
      console.log(color(`  Output: ${outputFile} (${csvData.length.toLocaleString()} bytes)`, 'dim'));
    }
    
    return { records: jsonData.length, bytes: csvData.length, time: elapsed };
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function convertCsvToJson(inputFile, outputFile, options) {
  const startTime = Date.now();
  
  try {
    if (!options.silent) {
      console.log(color('Reading CSV file...', 'dim'));
    }
    
    // Prepare options for jtcsv
    const jtcsvOptions = {
      delimiter: options.delimiter,
      autoDetect: options.autoDetect,
      candidates: options.candidates,
      hasHeaders: options.hasHeaders,
      renameMap: options.renameMap,
      trim: options.trim,
      parseNumbers: options.parseNumbers,
      parseBooleans: options.parseBooleans,
      maxRows: options.maxRows,
      useFastPath: options.useFastPath,
      fastPathMode: options.fastPathMode
    };
    
    // Read and convert CSV
    const jsonData = await jtcsv.readCsvAsJson(inputFile, jtcsvOptions);
    
    // Format JSON
    const jsonOutput = options.pretty 
      ? JSON.stringify(jsonData, null, 2)
      : JSON.stringify(jsonData);
    
    // Write output file
    await fs.promises.writeFile(outputFile, jsonOutput, 'utf8');
    
    const elapsed = Date.now() - startTime;
    if (!options.silent) {
      console.log(color(`✓ Converted ${jsonData.length.toLocaleString()} rows in ${elapsed}ms`, 'green'));
      console.log(color(`  Output: ${outputFile} (${jsonOutput.length.toLocaleString()} bytes)`, 'dim'));
    }
    
    return { rows: jsonData.length, bytes: jsonOutput.length, time: elapsed };
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function saveAsJson(inputFile, outputFile, options) {
  const startTime = Date.now();
  
  try {
    // Read input file
    const inputData = await fs.promises.readFile(inputFile, 'utf8');
    const jsonData = JSON.parse(inputData);
    
    if (!options.silent) {
      console.log(color(`Saving ${Array.isArray(jsonData) ? jsonData.length.toLocaleString() + ' records' : 'object'}...`, 'dim'));
    }
    
    // Prepare options for jtcsv
    const jtcsvOptions = {
      prettyPrint: options.pretty
    };
    
    // Save as JSON
    await jtcsv.saveAsJson(jsonData, outputFile, jtcsvOptions);
    
    const elapsed = Date.now() - startTime;
    if (!options.silent) {
      console.log(color(`✓ Saved JSON in ${elapsed}ms`, 'green'));
      console.log(color(`  Output: ${outputFile}`, 'dim'));
    }
    
    return { time: elapsed };
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function preprocessJson(inputFile, outputFile, options) {
  const startTime = Date.now();
  
  try {
    // Read input file
    const inputData = await fs.promises.readFile(inputFile, 'utf8');
    const jsonData = JSON.parse(inputData);
    
    if (!Array.isArray(jsonData)) {
      throw new Error('JSON data must be an array of objects for preprocessing');
    }
    
    if (!options.silent) {
      console.log(color(`Preprocessing ${jsonData.length.toLocaleString()} records...`, 'dim'));
    }
    
    // Preprocess data
    const processedData = jtcsv.preprocessData(jsonData);
    
    // Apply deep unwrap if needed
    if (options.unwrapArrays || options.stringifyObjects) {
      const maxDepth = options.maxDepth || 5;
      processedData.forEach(item => {
        for (const key in item) {
          if (item[key] && typeof item[key] === 'object') {
            item[key] = jtcsv.deepUnwrap(item[key], 0, maxDepth);
          }
        }
      });
    }
    
    // Format JSON
    const jsonOutput = options.pretty 
      ? JSON.stringify(processedData, null, 2)
      : JSON.stringify(processedData);
    
    // Write output file
    await fs.promises.writeFile(outputFile, jsonOutput, 'utf8');
    
    const elapsed = Date.now() - startTime;
    if (!options.silent) {
      console.log(color(`✓ Preprocessed ${jsonData.length.toLocaleString()} records in ${elapsed}ms`, 'green'));
      console.log(color(`  Output: ${outputFile} (${jsonOutput.length.toLocaleString()} bytes)`, 'dim'));
    }
    
    return { records: jsonData.length, bytes: jsonOutput.length, time: elapsed };
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// STREAMING FUNCTIONS
// ============================================================================

async function streamJsonToCsv(inputFile, outputFile, options) {
  const startTime = Date.now();
  let recordCount = 0;
  
  try {
    if (!options.silent) {
      console.log(color('Streaming JSON to CSV...', 'dim'));
    }
    
    // Create streams
    const readStream = fs.createReadStream(inputFile, 'utf8');
    const writeStream = fs.createWriteStream(outputFile, 'utf8');
    
    // Add UTF-8 BOM if requested
    if (options.addBOM) {
      writeStream.write('\uFEFF');
    }
    
    // Parse JSON stream
    let buffer = '';
    let isFirstChunk = true;
    let headersWritten = false;
    
    readStream.on('data', (chunk) => {
      buffer += chunk;
      
      // Try to parse complete JSON objects
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const obj = JSON.parse(line);
            recordCount++;
            
            // Write headers on first object
            if (!headersWritten && options.includeHeaders !== false) {
              const headers = Object.keys(obj);
              writeStream.write(headers.join(options.delimiter || ';') + '\n');
              headersWritten = true;
            }
            
            // Write CSV row
            const row = Object.values(obj).map(value => {
              const str = String(value);
              if (str.includes(options.delimiter || ';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            }).join(options.delimiter || ';') + '\n';
            
            writeStream.write(row);
            
            // Show progress
            if (options.verbose && recordCount % 10000 === 0) {
              process.stdout.write(color(`  Processed ${recordCount.toLocaleString()} records\r`, 'dim'));
            }
            
          } catch (error) {
            // Skip invalid JSON lines
            if (options.debug) {
              console.warn(color(`  Warning: Skipping invalid JSON line: ${error.message}`, 'yellow'));
            }
          }
        }
      }
    });
    
    readStream.on('end', async () => {
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          recordCount++;
          
          if (!headersWritten && options.includeHeaders !== false) {
            const headers = Object.keys(obj);
            writeStream.write(headers.join(options.delimiter || ';') + '\n');
          }
          
          const row = Object.values(obj).map(value => {
            const str = String(value);
            if (str.includes(options.delimiter || ';') || str.includes('"') || str.includes('\n')) {
                            return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(options.delimiter || ';') + '\n';
          
          writeStream.write(row);
        } catch (error) {
          // Skip invalid JSON
        }
      }
      
      writeStream.end();
      
      // Wait for write stream to finish
      await new Promise(resolve => writeStream.on('finish', resolve));
      
      const elapsed = Date.now() - startTime;
      if (!options.silent) {
        console.log(color(`\n✓ Streamed ${recordCount.toLocaleString()} records in ${elapsed}ms`, 'green'));
        console.log(color(`  Output: ${outputFile}`, 'dim'));
      }
    });
    
    readStream.on('error', (error) => {
      console.error(color(`✗ Stream error: ${error.message}`, 'red'));
      process.exit(1);
    });
    
    writeStream.on('error', (error) => {
      console.error(color(`✗ Write error: ${error.message}`, 'red'));
      process.exit(1);
    });
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function streamCsvToJson(inputFile, outputFile, options) {
  const startTime = Date.now();
  let rowCount = 0;
  
  try {
    if (!options.silent) {
      console.log(color('Streaming CSV to JSON...', 'dim'));
    }
    
    // Create streams
    const readStream = fs.createReadStream(inputFile, 'utf8');
    const writeStream = fs.createWriteStream(outputFile, 'utf8');
    
    // Write JSON array opening bracket
    writeStream.write('[\n');
    
    let buffer = '';
    let isFirstRow = true;
    let headers = [];
    
    readStream.on('data', (chunk) => {
      buffer += chunk;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        rowCount++;
        
        // Parse CSV line
        const fields = parseCsvLineSimple(line, options.delimiter || ';');
        
        // First row might be headers
        if (rowCount === 1 && options.hasHeaders !== false) {
          headers = fields;
          continue;
        }
        
        // Create JSON object
        const obj = {};
        const fieldCount = Math.min(fields.length, headers.length);
        
        for (let j = 0; j < fieldCount; j++) {
          const header = headers[j] || `column${j + 1}`;
          let value = fields[j];
          
          // Parse numbers if enabled
          if (options.parseNumbers && /^-?\d+(\.\d+)?$/.test(value)) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              value = num;
            }
          }
          
          // Parse booleans if enabled
          if (options.parseBooleans) {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true') value = true;
            if (lowerValue === 'false') value = false;
          }
          
          obj[header] = value;
        }
        
        // Write JSON object
        const jsonStr = JSON.stringify(obj);
        if (!isFirstRow) {
          writeStream.write(',\n');
        }
        writeStream.write('  ' + jsonStr);
        isFirstRow = false;
        
        // Show progress
        if (options.verbose && rowCount % 10000 === 0) {
          process.stdout.write(color(`  Processed ${rowCount.toLocaleString()} rows\r`, 'dim'));
        }
      }
    });
    
    readStream.on('end', async () => {
      // Process remaining buffer
      if (buffer.trim()) {
        const fields = parseCsvLineSimple(buffer.trim(), options.delimiter || ';');
        
        if (fields.length > 0) {
          rowCount++;
          
          // Skip if it's headers
          if (!(rowCount === 1 && options.hasHeaders !== false)) {
            const obj = {};
            const fieldCount = Math.min(fields.length, headers.length);
            
            for (let j = 0; j < fieldCount; j++) {
              const header = headers[j] || `column${j + 1}`;
              obj[header] = fields[j];
            }
            
            const jsonStr = JSON.stringify(obj);
            if (!isFirstRow) {
              writeStream.write(',\n');
            }
            writeStream.write('  ' + jsonStr);
          }
        }
      }
      
      // Write JSON array closing bracket
      writeStream.write('\n]');
      writeStream.end();
      
      // Wait for write stream to finish
      await new Promise(resolve => writeStream.on('finish', resolve));
      
      const elapsed = Date.now() - startTime;
      if (!options.silent) {
        console.log(color(`\n✓ Streamed ${(rowCount - (options.hasHeaders !== false ? 1 : 0)).toLocaleString()} rows in ${elapsed}ms`, 'green'));
        console.log(color(`  Output: ${outputFile}`, 'dim'));
      }
    });
    
    readStream.on('error', (error) => {
      console.error(color(`✗ Stream error: ${error.message}`, 'red'));
      process.exit(1);
    });
    
    writeStream.on('error', (error) => {
      console.error(color(`✗ Write error: ${error.message}`, 'red'));
      process.exit(1);
    });
    
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Simple CSV line parser for streaming
function parseCsvLineSimple(line, delimiter) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  fields.push(currentField);
  return fields;
}

// ============================================================================
// BATCH PROCESSING FUNCTIONS
// ============================================================================

async function batchJsonToCsv(inputPattern, outputDir, options) {
  const startTime = Date.now();
  
  try {
    const glob = require('glob');
    const files = glob.sync(inputPattern, { 
      absolute: true,
      nodir: true 
    });
    
    if (files.length === 0) {
      console.error(color(`✗ No files found matching pattern: ${inputPattern}`, 'red'));
      process.exit(1);
    }
    
    if (!options.silent) {
      console.log(color(`Found ${files.length} files to process...`, 'dim'));
    }
    
    // Create output directory if it doesn't exist
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    const results = [];
    const parallelLimit = options.parallel || 4;
    
    // Process files in parallel batches
    for (let i = 0; i < files.length; i += parallelLimit) {
      const batch = files.slice(i, i + parallelLimit);
      const promises = batch.map(async (file) => {
        const fileName = path.basename(file, '.json');
        const outputFile = path.join(outputDir, `${fileName}.csv`);
        
        if (!options.silent && options.verbose) {
          console.log(color(`  Processing: ${file}`, 'dim'));
        }
        
        try {
          const result = await convertJsonToCsv(file, outputFile, {
            ...options,
            silent: true // Suppress individual file output
          });
          
          if (!options.silent) {
            console.log(color(`  ✓ ${fileName}.json → ${fileName}.csv (${result.records} records)`, 'green'));
          }
          
          return { file, success: true, ...result };
        } catch (error) {
          if (!options.silent) {
            console.log(color(`  ✗ ${fileName}.json: ${error.message}`, 'red'));
          }
          return { file, success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      
      if (!options.silent) {
        const processed = i + batch.length;
        const percent = Math.round((processed / files.length) * 100);
        console.log(color(`  Progress: ${processed}/${files.length} (${percent}%)`, 'dim'));
      }
    }
    
    const elapsed = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const totalRecords = results.filter(r => r.success).reduce((sum, r) => sum + (r.records || 0), 0);
    
    if (!options.silent) {
      console.log(color(`\n✓ Batch processing completed in ${elapsed}ms`, 'green'));
      console.log(color(`  Successful: ${successful}/${files.length} files`, 'dim'));
      console.log(color(`  Total records: ${totalRecords.toLocaleString()}`, 'dim'));
      console.log(color(`  Output directory: ${outputDir}`, 'dim'));
    }
    
    return { 
      totalFiles: files.length, 
      successful, 
      totalRecords, 
      time: elapsed,
      results 
    };
    
  } catch (error) {
    console.error(color(`✗ Batch processing error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function batchCsvToJson(inputPattern, outputDir, options) {
  const startTime = Date.now();
  
  try {
    const glob = require('glob');
    const files = glob.sync(inputPattern, { 
      absolute: true,
      nodir: true 
    });
    
    if (files.length === 0) {
      console.error(color(`✗ No files found matching pattern: ${inputPattern}`, 'red'));
      process.exit(1);
    }
    
    if (!options.silent) {
      console.log(color(`Found ${files.length} files to process...`, 'dim'));
    }
    
    // Create output directory if it doesn't exist
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    const results = [];
    const parallelLimit = options.parallel || 4;
    
    // Process files in parallel batches
    for (let i = 0; i < files.length; i += parallelLimit) {
      const batch = files.slice(i, i + parallelLimit);
      const promises = batch.map(async (file) => {
        const fileName = path.basename(file, '.csv');
        const outputFile = path.join(outputDir, `${fileName}.json`);
        
        if (!options.silent && options.verbose) {
          console.log(color(`  Processing: ${file}`, 'dim'));
        }
        
        try {
          const result = await convertCsvToJson(file, outputFile, {
            ...options,
            silent: true // Suppress individual file output
          });
          
          if (!options.silent) {
            console.log(color(`  ✓ ${fileName}.csv → ${fileName}.json (${result.rows} rows)`, 'green'));
          }
          
          return { file, success: true, ...result };
        } catch (error) {
          if (!options.silent) {
            console.log(color(`  ✗ ${fileName}.csv: ${error.message}`, 'red'));
          }
          return { file, success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      
      if (!options.silent) {
        const processed = i + batch.length;
        const percent = Math.round((processed / files.length) * 100);
        console.log(color(`  Progress: ${processed}/${files.length} (${percent}%)`, 'dim'));
      }
    }
    
    const elapsed = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const totalRows = results.filter(r => r.success).reduce((sum, r) => sum + (r.rows || 0), 0);
    
    if (!options.silent) {
      console.log(color(`\n✓ Batch processing completed in ${elapsed}ms`, 'green'));
      console.log(color(`  Successful: ${successful}/${files.length} files`, 'dim'));
      console.log(color(`  Total rows: ${totalRows.toLocaleString()}`, 'dim'));
      console.log(color(`  Output directory: ${outputDir}`, 'dim'));
    }
    
    return { 
      totalFiles: files.length, 
      successful, 
      totalRows, 
      time: elapsed,
      results 
    };
    
  } catch (error) {
    console.error(color(`✗ Batch processing error: ${error.message}`, 'red'));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// OPTIONS PARSING
// ============================================================================

function parseOptions(args) {
  const options = {
    delimiter: ';',
    autoDetect: true,
    candidates: [';', ',', '\t', '|'],
    hasHeaders: true,
    includeHeaders: true,
    renameMap: undefined,
    template: undefined,
    trim: true,
    parseNumbers: false,
    parseBooleans: false,
    useFastPath: true,
    fastPathMode: 'objects',
    preventCsvInjection: true,
    rfc4180Compliant: true,
    maxRecords: undefined,
    maxRows: undefined,
    maxDepth: 5,
    pretty: false,
    silent: false,
    verbose: false,
    debug: false,
    dryRun: false,
    addBOM: false,
    unwrapArrays: false,
    stringifyObjects: false,
    recursive: false,
    pattern: '**/*',
    outputDir: './output',
    overwrite: false,
    parallel: 4,
    chunkSize: 65536,
    bufferSize: 1000,
    schema: undefined,
    transform: undefined
  };
  
  const files = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      
      switch (key) {
      case 'delimiter':
        options.delimiter = value || ',';
        options.autoDetect = false;
        break;
      case 'auto-detect':
        options.autoDetect = value !== 'false';
        break;
      case 'candidates':
        options.candidates = value ? value.split(',') : [';', ',', '\t', '|'];
        break;
      case 'no-headers':
        options.includeHeaders = false;
        options.hasHeaders = false;
        break;
      case 'parse-numbers':
        options.parseNumbers = true;
        break;
      case 'parse-booleans':
        options.parseBooleans = true;
        break;
      case 'no-trim':
        options.trim = false;
        break;
      case 'no-fast-path':
        options.useFastPath = false;
        break;
      case 'fast-path':
        options.useFastPath = value !== 'false';
        break;
      case 'fast-path-mode':
        options.fastPathMode = value || 'objects';
        if (options.fastPathMode !== 'objects' && options.fastPathMode !== 'compact') {
          throw new Error('Invalid --fast-path-mode value (objects|compact)');
        }
        break;
      case 'rename':
        try {
          const jsonStr = value || '{}';
          const cleanStr = jsonStr.replace(/^'|'$/g, '').replace(/^"|"$/g, '');
          options.renameMap = JSON.parse(cleanStr);
        } catch (e) {
          throw new Error(`Invalid JSON in --rename option: ${e.message}`);
        }
        break;
      case 'template':
        try {
          const jsonStr = value || '{}';
          const cleanStr = jsonStr.replace(/^'|'$/g, '').replace(/^"|"$/g, '');
          options.template = JSON.parse(cleanStr);
        } catch (e) {
          throw new Error(`Invalid JSON in --template option: ${e.message}`);
        }
        break;
      case 'no-injection-protection':
        options.preventCsvInjection = false;
        break;
      case 'no-rfc4180':
        options.rfc4180Compliant = false;
        break;
      case 'max-records':
        options.maxRecords = parseInt(value, 10);
        break;
      case 'max-rows':
        options.maxRows = parseInt(value, 10);
        break;
      case 'max-depth':
        options.maxDepth = parseInt(value, 10) || 5;
        break;
      case 'pretty':
        options.pretty = true;
        break;
      case 'silent':
        options.silent = true;
        break;
      case 'verbose':
        options.verbose = true;
        break;
      case 'debug':
        options.debug = true;
        break;
      case 'dry-run':
        options.dryRun = true;
        break;
      case 'add-bom':
        options.addBOM = true;
        break;
      case 'unwrap-arrays':
        options.unwrapArrays = true;
        break;
      case 'stringify-objects':
        options.stringifyObjects = true;
        break;
      case 'recursive':
        options.recursive = true;
        break;
      case 'pattern':
        options.pattern = value || '**/*';
        break;
      case 'output-dir':
        options.outputDir = value || './output';
        break;
      case 'overwrite':
        options.overwrite = true;
        break;
      case 'parallel':
        options.parallel = parseInt(value, 10) || 4;
        break;
      case 'chunk-size':
        options.chunkSize = parseInt(value, 10) || 65536;
        break;
      case 'buffer-size':
        options.bufferSize = parseInt(value, 10) || 1000;
        break;
      case 'schema':
        try {
          const jsonStr = value || '{}';
          const cleanStr = jsonStr.replace(/^'|'$/g, '').replace(/^"|"$/g, '');
          options.schema = JSON.parse(cleanStr);
        } catch (e) {
          throw new Error(`Invalid JSON in --schema option: ${e.message}`);
        }
        break;
      case 'transform':
        options.transform = value;
        break;
      }
    } else if (!arg.startsWith('-')) {
      files.push(arg);
    }
  }
  
  return { options, files };
}

// ============================================================================
// TUI LAUNCHER
// ============================================================================

async function launchTUI() {
  try {
    // Check if blessed is installed
    require.resolve('blessed');
    
    console.log(color('Launching Terminal User Interface...', 'cyan'));
    console.log(color('Press Ctrl+Q to exit', 'dim'));
    
    // Check if TUI file exists and has content
    const tuiPath = path.join(__dirname, '../cli-tui.js');
    const stats = await fs.promises.stat(tuiPath);
    
    if (stats.size < 100) {
      console.log(color('⚠️  TUI interface is not fully implemented yet', 'yellow'));
      console.log(color('   Basic TUI will be started...', 'dim'));
      
      // Start basic TUI
      await startBasicTUI();
    } else {
      // Import and launch full TUI
      const JtcsvTUI = require('../cli-tui.js');
      const tui = new JtcsvTUI();
      tui.start();
    }
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error(color('Error: blessed is required for TUI interface', 'red'));
      console.log(color('Install it with:', 'dim'));
      console.log(color('  npm install blessed blessed-contrib', 'cyan'));
      console.log(color('\nOr use the CLI interface instead:', 'dim'));
      console.log(color('  jtcsv help', 'cyan'));
    } else {
      console.error(color(`Error: ${error.message}`, 'red'));
    }
    process.exit(1);
  }
}

async function startBasicTUI() {
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.clear();
  console.log(color('╔══════════════════════════════════════╗', 'cyan'));
  console.log(color('║        JTCSV Terminal Interface      ║', 'cyan'));
  console.log(color('╚══════════════════════════════════════╝', 'cyan'));
  console.log();
  console.log(color('Select operation:', 'bright'));
  console.log('  1. JSON → CSV');
  console.log('  2. CSV → JSON');
  console.log('  3. Preprocess JSON');
  console.log('  4. Batch Processing');
  console.log('  5. Exit');
  console.log();
  
  rl.question(color('Enter choice (1-5): ', 'cyan'), async (choice) => {
    switch (choice) {
      case '1':
        await runJsonToCsvTUI(rl);
        break;
      case '2':
        await runCsvToJsonTUI(rl);
        break;
      case '3':
        console.log(color('Preprocess feature coming soon...', 'yellow'));
        rl.close();
        break;
      case '4':
        console.log(color('Batch processing coming soon...', 'yellow'));
        rl.close();
        break;
      case '5':
        console.log(color('Goodbye!', 'green'));
        rl.close();
        process.exit(0);
        break;
      default:
        console.log(color('Invalid choice', 'red'));
        rl.close();
        process.exit(1);
    }
  });
}

async function runJsonToCsvTUI(rl) {
  console.clear();
  console.log(color('JSON → CSV Conversion', 'cyan'));
  console.log();
  
  rl.question('Input JSON file: ', (inputFile) => {
    rl.question('Output CSV file: ', async (outputFile) => {
      rl.question('Delimiter (default: ;): ', async (delimiter) => {
        try {
          console.log(color('\nConverting...', 'dim'));
          
          const result = await convertJsonToCsv(inputFile, outputFile, {
            delimiter: delimiter || ';',
            silent: false
          });
          
          console.log(color('\n✓ Conversion complete!', 'green'));
          rl.question('\nPress Enter to continue...', () => {
            rl.close();
            startBasicTUI();
          });
        } catch (error) {
          console.error(color(`✗ Error: ${error.message}`, 'red'));
          rl.close();
          process.exit(1);
        }
      });
    });
  });
}

async function runCsvToJsonTUI(rl) {
  console.clear();
  console.log(color('CSV → JSON Conversion', 'cyan'));
  console.log();
  
  rl.question('Input CSV file: ', (inputFile) => {
    rl.question('Output JSON file: ', async (outputFile) => {
      rl.question('Delimiter (default: ;): ', async (delimiter) => {
        rl.question('Pretty print? (y/n): ', async (pretty) => {
          try {
            console.log(color('\nConverting...', 'dim'));
            
            const result = await convertCsvToJson(inputFile, outputFile, {
              delimiter: delimiter || ';',
              pretty: pretty.toLowerCase() === 'y',
              silent: false
            });
            
            console.log(color('\n✓ Conversion complete!', 'green'));
            rl.question('\nPress Enter to continue...', () => {
              rl.close();
              startBasicTUI();
            });
          } catch (error) {
            console.error(color(`✗ Error: ${error.message}`, 'red'));
            rl.close();
            process.exit(1);
          }
        });
      });
    });
  });
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const command = args[0].toLowerCase();
  const { options, files } = parseOptions(args.slice(1));
  
  // Handle dry run
  if (options.dryRun) {
    console.log(color('DRY RUN - No files will be modified', 'yellow'));
    console.log(`Command: ${command}`);
    console.log(`Files: ${files.join(', ')}`);
    console.log(`Options:`, options);
    return;
  }
  
  // Suppress output if silent mode
  if (options.silent) {
    console.log = () => {};
    console.info = () => {};
  }
  
  switch (command) {
    // Main conversion commands
    case 'json-to-csv':
    case 'json2csv':
      if (files.length < 2) {
        console.error(color('Error: Input and output files required', 'red'));
        console.log(color('Usage: jtcsv json-to-csv input.json output.csv', 'cyan'));
        process.exit(1);
      }
      await convertJsonToCsv(files[0], files[1], options);
      break;
      
    case 'csv-to-json':
    case 'csv2json':
      if (files.length < 2) {
        console.error(color('Error: Input and output files required', 'red'));
        console.log(color('Usage: jtcsv csv-to-json input.csv output.json', 'cyan'));
        process.exit(1);
      }
      await convertCsvToJson(files[0], files[1], options);
      break;
      
    case 'save-json':
      if (files.length < 2) {
        console.error(color('Error: Input and output files required', 'red'));
        console.log(color('Usage: jtcsv save-json input.json output.json', 'cyan'));
        process.exit(1);
      }
      await saveAsJson(files[0], files[1], options);
      break;
      
    case 'preprocess':
      if (files.length < 2) {
        console.error(color('Error: Input and output files required', 'red'));
        console.log(color('Usage: jtcsv preprocess input.json output.json', 'cyan'));
        process.exit(1);
      }
      await preprocessJson(files[0], files[1], options);
      break;
      
    // Streaming commands
    case 'stream':
      if (args.length < 2) {
        console.error(color('Error: Streaming mode requires subcommand', 'red'));
        console.log(color('Usage: jtcsv stream [json-to-csv|csv-to-json|file-to-csv|file-to-json]', 'cyan'));
        process.exit(1);
      }
      
      const streamCommand = args[1].toLowerCase();
      if (streamCommand === 'json-to-csv' && files.length >= 2) {
        await streamJsonToCsv(files[0], files[1], options);
      } else if (streamCommand === 'csv-to-json' && files.length >= 2) {
        await streamCsvToJson(files[0], files[1], options);
      } else if (streamCommand === 'file-to-csv' && files.length >= 2) {
        // Use jtcsv streaming API if available
        try {
          const readStream = fs.createReadStream(files[0], 'utf8');
          const writeStream = fs.createWriteStream(files[1], 'utf8');
          
          if (options.addBOM) {
            writeStream.write('\uFEFF');
          }
          
          const transformStream = jtcsv.createJsonToCsvStream(options);
          await pipeline(readStream, transformStream, writeStream);
          
          console.log(color('✓ File streamed successfully', 'green'));
        } catch (error) {
          console.error(color(`✗ Streaming error: ${error.message}`, 'red'));
          process.exit(1);
        }
      } else if (streamCommand === 'file-to-json' && files.length >= 2) {
        // Use jtcsv streaming API if available
        try {
          const readStream = fs.createReadStream(files[0], 'utf8');
          const writeStream = fs.createWriteStream(files[1], 'utf8');
          
          const transformStream = jtcsv.createCsvToJsonStream(options);
          await pipeline(readStream, transformStream, writeStream);
          
          console.log(color('✓ File streamed successfully', 'green'));
        } catch (error) {
          console.error(color(`✗ Streaming error: ${error.message}`, 'red'));
          process.exit(1);
        }
      } else {
        console.error(color('Error: Invalid streaming command or missing files', 'red'));
        process.exit(1);
      }
      break;
      
    // Batch processing commands
    case 'batch':
      if (args.length < 2) {
        console.error(color('Error: Batch mode requires subcommand', 'red'));
        console.log(color('Usage: jtcsv batch [json-to-csv|csv-to-json|process]', 'cyan'));
        process.exit(1);
      }
      
      const batchCommand = args[1].toLowerCase();
      if (batchCommand === 'json-to-csv' && files.length >= 2) {
        await batchJsonToCsv(files[0], files[1], options);
      } else if (batchCommand === 'csv-to-json' && files.length >= 2) {
        await batchCsvToJson(files[0], files[1], options);
      } else if (batchCommand === 'process' && files.length >= 2) {
        console.log(color('Mixed batch processing coming soon...', 'yellow'));
        // TODO: Implement mixed batch processing
      } else {
        console.error(color('Error: Invalid batch command or missing files', 'red'));
        process.exit(1);
      }
      break;
      
    // TUI command
    case 'tui':
      await launchTUI();
      break;
      
    // Help and version
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    case 'version':
    case '-v':
    case '--version':
      showVersion();
      break;
      
    default:
      console.error(color(`Error: Unknown command '${command}'`, 'red'));
      console.log(color('Use jtcsv help for available commands', 'cyan'));
      process.exit(1);
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('uncaughtException', (error) => {
  console.error(color(`\n✗ Uncaught error: ${error.message}`, 'red'));
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(color(`\n✗ Unhandled promise rejection: ${error.message}`, 'red'));
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error(color(`\n✗ Fatal error: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = { main };
