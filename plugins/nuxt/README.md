# @jtcsv/nuxt

Nuxt module for JTCSV.

## Install
```bash
npm install @jtcsv/nuxt jtcsv
```

## Setup
```typescript
export default defineNuxtConfig({
  modules: ['@jtcsv/nuxt'],
  jtcsv: {
    autoimport: true
  }
});
```

## Usage
```vue
<script setup>
const { csvToJson, jsonToCsv } = useJtcsv();
</script>
```
