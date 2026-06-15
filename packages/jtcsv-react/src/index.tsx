/**
 * jtcsv-react — React hooks and components for jtcsv.
 *
 * Public API:
 *   - useCsvUpload({ parseOptions?, onParsed?, onError? })
 *   - useCsvParse(text, options?)
 *   - useCsvDownload()
 *   - <CsvDropZone />
 *
 * @version 0.1.0
 * @date 2026-06-15
 */

import * as React from 'react';
import {
  parseCsvFile,
  csvToJson,
  downloadAsCsv,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
} from 'jtcsv/browser';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface CsvDropZoneProps {
  accept?: string;
  multiple?: boolean;
  parseOptions?: any;
  onParsed?: (rows: any[]) => void;
  onError?: (err: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// useCsvUpload
// ---------------------------------------------------------------------------

export function useCsvUpload(options: UseCsvUploadOptions = {}): UseCsvUploadReturn {
  const { parseOptions, onParsed, onError } = options;
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    async (files: FileList | File[] | null | undefined): Promise<any[]> => {
      if (!files) return [];
      const arr: File[] = Array.from(files as any) as File[];
      if (arr.length === 0) return [];

      setIsParsing(true);
      setError(null);
      try {
        const merged: any[] = [];
        for (const f of arr) {
          const rows = await parseCsvFile(f, parseOptions);
          if (Array.isArray(rows)) merged.push(...rows);
        }
        if (onParsed) onParsed(merged);
        return merged;
      } catch (err: any) {
        const e: Error = err instanceof Error ? err : new Error(String(err));
        setError(e);
        if (onError) onError(e);
        return [];
      } finally {
        setIsParsing(false);
      }
    },
    [parseOptions, onParsed, onError]
  );

  const onDragOver = React.useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
  }, []);

  const onDragEnter = React.useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = React.useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        // Fire-and-forget; consumers can also await handleFiles directly.
        void handleFiles(files);
      }
    },
    [handleFiles]
  );

  const dropzoneProps: DropzoneProps = { onDragOver, onDragEnter, onDragLeave, onDrop };

  return { handleFiles, isParsing, error, isDragging, dropzoneProps };
}

// ---------------------------------------------------------------------------
// useCsvParse
// ---------------------------------------------------------------------------

export function useCsvParse(
  text: string | null | undefined,
  options?: any
): UseCsvParseReturn {
  return React.useMemo<UseCsvParseReturn>(() => {
    if (text == null) {
      return { data: null, error: null, isParsing: false };
    }
    try {
      const data = csvToJson(text, options);
      return { data, error: null, isParsing: false };
    } catch (err: any) {
      const e: Error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error: e, isParsing: false };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, options]);
}

// ---------------------------------------------------------------------------
// useCsvDownload
// ---------------------------------------------------------------------------

export interface UseCsvDownloadReturn {
  downloadCsv: (data: any[], filename?: string, options?: any) => void;
}

export function useCsvDownload(): UseCsvDownloadReturn {
  const downloadCsv = React.useCallback(
    (data: any[], filename: string = 'data.csv', options: any = {}) => {
      downloadAsCsv(data, filename, options);
    },
    []
  );
  return { downloadCsv };
}

// ---------------------------------------------------------------------------
// <CsvDropZone />
// ---------------------------------------------------------------------------

export const CsvDropZone = React.forwardRef<HTMLDivElement, CsvDropZoneProps>(
  function CsvDropZone(
    {
      accept = '.csv,text/csv',
      multiple = false,
      parseOptions,
      onParsed,
      onError,
      className,
      children,
    },
    ref
  ) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const { handleFiles, isParsing, isDragging, dropzoneProps } = useCsvUpload({
      parseOptions,
      onParsed,
      onError,
    });

    const onInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length) {
          void handleFiles(files);
        }
      },
      [handleFiles]
    );

    const onClick = React.useCallback(() => {
      inputRef.current && inputRef.current.click();
    }, []);

    const baseClass = ['jtcsv-react-dropzone'];
    if (isDragging) baseClass.push('is-dragging');
    if (isParsing) baseClass.push('is-parsing');
    if (className) baseClass.push(className);

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        className={baseClass.join(' ')}
        {...dropzoneProps}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          style={{ display: 'none' }}
          data-testid="jtcsv-react-file-input"
        />
        {children != null ? (
          children
        ) : (
          <span className="jtcsv-react-dropzone-label">
            {isDragging ? 'Release to upload' : isParsing ? 'Parsing…' : 'Drop CSV here'}
          </span>
        )}
      </div>
    );
  }
);
