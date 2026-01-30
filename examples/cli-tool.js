#!/usr/bin/env node

// jtcsv CLI Tool
// Usage: node cli-tool.js input.json output.csv [options]
// Example: node cli-tool.js data.json output.csv --delimiter=,

const fs = require('fs');
const path = require('path');
const { jsonToCsv, saveAsCsv } = require('../index.js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    input: null,
    output: null,
    delimiter: ';',
    noHeaders: false,
    help: false,
    version: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      
      switch (key) {
      case 'delimiter':
        result.delimiter = value || ',';
        break;
      case 'no-headers':
        result.noHeaders = true;
        break;
      case 'help':
        result.help = true;
        break;
      case 'version':
        result.version = true;
        break;
      default:
        console.warn(`Warning: Unknown option --${key}`);
      }
    } else if (!result.input) {
      result.input = arg;
    } else if (!result.output) {
      result.output = arg;
    }
  }
  
  return result;
}

// Show help
function showHelp() {
  console.log(`
jtcsv CLI Tool - Convert JSON files to CSV
`);
  console.log('Usage:');
  console.log('  node cli-tool.js <input.json> [output.csv] [options]');
  console.log('  node cli-tool.js --help');
  console.log('  node cli-tool.js --version');
  console.log('');
  console.log('Arguments:');
  console.log('  input.json          Input JSON file (required)');
  console.log('  output.csv          Output CSV file (optional, prints to stdout if not provided)');
  console.log('');
  console.log('Options:');
  console.log('  --delimiter=<char>  CSV delimiter (default: ;)');
  console.log('  --no-headers        Do not include headers in output');
  console.log('  --help              Show this help message');
  console.log('  --version           Show version');
  console.log('');
  console.log('Examples:');
  console.log('  # Convert data.json to data.csv with comma delimiter');
  console.log('  node cli-tool.js data.json data.csv --delimiter=,');
  console.log('');
  console.log('  # Convert and print to console');
  console.log('  node cli-tool.js data.json');
  console.log('');
  console.log('  # Convert without headers');
  console.log('  node cli-tool.js data.json output.csv --no-headers');
}

// Show version
function showVersion() {
  const packageJson = require('../package.json');
  console.log(`jtcsv CLI Tool v${packageJson.version}`);
}

// Read JSON file
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
    throw error;
  }
}

// Main function
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }
  
  if (args.version) {
    showVersion();
    return;
  }
  
  if (!args.input) {
    console.error('Error: Input file is required');
    showHelp();
    process.exit(1);
  }
  
  try {
    // Read and validate input
    console.log(`Reading ${args.input}...`);
    const data = readJsonFile(args.input);
    
    if (!Array.isArray(data)) {
      throw new Error('JSON data must be an array of objects');
    }
    
    console.log(`Found ${data.length} records`);
    
    // Convert to CSV
    const options = {
      delimiter: args.delimiter,
      includeHeaders: !args.noHeaders
    };
    
    if (args.output) {
      // Save to file
      console.log(`Converting to CSV with delimiter '${args.delimiter}'...`);
      
      // Using saveAsCsv for better security
      await saveAsCsv(data, args.output, options);
      
      const stats = fs.statSync(args.output);
      console.log(`✅ Successfully saved to ${args.output}`);
      console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Records: ${data.length}`);
    } else {
      // Print to stdout
      const csv = jsonToCsv(data, options);
      console.log(csv);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    
    if (error.message.includes('Directory traversal')) {
      console.error('   Security violation: Attempted directory traversal');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught error:', error.message);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseArgs, readJsonFile, showHelp, showVersion };
