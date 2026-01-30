// Advanced Web Workers usage (browser example)
// Requires jtcsv loaded in the browser (UMD or ESM).

async function runWorkerDemo(file) {
  if (!window.jtcsv) {
    throw new Error('jtcsv is not available on window');
  }

  const pool = window.jtcsv.createWorkerPool({
    workerCount: 4,
    maxQueueSize: 50,
    autoScale: true
  });

  const result = await window.jtcsv.parseCSVWithWorker(file, {
    delimiter: ',',
    parseNumbers: true
  }, (progress) => {
    console.log(`Processed ${progress.processed} rows (${progress.percentage.toFixed(1)}%)`);
  }, pool);

  console.log('Rows:', result.length);
  return result;
}

// Example usage in the browser:
// const file = document.querySelector('input[type="file"]').files[0];
// runWorkerDemo(file);
