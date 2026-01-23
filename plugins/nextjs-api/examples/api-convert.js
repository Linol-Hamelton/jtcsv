/**
 * Пример API route для Next.js
 * Сохраните этот файл как pages/api/convert.js
 * 
 * @example
 * // Запросы к API:
 * // POST /api/convert с JSON телом → получите CSV
 * // POST /api/convert с CSV телом → получите JSON
 * // GET /api/convert/health → проверка состояния
 */

import { 
  handler as jtcsvHandler,
  csvToJsonHandler,
  jsonToCsvHandler,
  healthCheckHandler 
} from '../../route';

// Основной endpoint для автоматической конвертации
export default jtcsvHandler;

// Специализированные endpoints
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

// Альтернативная реализация с отдельными путями
// export default async function handler(req, res) {
//   const { path } = req.query;
//   
//   switch (path) {
//     case 'csv-to-json':
//       return csvToJsonHandler(req, res);
//     case 'json-to-csv':
//       return jsonToCsvHandler(req, res);
//     case 'health':
//       return healthCheckHandler(req, res);
//     default:
//       return jtcsvHandler(req, res);
//   }
// }

/**
 * Пример использования с кастомной логикой
 * 
 * export default async function handler(req, res) {
 *   // Добавляем логирование
 *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
 *   
 *   // Проверяем аутентификацию
 *   const apiKey = req.headers['x-api-key'];
 *   if (!apiKey || apiKey !== process.env.API_KEY) {
 *     return res.status(401).json({ error: 'Unauthorized' });
 *   }
 *   
 *   // Ограничение по частоте запросов
 *   const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 *   // ... rate limiting logic
 *   
 *   // Вызываем основной обработчик
 *   return jtcsvHandler(req, res);
 * }
 */