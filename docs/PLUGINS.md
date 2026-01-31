# JTCSV plugin system
Current version: 3.1.0


The plugin-enabled API is exported from `jtcsv/plugins` (see `src/index-with-plugins.js`).
It wraps the core JSON/CSV functions with hook and middleware support.

## Quick start
```javascript
const { create } = require('jtcsv/plugins');

const jtcsv = create({ enablePlugins: true, enableFastPath: true });

const csv = await jtcsv.jsonToCsv([{ id: 1 }], { delimiter: ',' });
const json = await jtcsv.csvToJson('id\n1', { delimiter: ',' });
```

## Register a plugin
```javascript
const { create } = require('jtcsv/plugins');

const jtcsv = create();

jtcsv.use('logger', {
  name: 'Logger',
  version: '1.0.0',
  hooks: {
    'before:csvToJson': (csv) => {
      console.log('csv size', csv.length);
      return csv;
    },
    'after:jsonToCsv': (csv) => {
      console.log('csv output', csv.length);
      return csv;
    }
  },
  middlewares: [
    async (ctx, next) => {
      await next();
    }
  ]
});
```

## Core exports
- create
- PluginManager
- FastPathEngine
- NdjsonParser

## Hook names
The default hook names registered by `PluginManager` include:
- before:csvToJson, after:csvToJson
- before:jsonToCsv, after:jsonToCsv
- before:parse, after:parse
- before:serialize, after:serialize
- error, validation, transformation

## Optional integrations
```javascript
const { create } = require('jtcsv/plugins');
const { jtcsvPlugin: excelPlugin } = require('@jtcsv/excel');
const { jtcsvPlugin: validatorPlugin } = require('@jtcsv/validator');

const jtcsv = create();
jtcsv.use('excel', excelPlugin());
jtcsv.use('validator', validatorPlugin());
```

See `plugins/README.md` for framework adapters.
