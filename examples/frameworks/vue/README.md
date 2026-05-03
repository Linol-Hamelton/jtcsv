# @jtcsv/vue

Current version: 1.0.0

Vue 3 plugin for jtcsv - high-performance CSV/JSON conversion library for Vue applications.

## Install

```bash
npm install @jtcsv/vue vue jtcsv
```

## Quick Start

### As Plugin (main.ts)

```typescript
import { createApp } from 'vue';
import JtcsvVuePlugin from '@jtcsv/vue';

const app = createApp(App);
app.use(JtcsvVuePlugin);
app.mount('#app');
```

### In Component (Composition API)

```vue
<template>
  <div>
    <input type="file" @change="handleFile" accept=".csv" />
    <pre>{{ data }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useJtcsv } from '@jtcsv/vue';

const { csvToJson, jsonToCsv } = useJtcsv();
const data = ref([]);

const handleFile = async (event) => {
  const file = event.target.files[0];
  const text = await file.text();
  data.value = csvToJson(text);
};
</script>
```

## Options

```typescript
app.use(JtcsvVuePlugin, {
  async: true,           // Enable async methods (default: true)
  workers: false,        // Enable worker support (default: false)
  propertyName: '$jtcsv', // Global property name (default: '$jtcsv')
  provideComposable: true // Provide composable (default: true)
});
```

## API

### useJtcsv()

Returns jtcsv instance with:

- `csvToJson(csv, options)` - Convert CSV to JSON
- `jsonToCsv(data, options)` - Convert JSON to CSV
- `csvToJsonAsync(csv, options)` - Async CSV to JSON (if async: true)
- `jsonToCsvAsync(data, options)` - Async JSON to CSV (if async: true)

### useJtcsvAsync()

Returns jtcsv instance with guaranteed async methods.

### csvUpload Directive

```vue
<input 
  type="file" 
  v-csv-upload="{ 
    onLoad: handleData, 
    onError: handleError,
    options: { delimiter: ',' }
  }" 
  accept=".csv"
/>
```

```typescript
const handleData = (data, file) => {
  console.log('Loaded:', data.length, 'rows');
};

const handleError = (error, file) => {
  console.error('Error:', error.message);
};
```

### Options API

```vue
<template>
  <div>{{ $jtcsv.csvToJson(csvString) }}</div>
</template>

<script>
export default {
  data() {
    return {
      csvString: 'name,age\nJohn,30'
    };
  }
};
</script>
```

## Example

See [example.ts](example.ts) for complete example.
