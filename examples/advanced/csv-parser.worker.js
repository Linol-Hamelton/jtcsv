// Simplified Web Worker for demo purposes
// This is a standalone worker that doesn't depend on jtcsv bundle

self.onmessage = function(event) {
  const { type, csv, options } = event.data;
  
  if (type === 'parseCsv') {
    // Simulate processing time based on CSV size
    const startTime = performance.now();
    const lines = csv.split('\n');
    const totalLines = lines.length;
    
    // Send initial progress
    self.postMessage({
      type: 'progress',
      progress: 10
    });
    
    // Simple CSV parsing (for demo only)
    const headers = lines[0] ? lines[0].split(',') : [];
    const result = [];
    
    // Process in chunks to show progress
    const CHUNK_SIZE = Math.max(1, Math.floor(totalLines / 10));
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',');
      const obj = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Try to parse numbers and booleans if options say so
        if (options.parseNumbers) {
          const num = parseFloat(value);
          if (!isNaN(num) && value.trim() !== '') {
            value = num;
          }
        }
        
        if (options.parseBooleans) {
          const lower = value.toString().toLowerCase();
          if (lower === 'true' || lower === 'false') {
            value = lower === 'true';
          }
        }
        
        obj[header.trim()] = value;
      });
      
      result.push(obj);
      
      // Send progress updates
      if (i % CHUNK_SIZE === 0) {
        const progress = Math.min(95, Math.floor((i / totalLines) * 100));
        self.postMessage({
          type: 'progress',
          progress: progress
        });
      }
    }
    
    // Send final progress
    self.postMessage({
      type: 'progress',
      progress: 100
    });
    
    const endTime = performance.now();
    
    // Send result
    self.postMessage({
      type: 'result',
      data: result,
      stats: {
        rows: result.length,
        processingTime: endTime - startTime,
        headers: headers.length
      }
    });
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });