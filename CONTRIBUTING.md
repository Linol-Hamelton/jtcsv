# Contributing to JTCSV

Спасибо за интерес к проекту JTCSV! Мы рады любому вкладу в развитие библиотеки.

---

## 📋 Содержание

- [Кодекс поведения](#кодекс-поведения)
- [Как внести вклад](#как-внести-вклад)
- [Настройка окружения](#настройка-окружения)
- [Разработка](#разработка)
- [Тестирование](#тестирование)
- [Стиль кода](#стиль-кода)
- [Pull Request процесс](#pull-request-процесс)
- [Сообщения об ошибках](#сообщения-об-ошибках)

---

## Кодекс поведения

Этот проект следует [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Участвуя в проекте, вы соглашаетесь соблюдать его условия.

---

## Как внести вклад

### Сообщить об ошибке

1. Проверьте, что ошибка ещё не зарегистрирована в [Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
2. Создайте новый issue с шаблоном "Bug Report"
3. Включите:
   - Версию JTCSV
   - Версию Node.js
   - Минимальный пример для воспроизведения
   - Ожидаемое поведение
   - Фактическое поведение

### Предложить улучшение

1. Создайте issue с меткой "enhancement"
2. Опишите:
   - Проблему, которую решает улучшение
   - Предлагаемое решение
   - Альтернативы, которые вы рассматривали

### Внести код

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Внесите изменения
4. Добавьте тесты
5. Отправьте Pull Request

---

## Настройка окружения

### Требования

- Node.js 18+ (рекомендуется 20+)
- npm 9+ или pnpm 8+
- Git

### Установка

```bash
# Клонируйте форк
git clone https://github.com/YOUR_USERNAME/jtcsv.git
cd jtcsv

# Установите зависимости
npm install

# Запустите тесты
npm test

# Соберите проект
npm run build
```

### Структура проекта

```
jtcsv/
├── src/
│   ├── browser/         # Browser-specific код
│   ├── core/            # Core логика
│   ├── formats/         # NDJSON, TSV парсеры
│   ├── types/           # TypeScript типы
│   └── utils/           # Утилиты
├── __tests__/           # Jest тесты
├── docs/                # Документация
├── examples/            # Примеры использования
├── bin/                 # CLI инструмент
└── packages/            # Дополнительные пакеты
```

---

## Разработка

### Скрипты

```bash
# Разработка
npm run dev              # Watch mode для разработки
npm run build            # Сборка проекта
npm run build:watch      # Watch mode для сборки

# Тестирование
npm test                 # Все тесты
npm run test:watch       # Watch mode
npm run test:coverage    # С покрытием кода
npm run test:specific    # Конкретный тест

# Качество кода
npm run lint             # ESLint проверка
npm run lint:fix         # Автоисправление
npm run typecheck        # TypeScript проверка

# Документация
npm run docs             # Генерация TypeDoc
```

### Создание новой функции

1. **Создайте файл** в соответствующей директории
2. **Добавьте TypeScript типы** в `src/types/index.ts`
3. **Напишите JSDoc** документацию
4. **Экспортируйте** из `index.ts`
5. **Напишите тесты** в `__tests__/`
6. **Обновите документацию** в `docs/`

---

## Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Конкретный файл
npm test -- csv-to-json.test.ts

# С покрытием
npm run test:coverage

# Watch mode
npm run test:watch
```

### Написание тестов

```typescript
import { describe, test, expect } from '@jest/globals';
import { csvToJson } from '../index';

describe('MyFeature', () => {
  test('should do something', () => {
    const result = csvToJson('a,b\n1,2');
    expect(result).toEqual([{ a: '1', b: '2' }]);
  });

  test('should handle edge case', () => {
    // Тестируйте edge cases
    expect(() => csvToJson('')).toThrow();
  });
});
```

### Требования к тестам

- Каждый новый функционал должен иметь тесты
- Покрытие кода должно быть >90%
- Тестируйте:
  - Happy path
  - Edge cases
  - Error handling
  - Performance (если применимо)

---

## Стиль кода

### TypeScript

```typescript
// Используйте строгие типы
function parseCsv(csv: string, options?: CsvOptions): ParsedRow[] {
  // ...
}

// Избегайте any
// ❌
function process(data: any) { }
// ✅
function process(data: unknown) { }

// Используйте интерфейсы
interface CsvOptions {
  delimiter?: string;
  hasHeaders?: boolean;
}

// Документируйте публичный API
/**
 * Parses CSV string to JSON array
 * @param csv - CSV string to parse
 * @param options - Parsing options
 * @returns Array of parsed objects
 * @example
 * const data = csvToJson('a,b\n1,2');
 */
```

### Именование

- **Файлы**: kebab-case (`csv-to-json.ts`)
- **Классы**: PascalCase (`CsvParser`)
- **Функции**: camelCase (`parseCsv`)
- **Константы**: UPPER_SNAKE_CASE (`MAX_ROWS`)
- **Интерфейсы**: PascalCase без префикса I (`CsvOptions`)

### JSDoc

```typescript
/**
 * Short description
 * 
 * Longer description if needed
 * 
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 * @throws {ParsingError} When CSV is invalid
 * @example
 * const result = myFunction('input', { option: true });
 */
```

---

## Pull Request процесс

### Перед отправкой

1. ✅ Код компилируется (`npm run build`)
2. ✅ Тесты проходят (`npm test`)
3. ✅ Линтинг проходит (`npm run lint`)
4. ✅ Типы корректны (`npm run typecheck`)
5. ✅ Документация обновлена
6. ✅ CHANGELOG.md обновлён

### Шаблон PR

```markdown
## Описание

Краткое описание изменений

## Тип изменений

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Как тестировать

1. Шаг 1
2. Шаг 2

## Checklist

- [ ] Тесты добавлены/обновлены
- [ ] Документация обновлена
- [ ] CHANGELOG обновлён
```

### Code Review

- Будьте готовы к изменениям по результатам review
- Отвечайте на комментарии конструктивно
- Используйте suggestions в GitHub

---

## Сообщения об ошибках

### Шаблон Bug Report

```markdown
## Описание

Чёткое описание ошибки

## Воспроизведение

1. Используйте версию X.Y.Z
2. Запустите код: `...`
3. Увидите ошибку

## Ожидаемое поведение

Что должно было произойти

## Фактическое поведение

Что произошло

## Окружение

- JTCSV: 3.1.0
- Node.js: 20.10.0
- OS: Windows 11

## Дополнительная информация

Скриншоты, логи, etc.
```

---

## 🙏 Спасибо!

Любой вклад ценится, даже:
- Исправление опечаток в документации
- Добавление примеров
- Ответы на вопросы в Issues
- Распространение информации о проекте

---

**Вопросы?** Создайте [Discussion](https://github.com/Linol-Hamelton/jtcsv/discussions) или напишите в [Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
