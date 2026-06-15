/**
 * Type definitions for jtcsv-vue.
 *
 * Hand-written to mirror the public surface of src/index.ts.
 *
 * @version 0.1.0
 */

import type { App, Plugin, InjectionKey, Ref, Directive } from 'vue';

export type CsvToJsonOptions = Record<string, any>;
export type JsonToCsvOptions = Record<string, any>;

export interface VuePluginOptions {
  /** Whether to enable async functions (default: true) */
  async?: boolean;
  /** Whether to enable worker support (default: false) */
  workers?: boolean;
  /** Global property name (default: '$jtcsv') */
  propertyName?: string;
  /** Provide composable via string key for legacy callers (default: true) */
  provideComposable?: boolean;
}

export interface JtcsvVueInstance {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => any;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => string;
  csvToJsonAsync?: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsvAsync?: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
}

export const jtcsvKey: InjectionKey<JtcsvVueInstance>;

export interface CsvUploadDirectiveBinding {
  onLoad?: (data: any[], file: File) => void;
  onError?: (error: Error, file: File) => void;
  options?: CsvToJsonOptions;
}

export const csvUploadDirective: Directive<HTMLInputElement, CsvUploadDirectiveBinding>;

export function createJtcsvPlugin(options?: VuePluginOptions): Plugin;

export function useJtcsv(): JtcsvVueInstance;

export function useJtcsvAsync(): {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
  csvToJsonAsync: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsvAsync: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
};

export interface UseCsvUploadOptions {
  parseOptions?: CsvToJsonOptions;
  onParsed?: (data: any[], file: File) => void;
  onError?: (error: Error, file: File | null) => void;
}

export interface UseCsvUploadReturn {
  isParsing: Ref<boolean>;
  error: Ref<Error | null>;
  isDragging: Ref<boolean>;
  handleFiles: (files: FileList | File[] | null | undefined) => Promise<any[] | null>;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => Promise<any[] | null>;
}

export function useCsvUpload(opts?: UseCsvUploadOptions): UseCsvUploadReturn;

export function useCsvDownload(): {
  downloadCsv: (data: any[], filename?: string, options?: JsonToCsvOptions) => void;
};

// Re-exported error classes from jtcsv/browser
export class ValidationError extends Error {}
export class ParsingError extends Error {}
export class SecurityError extends Error {}
export class FileSystemError extends Error {}
export class LimitError extends Error {}
export class ConfigurationError extends Error {}
export const ERROR_CODES: Record<string, string>;

declare const _default: Plugin;
export default _default;
