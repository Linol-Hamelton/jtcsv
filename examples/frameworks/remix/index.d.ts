import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

export interface RemixCsvParseOptions extends CsvToJsonOptions {
  fieldName?: string;
}

export function parseFormData(
  request: Request,
  options?: RemixCsvParseOptions
): Promise<unknown[]>;

export function generateCsvResponse(
  data: unknown[] | Record<string, unknown>,
  filename?: string,
  options?: JsonToCsvOptions
): Response;
