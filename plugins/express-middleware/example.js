// @ts-nocheck
/**
 * Пример использования Express middleware для JTCSV
 * 
 * Запуск: node example.js
 * Затем отправьте запросы:
 * - POST /api/convert с JSON телом → получите CSV
 * - POST /api/convert с CSV телом → получите JSON
 * - POST /api/csv-to-json → конвертация CSV в JSON
 * - POST /api/json-to-csv → конвертация JSON в CSV
 * - GET /api/health → проверка состояния
 */

const express = require('express');
const bodyParser = require('body-parser');
const { 
  middleware, 
  csvToJsonRoute, 
  jsonToCsvRoute, 
  healthCheck 
} = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON и текста
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/csv' }));

// Добавляем время начала обработки запроса
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Основное middleware для автоматической конвертации
app.use(middleware({
  maxSize: '50mb',
  delimiter: ',',
  enableFastPath: true,
  preventCsvInjection: true
}));

// Роуты для конкретных операций
app.post('/api/csv-to-json', csvToJsonRoute({
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
}));

app.post('/api/json-to-csv', jsonToCsvRoute({
  delimiter: ',',
  includeHeaders: true,
  preventCsvInjection: true
}));

// Health check
app.get('/api/health', healthCheck());

// Пример роута, использующего автоматическую конвертацию
app.post('/api/convert', (req, res) => {
  if (!req.converted) {
    return res.status(400).json({
      success: false,
      error: 'No data to convert'
    });
  }

  res.json({
    success: true,
    conversion: req.converted.conversion,
    data: req.converted.data,
    stats: {
      ...req.converted.stats,
      totalTime: Date.now() - req.startTime
    },
    format: req.converted.outputFormat
  });
});

// Пример роута для скачивания CSV
app.post('/api/download-csv', (req, res) => {
  if (!req.converted || req.converted.outputFormat !== 'csv') {
    return res.status(400).json({
      success: false,
      error: 'CSV data not available'
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="converted.csv"');
  res.send(req.converted.data);
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      'POST /api/convert',
      'POST /api/csv-to-json',
      'POST /api/json-to-csv',
      'POST /api/download-csv',
      'GET /api/health'
    ]
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 JTCSV Express server запущен на порту ${PORT}`);
  console.log(`📚 Примеры запросов:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/convert \
    -H "Content-Type: application/json" \
    -d '[{"name":"John","age":30},{"name":"Jane","age":25}]'`);
  console.log();
  console.log(`  curl -X POST http://localhost:${PORT}/api/convert \
    -H "Content-Type: text/csv" \
    -d 'name,age\nJohn,30\nJane,25'`);
  console.log();
  console.log(`  curl -X GET http://localhost:${PORT}/api/health`);
});

module.exports = app;


