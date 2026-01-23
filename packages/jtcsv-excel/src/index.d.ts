/**
 * TypeScript definitions для JTCSV Excel
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

declare module '@jtcsv/excel' {
  import ExcelJS from 'exceljs';

  export interface ExcelToJsonOptions {
    sheetNumber?: number;
    sheetName?: string;
    hasHeaders?: boolean;
    headerRow?: number;
    dataStartRow?: number;
    includeEmptyRows?: boolean;
    columnMapping?: Record<string, string>;
    valueTransformers?: Record<string, (value: any, row: number, col: number) => any>;
  }

  export interface JsonToExcelOptions {
    sheetName?: string;
    includeHeaders?: boolean;
    headers?: string[];
    columnStyles?: Record<string, Partial<ExcelJS.Style>>;
    headerStyle?: Partial<ExcelJS.Style>;
    autoWidth?: boolean;
    freezeHeader?: boolean;
    returnBuffer?: boolean;
  }

  export interface FormattingRule {
    condition: (value: any, row: any, rowIndex: number) => boolean;
    style: Partial<ExcelJS.Style>;
  }

  export interface ExportFormattingOptions {
    headerStyle?: Partial<ExcelJS.Style>;
    rules?: Record<string, FormattingRule[]>;
    numberFormat?: string;
    dateFormat?: string;
    addFilters?: boolean;
  }

  export interface SheetData {
    id: number;
    name: string;
    data: any[];
    rowCount: number;
    columnCount: number;
  }

  export interface ExcelMetadata {
    creator: string;
    lastModifiedBy: string;
    created: Date;
    modified: Date;
    lastPrinted?: Date;
    company?: string;
    manager?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    category?: string;
    description?: string;
    language?: string;
    revision?: number;
    contentStatus?: string;
    worksheets: Array<{
      id: number;
      name: string;
      state: string;
      rowCount: number;
      columnCount: number;
      dimensions: string;
      hasHeaderRow: boolean;
      properties: any;
    }>;
  }

  export interface TemplateOptions {
    sheetName?: string;
    instructions?: string;
    exampleData?: any[];
    validationRules?: Record<string, string[]>;
  }

  export class JtcsvExcel {
    static fromExcel(input: string | Buffer, options?: ExcelToJsonOptions): Promise<any[]>;
    
    static toExcel(
      data: any[], 
      output?: string | null, 
      options?: JsonToExcelOptions
    ): Promise<string | Buffer>;
    
    static excelToCsv(input: string | Buffer, options?: ExcelToJsonOptions & { csvOptions?: any }): Promise<string>;
    
    static csvToExcel(
      csv: string, 
      output?: string | null, 
      options?: { csvOptions?: any; excelOptions?: JsonToExcelOptions }
    ): Promise<string | Buffer>;
    
    static readMultipleSheets(input: string | Buffer, options?: ExcelToJsonOptions): Promise<Record<string, SheetData>>;
    
    static createMultiSheetExcel(
      sheetsData: Record<string, any[]>, 
      output?: string | null, 
      options?: JsonToExcelOptions
    ): Promise<string | Buffer>;
    
    static exportWithFormatting(
      data: any[], 
      formatting?: ExportFormattingOptions, 
      output?: string | null
    ): Promise<string | Buffer>;
    
    static getExcelMetadata(input: string | Buffer): Promise<ExcelMetadata>;
    
    static createTemplate(headers: string[], options?: TemplateOptions): Promise<Buffer>;
    
    static createJtcsvPlugin(): any;
  }

  export const fromExcel: typeof JtcsvExcel.fromExcel;
  export const toExcel: typeof JtcsvExcel.toExcel;
  export const excelToCsv: typeof JtcsvExcel.excelToCsv;
  export const csvToExcel: typeof JtcsvExcel.csvToExcel;
  export const readMultipleSheets: typeof JtcsvExcel.readMultipleSheets;
  export const createMultiSheetExcel: typeof JtcsvExcel.createMultiSheetExcel;
  export const exportWithFormatting: typeof JtcsvExcel.exportWithFormatting;
  export const getExcelMetadata: typeof JtcsvExcel.getExcelMetadata;
  export const createTemplate: typeof JtcsvExcel.createTemplate;
  export const jtcsvPlugin: any;
  export const ExcelJS: typeof ExcelJS;
}

export {};