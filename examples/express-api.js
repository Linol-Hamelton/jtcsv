// Express API example for jtcsv
// Run: node examples/express-api.js
// Then visit: http://localhost:3000/export/users

const express = require('express');
const { jsonToCsv } = require('../index.js');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Mock database
const mockUsers = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 3 === 0 ? 'admin' : i % 3 === 1 ? 'moderator' : 'user',
  status: i % 5 === 0 ? 'inactive' : 'active',
  createdAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
  profile: {
    age: Math.floor(Math.random() * 50) + 18,
    country: ['USA', 'UK', 'Germany', 'France', 'Japan'][Math.floor(Math.random() * 5)],
    bio: `Bio for user ${i + 1}`
  },
  tags: ['customer', `tier${Math.floor(Math.random() * 3) + 1}`]
}));

// Middleware
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'jtcsv Express API Example',
    endpoints: [
      'GET /export/users - Export users as CSV',
      'GET /export/users/download - Download users CSV file',
      'POST /export/custom - Convert custom JSON to CSV'
    ]
  });
});

// Export users as CSV (inline)
app.get('/export/users', (req, res) => {
  try {
    const csv = jsonToCsv(mockUsers, {
      delimiter: ',',
      renameMap: {
        id: 'ID',
        name: 'Full Name',
        email: 'Email Address',
        role: 'Role',
        status: 'Status',
        'profile.age': 'Age',
        'profile.country': 'Country',
        'profile.bio': 'Bio',
        'createdAt': 'Created At'
      }
    });
    
    res.set('Content-Type', 'text/plain');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download users CSV file
app.get('/export/users/download', async (req, res) => {
  try {
    const csv = jsonToCsv(mockUsers, {
      delimiter: ',',
      renameMap: {
        id: 'ID',
        name: 'Full Name',
        email: 'Email Address'
      }
    });
    
    const filename = `users-export-${Date.now()}.csv`;
    const filePath = path.join(__dirname, 'temp', filename);
    
    // Ensure temp directory exists
    await fs.mkdir(path.join(__dirname, 'temp'), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, csv, 'utf8');
    
    // Send file for download
    res.download(filePath, filename, (err) => {
      // Clean up temp file
      fs.unlink(filePath).catch(() => {});
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert custom JSON to CSV
app.post('/export/custom', (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }
    
    // Limit to 10,000 records for safety
    const safeData = data.slice(0, 10000);
    
    const csv = jsonToCsv(safeData, {
      delimiter: options.delimiter || ',',
      renameMap: options.renameMap || {},
      maxRecords: 10000
    });
    
    res.json({
      success: true,
      records: safeData.length,
      csvSize: csv.length,
      csv: options.returnCsv !== false ? csv : undefined
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      type: error.constructor.name
    });
  }
});

// Example with CSV injection protection
app.get('/export/safe', (req, res) => {
  const dangerousData = [
    { id: 1, input: '=cmd|"/c calc.exe"!A0', note: 'Malicious formula' },
    { id: 2, input: '@SUM(A1:A10)', note: 'Excel function' },
    { id: 3, input: '+1-1', note: 'Another formula' },
    { id: 4, input: '-2+2', note: 'Formula with minus' },
    { id: 5, input: 'Normal text', note: 'Safe content' },
    { id: 6, input: 'Text with, commas', note: 'With comma' },
    { id: 7, input: 'Text with\nnewlines', note: 'With newline' },
    { id: 8, input: 'Text with "quotes"', note: 'With quotes' }
  ];
  
  const csv = jsonToCsv(dangerousData, { delimiter: ',' });
  
  res.set('Content-Type', 'text/plain');
  res.send(`# CSV Injection Protection Demo\n\n${csv}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express API running at http://localhost:${PORT}`);
  console.log('📊 Try these endpoints:');
  console.log(`   http://localhost:${PORT}/export/users`);
  console.log(`   http://localhost:${PORT}/export/users/download`);
  console.log(`   http://localhost:${PORT}/export/safe`);
  console.log('\nExample POST to /export/custom:');
  console.log(`curl -X POST http://localhost:${PORT}/export/custom \\
  -H "Content-Type: application/json" \\
  -d '{"data":[{"name":"John","age":30}],"options":{"delimiter":";"}}'`);
});

module.exports = app;