# @jtcsv/nuxt
Current version: 3.1.0


Nuxt module that injects `jtcsv` into the Nuxt app and provides a `useJtcsv` composable.

## Install
```bash
npm install @jtcsv/nuxt jtcsv
```

## Nuxt config
```typescript
export default defineNuxtConfig({
  modules: ['@jtcsv/nuxt'],
  jtcsv: { autoimport: true }
});
```

## Usage
```vue
<script setup>
const jtcsv = useJtcsv();
const csv = jtcsv.jsonToCsv([{ id: 1 }]);
</script>
```
