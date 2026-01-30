#!/usr/bin/env node

/**
 * Простой HTTP сервер для запуска демо web worker
 * Решает проблему CORS при запуске из файловой системы
 */

import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const PORT = 3000;
const DEMO_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Default to index.html
  if (pathname === '/') {
    pathname = '/web-worker-usage.html';
  }
  
  // Security: prevent directory traversal
  const sanitizedPath = pathname.replace(/\.\./g, '');
  const filePath = path.join(DEMO_DIR, sanitizedPath);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    
    // Get file extension
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Read and serve file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      
      // Special handling for worker.js to set correct MIME type
      if (ext === '.js' && filePath.includes('worker')) {
        res.writeHead(200, { 
          'Content-Type': 'text/javascript; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
      } else {
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
      }
      
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`
🚀 Демо сервер запущен!
📁 Директория: ${DEMO_DIR}
🌐 Откройте в браузере: http://localhost:${PORT}

📋 Доступные файлы:
  • http://localhost:${PORT}/web-worker-usage.html - Демо Web Workers
  • http://localhost:${PORT}/csv-parser.worker.js - Web Worker файл
  • http://localhost:${PORT}/nested-objects-example.js - Пример вложенных объектов

🛑 Для остановки сервера нажмите Ctrl+C
`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

// Error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят. Попробуйте другой порт:`);
    console.log(`   node ${__filename} --port 3001`);
    process.exit(1);
  } else {
    console.error('❌ Ошибка сервера:', err.message);
    process.exit(1);
  }
});