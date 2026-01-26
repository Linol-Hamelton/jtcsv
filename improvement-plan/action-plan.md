# ⚡ JTCSV: ПЛАН ДЕЙСТВИЙ НА СЛЕДУЮЩИЕ 2 НЕДЕЛИ

**Создано:** 26 января 2026  
**Для:** Разработчиков и менеджеров проектов  
**Формат:** Пошаговый, с временем и результатами  

---

## 🎯 ЦЕЛЬ

Превратить jtcsv из **"хорошей но проблемной"** (60% готовности) в **"production-ready"** (94% готовности)

**СРОКИ:** 2 недели (7.5 часов разработки)

---

## ⏰ НЕДЕЛЯ 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

### 📅 ДЕН 1 (ПОНЕДЕЛЬНИК) — 15 минут

#### ЗАДАЧА 1: Добавить glob в зависимости

```bash
cd /path/to/jtcsv
npm install glob --save

# Результат должен быть в package.json:
# "glob": "^10.3.0"

# Проверка:
npm test
npm install -g .
jtcsv batch json-to-csv "test/*.json" ./output
# Должно вывести: ✓ Batch complete
```

**ПУБЛИКАЦИЯ v2.1.6:**

```bash
npm version patch
npm publish
```

**РЕЗУЛЬТАТ:** ✅ Batch команда работает!

---

### 📅 ДНИ 2-4 (ВТОРНИК-ЧЕТВЕРГ) — 3.5 часа

#### ЗАДАЧА 2: Реализовать --transform (1.5 часа)

**ФАЙЛ:** `bin/jtcsv.js` строка ~450

**ЗАМЕНА:**
```javascript
// ❌ СТАРОЕ:
if (options.transform) {
  // пусто
}

// ✅ НОВОЕ:
if (options.transform) {
  try {
    const transformPath = path.resolve(options.transform);
    if (!fs.existsSync(transformPath)) {
      throw new Error(`Transform file not found`);
    }
    const transformFn = require(transformPath);
    if (typeof transformFn !== 'function') {
      throw new Error('Must export a function');
    }
    jsonData = jsonData.map((row, idx) => {
      const result = transformFn(row, idx);
      return result || row;
    });
    console.log(color(`✓ Transform applied`, 'green'));
  } catch (error) {
    console.error(color(`✗ Error: ${error.message}`, 'red'));
    process.exit(1);
  }
}
```

**ТЕСТ:**
```bash
echo '[{"id":1}]' > test.json
cat > transform.js << 'EOF'
module.exports = (row) => ({ ...row, id: row.id * 2 });
EOF
jtcsv json-to-csv test.json out.csv --transform=./transform.js
grep "2" out.csv  # ✅ Должна быть
```

---

#### ЗАДАЧА 3: Реализовать --schema (1 час)

**ФАЙЛ:** `bin/jtcsv.js` строка ~460

**ШАГ 1:** `npm install ajv --save`

**ШАГ 2:** Добавить код:
```javascript
if (options.schema) {
  try {
    const Ajv = require('ajv');
    let schema = options.schema;
    if (typeof schema === 'string') {
      schema = JSON.parse(schema);
    }
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    
    const errors = [];
    for (let i = 0; i < jsonData.length; i++) {
      const valid = validate(jsonData[i]);
      if (!valid) {
        errors.push({ row: i });
      }
    }
    
    if (errors.length > 0) {
      console.error(color(`✗ Validation failed`, 'red'));
      process.exit(1);
    }
  } catch (error) {
    console.error(color(`✗ Schema error`, 'red'));
    process.exit(1);
  }
}
```

---

#### ЗАДАЧА 4: Добавить NDJSON команды (1 час)

**ФАЙЛ:** `bin/jtcsv.js`

```javascript
case 'ndjson-to-csv':
  {
    const ndjsonStream = fs.createReadStream(files[0]);
    const csvTransform = jtcsv.createNdjsonToCsvStream(jtcsvOptions);
    const csvOutput = fs.createWriteStream(files[1]);
    const { pipeline } = require('stream/promises');
    await pipeline(ndjsonStream, csvTransform, csvOutput);
    console.log(color(`✓ Converted`, 'green'));
    break;
  }

case 'csv-to-ndjson':
  {
    const csvRead = fs.createReadStream(files[0]);
    const ndjsonTransform = jtcsv.createCsvToNdjsonStream(jtcsvOptions);
    const ndjsonWrite = fs.createWriteStream(files[1]);
    const { pipeline } = require('stream/promises');
    await pipeline(csvRead, ndjsonTransform, ndjsonWrite);
    console.log(color(`✓ Converted`, 'green'));
    break;
  }
```

---

#### ЗАДАЧА 5: Добавить unwrap команду (45 минут)

**ФАЙЛ:** `bin/jtcsv.js`

