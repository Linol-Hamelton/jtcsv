// Subpath entry: `jtcsv/ndjson` — NDJSON parsing + emission.
import NdjsonParser from './formats/ndjson-parser';

export const jsonToNdjson = NdjsonParser.toNdjson.bind(NdjsonParser);
export const ndjsonToJson = NdjsonParser.fromNdjson.bind(NdjsonParser);
export const parseNdjsonStream = NdjsonParser.parseStream.bind(NdjsonParser);
export const createNdjsonToCsvStream = NdjsonParser.createNdjsonToCsvStream.bind(NdjsonParser);
export const createCsvToNdjsonStream = NdjsonParser.createCsvToNdjsonStream.bind(NdjsonParser);
export const getNdjsonStats = NdjsonParser.getStats.bind(NdjsonParser);

export { NdjsonParser };
export default NdjsonParser;
