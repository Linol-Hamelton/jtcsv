import type { CsvToJsonOptions, JsonToCsvOptions, SaveAsCsvOptions } from './index';

export interface JtcsvWithPluginsOptions {
  enableFastPath?: boolean;
  enablePlugins?: boolean;
  [key: string]: any;
}

export interface PluginHookContext {
  operation: string;
  options?: any;
  metadata?: Record<string, any>;
}

export class JtcsvWithPlugins {
  constructor(options?: JtcsvWithPluginsOptions);
  csvToJson(csv: string, options?: CsvToJsonOptions): Promise<any[]>;
  csvToJsonIterator(csv: string, options?: CsvToJsonOptions): AsyncGenerator<any, void, unknown>;
  jsonToCsv(json: any[], options?: JsonToCsvOptions): Promise<string>;
  saveAsCsv(data: any[], filePath: string, options?: SaveAsCsvOptions): Promise<void>;
  readCsvAsJson(filePath: string, options?: CsvToJsonOptions): Promise<any[]>;
  parseNdjson(input: string | ReadableStream, options?: any): Promise<any[]>;
  toNdjson(data: any[], options?: any): string;
  fromNdjson(input: string, options?: any): any[];
  use(name: string, plugin: any): void;
  getStats(): any;
  configure(newOptions: JtcsvWithPluginsOptions): this;
  static create(options?: JtcsvWithPluginsOptions): JtcsvWithPlugins;
}

export class PluginManager {}
export class FastPathEngine {}
export class NdjsonParser {}

export const create: typeof JtcsvWithPlugins.create;

export default JtcsvWithPlugins;
