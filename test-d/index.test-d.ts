import { expectType, expectError, expectAssignable } from 'tsd';
import type * as api from 'jtcsv';
import type { Transform } from 'stream';

declare const csvToJson: typeof api.csvToJson;
declare const jsonToCsv: typeof api.jsonToCsv;
declare const createJsonToCsvStream: typeof api.createJsonToCsvStream;
declare const createCsvToJsonStream: typeof api.createCsvToJsonStream;
declare const autoDetectDelimiter: typeof api.autoDetectDelimiter;
declare const saveAsCsv: typeof api.saveAsCsv;
declare const saveAsJson: typeof api.saveAsJson;
declare const readCsvAsJson: typeof api.readCsvAsJson;
declare const readCsvAsJsonSync: typeof api.readCsvAsJsonSync;
declare const csvToJsonIterator: typeof api.csvToJsonIterator;
declare const ValidationError: typeof api.ValidationError;
declare const JtcsvError: typeof api.JtcsvError;

// Basic return types
expectType<string>(jsonToCsv([{ id: 1 }]));
expectType<string>(autoDetectDelimiter('a,b\n1,2'));

// csvToJson overloads
const rowsDefault = csvToJson('a,b\n1,2');
expectType<Record<string, any>[]>(rowsDefault);

const rowsCompact = csvToJson('a,b\n1,2', { fastPathMode: 'compact' });
expectType<any[][]>(rowsCompact);

const rowsStream = csvToJson('a,b\n1,2', { fastPathMode: 'stream' });
expectType<AsyncGenerator<Record<string, any> | any[]>>(rowsStream);

// Iterator
const iterator = csvToJsonIterator('a,b\n1,2');
expectType<AsyncGenerator<Record<string, any> | any[]>>(iterator);

// Streams
expectType<Transform>(createJsonToCsvStream());
expectType<Transform>(createCsvToJsonStream());

// IO
expectType<Promise<void>>(saveAsCsv([{ id: 1 }], 'out.csv'));
expectType<Promise<void>>(saveAsJson({ id: 1 }, 'out.json'));
expectType<Promise<Record<string, any>[]>>(readCsvAsJson('in.csv'));
expectType<Record<string, any>[]>(readCsvAsJsonSync('in.csv'));

// Errors
const err = new ValidationError('bad');
expectType<api.JtcsvError>(err);
expectAssignable<Error>(err);
expectType<typeof JtcsvError>(JtcsvError);

// Misuse
expectError(csvToJson('a,b\n1,2', { fastPathMode: 'invalid' }));
