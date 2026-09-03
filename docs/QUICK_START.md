# ⚡ КРАТКОЕ РЕЗЮМЕ ДЛЯ ПРОГРАММИСТА

**Читай это первым!** (5 минут)

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ?

Добавить браузерную поддержку к jtcsv (Node.js библиотеке JSON↔CSV).

**Сейчас**: Работает только на сервере (Node.js)  
**Нужно**: Работает везде (браузер, SaaS, мобиль)

---

## ⏱️ СКОЛЬКО ВРЕМЕНИ?

**5-7 дней** (35-50 часов)

```
День 1-2: Rollup конфигурация + удаление fs/path (8 часов)
День 3-4: Браузерные функции + тестирование (16 часов)
День 5:   NPM публикация (4 часа)
День 6-7: Web Workers (опционально, если нужно)
```

---

## 💰 ЗАЧЕМ ЭТО?

- 📈 Рынок растёт с 100K на 2M разработчиков (+20x)
- 💵 ROI 600%+ (инвестиция вернётся за 2-3 месяца)
- 🏆 Уникальное преимущество: CSV Injection Protection (конкурент PapaParse этого не имеет!)
- 📱 Пользователям нужна локальная обработка CSV (приватность, скорость)

---

## 🔧 ТЕХНИЧЕСКИ ЧТО НУЖНО?

### Шаг 1: Rollup Setup (2 часа)
```bash
npm install --save-dev rollup @rollup/plugin-node-resolve
# Скопировать rollup.config.mjs из ТЗ
npm run build
```

### Шаг 2: Удалить Node.js API (2 часа)
Всего 2 файла нужно обработать:
- `json-to-csv.js` - обернуть `fs` в `if (typeof window === 'undefined')`
- `csv-to-json.js` - аналогично

**ВАЖНО**: Логика НЕ меняется, только добавляется проверка браузер/Node.js

### Шаг 3: Добавить браузерные функции (2 часа)
```javascript
// НОВАЯ: JSON → CSV download
downloadAsCsv(data, filename)

// НОВАЯ: CSV file → JSON
parseCsvFile(file)
```

### Шаг 4: Сборка и публикация (2 часа)
```bash
npm run build     # Создаёт dist/jtcsv.umd.js
npm version minor # 1.0.0 → 1.1.0
npm publish
```

---

## 🌐 РЕЗУЛЬТАТ

### После выполнения:
```
dist/jtcsv.umd.js      (~16.7 KB gzipped) - для браузера
dist/jtcsv.mjs         (~16.0 KB gzipped) - для современных модулей
```

### Использование в браузере:
```html
<!-- Через CDN -->
<script src="https://cdn.jsdelivr.net/npm/jtcsv@latest/dist/jtcsv.umd.js"></script>

<script>
  // Парсить CSV file
  const json = await jtcsv.parseCsvFile(fileInput.files[0]);
  
  // Скачать как CSV
  jtcsv.downloadAsCsv(jsonData, 'export.csv');
</script>
```

---

## 🚀 FAST PATH (NODE.JS)

Для максимальной скорости CSV→JSON в Node.js:

- `useFastPath` (boolean, default: true) — включить/выключить fast‑path парсер.
- `fastPathMode` (string, default: 'objects') — режим `'objects'` или `'compact'` (меньше памяти).
- `fastPathMode: 'stream'` — получить async iterator вместо массива.

Бенчмарки и профили: `BENCHMARK-RESULTS.md`, `docs/PERFORMANCE.md`.

---

## ⭐ БОНУС: WEB WORKERS (ОПЦИОНАЛЬНО)

Если нужна максимальная производительность на больших файлах (>100MB):

**Рекомендуемое решение**: Comlink (1.1KB, используется Google)

```javascript
// Worker обрабатывает файл без зависания UI
const parser = wrap(new Worker('parser.worker.js'));
const json = await parser.csvToJson(csvText);
```

**Плюсы**:
- UI остаётся отзывчивым
- Можно показать прогресс-бар
- Работает с 1GB файлами
- Простой API (как локальные функции)

---

## 📋 ПОЛНЫЙ ФАЙЛ

Скачай файл **`TZ_JTCSV_BROWSER_SUPPORT.md`** - там ВСЕ детали:
- Полный Rollup config готов к копированию
- Все коды браузерных функций готовы
- Примеры Web Workers
- Чеклист для проверки

---

## ⚠️ ВАЖНОЕ

### Что НЕ нужно делать:
- ❌ Менять основную логику csvToJson/jsonToCsv
- ❌ Использовать localStorage (не работает в sandbox)
- ❌ Менять TypeScript определения без необходимости

### Что ОБЯЗАТЕЛЬНО:
- ✅ Проверить что fs и path обёрнуты в проверку браузер/Node.js
- ✅ Все функции работают в Chrome, Firefox, Safari
- ✅ CSV Injection Protection работает
- ✅ Размер UMD <= 30KB
- ✅ TypeScript типы обновлены

---

## 🚀 БЫСТРЫЙ СТАРТ

```bash
# 1. Установить Rollup
npm install --save-dev rollup @rollup/plugin-node-resolve

# 2. Скопировать rollup.config.mjs из ТЗ

# 3. Обновить 2 файла (json-to-csv.js, csv-to-json.js)
# (Копируй код из ТЗ раздела 1.2)

# 4. Собрать
npm run build

# 5. Опубликовать
npm version minor
npm publish

# ✅ ГОТОВО!
```

---

## 📞 ВОПРОСЫ?

Вся информация в файле: **`TZ_JTCSV_BROWSER_SUPPORT.md`**

Там же:
- Полные коды всех функций
- Примеры использования
- Rollup конфигурация
- Тестирование
- Web Workers архитектура
- Чеклист завершения

---

**Время начало**: ПРЯМО СЕЙЧАС! 🚀

Успехов! 💪





---

## Browser Streaming and Lazy Workers (NEW)

```javascript
import { csvToJsonIterator, parseCsvFileStream } from 'jtcsv-browser';

// Stream a File without full-buffer
for await (const row of parseCsvFileStream(file, { delimiter: ',' })) {
  console.log(row);
}

// Stream any ReadableStream
for await (const row of csvToJsonIterator(stream, { delimiter: ',' })) {
  console.log(row);
}
```

```javascript
import { parseCSVWithWorkerLazy } from 'jtcsv-browser';

// Lazy-load worker pool only when used
const json = await parseCSVWithWorkerLazy(file, {}, (progress) => {
  console.log(progress.percentage);
});
```

Notes:
- `parseCSVWithWorker` accepts `string`, `File`, `ArrayBuffer`, or typed arrays.
- Use streaming for large files to avoid full memory load.
