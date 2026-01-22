# How-to Guides for jtcsv

## Export Database to CSV in 5 Lines

### Using PostgreSQL with pg

```javascript
const { Pool } = require('pg');
const { saveAsCsv } = require('jtcsv');

const pool = new Pool({ /* your config */ });

async function exportUsersToCsv() {
  const result = await pool.query('SELECT * FROM users');
  await saveAsCsv(result.rows, './users-export.csv', {
    delimiter: ',',
    renameMap: {
      id: 'User ID',
      email: 'Email',
      created_at: 'Registration Date'
    }
  });
  console.log('✅ Exported', result.rowCount, 'users');
}
```

### Using MongoDB with mongoose

```javascript
const mongoose = require('mongoose');
const { saveAsCsv } = require('jtcsv');

async function exportProductsToCsv() {
  const products = await mongoose.model('Product').find({});
  
  // Convert Mongoose documents to plain objects
  const plainProducts = products.map(doc => doc.toObject());
  
  await saveAsCsv(plainProducts, './products-export.csv');
  console.log('✅ Exported', products.length, 'products');
}
```

## Bulk Convert Multiple JSON Files

```javascript
const fs = require('fs').promises;
const path = require('path');
const { jsonToCsv } = require('jtcsv');

async function convertJsonFiles(inputDir, outputDir) {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Read all JSON files
  const files = await fs.readdir(inputDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} JSON files`);
  
  for (const file of jsonFiles) {
    try {
      // Read JSON file
      const filePath = path.join(inputDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Convert to CSV
      const csv = jsonToCsv(data, { delimiter: ',' });
      
      // Save CSV file
      const csvFileName = file.replace('.json', '.csv');
      const csvPath = path.join(outputDir, csvFileName);
      await fs.writeFile(csvPath, csv, 'utf8');
      
      console.log(`✅ Converted ${file} -> ${csvFileName}`);
    } catch (error) {
      console.error(`❌ Error converting ${file}:`, error.message);
    }
  }
  
  console.log('\n🎉 Conversion complete!');
}

// Usage:
// convertJsonFiles('./json-files', './csv-files');
```

## Handle API Responses

### Convert API response to downloadable CSV

```javascript
const express = require('express');
const axios = require('axios');
const { jsonToCsv } = require('jtcsv');

const app = express();

app.get('/export/github-users', async (req, res) => {
  try {
    // Fetch data from GitHub API
    const response = await axios.get('https://api.github.com/users', {
      headers: { 'User-Agent': 'jtcsv-example' }
    });
    
    // Transform data (keep only needed fields)
    const users = response.data.map(user => ({
      id: user.id,
      login: user.login,
      name: user.name || '',
      company: user.company || '',
      blog: user.blog || '',
      location: user.location || '',
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following
    }));
    
    // Convert to CSV
    const csv = jsonToCsv(users, {
      delimiter: ',',
      renameMap: {
        login: 'Username',
        public_repos: 'Public Repos',
        followers: 'Followers'
      }
    });
    
    // Send as downloadable file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="github-users.csv"');
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Process Log Files

### Convert JSON logs to CSV for analysis

```javascript
const fs = require('fs');
const readline = require('readline');
const { jsonToCsv } = require('jtcsv');

async function processLogFile(logFilePath, outputPath) {
  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const logs = [];
  
  // Read line by line (for large files)
  for await (const line of rl) {
    try {
      const log = JSON.parse(line);
      
      // Extract relevant fields
      logs.push({
        timestamp: log.timestamp || log.time || log.date,
        level: log.level || log.severity,
        message: log.message,
        service: log.service || log.app,
        userId: log.userId || log.user,
        ip: log.ip || log.clientIp
      });
      
      // Process in batches to avoid memory issues
      if (logs.length >= 10000) {
        await processBatch(logs, outputPath);
        logs.length = 0; // Clear array
      }
    } catch (error) {
      // Skip invalid JSON lines
      console.warn('Skipping invalid JSON line:', line.substring(0, 100));
    }
  }
  
  // Process remaining logs
  if (logs.length > 0) {
    await processBatch(logs, outputPath);
  }
  
  console.log('✅ Log processing complete');
}

async function processBatch(logs, outputPath) {
  const csv = jsonToCsv(logs, { delimiter: ',' });
  
  // Append to file
  await fs.promises.appendFile(outputPath, csv + '\n', 'utf8');
  
  console.log(`Processed batch of ${logs.length} logs`);
}
```

## Excel-Specific Features

### Prepare data for Excel with proper formatting

```javascript
const { jsonToCsv } = require('jtcsv');

const salesData = [
  {
    date: '2024-01-15',
    product: 'Laptop',
    quantity: 5,
    price: 999.99,
    total: '=C2*D2', // Excel formula
    notes: 'Special order'
  },
  {
    date: '2024-01-16',
    product: 'Mouse',
    quantity: 20,
    price: 29.99,
    total: '=C3*D3',
    notes: 'Bulk purchase'
  }
];

// jtcsv automatically escapes Excel formulas
const csv = jsonToCsv(salesData, {
  delimiter: ',',
  renameMap: {
    date: 'Date',
    product: 'Product',
    quantity: 'Qty',
    price: 'Price',
    total: 'Total',
    notes: 'Notes'
  }
});

console.log(csv);
// Formulas are escaped: '=C2*D2' becomes '\'=C2*D2'
```

## Security Best Practices

### Safe file handling

```javascript
const { saveAsCsv } = require('jtcsv');

async function safeExport(data, userInput) {
  try {
    // NEVER use user input directly in file paths
    // const filename = userInput + '.csv'; // DANGEROUS!
    
    // Instead, use safe naming
    const safeFilename = `export-${Date.now()}.csv`;
    const safePath = `./exports/${safeFilename}`;
    
    // saveAsCsv validates paths automatically
    await saveAsCsv(data, safePath);
    
    console.log('✅ File saved safely');
  } catch (error) {
    if (error.message.includes('Directory traversal')) {
      console.error('🚨 Security violation detected!');
    }
    throw error;
  }
}
```

### Input validation

```javascript
const { jsonToCsv } = require('jtcsv');

function validateAndConvert(userData) {
  // Validate input
  if (!Array.isArray(userData)) {
    throw new Error('Data must be an array');
  }
  
  if (userData.length > 100000) {
    throw new Error('Too many records (max 100,000)');
  }
  
  // Check for suspicious content
  const hasSuspiciousContent = userData.some(item => 
    JSON.stringify(item).includes('=cmd|') ||
    JSON.stringify(item).includes('powershell')
  );
  
  if (hasSuspiciousContent) {
    console.warn('⚠️ Suspicious content detected');
  }
  
  // Convert with optional safety limits
  return jsonToCsv(userData, {
    maxRecords: userData.length > 50000 ? 50000 : undefined
  });
}
```

## Performance Tips

1. **Batch Processing**: For millions of records, process in batches
2. **Streaming**: Use streams for file I/O with large datasets
3. **Memory Monitoring**: Check `process.memoryUsage()` during conversion
4. **Limit Fields**: Only include necessary fields in output
5. **Use maxRecords optionally**: Set limits to prevent accidental processing of huge datasets

## Common Use Cases

1. **Data Migration**: Convert JSON dumps to CSV for database import
2. **Reporting**: Generate CSV reports from application data
3. **Data Exchange**: Share data with non-technical users (Excel compatible)
4. **Log Analysis**: Convert JSON logs to CSV for spreadsheet analysis
5. **API Integration**: Provide CSV exports from REST APIs
6. **Backup**: Create human-readable backups of database records