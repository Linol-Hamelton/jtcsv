# План перехода проекта jtcsv на TypeScript

## Текущее состояние
- Проект написан на JavaScript с JSDoc комментариями
- Уже есть файл типов `index.d.ts` с основными интерфейсами
- Конфигурация TypeScript `tsconfig.json` настроена для генерации деклараций
- Используется Rollup для сборки
- Есть поддержка браузера и Node.js

## Цели перехода
1. Полная конвертация всех JavaScript файлов в TypeScript
2. Сохранение обратной совместимости
3. Улучшение типизации и безопасности типов
4. Поддержка современных возможностей TypeScript

## Этапы перехода

### Этап 1: Подготовка инфраструктуры
1. Обновление `tsconfig.json` для полной поддержки TypeScript
2. Добавление необходимых зависимостей TypeScript
3. Настройка сборки TypeScript через Rollup
4. Создание скриптов для инкрементальной миграции

### Этап 2: Конвертация основных модулей
Приоритетные модули для конвертации:
1. `json-to-csv.js` → `json-to-csv.ts`
2. `csv-to-json.js` → `csv-to-json.ts`
3. `errors.js` → `errors.ts`
4. `stream-json-to-csv.js` → `stream-json-to-csv.ts`
5. `stream-csv-to-json.js` → `stream-csv-to-json.ts`
6. `json-save.js` → `json-save.ts`

### Этап 3: Конвертация ядра (src/)
1. `src/errors.js` → `src/errors.ts`
2. `src/core/` директория
3. `src/engines/` директория
4. `src/formats/` директория
5. `src/utils/` директория

### Этап 4: Конвертация браузерной части
1. `src/browser/` директория
2. Браузерные worker'ы

### Этап 5: Конвертация плагинов
1. Express middleware
2. Fastify plugin
3. Next.js API
4. NestJS
5. Remix
6. SvelteKit
7. Hono
8. tRPC

### Этап 6: Обновление тестов
1. Конвертация тестов в TypeScript
2. Обновление конфигурации Jest для TypeScript
3. Проверка типов в тестах

### Этап 7: Документация и примеры
1. Обновление примеров кода
2. Обновление документации API
3. Создание TypeScript примеров

## Стратегия конвертации

### Подход 1: Инкрементальная конвертация
1. Начинаем с одного модуля, проверяем компиляцию
2. Постепенно расширяем на связанные модули
3. Используем `allowJs: true` для смешанной компиляции
4. Постепенно увеличиваем строгость типизации

### Подход 2: Параллельная поддержка
1. Создаем TypeScript версии файлов с расширением `.ts`
2. Обновляем импорты постепенно
3. Поддерживаем обе версии во время перехода
4. Финальный переход на чистый TypeScript

## Конфигурация TypeScript

### Основные настройки
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "src/**/*",
    "*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "__tests__",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

## Интеграция с Rollup
1. Обновление `rollup.config.mjs` для поддержки TypeScript
2. Использование `@rollup/plugin-typescript`
3. Настройка source maps
4. Поддержка деклараций типов

## Проверка типов
1. Добавление `tsc --noEmit` в pre-commit хуки
2. Интеграция с CI/CD
3. Проверка типов в тестах

## Риски и митигация
1. **Риск**: Нарушение обратной совместимости
   **Митигация**: Тщательное тестирование, семантическое версионирование

2. **Риск**: Увеличение времени сборки
   **Митигация**: Инкрементальная компиляция, кэширование

3. **Риск**: Сложность отладки
   **Митигация**: Сохранение source maps, постепенный переход

## График перехода
- Неделя 1: Подготовка инфраструктуры
- Неделя 2: Конвертация основных модулей
- Неделя 3: Конвертация ядра
- Неделя 4: Конвертация браузерной части
- Неделя 5: Конвертация плагинов
- Неделя 6: Обновление тестов
- Неделя 7: Документация и финальная проверка

## Чеклист для каждого модуля
- [ ] Конвертация файла `.js` → `.ts`
- [ ] Удаление JSDoc комментариев (опционально)
- [ ] Добавление TypeScript типов
- [ ] Проверка компиляции
- [ ] Проверка тестов
- [ ] Обновление импортов
- [ ] Проверка производительности