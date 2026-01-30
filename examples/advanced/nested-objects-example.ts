/**
 * Пример обработки вложенных объектов в jtcsv
 * Демонстрирует улучшенную поддержку сложных JSON структур
 */

const {  jsonToCsv, preprocessData, deepUnwrap  } = await import("../../index");

// Пример 1: Простые вложенные объекты
const simpleNestedData = [
  {
    id: 1,
    name: 'John Doe',
    profile: {
      age: 30,
      email: 'john@example.com',
      address: {
        city: 'New York',
        country: 'USA'
      }
    },
    tags: ['developer', 'javascript', 'nodejs']
  },
  {
    id: 2,
    name: 'Jane Smith',
    profile: {
      age: 25,
      email: 'jane@example.com',
      address: {
        city: 'London',
        country: 'UK'
      }
    },
    tags: ['designer', 'ui', 'ux']
  }
];

console.log('=== Пример 1: Простые вложенные объекты ===\n');

// Текущая реализация (deepUnwrap)
console.log('Текущая реализация (deepUnwrap):');
const processed1 = preprocessData(simpleNestedData);
console.log('Обработанные данные:', JSON.stringify(processed1, null, 2));

const csv1 = jsonToCsv(processed1);
console.log('\nCSV результат:');
console.log(csv1);

// Пример 2: Сложные вложенные структуры
const complexNestedData = [
  {
    orderId: 'ORD-001',
    customer: {
      id: 'CUST-001',
      name: 'Acme Corp',
      contact: {
        primary: {
          name: 'Alice Johnson',
          phone: '+1-555-1234',
          email: 'alice@acme.com'
        },
        secondary: {
          name: 'Bob Smith',
          phone: '+1-555-5678',
          email: 'bob@acme.com'
        }
      }
    },
    items: [
      {
        productId: 'PROD-001',
        name: 'Laptop',
        quantity: 2,
        price: 999.99,
        specifications: {
          cpu: 'Intel i7',
          ram: '16GB',
          storage: '512GB SSD'
        }
      },
      {
        productId: 'PROD-002',
        name: 'Mouse',
        quantity: 1,
        price: 49.99
      }
    ],
    metadata: {
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-16T14:45:00Z',
      status: 'completed',
      notes: ['Urgent delivery', 'Gift wrapping requested']
    }
  }
];

console.log('\n\n=== Пример 2: Сложные вложенные структуры ===\n');

console.log('Текущая реализация (ограничения):');
const processed2 = preprocessData(complexNestedData);
console.log('Обработанные данные (первые 500 символов):');
console.log(JSON.stringify(processed2, null, 2).substring(0, 500) + '...');

// Пример 3: Предлагаемые улучшения
console.log('\n\n=== Пример 3: Предлагаемые улучшения ===\n');

/**
 * Улучшенная функция flattenObject для автоматического разворачивания вложенных структур
 */
function flattenObject(obj, prefix = '', separator = '.', maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return { [prefix || 'value']: JSON.stringify(obj) };
  }

  const result = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}${separator}${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Рекурсивно разворачиваем объекты
        const flattened = flattenObject(
          value,
          newKey,
          separator,
          maxDepth,
          currentDepth + 1
        );
        Object.assign(result, flattened);
      } else if (Array.isArray(value)) {
        // Обработка массивов
        if (value.length === 0) {
          result[newKey] = '';
        } else if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
          // Простые массивы - объединяем через запятую
          result[newKey] = value.join(', ');
        } else {
          // Сложные массивы - сериализуем
          result[newKey] = JSON.stringify(value);
        }
      } else {
        // Примитивные значения
        result[newKey] = value;
      }
    }
  }

  return result;
}

/**
 * Улучшенная функция preprocessData с поддержкой flattening
 */
function preprocessDataWithFlattening(data, options = {}) {
  const {
    flatten = false,
    separator = '.',
    maxDepth = 3,
    arrayHandling = 'stringify' // 'stringify', 'join', 'expand'
  } = options;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return {};
    }

    if (flatten) {
      return flattenObject(item, '', separator, maxDepth);
    }

    // Стандартная обработка (совместимость)
    const processed = {};
    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        const value = item[key];
        if (value && typeof value === 'object') {
          processed[key] = deepUnwrap(value);
        } else {
          processed[key] = value;
        }
      }
    }
    return processed;
  });
}

