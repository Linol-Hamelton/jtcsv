import type { CsvToJsonOptions } from 'jtcsv';

export function createCsvProcedure<TProcedureBuilder>(
  t: { procedure: TProcedureBuilder },
  schema: unknown,
  options?: CsvToJsonOptions
): TProcedureBuilder;
