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
    
    // Быстрый подсчёт вхождений кандидатов за один проход
    const counts = {};
    const candidateSet = new Set(candidates);
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (candidateSet.has(char)) {
        counts[char] = (counts[char] || 0) + 1;
      }
    }
    // Убедимся, что все кандидаты присутствуют в counts (даже с нулём)
    for (const delim of candidates) {
      if (!(delim in counts)) {
        counts[delim] = 0;
      }
    }

    // Находим разделитель с максимальным количеством
    let maxCount = -1;
    let detectedDelimiter = ';';
    const maxDelimiters = [];
    
    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDelimiters.length = 0;
        maxDelimiters.push(delim);
      } else if (count === maxCount) {
        maxDelimiters.push(delim);
      }
    }

    // Если разделитель не найден или есть ничья, возвращаем стандартный
    if (maxCount === 0 || maxDelimiters.length > 1) {
      detectedDelimiter = ';';
    } else {
      detectedDelimiter = maxDelimiters[0];
    }

    // Сохраняем в кэш если он предоставлен
    if (cache) {
      cache.set(csv, candidates, detectedDelimiter);
    }

    return detectedDelimiter;
  }
}

module.exports = DelimiterCache;