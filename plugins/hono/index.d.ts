import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';
import type { Context } from 'hono';

export function csvMiddleware(
  options?: CsvToJsonOptions
): (c: Context, next: () => Promise<void>) => Promise<void>;

export function createCsvResponse(
  data: unknown[] | Record<string, unknown>,
  filename?: string,
  options?: JsonToCsvOptions
): { csv: string; headers: Record<string, string> };
