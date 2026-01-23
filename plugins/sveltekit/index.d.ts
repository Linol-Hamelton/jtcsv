import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

export interface SvelteKitCsvParseOptions extends CsvToJsonOptions {
  fieldName?: string;
  formData?: boolean;
}

export function parseCsv(
  request: Request,
  options?: SvelteKitCsvParseOptions
): Promise<unknown[]>;

export function generateCsv(
  data: unknown[] | Record<string, unknown>,
  filename?: string,
  options?: JsonToCsvOptions
): Response;
