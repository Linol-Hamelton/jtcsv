const FastPathEngine = require('../src/engines/fast-path-engine');

describe('FastPathEngine additional coverage', () => {
  let engine;

  beforeEach(() => {
    engine = new FastPathEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  test('parses simple CSV with backslash escapes', () => {
    const csv = [
      'id,name',
      '1,hello\\,world',
      '2,slash\\\\test',
      '3,trail\\',
      ''
    ].join('\n');
    const rows = engine.parse(csv);

    expect(rows[1]).toEqual(['1', 'hello,world']);
    expect(rows[2]).toEqual(['2', 'slash\\test']);
    expect(rows[3]).toEqual(['3', 'trail\\']);
  });

  test('iterates rows with escaped quotes and backslashes', () => {
    const csv = 'id,text\n1,"Hello\\\\world"\n2,"He said ""hi"""\n';
    const rows = Array.from(engine.iterateRows(csv));

    expect(rows).toEqual([
      ['id', 'text'],
      ['1', 'Hello\\world'],
      ['2', 'He said "hi"']
    ]);
  });

  test('throws FAST_PATH_UNCLOSED_QUOTES for escaped parser', () => {
    const csv = 'id,text\n1,"Unclosed\n';

    expect(() => Array.from(engine.iterateRows(csv)))
      .toThrow('Unclosed quotes in CSV');
  });

  test('compileParser default case uses standard parser count', () => {
    const parser = engine.compileParser({
      delimiter: ',',
      hasQuotes: false,
      hasNewlinesInFields: false,
      fieldConsistency: true,
      recommendedEngine: 'UNKNOWN'
    });

    expect(typeof parser).toBe('function');

    const stats = engine.getStats();
    expect(stats.standardParserCount).toBe(1);
  });

  test('compileRowEmitter caches emitters', () => {
    const structure = {
      delimiter: ',',
      hasQuotes: false,
      hasNewlinesInFields: false,
      fieldConsistency: true,
      recommendedEngine: 'SIMPLE'
    };

    const emitter1 = engine.compileRowEmitter(structure);
    const emitter2 = engine.compileRowEmitter(structure);

    expect(emitter1).toBe(emitter2);
  });

  test('forceEngine option overrides recommendation', () => {
    const csv = 'id,name\n1,John\n2,Jane';
    const rows = engine.parse(csv, { forceEngine: 'STANDARD' });

    expect(rows).toEqual([
      ['id', 'name'],
      ['1', 'John'],
      ['2', 'Jane']
    ]);
  });
});
