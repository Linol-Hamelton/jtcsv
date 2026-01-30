#!/usr/bin/env node

/**
 * Streaming Example for jtcsv
 * 
 * Demonstrates bidirectional streaming with large datasets
 * and real-time progress monitoring.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const jtcsv = require('../index.js');

async function generateLargeJsonFile(filePath, recordCount) {
  console.log(`Generating ${recordCount} records...`);
  
  const writeStream = fs.createWriteStream(filePath, 'utf8');
  
  // Write opening bracket for JSON array
  writeStream.write('[');
  
  for (let i = 1; i <= recordCount; i++) {
    const record = {
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
      active: Math.random() > 0.5,
      score: Math.random() * 100,
      tags: ['customer', `tier${Math.floor(Math.random() * 3) + 1}`],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    const jsonRecord = JSON.stringify(record);
    writeStream.write(jsonRecord);
    
    if (i < recordCount) {
      writeStream.write(',');
    }
    
    // Show progress every 10,000 records
    if (i % 10000 === 0) {
      process.stdout.write(`  Generated ${i} records\r`);
    }
  }
  
  // Write closing bracket
  writeStream.write(']');
  
  await new Promise((resolve) => {
    writeStream.end(() => {
      console.log(`\nGenerated ${recordCount} records in ${filePath}`);
      resolve();
    });
  });
}

async function exampleJsonToCsvStreaming() {
  console.log('\n=== Example 1: JSON to CSV Streaming ===');
  
  const inputFile = './examples/large-data.json';
  const outputFile = './examples/large-data.csv';
  
  // Generate test data if needed
  if (!fs.existsSync(inputFile)) {
    await generateLargeJsonFile(inputFile, 100000);
  }
  
  console.log('Converting JSON to CSV using streaming...');
  
  const startTime = Date.now();
  
  try {
    // Create readable stream from file
    const readStream = fs.createReadStream(inputFile, 'utf8');
    
    // Parse JSON stream (simplified - in real app use proper JSON stream parser)
    let buffer = '';
    let recordCount = 0;
    
    const jsonStream = new (require('stream').Transform)({
      objectMode: true,
      transform(chunk, encoding, callback) {
        buffer += chunk;
        
        // Simple JSON parsing for demonstration
        // In production, use a proper JSON stream parser
        try {
          const data = JSON.parse(buffer);
          if (Array.isArray(data)) {
            data.forEach(item => {
              this.push(item);
              recordCount++;
              
              if (recordCount % 10000 === 0) {
                console.log(`  Processed ${recordCount} records`);
              }
            });
          }
          buffer = '';
        } catch (error) {
          // Incomplete JSON, wait for more data
        }
        
        callback();
      },
      
      flush(callback) {
        // Process any remaining data
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer);
            if (Array.isArray(data)) {
              data.forEach(item => {
                this.push(item);
                recordCount++;
              });
            }
          } catch (error) {
            console.error('Error parsing final JSON:', error.message);
          }
        }
        callback();
      }
    });
    
    // Create CSV transform stream
    const csvStream = jtcsv.createJsonToCsvStream({
      delimiter: ',',
      includeHeaders: true,
      renameMap: {
        id: 'ID',
        name: 'Full Name',
        email: 'Email Address',
        age: 'Age',
        active: 'Active Status',
        score: 'Score',
        'metadata.created': 'Created Date',
        'metadata.updated': 'Updated Date'
      },
      preventCsvInjection: true,
      rfc4180Compliant: true
    });
    
    // Create write stream
    const writeStream = fs.createWriteStream(outputFile, 'utf8');
    
    // Add UTF-8 BOM for Excel compatibility
    writeStream.write('\uFEFF');
    
    // Pipe streams together
    await pipeline(
      readStream,
      jsonStream,
      csvStream,
      writeStream
    );
    
    const elapsed = Date.now() - startTime;
    console.log(`✓ Converted ${recordCount} records in ${elapsed}ms`);
    
    // Show file sizes
    const inputStats = fs.statSync(inputFile);
    const outputStats = fs.statSync(outputFile);
    
    console.log(`  Input:  ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Output: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function exampleCsvToJsonStreaming() {
  console.log('\n=== Example 2: CSV to JSON Streaming ===');
  
  const inputFile = './examples/large-data.csv';
  const outputFile = './examples/streamed-output.json';
  
  if (!fs.existsSync(inputFile)) {
    console.log('CSV file not found. Run Example 1 first.');
    return;
  }
  
  console.log('Converting CSV to JSON using streaming...');
  
  const startTime = Date.now();
  
  try {
    // Create CSV read stream
    const readStream = fs.createReadStream(inputFile, 'utf8');
    
    // Create CSV to JSON transform stream
    const jsonStream = jtcsv.createCsvToJsonStream({
      delimiter: ',',
      hasHeaders: true,
      parseNumbers: true,
      parseBooleans: true,
      renameMap: {
        'ID': 'id',
        'Full Name': 'name',
        'Email Address': 'email',
        'Age': 'age',
        'Active Status': 'active',
        'Score': 'score',
        'Created Date': 'created',
        'Updated Date': 'updated'
      }
    });
    
    // Create JSON write stream
    const writeStream = fs.createWriteStream(outputFile, 'utf8');
    
    // Write opening bracket
    writeStream.write('[');
    
    let recordCount = 0;
    let firstRecord = true;
    
    // Custom transform to format JSON array
    const arrayFormatter = new (require('stream').Transform)({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const jsonRecord = JSON.stringify(chunk);
        
        if (!firstRecord) {
          writeStream.write(',');
        } else {
          firstRecord = false;
        }
        
        writeStream.write(jsonRecord);
        
        recordCount++;
        if (recordCount % 10000 === 0) {
          console.log(`  Processed ${recordCount} records`);
        }
        
        callback();
      },
      
      flush(callback) {
        // Write closing bracket
        writeStream.write(']');
        callback();
      }
    });
    
    // Pipe streams together
    await pipeline(
      readStream,
      jsonStream,
      arrayFormatter
    );
    
    // Close write stream
    await new Promise((resolve) => {
      writeStream.end(() => resolve());
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✓ Converted ${recordCount} records in ${elapsed}ms`);
    
    // Verify roundtrip
    const inputStats = fs.statSync(inputFile);
    const outputStats = fs.statSync(outputFile);
    
    console.log(`  Input:  ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Output: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Sample verification
    const sampleData = require(outputFile).slice(0, 3);
    console.log('\nSample of converted data (first 3 records):');
    console.log(JSON.stringify(sampleData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function exampleBidirectionalStreaming() {
  console.log('\n=== Example 3: Bidirectional Streaming Pipeline ===');
  
  const inputFile = './examples/large-data.json';
  const tempFile = './examples/temp-stream.csv';
  const outputFile = './examples/final-stream.json';
  
  if (!fs.existsSync(inputFile)) {
    await generateLargeJsonFile(inputFile, 50000);
  }
  
  console.log('Running bidirectional streaming pipeline...');
  console.log('JSON → CSV → JSON roundtrip');
  
  const startTime = Date.now();
  
  try {
    // Step 1: JSON to CSV
    console.log('\nStep 1: Converting JSON to CSV...');
    
    const jsonToCsvOptions = {
      delimiter: ',',
      includeHeaders: true,
      preventCsvInjection: true
    };
    
    // For simplicity, we'll use the regular conversion
    // In production, you would use proper streaming
    const jsonData = require(inputFile);
    const csvData = jtcsv.jsonToCsv(jsonData, jsonToCsvOptions);
    
    await fs.promises.writeFile(tempFile, csvData, 'utf8');
    
    const step1Time = Date.now() - startTime;
    console.log(`  ✓ Step 1 completed in ${step1Time}ms`);
    
    // Step 2: CSV to JSON
    console.log('\nStep 2: Converting CSV to JSON...');
    
    const csvToJsonOptions = {
      delimiter: ',',
      hasHeaders: true,
      parseNumbers: true,
      parseBooleans: true
    };
    
    const finalData = await jtcsv.readCsvAsJson(tempFile, csvToJsonOptions);
    
    await fs.promises.writeFile(
      outputFile,
      JSON.stringify(finalData, null, 2),
      'utf8'
    );
    
    const totalTime = Date.now() - startTime;
    console.log(`  ✓ Step 2 completed in ${totalTime - step1Time}ms`);
    
    // Verification
    console.log('\nVerification:');
    console.log(`  Original records: ${jsonData.length}`);
    console.log(`  Final records: ${finalData.length}`);
    
    // Check if data survived roundtrip
    const sampleOriginal = jsonData[0];
    const sampleFinal = finalData[0];
    
    console.log('\nSample comparison (first record):');
    console.log('  Original:', JSON.stringify(sampleOriginal).substring(0, 100) + '...');
    console.log('  Final:   ', JSON.stringify(sampleFinal).substring(0, 100) + '...');
    
    // Cleanup temp file
    await fs.promises.unlink(tempFile).catch(() => {});
    
    console.log(`\n✓ Bidirectional streaming completed in ${totalTime}ms`);
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Cleanup on error
    try {
      await fs.promises.unlink(tempFile);
    } catch (_e) {
      // Ignore cleanup errors
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('jtcsv Streaming Examples');
  console.log('='.repeat(60));
  
  // Create examples directory
  const examplesDir = './examples';
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }
  
  try {
    await exampleJsonToCsvStreaming();
    await exampleCsvToJsonStreaming();
    await exampleBidirectionalStreaming();
    
    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));
    
    console.log('\nTry these commands:');
    console.log('  • Launch TUI:        npx jtcsv tui');
    console.log('  • Convert JSON:      npx jtcsv json2csv examples/large-data.json output.csv');
    console.log('  • Convert CSV:       npx jtcsv csv2json examples/large-data.csv output.json');
    console.log('  • Streaming mode:    npx jtcsv stream json2csv examples/large-data.json streamed.csv');
    
  } catch (error) {
    console.error('\nError running examples:', error.message);
    process.exit(1);
  }
}

// Run examples
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateLargeJsonFile,
  exampleJsonToCsvStreaming,
  exampleCsvToJsonStreaming,
  exampleBidirectionalStreaming
};
