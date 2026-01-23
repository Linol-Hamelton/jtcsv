const TsvParser = require('./src/formats/tsv-parser');

console.log('Testing TSV escaping...');
const data = [
  { text: 'Line1\nLine2' },
  { text: 'Tab\tcharacter' },
  { text: 'Quote"test' }
];

console.log('Original data:', JSON.stringify(data, null, 2));

const tsv = TsvParser.jsonToTsv(data);
console.log('\nTSV output:');
console.log(tsv);

const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
console.log('\nLines count:', lines.length);
console.log('Lines:', lines);