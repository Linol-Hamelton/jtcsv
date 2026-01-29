# Расширенное использование CLI jtcsv

Этот документ описывает расширенные возможности CLI jtcsv, включая новые функции, добавленные в рамках улучшений проекта.

## Новые возможности CLI

### 1. Обработка вложенных объектов (Flattening)

CLI теперь поддерживает автоматическое разворачивание вложенных объектов с помощью опции `--flatten`.

**Примеры:**

```bash
# Развернуть вложенные объекты с разделителем по умолчанию (.)
jtcsv json-to-csv data.json --output result.csv --flatten

# Использовать пользовательский разделитель
jtcsv json-to-csv data.json --output result.csv --flatten --flatten-separator "_"

# Установить максимальную глубину разворачивания
jtcsv json-to-csv data.json --output result.csv --flatten --flatten-max-depth 4

# Комбинированные опции
jtcsv json-to-csv data.json --output result.csv \
  --flatten \
  --flatten-separator ":" \
  --flatten-max-depth 5 \
  --delimiter "," \
  --include-headers
```

### 2. Пакетная обработка файлов

CLI поддерживает пакетную обработку нескольких файлов:

```bash
# Конвертация всех JSON файлов в директории
jtcsv batch-convert ./input/*.json --output-dir ./output --format csv

# Конвертация всех CSV файлов в JSON
jtcsv batch-convert ./input/*.csv --output-dir ./output --format json

# С фильтрацией по размеру
jtcsv batch-convert ./input/*.json --output-dir ./output --min-size 1KB --max-size 10MB
```

### 3. Валидация данных

```bash
# Валидация CSV файла
jtcsv validate input.csv --schema schema.json

# Валидация JSON файла
jtcsv validate data.json --schema schema.json

# Проверка структуры без схемы
jtcsv validate-structure data.json --check-consistency
```

### 4. Статистика и анализ

```bash
# Получить статистику о CSV файле
jtcsv stats input.csv

# Анализ структуры JSON файла
jtcsv analyze-structure data.json

# Проверка производительности
jtcsv benchmark input.csv --iterations 10 --output benchmark.json
```

### 5. Потоковая обработка больших файлов

```bash
# Потоковая конвертация больших файлов
jtcsv stream-convert large-input.csv --output large-output.json --chunk-size 10000

# Параллельная обработка
jtcsv parallel-convert huge-file.csv --output result.json --workers 4

# Мониторинг прогресса
jtcsv convert big-data.json --output big-data.csv --progress --progress-interval 1000
```

## Полный список новых опций

### Опции flattening:
- `--flatten` - Включить разворачивание вложенных объектов
- `--flatten-separator` - Разделитель для развернутых ключей (по умолчанию: ".")
- `--flatten-max-depth` - Максимальная глубина разворачивания (по умолчанию: 3)
- `--array-handling` - Стратегия обработки массивов: "stringify", "join", "expand" (по умолчанию: "stringify")

### Опции пакетной обработки:
- `--batch-size` - Размер пакета для обработки
- `--parallel` - Количество параллельных процессов
- `--continue-on-error` - Продолжать при ошибках
- `--log-file` - Файл для логов

### Опции валидации:
- `--schema` - JSON схема для валидации
- `--strict` - Строгая валидация
- `--report-format` - Формат отчета: "json", "text", "html"

## Примеры реального использования

### Пример 1: Обработка сложных JSON структур

```bash
# Исходный JSON с вложенными объектами
cat > complex-data.json << 'EOF'
[
  {
    "id": 1,
    "user": {
      "name": "John Doe",
      "contact": {
        "email": "john@example.com",
        "phone": "+1234567890"
      }
    },
    "orders": [
      {"id": "A1", "amount": 100},
      {"id": "A2", "amount": 200}
    ]
  }
]
EOF

# Конвертация с flattening
jtcsv json-to-csv complex-data.json --output flattened.csv \
  --flatten \
  --flatten-separator "_" \
  --delimiter ","

# Результат:
# id,user_name,user_contact_email,user_contact_phone,orders
# 1,John Doe,john@example.com,+1234567890,"[{""id"":""A1"",""amount"":100},{""id"":""A2"",""amount"":200}]"
```

### Пример 2: Пакетная обработка с валидацией

```bash
# Создание схемы валидации
cat > schema.json << 'EOF'
{
  "type": "object",
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["id", "name"]
}
EOF

# Пакетная обработка с валидацией
jtcsv batch-convert ./data/*.json \
  --output-dir ./processed \
  --format csv \
  --schema schema.json \
  --parallel 4 \
  --log-file ./processing.log
```

### Пример 3: Мониторинг и статистика

```bash
# Получение детальной статистики
jtcsv stats large-dataset.csv \
  --detailed \
  --output-stats stats.json \
  --include-samples

# Анализ структуры
jtcsv analyze-structure complex-data.json \
  --output-analysis analysis.md \
  --include-recommendations

# Бенчмарк производительности
jtcsv benchmark test-data.csv \
  --iterations 5 \
  --warmup 2 \
  --output-format json \
  --compare-with papaparse csvtojson
```

## Интеграция с CI/CD

CLI может быть использован в CI/CD пайплайнах:

```yaml
# .github/workflows/data-processing.yml
name: Data Processing Pipeline

on:
  push:
    paths:
      - 'data/**'

jobs:
  process-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install jtcsv
        run: npm install -g jtcsv
        
      - name: Validate data
        run: |
          jtcsv validate ./data/input.csv \
            --schema ./schemas/data-schema.json \
            --report-format json \
            --output validation-report.json
            
      - name: Process data
        run: |
          jtcsv batch-convert ./data/*.csv \
            --output-dir ./processed \
            --format json \
            --flatten \
            --parallel 2
            
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: processed-data
          path: ./processed/
```

## Советы по производительности

1. **Используйте потоковую обработку для больших файлов:**
   ```bash
   jtcsv stream-convert huge-file.csv --chunk-size 50000
   ```

2. **Настройте размер пакета для вашего железа:**
   ```bash
   jtcsv batch-convert *.json --batch-size 1000 --parallel $(nproc)
   ```

3. **Используйте кэширование для повторяющихся операций:**
   ```bash
   jtcsv convert data.json --cache --cache-dir ./cache
   ```

4. **Мониторинг использования памяти:**
   ```bash
   jtcsv convert large-data.csv --memory-limit 2GB --progress
   ```

## Устранение неполадок

### Проблема: Ошибка памяти при обработке больших файлов
**Решение:** Используйте потоковую обработку
```bash
jtcsv stream-convert large-file.csv --chunk-size 10000
```

### Проблема: Медленная обработка
**Решение:** Увеличьте параллелизм
```bash
jtcsv batch-convert *.json --parallel 4 --batch-size 5000
```

### Проблема: Сложные вложенные структуры
**Решение:** Настройте flattening
```bash
jtcsv json-to-csv data.json --flatten --flatten-max-depth 5 --array-handling join
```

## Дополнительные ресурсы

- [Документация jtcsv](https://github.com/yourusername/jtcsv)
- [Примеры использования](https://github.com/yourusername/jtcsv/examples)
- [Руководство по миграции](https://github.com/yourusername/jtcsv/docs/MIGRATION_GUIDE.md)
- [Часто задаваемые вопросы](https://github.com/yourusername/jtcsv/docs/FAQ.md)

---

*Обновлено в рамках улучшений проекта jtcsv согласно jtcsv-winner-strategy.md*