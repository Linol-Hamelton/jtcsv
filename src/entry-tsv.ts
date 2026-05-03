// Subpath entry: `jtcsv/tsv` — TSV parsing + emission.
import TsvParser from './formats/tsv-parser';

export const jsonToTsv = TsvParser.jsonToTsv.bind(TsvParser);
export const tsvToJson = TsvParser.tsvToJson.bind(TsvParser);
export const isTsv = TsvParser.isTsv.bind(TsvParser);
export const validateTsv = TsvParser.validateTsv.bind(TsvParser);
export const readTsvAsJson = TsvParser.readTsvAsJson.bind(TsvParser);
export const readTsvAsJsonSync = TsvParser.readTsvAsJsonSync.bind(TsvParser);
export const saveAsTsv = TsvParser.saveAsTsv.bind(TsvParser);
export const saveAsTsvSync = TsvParser.saveAsTsvSync.bind(TsvParser);
export const createJsonToTsvStream = TsvParser.createJsonToTsvStream.bind(TsvParser);
export const createTsvToJsonStream = TsvParser.createTsvToJsonStream.bind(TsvParser);

export { TsvParser };
export default TsvParser;
