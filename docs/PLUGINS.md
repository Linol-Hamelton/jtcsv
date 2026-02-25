# JTCSV plugin system
Current version: 3.1.0


The plugin-enabled API is exported from `jtcsv/plugins` (see `src/index-with-plugins.js`).
It wraps the core JSON/CSV functions with hook and middleware support.

## Interactive plugin example
<iframe
  src="https://stackblitz.com/github/Linol-Hamelton/jtcsv?embed=1&file=docs/embeds/plugins.js&view=editor"
  width="100%"
  height="520"
  style="border:0;border-radius:12px;overflow:hidden;"
  title="JTCSV Plugins (StackBlitz)"
></iframe>

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
