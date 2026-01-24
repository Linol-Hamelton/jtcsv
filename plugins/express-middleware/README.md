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
  conversionOptions: {
    parseNumbers: true,
    parseBooleans: true
  }
}));
```

Note: body size limits are controlled by your body parser (for example `express.json({ limit: '10mb' })`).

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