// Демонстрация улучшенной обработки
console.log('Улучшенная обработка с flattening:');
const flattened = preprocessDataWithFlattening(simpleNestedData, { flatten: true });
console.log('Развернутые данные:');
console.log(JSON.stringify(flattened, null, 2));

const csvFlattened = jsonToCsv(flattened);
console.log('\nCSV с развернутыми полями:');
console.log(csvFlattened);

// Пример 4: Разные стратегии обработки массивов
console.log('\n\n=== Пример 4: Обработка массивов ===\n');

const arrayData = [
  {
    id: 1,
    name: 'Product A',
    categories: ['Electronics', 'Computers', 'Laptops'],
    reviews: [
      { user: 'Alice', rating: 5, comment: 'Great product!' },
      { user: 'Bob', rating: 4, comment: 'Good value' }
    ],
    attributes: {
      colors: ['Black', 'Silver', 'Space Gray'],
      sizes: ['13"', '15"', '17"']
    }
  }
];

console.log('Разные стратегии обработки массивов:');

// Стратегия 1: Объединение через запятую (по умолчанию)
const strategy1 = preprocessDataWithFlattening(arrayData, { 
  flatten: true,
  arrayHandling: 'join'
});
console.log('\n1. Объединение через запятую:');
console.log(JSON.stringify(strategy1, null, 2));

// Стратегия 2: Сериализация JSON
const strategy2 = preprocessDataWithFlattening(arrayData, { 
  flatten: true,
  arrayHandling: 'stringify'
});
console.log('\n2. Сериализация JSON:');
console.log(JSON.stringify(strategy2, null, 2));

// Пример 5: Интеграция с существующим API
console.log('\n\n=== Пример 5: Интеграция с существующим API ===\n');

/**
 * Расширенная версия jsonToCsv с поддержкой flattening
 */
function jsonToCsvWithFlattening(data, options = {}) {
  const {
    flatten = false,
    flattenSeparator = '.',
    flattenMaxDepth = 3,
    arrayHandling = 'stringify',
    ...csvOptions
  } = options;

  // Предобработка с flattening
  const processedData = preprocessDataWithFlattening(data, {
    flatten,
    separator: flattenSeparator,
    maxDepth: flattenMaxDepth,
    arrayHandling
  });

  // Используем существующую функцию jsonToCsv
  return jsonToCsv(processedData, csvOptions);
}

// Демонстрация
const complexData = [
  {
    id: 'USER-001',
    personal: {
      name: 'Charlie Brown',
      birth: {
        date: '1990-05-15',
        place: 'Springfield'
      }
    },
    employment: {
      company: 'Tech Corp',
      position: 'Senior Developer',
      skills: ['JavaScript', 'TypeScript', 'Node.js', 'React']
    }
  }
];

console.log('Без flattening:');
const csvWithout = jsonToCsvWithFlattening(complexData, { flatten: false });
console.log(csvWithout);

console.log('\nС flattening:');
const csvWith = jsonToCsvWithFlattening(complexData, { 
  flatten: true,
  flattenSeparator: '_',
  flattenMaxDepth: 4
});
console.log(csvWith);

console.log('\n\n=== Рекомендации по улучшению jtcsv ===\n');
console.log('1. Добавить опцию "flatten" в jsonToCsv для автоматического разворачивания вложенных объектов');
console.log('2. Добавить параметры для контроля flattening:');
console.log('   - flattenSeparator: разделитель для вложенных ключей (по умолчанию ".")');
console.log('   - flattenMaxDepth: максимальная глубина разворачивания');
console.log('   - arrayHandling: стратегия обработки массивов');
console.log('3. Добавить функцию flattenObject в публичное API');
console.log('4. Обновить документацию с примерами обработки сложных JSON структур');
console.log('5. Добавить тесты для edge cases вложенных объектов');