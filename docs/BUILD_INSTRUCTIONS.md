# Инструкции по сборке и развертыванию jtcsv Browser Edition

## Установка зависимостей

```bash
# Установка всех зависимостей для разработки
npm install

# Или установка конкретных зависимостей
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-babel @babel/core @babel/preset-env rollup-plugin-terser
```

## Сборка проекта

### Разработка (watch mode)
```bash
npm run dev
# или
npm run build:watch
```

### Продакшн сборка
```bash
npm run build:prod
# или
NODE_ENV=production npm run build
```

### Одноразовая сборка
```bash
npm run build
```

## Структура проекта

```
jtcsv/
├── src/browser/              # Браузерный код
│   ├── index.js             # Точка входа для браузера
│   ├── json-to-csv-browser.js # JSON→CSV для браузера
│   ├── csv-to-json-browser.js # CSV→JSON для браузера
│   ├── browser-functions.js # Браузерные функции
│   ├── errors-browser.js    # Система ошибок для браузера
│   └── workers/             # Web Workers
│       ├── worker-pool.js   # Worker Pool
│       └── csv-parser.worker.js # Worker скрипт
├── dist/                    # Собранные файлы
│   ├── jtcsv.umd.js        # UMD версия (для браузера)
│   ├── jtcsv.esm.js        # ESM версия (для модулей)
│   └── jtcsv.cjs.js        # CJS версия (для Node.js)
├── demo/                    # Демо приложение
│   └── index.html          # HTML демо
├── rollup.config.mjs        # Конфигурация Rollup
└── package.json            # Конфигурация проекта
```

## Тестирование

### Unit тесты
```bash
npm test
```

### Тесты с покрытием
```bash
npm run test:coverage
```

### Браузерные тесты (jsdom)
```bash
npm run test:browser
```

### Watch mode
```bash
npm run test:watch
```

## Линтинг

```bash
# Линтинг всего проекта
npm run lint:all

# Линтинг только основных файлов
npm run lint
```

## Проверка размера бандла

```bash
# Проверка размера
npm run size

# Детальный анализ размера
npm run size:why
```

## Запуск демо

```bash
# Установите http-server если нужно
npm install -g http-server

# Запуск демо
npm run demo
# или
http-server demo -p 3000 -o
```

Демо будет доступно по адресу: http://localhost:3000

## Публикация

### Подготовка к публикации
```bash
# Запуск тестов и сборки
npm run prepublishOnly
```

### Публикация на npm
```bash
# Увеличить версию
npm version patch  # или minor, major

# Опубликовать
npm publish
```

## Использование в проектах

### В браузере (через CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/jtcsvst/jtcsv.umd.js"></script>
<script>
  // Использование глобальной переменной jtcsv
  const csv = jtcsv.jsonToCsv([{id: 1, name: 'John'}]);
</script>
```

### В браузере (ES модули)
```html
<script type="module">
  import { jsonToCsv } from 'https://cdn.jsdelivr.net/npm/jtcsvst/jtcsv.esm.js';
  const csv = jsonToCsv([{id: 1, name: 'John'}]);
</script>
```

### В Node.js
```javascript
const { jsonToCsv, csvToJson } = require('jtcsv
// или для браузерной версии
const { downloadAsCsv } = require('jtcsv;
```

### В современных бандлерах (Webpack, Vite, Rollup)
```javascript
import { jsonToCsv, parseCsvFile } from 'jtcsv
```

## Оптимизация

### Минификация
Проект автоматически минифицирует код в production сборке с помощью Terser.

### Tree-shaking
ESM версия поддерживает tree-shaking, удаляя неиспользуемый код.

### Code splitting
Web Workers загружаются отдельно и не увеличивают основной бандл.

## Поддержка браузеров

Проект использует Babel для транспиляции в ES5 и поддерживает:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- Mobile browsers

## Troubleshooting

### Проблемы со сборкой
1. Убедитесь что все зависимости установлены
2. Проверьте версию Node.js (требуется >=12.0.0)
3. Очистите кеш npm: `npm cache clean --force`

### Проблемы с Web Workers
1. Убедитесь что worker скрипты доступны по правильному URL
2. Проверьте CORS политики если используете CDN
3. Убедитесь что браузер поддерживает модульные workers

### Проблемы с размерами файлов
1. Используйте `npm run size:why` для анализа
2. Проверьте что минификация включена в production
3. Рассмотрите возможность code splitting для больших проектов

## Производительность

### Бенчмарки
Запустите демо и используйте раздел "Performance Test" для проверки производительности.

### Мониторинг
Используйте DevTools для мониторинга:
1. Производительности парсинга
2. Использования памяти
3. Активности Web Workers

## Безопасность

### CSV Injection Protection
Убедитесь что опция `preventCsvInjection` включена (включена по умолчанию).

### Валидация входных данных
Все функции включают валидацию входных данных.

### Безопасность файлов
Проверяются расширения файлов и предотвращаются path traversal атаки.




