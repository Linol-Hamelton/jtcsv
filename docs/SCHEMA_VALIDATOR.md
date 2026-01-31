# Schema Validator Format
Current version: 3.1.0


JTCSV supports a lightweight schema format for validating and normalizing rows.
You can pass it via the `schema` option or `--schema` in the CLI.

Direct entry point:
```js
const schema = require('jtcsv/schema');
```

## Supported Inputs

- Inline JSON string (CLI): `--schema '{"properties": {"id": {"type": "integer"}}}'`
- JSON file path (CLI): `--schema ./schema.json`
- Object (API): `{ properties: { id: { type: 'integer' } } }`

## Two Accepted Shapes

### 1) JSON Schema-like

```json
{
  "properties": {
    "id": { "type": "integer" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "number", "minimum": 0 }
  },
  "required": ["id", "email"]
}
```

### 2) Simple Map (field -> rule)

```json
{
  "id": { "type": "integer", "required": true },
  "email": { "type": "string", "format": "email" },
  "tags": { "type": "array", "items": { "type": "string" } }
}
```

## Supported Rule Fields

- `type`: `string | number | integer | boolean | array | object`
- `required`: boolean (or use top-level `required` array)
- `minLength`, `maxLength` (strings)
- `pattern` (regex string)
- `enum` (allowed values array)
- `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` (numbers)
- `minItems`, `maxItems`, `uniqueItems` (arrays)
- `items` (schema for array items)
- `properties` (schema for nested objects)
- `format`: `date-time`, `email`, `uri`

## Usage Examples

### Node.js (csvToJson)

```js
const { csvToJson } = require('jtcsv');

const schema = {
  properties: {
    id: { type: 'integer' },
    email: { type: 'string', format: 'email' }
  },
  required: ['id']
};

const rows = csvToJson(csvText, { schema });
```

### Streaming (createCsvToJsonStream)

```js
const { createCsvToJsonStream } = require('jtcsv');

const stream = createCsvToJsonStream({ schema });
readable.pipe(stream).on('data', (row) => {
  // row is validated and formatted
});
```

### CLI

```bash
jtcsv csv-to-json input.csv output.json --schema ./schema.json
```

## Behavior Notes

- Validation errors are thrown as `ValidationError`.
- `format` can normalize values (for example, `email` lowercases and trims).
- The schema validator is a pragmatic subset of JSON Schema and is not a full JSON Schema engine.

## Built-in Validators

JTCSV also exports simple validators you can reuse directly:

```js
const { isEmail, isUrl, isDate } = require('jtcsv');

isEmail('user@example.com'); // true
isUrl('https://example.com'); // true
isDate('2024-12-31'); // true
```
