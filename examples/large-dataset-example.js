// Large dataset example for jtcsv
// Demonstrates handling of large datasets and memory efficiency

const { jsonToCsv } = require('jtcsv');
const fs = require('fs');
const path = require('path');

// Generate large dataset
function generateLargeDataset(rows) {
  console.log(`Generating ${rows.toLocaleString()} records...`);
  
  const dataset = [];
  const batchSize = 10000;
  const batches = Math.ceil(rows / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, rows);
    
    for (let i = start; i < end; i++) {
      dataset.push({
        id: i + 1,
        timestamp: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
        userId: `user_${Math.floor(Math.random() * 10000)}`,
        action: ['login', 'purchase', 'view', 'click', 'logout'][Math.floor(Math.random() * 5)],
        amount: Math.random() * 1000,
        success: Math.random() > 0.1,
        metadata: {
          ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: `Browser/${Math.floor(Math.random() * 100)}`,
          sessionId: `session_${Math.random().toString(36).substr(2, 9)}`
        },
        tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, 
          () => ['tag' + Math.floor(Math.random() * 20), 'cat' + Math.floor(Math.random() * 10)]
        ).flat()
      });
    }
    
    if ((batch + 1) % 10 === 0 || batch === batches - 1) {
      console.log(`  Generated ${Math.min((batch + 1) * batchSize, rows).toLocaleString()} records`);
    }
  }
  
  return dataset;
}

// Memory usage helper
function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024)
  };
}

// Benchmark conversion
async function benchmarkConversion(dataset, name) {
  console.log(`\n${name}:`);
  console.log(`  Records: ${dataset.length.toLocaleString()}`);
  
  const memBefore = getMemoryUsage();
  console.log(`  Memory before: ${memBefore.heapUsed}MB heap`);
  
  const startTime = performance.now();
  
  try {
    const csv = jsonToCsv(dataset, {
      delimiter: ','
    });
    
    const endTime = performance.now();
    const memAfter = getMemoryUsage();
    
    console.log(`  Conversion time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`  Memory after: ${memAfter.heapUsed}MB heap`);
    console.log(`  Memory delta: ${(memAfter.heapUsed - memBefore.heapUsed)}MB`);
    console.log(`  CSV size: ${(csv.length / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Rows/second: ${Math.round((dataset.length / (endTime - startTime)) * 1000).toLocaleString()}`);
    
    return csv;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

// Save CSV in chunks (for very large files)
function saveCsvInChunks(csv, filename, chunkSize = 10 * 1024 * 1024) { // 10MB chunks
  console.log(`\nSaving CSV in chunks to ${filename}...`);
  
  const totalChunks = Math.ceil(csv.length / chunkSize);
  const writeStream = fs.createWriteStream(filename);
  
  return new Promise((resolve, reject) => {
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, csv.length);
      const chunk = csv.substring(start, end);
      
      if (!writeStream.write(chunk)) {
        // Wait for drain if buffer is full
        writeStream.once('drain', () => {
          if (i % 10 === 0 || i === totalChunks - 1) {
            console.log(`  Written chunk ${i + 1}/${totalChunks} (${Math.round((i + 1) / totalChunks * 100)}%)`);
          }
        });
      } else {
        if (i % 10 === 0 || i === totalChunks - 1) {
          console.log(`  Written chunk ${i + 1}/${totalChunks} (${Math.round((i + 1) / totalChunks * 100)}%)`);
        }
      }
    }
    
    writeStream.end();
  });
}

// Main function
async function main() {
  console.log('📊 jtcsv Large Dataset Demo');
  console.log('=' .repeat(50));
  
  // Test with different dataset sizes
  const testSizes = [1000, 10000, 50000];
  
  for (const size of testSizes) {
    const dataset = generateLargeDataset(size);
    const csv = await benchmarkConversion(dataset, `Dataset: ${size.toLocaleString()} records`);
    
    if (csv && size === 50000) {
      // Save the largest dataset as example
      const filename = `large-dataset-${size}-records.csv`;
      await saveCsvInChunks(csv, filename);
      
      const stats = fs.statSync(filename);
      console.log(`\n✅ Saved to ${filename}`);
      console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Show first few lines
      const sample = csv.split('\n').slice(0, 3).join('\n');
      console.log('\nSample output (first 3 lines):');
      console.log(sample);
      console.log('...');
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  console.log('\n🎯 Performance Summary:');
  console.log('| Records | Approx. Time | Memory Usage | CSV Size |');
  console.log('|---------|--------------|--------------|----------|');
  console.log('| 1,000   | ~5ms         | ~2MB         | ~0.5MB   |');
  console.log('| 10,000  | ~50ms        | ~10MB        | ~5MB     |');
  console.log('| 50,000  | ~250ms       | ~40MB        | ~25MB    |');
  console.log('| 100,000 | ~500ms*      | ~80MB*       | ~50MB*   |');
  console.log('\n* Estimated values');
  
  console.log('\n💡 Tips for very large datasets:');
  console.log('1. Use the maxRecords option optionally to limit processing');
  console.log('2. Process data in batches if memory is limited');
  console.log('3. Use saveAsCsv() for secure file writing');
  console.log('4. Monitor memory usage with process.memoryUsage()');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateLargeDataset,
  benchmarkConversion,
  saveCsvInChunks
};
