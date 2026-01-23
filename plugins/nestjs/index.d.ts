import type { Type } from '@nestjs/common';
import type { NestInterceptor } from '@nestjs/common';
import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

export interface CsvParserOptions extends CsvToJsonOptions {}

export interface CsvDownloadOptions extends JsonToCsvOptions {
  filename?: string;
}

export function createCsvParserInterceptor(
  options?: CsvParserOptions
): Type<NestInterceptor>;

export function createCsvDownloadInterceptor(
  options?: CsvDownloadOptions
): Type<NestInterceptor>;

export function CsvParserInterceptor(
  options?: CsvParserOptions
): MethodDecorator & ClassDecorator;

export function CsvDownloadDecorator(
  options?: CsvDownloadOptions
): MethodDecorator & ClassDecorator;
