/**
 * Кэширование результатов авто-детектирования разделителя
 * Использует WeakMap и LRU кэш для оптимизации производительности
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

interface CacheStatsWithRates extends CacheStats {
  hitRate: number;
  totalRequests: number;
}

export class DelimiterCache {
  private weakMap: WeakMap<object, string>;
  private lruCache: Map<string, string>;
  private maxSize: number;
  private stats: CacheStats;

  constructor(maxSize: number = 100) {
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
  private _generateKey(csv: string, candidates: string[]): string {
    // Используем хэш первых 1000 символов для производительности
    const sample = csv.substring(0, Math.min(1000, csv.length));
    const candidatesKey = candidates.join(',');
    return `${this._hashString(sample)}:${candidatesKey}`;
  }

  /**
   * Простая хэш-функция для строк
   * @private
   */
  private _hashString(str: string): string {
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
   * @param csv - CSV строка
   * @param candidates - Кандидаты разделителей
   * @returns Найденный разделитель или undefined
   */
  get(csv: string, candidates: string[]): string | null {
    // Сначала проверяем WeakMap (для объектов)
    if (typeof csv === 'object' && csv !== null) {
      const result = this.weakMap.get(csv as any);
      if (result !== undefined) {
        this.stats.hits++;
        return result;
      }
    }

    // Проверяем LRU кэш
    const key = this._generateKey(csv, candidates);
    const result = this.lruCache.get(key);
    
    if (result !== undefined) {
      // Обновляем позицию в LRU (перемещаем в конец)
      this.lruCache.delete(key);
      this.lruCache.set(key, result);
      this.stats.hits++;
      return result;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Сохраняет значение в кэш
   * @param csv - CSV строка
   * @param candidates - Кандидаты разделителей
   * @param delimiter - Найденный разделитель
   */
  set(csv: string, candidates: string[], delimiter: string): void {
    // Сохраняем в WeakMap для объектов
    if (typeof csv === 'object' && csv !== null) {
      this.weakMap.set(csv as any, delimiter);
    }

    // Сохраняем в LRU кэш
    const key = this._generateKey(csv, candidates);
    
    // Проверяем размер кэша
    if (this.lruCache.size >= this.maxSize) {
      // Удаляем самый старый элемент (первый в Map)
      const firstKey = this.lruCache.keys().next().value;
      if (firstKey) {
        this.lruCache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.lruCache.set(key, delimiter);
    this.stats.size = this.lruCache.size;
  }

  /**
   * Очищает кэш
   */
  clear(): void {
    this.weakMap = new WeakMap();
    this.lruCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Возвращает статистику кэша
   */
  getStats(): CacheStatsWithRates {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      totalRequests,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  /**
   * Проверяет наличие значения в кэше
   */
  has(csv: string, candidates: string[]): boolean {
    if (typeof csv === 'object' && csv !== null) {
      return this.weakMap.has(csv as any);
    }

    const key = this._generateKey(csv, candidates);
    return this.lruCache.has(key);
  }

  /**
   * Удаляет значение из кэша
   */
  delete(csv: string, candidates: string[]): boolean {
    let deleted = false;

    if (typeof csv === 'object' && csv !== null) {
      deleted = this.weakMap.delete(csv as any);
    }

    const key = this._generateKey(csv, candidates);
    if (this.lruCache.delete(key)) {
      deleted = true;
      this.stats.size = this.lruCache.size;
    }

    return deleted;
  }

  /**
   * Возвращает размер кэша
   */
  get size(): number {
    return this.lruCache.size;
  }

  /**
   * Асинхронная версия get
   */
  async getAsync(csv: string, candidates: string[]): Promise<string | null> {
    return this.get(csv, candidates);
  }

  /**
   * Асинхронная версия set
   */
  async setAsync(csv: string, candidates: string[], delimiter: string): Promise<void> {
    return this.set(csv, candidates, delimiter);
  }

  /**
   * Асинхронная версия clear
   */
  async clearAsync(): Promise<void> {
    return this.clear();
  }

  /**
   * РћРїС‚РёРјРёР·РёСЂРѕРІР°РЅРЅР°СЏ РІРµСЂСЃРёСЏ autoDetectDelimiter СЃ РєСЌС€РёСЂРѕРІР°РЅРёРµРј
   */
  static autoDetectDelimiter(
    csv: string,
    candidates: string[] = [';', ',', '\t', '|'],
    cache: DelimiterCache | null = null
  ): string {
    if (!csv || typeof csv !== 'string') {
      return ';';
    }

    // РџСЂРѕРІРµСЂСЏРµРј РєСЌС€ РµСЃР»Рё РѕРЅ РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅ
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

    // РСЃРїРѕР»СЊР·СѓРµРј РїРµСЂРІСѓСЋ РЅРµРїСѓСЃС‚СѓСЋ СЃС‚СЂРѕРєСѓ РґР»СЏ РґРµС‚РµРєС‚РёСЂРѕРІР°РЅРёСЏ
    const firstLine = lines[0];

    // Р‘С‹СЃС‚СЂС‹Р№ РїРѕРґСЃС‡С‘С‚ РІС…РѕР¶РґРµРЅРёР№ РєР°РЅРґРёРґР°С‚РѕРІ Р·Р° РѕРґРёРЅ РїСЂРѕС…РѕРґ
    const counts: Record<string, number> = {};
    const candidateSet = new Set(candidates);
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (candidateSet.has(char)) {
        counts[char] = (counts[char] || 0) + 1;
      }
    }

    for (const delim of candidates) {
      if (!(delim in counts)) {
        counts[delim] = 0;
      }
    }

    let maxCount = -1;
    let detectedDelimiter = ';';
    const maxDelimiters: string[] = [];

    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDelimiters.length = 0;
        maxDelimiters.push(delim);
      } else if (count === maxCount) {
        maxDelimiters.push(delim);
      }
    }

    if (maxCount === 0 || maxDelimiters.length > 1) {
      detectedDelimiter = ';';
    } else {
      detectedDelimiter = maxDelimiters[0];
    }

    if (cache) {
      cache.set(csv, candidates, detectedDelimiter);
    }

    return detectedDelimiter;
  }
}

// Создание глобального экземпляра кэша
let globalCache: DelimiterCache | null = null;

/**
 * Возвращает глобальный экземпляр кэша разделителей
 */
export function getGlobalDelimiterCache(maxSize: number = 100): DelimiterCache {
  if (!globalCache) {
    globalCache = new DelimiterCache(maxSize);
  }
  return globalCache;
}

/**
 * Асинхронная версия getGlobalDelimiterCache
 */
export async function getGlobalDelimiterCacheAsync(maxSize: number = 100): Promise<DelimiterCache> {
  return getGlobalDelimiterCache(maxSize);
}

// Экспорт для CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DelimiterCache,
    getGlobalDelimiterCache,
    getGlobalDelimiterCacheAsync
  };
}
