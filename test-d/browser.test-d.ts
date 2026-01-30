import { expectType } from 'tsd';
import type * as browserJson from 'jtcsv-browser-json';
import type * as browserCsv from 'jtcsv-browser-csv';

declare const jsonToCsv: typeof browserJson.jsonToCsv;
declare const preprocessData: typeof browserJson.preprocessData;
declare const deepUnwrap: typeof browserJson.deepUnwrap;

declare const csvToJson: typeof browserCsv.csvToJson;
declare const csvToJsonIterator: typeof browserCsv.csvToJsonIterator;
declare const autoDetectDelimiter: typeof browserCsv.autoDetectDelimiter;

expectType<string>(jsonToCsv([{ id: 1 }]));
expectType<any[]>(preprocessData([{ id: 1 }]));
expectType<any>(deepUnwrap({ a: 1 }));

expectType<any[]>(csvToJson('a,b\n1,2'));
expectType<AsyncGenerator<any, void, unknown>>(csvToJsonIterator('a,b\n1,2'));
expectType<string>(autoDetectDelimiter('a,b\n1,2'));
