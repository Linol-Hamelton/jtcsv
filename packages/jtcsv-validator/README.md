# @jtcsv/validator
Current version: 3.1.0


Schema-based validation helpers for CSV/JSON data.

## Install
```bash
npm install @jtcsv/validator jtcsv
```

## Quick start
```javascript
const { JtcsvValidator } = require('@jtcsv/validator');

const validator = new JtcsvValidator()
  .field('id', { type: 'integer', required: true })
  .field('email', { type: 'string', required: true, pattern: /@/ });

const result = validator.validate([{ id: 1, email: 'a@b.com' }]);
```

## CSV validation
```javascript
const { validateCsv } = require('@jtcsv/validator');

const result = await validateCsv('id,email\n1,a@b.com', {
  id: { type: 'integer', required: true },
  email: { type: 'string', required: true }
});
```

## Exports
- JtcsvValidator
- createValidator(schema)
- validateCsv(csv, schema, options)
- validateJson(data, schema, options)
- schemas (built-in schemas)
- expressMiddleware(options)
- jtcsvPlugin (plugin for `jtcsv/plugins`)

## Scripts
```bash
npm test
npm run test:coverage
npm run example
```
