/**
 * jtcsv-react — hand-written .d.ts (mirrors src/index.ts public surface).
 */

import * as React from 'react';

export interface UseCsvUploadOptions {
  parseOptions?: any;
  onParsed?: (rows: any[]) => void;
  onError?: (err: Error) => void;
}

export interface DropzoneProps {
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
}

export interface UseCsvUploadReturn {
  handleFiles: (files: FileList | File[] | null | undefined) => Promise<any[]>;
  isParsing: boolean;
  error: Error | null;
  isDragging: boolean;
  dropzoneProps: DropzoneProps;
}

export interface UseCsvParseReturn {
  data: any[] | null;
  error: Error | null;
  isParsing: boolean;
}

export interface UseCsvDownloadReturn {
  downloadCsv: (data: any[], filename?: string, options?: any) => void;
}

export interface CsvDropZoneProps {
  accept?: string;
  multiple?: boolean;
  parseOptions?: any;
  onParsed?: (rows: any[]) => void;
  onError?: (err: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export function useCsvUpload(options?: UseCsvUploadOptions): UseCsvUploadReturn;
export function useCsvParse(
  text: string | null | undefined,
  options?: any
): UseCsvParseReturn;
export function useCsvDownload(): UseCsvDownloadReturn;

export const CsvDropZone: React.ForwardRefExoticComponent<
  CsvDropZoneProps & React.RefAttributes<HTMLDivElement>
>;

// ---------------------------------------------------------------------------
// Error re-exports (from jtcsv/browser)
// ---------------------------------------------------------------------------

export {
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
} from 'jtcsv/browser';
