/**
 * Кэширование результатов авто-детектирования разделителя
 * Использует WeakMap и LRU кэш для оптимизации производительности
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

class DelimiterCache {
  constructor(maxSize = 100) {
    this.weakMap = new WeakMap();
    this.lruCache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Генерирует ключ кэша на основе строки и кандидатов
   * @private
   */
  _generateKey(csv, candidates) {
    // Используем хэш первых 1000 символов для производительности
    const sample = csv.substring(0, Math.min(1000, csv.length));
    const candidatesKey = candidates.join(',');
    return `${this._hashString(sample)}:${candidatesKey}`;
  }

  /**
   * Простая хэш-функция для строк
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Получает значение из кэша
   * @param {string} csv - CSV строка
   * @param {Array} candidates - Кандидаты разделителей
   * @returns {string|null} Кэшированный разделитель или null
   */
  get(csv, candidates) {
    const key = this._generateKey(csv, candidates);
    
    // Проверяем LRU кэш
    if (this.lruCache.has(key)) {
      // Обновляем позицию в LRU
      const value = this.lruCache.get(key);
      this.lruCache.delete(key);
      this.lruCache.set(key, value);
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Сохраняет значение в кэш
   * @param {string} csv - CSV строка
   * @param {Array} candidates - Кандидаты разделителей
   * @param {string} delimiter - Найденный разделитель
   */
  set(csv, candidates, delimiter) {
    const key = this._generateKey(csv, candidates);
    
    // Проверяем необходимость вытеснения из LRU кэша
    if (this.lruCache.size >= this.maxSize) {
      // Удаляем самый старый элемент (первый в Map)
      const firstKey = this.lruCache.keys().next().value;
      this.lruCache.delete(firstKey);
      this.stats.evictions++;
    }
    
    // Сохраняем в LRU кэш
    this.lruCache.set(key, delimiter);
    this.stats.size = this.lruCache.size;
    
    // Также сохраняем в WeakMap если csv является объектом
    if (typeof csv === 'object' && csv !== null) {
      this.weakMap.set(csv, { candidates, delimiter });
    }
  }

  /**
   * Очищает кэш
   */
  clear() {
    this.lruCache.clear();
    this.weakMap = new WeakMap();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Возвращает статистику кэша
   * @returns {Object} Статистика
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      totalRequests: total
    };
  }

  /**
   * Оптимизированная версия autoDetectDelimiter с кэшированием
   * @param {string} csv - CSV строка
   * @param {Array} candidates - Кандидаты разделителей
   * @param {DelimiterCache} cache - Экземпляр кэша (опционально)
   * @returns {string} Найденный разделитель
   */
  static autoDetectDelimiter(csv, candidates = [';', ',', '\t', '|'], cache = null) {
    if (!csv || typeof csv !== 'string') {
      return ';';
    }

    // Проверяем кэш если он предоставлен
    if (cache) {
      const cached = cache.get(csv, candidates);
      if (cached !== null) {
        return cached;
      }
    }

    const lines = csv.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return ';';
    }

    // Используем первую непустую строку для детектирования
    const firstLine = lines[0];
    
    const counts = {};
    candidates.forEach(delim => {
      const escapedDelim = delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedDelim, 'g');
      const matches = firstLine.match(regex);
      counts[delim] = matches ? matches.length : 0;
    });

    // Находим разделитель с максимальным количеством
    let maxCount = -1;
    let detectedDelimiter = ';';
    
    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delim;
      }
    }

    // Если разделитель не найден или есть ничья, возвращаем стандартный
    if (maxCount === 0) {
      detectedDelimiter = ';';
    }

    // Сохраняем в кэш если он предоставлен
    if (cache) {
      cache.set(csv, candidates, detectedDelimiter);
    }

    return detectedDelimiter;
  }
}

module.exports = DelimiterCache;