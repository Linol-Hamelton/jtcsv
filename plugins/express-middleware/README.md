# @jtcsv/express-middleware

Express middleware that converts CSV/JSON payloads and exposes the converted data on `req.converted`.

## Install
```bash
npm install @jtcsv/express-middleware express jtcsv
```

## Quick start
```javascript
const express = require('express');
const { middleware } = require('@jtcsv/express-middleware');

const app = express();
app.use(express.json());
app.use(express.text({ type: 'text/csv' }));
app.use(middleware());

app.post('/api/convert', (req, res) => {
  res.json(req.converted);
});
```

## Options
The middleware detects input/output format based on `Content-Type`, `Accept`, and `?format=csv`.

```javascript
app.use(middleware({
  autoDetect: true,
  delimiter: ',',
  enableFastPath: true,
  preventCsvInjection: true,
  rfc4180Compliant: true,
  // Security & DoS protection
  maxFileSize: '500MB',          // Maximum allowed file size (default: 500MB)
  maxFieldSize: 1024 * 1024,     // Maximum field size in bytes (default: 1MB)
  timeout: 300000,               // Processing timeout in milliseconds (default: 5 minutes)
  // Conversion options
  conversionOptions: {
    parseNumbers: true,
    parseBooleans: true
  }
}));
```

**Security notes**:
- `maxFileSize` rejects requests with `Content-Length` exceeding the limit (HTTP 413).
- `maxFieldSize` limits individual field size during parsing (helps prevent memory exhaustion).
- `timeout` cancels long-running conversions and returns HTTP 503.
- For additional protection, combine with `express-rate-limit` and body parser limits.

**Example with rate limiting**:
```javascript
const rateLimit = require('express-rate-limit');
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per window
});
app.post('/api/import', importLimiter, middleware());
```

## Helpers
```javascript
const {
  csvToJsonRoute,
  jsonToCsvRoute,
  uploadCsvRoute,
  healthCheck
} = require('@jtcsv/express-middleware');
```

## req.converted shape
```json
{
  "data": "...",
  "format": "json",
  "inputFormat": "csv",
  "outputFormat": "json",
  "stats": { "inputSize": 0, "outputSize": 0, "processingTime": 0, "conversion": "csv->json" },
  "options": {}
}
```