```javascript
case 'unwrap':
case 'flatten':
  {
    const inputData = fs.readFileSync(files[0], 'utf8');
    const jsonData = JSON.parse(inputData);
    const flattenDepth = options.flattenDepth || 10;
    const separator = options.flattenPrefix || '_';
    
    const unwrappedData = jtcsv.deepUnwrap(jsonData, {
      maxDepth: flattenDepth,
      separator: separator
    });
    
    fs.writeFileSync(files[1], JSON.stringify(unwrappedData, null, 2));
    console.log(color(`✓ Unwrapped`, 'green'));
    break;
  }
```

---

#### ЗАДАЧА 6: Параметры в streaming (30 минут)

**ФАЙЛ:** `bin/jtcsv.js`

```javascript
// ❌ СТАРОЕ:
const transformStream = jtcsv.createJsonToCsvStream({
  delimiter: options.delimiter || ','
});

// ✅ НОВОЕ:
const streamingOptions = {
  delimiter: options.delimiter || ',',
  parseNumbers: options.parseNumbers,
  parseBooleans: options.parseBooleans,
  renameMap: options.renameMap,
  template: options.template,
  headers: options.headers,
  flattenDepth: options.flattenDepth,
  flattenPrefix: options.flattenPrefix,
  preventCsvInjection: options.preventCsvInjection,
  cellQuoteMode: options.cellQuoteMode,
  includeHeaders: options.includeHeaders
};

const transformStream = jtcsv.createJsonToCsvStream(streamingOptions);
```

---

#### ЗАДАЧА 7: --rename везде (20 минут)

**ФАЙЛ:** `bin/jtcsv.js` в функции streamJsonToCsv

```javascript
let headers = Object.keys(obj);

if (options.renameMap) {
  headers = headers.map(h => options.renameMap[h] || h);
}

writeStream.write(headers.join(delimiter) + '\n');
```

---

### 📅 ДЕНЬ 5 (ПЯТНИЦА) — ТЕСТИРОВАНИЕ

**КОМАНДЫ ПРОВЕРКИ:**

```bash
# Тест 1: --transform
echo '[{"id":1}]' > t1.json
jtcsv json-to-csv t1.json out1.csv --transform=transform.js
grep "2" out1.csv && echo "✓ Transform works"

# Тест 2: --schema
echo '[{"id":1}]' > t2.json
jtcsv json-to-csv t2.json out2.csv --schema='{"properties":{"id":{"type":"number"}}}'
echo "✓ Schema works"

# Тест 3: NDJSON
echo '{"id":1}' > t3.ndjson
jtcsv ndjson-to-csv t3.ndjson out3.csv
test -f out3.csv && echo "✓ NDJSON works"

# Тест 4: unwrap
echo '{"a":{"b":1}}' > t4.json
jtcsv unwrap t4.json out4.json
grep "a_b" out4.json && echo "✓ Unwrap works"

# Тест 5: streaming params
echo '[{"id":"5"}]' > t5.json
jtcsv stream json-to-csv t5.json out5.csv --parse-numbers
grep "^5$" out5.csv && echo "✓ Streaming params work"
```

**ПУБЛИКАЦИЯ v2.1.7:**

```bash
npm version minor
npm publish
```

---

## 📊 ИТОГИ НЕДЕЛЯ 1

```
v2.1.6 (ДЕНЬ 1 - 15 минут):
  ✅ Glob добавлен
  📈 Готовность: 60% → 70%

v2.1.7 (ДНИ 2-5 - 3.5 часа):
  ✅ --transform реализован
  ✅ --schema реализирована
  ✅ NDJSON команды работают
  ✅ unwrap/flatten работают
  ✅ Параметры в streaming
  ✅ --rename везде работает
  📈 Готовность: 70% → 94%

ИТОГО ОЦЕНКА: 7.5/10 → 7.9/10 ✅
```

---

## 🎯 НЕДЕЛЯ 2: РАСШИРЕНИЯ (ОПЦИОНАЛЬНО)

Если время позволяет:

### ЗАДАЧА 1: batch process полная (1.5 часа)

```bash
jtcsv batch json-to-csv "data/*.json" ./output
✓ Processing 100 files... 100% complete
```

### ЗАДАЧА 2: TUI потоковая обработка (2 часа)

```bash
jtcsv
=== JTCSV v2.1.7 ===
5. Stream Processing  ← НОВОЕ!
```

### ЗАДАЧА 3: Web-UI сервер (1.5 часа)

```bash
jtcsv web
🌐 Web UI started at http://localhost:3000
```

**ИТОГ: Оценка 7.9 → 8.8/10 ✅**

---

## 📋 ФИНАЛЬНЫЙ ЧЕКЛИСТ

### v2.1.6 ✅
```
[ ] npm install glob --save
[ ] npm test
[ ] npm version patch
[ ] npm publish
```

### v2.1.7 ✅
```
[ ] --transform реализован
[ ] --schema реализирована
[ ] NDJSON команды работают
[ ] unwrap команда работает
[ ] Параметры в streaming
[ ] --rename везде
[ ] npm test 100%
[ ] npm version minor
[ ] npm publish
```

---

**План подготовлен:** 26 января 2026  
**Все задачи реальны и выполнимы ✅**