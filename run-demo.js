#!/usr/bin/env node

/**
 * Run Demo Script for jtcsv
 * 
 * Starts various demo servers and examples
 * Usage: npm run demo
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting jtcsv demos...\n');

async function runDemo() {
  console.log('📋 Available demos:');
  console.log('1. Express API Demo');
  console.log('2. Plugin Examples');
  console.log('3. Web Demo (Vue.js)');
  console.log('4. CLI TUI Interface');
  console.log('5. All demos\n');

  // For now, just start the Express API demo
  console.log('🌐 Starting Express API Demo...');
  
  const expressDemo = path.join(__dirname, 'examples', 'express-api.js');
  
  if (fs.existsSync(expressDemo)) {
    const child = spawn('node', [expressDemo], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error(`❌ Failed to start demo: ${error.message}`);
    });
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping demo...');
      child.kill('SIGINT');
      process.exit(0);
    });
  } else {
    console.log('❌ Express demo not found. Run examples directly:');
    console.log('   node examples/express-api.js');
    console.log('   node examples/plugin-excel-exporter.js');
    console.log('   cd demo && npm run dev');
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(`\n❌ Demo error: ${error.message}`);
  process.exit(1);
});

// Run demo
runDemo().catch(error => {
  console.error(`\n❌ Failed to run demo: ${error.message}`);
  process.exit(1);
});



