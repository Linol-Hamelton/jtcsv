export function csvToJson(csv: string, options?: any): any[];
export function csvToJsonIterator(input: any, options?: any): AsyncGenerator<any, void, unknown>;
export function autoDetectDelimiter(csv: string, candidates?: string[]): string;
