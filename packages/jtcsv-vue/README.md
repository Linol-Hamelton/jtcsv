# jtcsv-vue

Current version: 0.1.0

Vue 3 plugin, composables, and `v-csv-upload` directive for
[jtcsv](https://www.npmjs.com/package/jtcsv) — the high-performance CSV/JSON
toolkit. Imports from `jtcsv/browser` so File / Blob / FileReader APIs work
out of the box in browser Vue apps.

> The `@jtcsv` scope is squatted on npm — siblings ship unscoped (`jtcsv-vue`,
> `jtcsv-excel`, `jtcsv-validator`, `jtcsv-codemod`, `jtcsv-tui`).

## Install

```bash
npm install jtcsv-vue jtcsv vue
```

`jtcsv` and `vue` are peer dependencies — see `peerDependencies` in
`package.json` for supported ranges.

## Quick start

### Install the plugin (main.ts)

```typescript
import { createApp } from 'vue';
import { createJtcsvPlugin } from 'jtcsv-vue';
import App from './App.vue';

const app = createApp(App);
app.use(createJtcsvPlugin());
app.mount('#app');
```

### Use the composable (Composition API)

```vue
<template>
  <div>
    <input type="file" @change="handleFile" accept=".csv" />
    <pre>{{ data }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useJtcsv } from 'jtcsv-vue';

const { csvToJson } = useJtcsv();
const data = ref<any[]>([]);

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  data.value = csvToJson(text);
}
</script>
```

### Use the `v-csv-upload` directive

```vue
<template>
  <input
    type="file"
    accept=".csv"
    v-csv-upload="{
      onLoad: handleData,
      onError: handleError,
      options: { delimiter: ',' },
    }"
  />
</template>

<script setup lang="ts">
function handleData(rows: any[], file: File) {
  console.log('Loaded', rows.length, 'rows from', file.name);
}
function handleError(err: Error, file: File) {
  console.error('Parse failed for', file.name, err);
}
</script>
```

### Drag-and-drop upload with `useCsvUpload`

```vue
<template>
  <div
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    :class="{ dragging: isDragging }"
  >
    <p v-if="isParsing">Parsing…</p>
    <p v-else-if="error">{{ error.message }}</p>
    <p v-else>Drop a CSV file here</p>
  </div>
</template>

<script setup lang="ts">
import { useCsvUpload } from 'jtcsv-vue';

const { isParsing, error, isDragging, onDragOver, onDragLeave, onDrop } =
  useCsvUpload({
    onParsed: (rows, file) => console.log('Got', rows.length, 'rows'),
    onError: (err) => console.error(err),
  });
</script>
```

### Download CSV

```vue
<script setup lang="ts">
import { useCsvDownload } from 'jtcsv-vue';

const { downloadCsv } = useCsvDownload();

function exportData() {
  downloadCsv(
    [{ name: 'alice', age: 30 }, { name: 'bob', age: 25 }],
    'users.csv',
  );
}
</script>
```

## Plugin options

```typescript
app.use(createJtcsvPlugin({
  async: true,            // expose csvToJsonAsync / jsonToCsvAsync (default: true)
  workers: false,         // reserved for worker support (default: false)
  propertyName: '$jtcsv', // global property name for Options API (default: '$jtcsv')
  provideComposable: true // also provide under the string key 'jtcsv' (default: true)
}));
```

## API

### `createJtcsvPlugin(options?)`

Returns a Vue `Plugin`. Call `app.use(createJtcsvPlugin())`. Registers the
`v-csv-upload` directive and exposes a `JtcsvVueInstance` via both the
`jtcsvKey` injection key and `app.config.globalProperties.$jtcsv`.

### `useJtcsv()`

Composition API: returns the injected `JtcsvVueInstance`. Throws a helpful
error if the plugin wasn't installed.

```typescript
const { csvToJson, jsonToCsv } = useJtcsv();
```

### `useJtcsvAsync()`

Composition API: like `useJtcsv()` but guarantees the async variants — if
the plugin was installed with `async: false` they fall back to sync calls
wrapped in `Promise.resolve(...)`.

### `useCsvUpload({ parseOptions?, onParsed?, onError? })`

Composable returning:

| key            | type                                          | description                                     |
| -------------- | --------------------------------------------- | ----------------------------------------------- |
| `isParsing`    | `Ref<boolean>`                                | `true` while parsing is in flight               |
| `error`        | `Ref<Error \| null>`                          | last parse error                                |
| `isDragging`   | `Ref<boolean>`                                | `true` while a drag is hovering the drop zone   |
| `handleFiles`  | `(files: FileList \| File[]) => Promise<...>` | parse the first file, fire callbacks            |
| `onDragOver`   | `(event: DragEvent) => void`                  | wire to `@dragover`                             |
| `onDragLeave`  | `(event: DragEvent) => void`                  | wire to `@dragleave`                            |
| `onDrop`       | `(event: DragEvent) => Promise<...>`          | wire to `@drop`                                 |

Wraps `parseCsvFile` from `jtcsv/browser`.

### `useCsvDownload()`

Returns `{ downloadCsv(data, filename?, options?) }`. Wraps `downloadAsCsv`
from `jtcsv/browser`.

### `v-csv-upload` directive

Attach to a `<input type="file">`. Binding value:

```typescript
{
  onLoad?: (data: any[], file: File) => void;
  onError?: (error: Error, file: File) => void;
  options?: CsvToJsonOptions;
}
```

### `jtcsvKey`

`InjectionKey<JtcsvVueInstance>` (a `Symbol.for('jtcsv')`). Use with the
explicit `inject(jtcsvKey)` form if you want type inference instead of
calling `useJtcsv()`.

### Re-exported error classes

For convenient `instanceof` checks:

```typescript
import {
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
} from 'jtcsv-vue';
```

These are the exact same constructors exported by `jtcsv/browser`.

### Options API

```vue
<template>
  <div>{{ $jtcsv.csvToJson(csv) }}</div>
</template>

<script>
export default {
  data() {
    return { csv: 'name,age\nalice,30' };
  },
};
</script>
```

## Examples

See [`examples/basic-usage.ts`](examples/basic-usage.ts) for a runnable
snippet.

## License

MIT — see [LICENSE](LICENSE).
