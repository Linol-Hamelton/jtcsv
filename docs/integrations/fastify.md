# Fastify: CSV upload API
Current version: 3.1.0

## Problem
Accept CSV uploads in Fastify and return parsed JSON or NDJSON.

## Complete working example
```js
const fastify = require('fastify')({ logger: true });
const multipart = require('@fastify/multipart');
const { Transform } = require('stream');
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');

fastify.register(multipart);

fastify.post('/api/csv/upload', async function (request, reply) {
  const data = await request.file();
  if (!data) {
    reply.code(400).send({ error: 'No file uploaded' });
    return;
  }

  const parser = createCsvToJsonStream({
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true,
    parseBooleans: true
  });

  const toNdjson = new Transform({
    objectMode: true,
    transform(row, _enc, cb) {
      cb(null, JSON.stringify(row) + '\n');
    }
  });

  reply.header('Content-Type', 'application/x-ndjson');
  return reply.send(data.file.pipe(parser).pipe(toNdjson));
});

fastify.listen({ port: 3002 });
```

## Common pitfalls
- Register `@fastify/multipart` before defining the route.
- Use streaming for large files to avoid memory spikes.

## Testing
```bash
curl -F "file=@./data.csv" http://localhost:3002/api/csv/upload
```
