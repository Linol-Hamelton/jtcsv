#!/usr/bin/env node

const { performance } = require('perf_hooks');
const jtcsv = require('jtcsv');

const rows = Number(process.env.JTCSV_PROFILE_ROWS || 10000);
const iterations = Number(process.env.JTCSV_PROFILE_ITERS || 5);

function generateData(count) {
  let csv = 'id,name,active\n';
  const json = [];
  for (let i = 1; i <= count; i++) {
    csv += `${i},User ${i},${i % 2 === 0}\n`;
    json.push({ id: i, name: `User ${i}`, active: i % 2 === 0 });
  }
  return { csv, json };
}

function run(name, fn) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { name, avgMs: Number(avg.toFixed(2)), samples: times.length };
}

const data = generateData(rows);

const results = [
  run('csvToJson', () => {
    jtcsv.csvToJson(data.csv, { delimiter: ',', parseNumbers: true, parseBooleans: true });
  }),
  run('csvToJsonFastPath', () => {
    jtcsv.csvToJson(data.csv, { delimiter: ',', parseNumbers: true, parseBooleans: true, useFastPath: true });
  }),
  run('jsonToCsv', () => {
    jtcsv.jsonToCsv(data.json, { delimiter: ',', includeHeaders: true });
  })
];

console.log(JSON.stringify({
  rows,
  iterations,
  results
}, null, 2));
