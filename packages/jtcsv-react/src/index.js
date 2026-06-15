/**
 * jtcsv-react — CJS hand-mirror of src/index.ts.
 *
 * This file is hand-maintained to mirror src/index.ts's public API
 * (post jtcsv-excel-W9 strategy: TS authoritative, JS hand-mirror, .d.ts
 * hand-written).
 */

'use strict';

const React = require('react');
const jsxRuntime = require('react/jsx-runtime');
const jtcsvBrowser = require('jtcsv/browser');

const {
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
} = jtcsvBrowser;

// ---------------------------------------------------------------------------
// useCsvUpload
// ---------------------------------------------------------------------------

function useCsvUpload(options) {
  const opts = options || {};
  const parseOptions = opts.parseOptions;
  const onParsed = opts.onParsed;
  const onError = opts.onError;

  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    async function handleFiles(files) {
      if (!files) return [];
      const arr = Array.from(files);
      if (arr.length === 0) return [];

      setIsParsing(true);
      setError(null);
      try {
        const merged = [];
        for (const f of arr) {
          const rows = await parseCsvFile(f, parseOptions);
          if (Array.isArray(rows)) merged.push.apply(merged, rows);
        }
        if (onParsed) onParsed(merged);
        return merged;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        if (onError) onError(e);
        return [];
      } finally {
        setIsParsing(false);
      }
    },
    [parseOptions, onParsed, onError]
  );

  const onDragOver = React.useCallback(function (e) {
    e.preventDefault();
  }, []);

  const onDragEnter = React.useCallback(function (e) {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = React.useCallback(function (e) {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = React.useCallback(
    function (e) {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        void handleFiles(files);
      }
    },
    [handleFiles]
  );

  const dropzoneProps = { onDragOver, onDragEnter, onDragLeave, onDrop };
  return { handleFiles, isParsing, error, isDragging, dropzoneProps };
}

// ---------------------------------------------------------------------------
// useCsvParse
// ---------------------------------------------------------------------------

function useCsvParse(text, options) {
  return React.useMemo(
    function () {
      if (text == null) {
        return { data: null, error: null, isParsing: false };
      }
      try {
        const data = csvToJson(text, options);
        return { data, error: null, isParsing: false };
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        return { data: null, error: e, isParsing: false };
      }
    },
    [text, options]
  );
}

// ---------------------------------------------------------------------------
// useCsvDownload
// ---------------------------------------------------------------------------

function useCsvDownload() {
  const downloadCsv = React.useCallback(function (data, filename, options) {
    downloadAsCsv(data, filename || 'data.csv', options || {});
  }, []);
  return { downloadCsv };
}

// ---------------------------------------------------------------------------
// <CsvDropZone />
// ---------------------------------------------------------------------------

const CsvDropZone = React.forwardRef(function CsvDropZone(props, ref) {
  const accept = props.accept != null ? props.accept : '.csv,text/csv';
  const multiple = !!props.multiple;
  const parseOptions = props.parseOptions;
  const onParsed = props.onParsed;
  const onError = props.onError;
  const className = props.className;
  const children = props.children;

  const inputRef = React.useRef(null);
  const upload = useCsvUpload({ parseOptions, onParsed, onError });
  const { handleFiles, isParsing, isDragging, dropzoneProps } = upload;

  const onInputChange = React.useCallback(
    function (e) {
      const files = e.target.files;
      if (files && files.length) void handleFiles(files);
    },
    [handleFiles]
  );

  const onClick = React.useCallback(function () {
    if (inputRef.current) inputRef.current.click();
  }, []);

  const baseClass = ['jtcsv-react-dropzone'];
  if (isDragging) baseClass.push('is-dragging');
  if (isParsing) baseClass.push('is-parsing');
  if (className) baseClass.push(className);

  const inputEl = jsxRuntime.jsx('input', {
    ref: inputRef,
    type: 'file',
    accept,
    multiple,
    onChange: onInputChange,
    style: { display: 'none' },
    'data-testid': 'jtcsv-react-file-input',
  });

  const labelEl =
    children != null
      ? children
      : jsxRuntime.jsx(
          'span',
          { className: 'jtcsv-react-dropzone-label' },
          isDragging ? 'Release to upload' : isParsing ? 'Parsing…' : 'Drop CSV here'
        );

  return jsxRuntime.jsxs(
    'div',
    Object.assign(
      {
        ref,
        role: 'button',
        tabIndex: 0,
        onClick,
        className: baseClass.join(' '),
      },
      dropzoneProps,
      { children: [inputEl, labelEl] }
    )
  );
});

module.exports = {
  useCsvUpload,
  useCsvParse,
  useCsvDownload,
  CsvDropZone,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
};
