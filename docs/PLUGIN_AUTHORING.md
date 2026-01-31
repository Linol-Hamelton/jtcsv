# Plugin Authoring Guide
Current version: 3.1.0


This guide explains how to build custom JTCSV plugins for `jtcsv/plugins`.

## Basics

Plugins are plain objects with optional hooks and middleware:

```js
const plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Example plugin',
  hooks: {
    'before:csvToJson': (csv, ctx) => csv,
    'after:csvToJson': (rows, ctx) => rows
  },
  middlewares: [
    async (ctx, next) => {
      await next();
    }
  ],
  init(manager) {
    // optional setup
  },
  destroy() {
    // optional teardown
  }
};
```

Register it:

```js
const { create } = require('jtcsv/plugins');

const jtcsv = create();
jtcsv.use('my-plugin', plugin);
```

## Hook Names

Built-in hook names include:

- `before:csvToJson`, `after:csvToJson`
- `before:jsonToCsv`, `after:jsonToCsv`
- `before:parse`, `after:parse`
- `before:serialize`, `after:serialize`
- `error`, `validation`, `transformation`

You can also define custom hook names. They will be created on first use.

## Hook Context

Hooks receive a context object with:

- `operation` (e.g. `csvToJson`)
- `options` (the original options)
- `metadata` (mutable object shared across middleware/hooks)
- `hookName`

Example:

```js
hooks: {
  'before:csvToJson': (csv, ctx) => {
    ctx.metadata.start = Date.now();
    return csv;
  },
  'after:csvToJson': (rows, ctx) => {
    const ms = Date.now() - ctx.metadata.start;
    console.log('parsed', rows.length, 'rows in', ms, 'ms');
    return rows;
  }
}
```

## Error Handling

If a hook throws, JTCSV will call the `error` hooks (if registered). Use this to log and collect diagnostics.

```js
hooks: {
  error: (error, ctx) => {
    console.error('plugin error', ctx.hookName, error.message);
  }
}
```

## Middleware

Middleware runs between `before:*` and `after:*` hooks, and can mutate input or options.

```js
middlewares: [
  async (ctx, next) => {
    ctx.options.delimiter = ctx.options.delimiter || ',';
    await next();
  }
]
```

## Packaging Tips

- Export the plugin from your package entry.
- Keep plugin hooks pure and fast; avoid heavy synchronous I/O.
- Add version metadata so users can debug compatibility issues.
