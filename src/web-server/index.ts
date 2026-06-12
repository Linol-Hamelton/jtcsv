/**
 * JTCSV Web Server
 * 
 * Simple web server for browser-based CSV/JSON conversion
 * with REST API endpoints
 */

import http from "http";
import fs from "fs";
import path from "path";
import url from "url";
import * as jtcsv from "../../index";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Body-size cap — defends against unbounded-concat DoS via /api/* POST.
// Defaults to 10 MB; override with JTCSV_MAX_BODY_BYTES (positive int).
const MAX_BODY_BYTES = (() => {
  const env = process.env.JTCSV_MAX_BODY_BYTES;
  if (!env) return 10 * 1024 * 1024;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : 10 * 1024 * 1024;
})();

// CORS allowlist. Empty/unset → same-origin localhost only (the safe default).
// Comma-separated list of allowed origins. Use `*` to opt back into the old
// permissive behavior — but ONLY if you understand the server is dev-only and
// must never be exposed to the public internet. See docs/THREAT_MODEL.md ADR-002.
const CORS_ALLOW = (() => {
  const raw = (process.env.JTCSV_CORS_ALLOW || '').trim();
  if (!raw) return null;                          // null sentinel → use default localhost matcher
  if (raw === '*') return '*' as const;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
})();

function isLocalhostOrigin(origin: string): boolean {
  // Allow http(s)://localhost(:PORT) and http(s)://127.0.0.1(:PORT)
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function resolveCorsOrigin(reqOrigin: string | undefined): string | null {
  if (CORS_ALLOW === '*') return '*';
  if (Array.isArray(CORS_ALLOW)) {
    if (!reqOrigin) return null;
    return CORS_ALLOW.includes(reqOrigin) ? reqOrigin : null;
  }
  // Default policy: localhost-only.
  if (!reqOrigin) return null;
  return isLocalhostOrigin(reqOrigin) ? reqOrigin : null;
}

/**
 * Parse JSON body from request. Caps body at MAX_BODY_BYTES.
 */
function parseBody(req): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        aborted = true;
        const err: Error & { statusCode?: number } = new Error(
          `Request body too large (>${MAX_BODY_BYTES} bytes). Set JTCSV_MAX_BODY_BYTES to raise the limit.`,
        );
        err.statusCode = 413;
        // Stop accepting more data; respond 413.
        try { req.destroy(); } catch { /* ignore */ }
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response. CORS headers reflect the resolved allowlist.
 */
function sendJson(res, statusCode, data, reqOrigin?: string) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  const allowed = resolveCorsOrigin(reqOrigin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res, statusCode, message, reqOrigin?: string) {
  sendJson(res, statusCode, {
    success: false,
    error: message
  }, reqOrigin);
}

/**
 * Map a parseBody() rejection to a status code. 413 for over-limit, 400 otherwise.
 */
function statusFromBodyError(err: unknown): number {
  const code = (err as { statusCode?: number } | null)?.statusCode;
  return typeof code === 'number' ? code : 400;
}

/**
 * API Handler: Convert JSON to CSV
 */
async function handleJsonToCsv(req, res, reqOrigin?: string) {
  try {
    const body = await parseBody(req);
    const { data, options = {} } = body;

    if (!Array.isArray(data)) {
      return sendError(res, 400, 'Data must be an array of objects', reqOrigin);
    }

    const csv = jtcsv.jsonToCsv(data, {
      delimiter: options.delimiter || ',',
      includeHeaders: options.includeHeaders !== false,
      preventCsvInjection: options.preventCsvInjection !== false,
      rfc4180Compliant: options.rfc4180Compliant !== false
    });

    sendJson(res, 200, {
      success: true,
      result: csv,
      records: data.length,
      bytes: csv.length
    }, reqOrigin);
  } catch (error) {
    sendError(res, statusFromBodyError(error), error.message, reqOrigin);
  }
}

/**
 * API Handler: Convert CSV to JSON
 */
async function handleCsvToJson(req, res, reqOrigin?: string) {
  try {
    const body = await parseBody(req);
    const { data, options = {} } = body;

    if (typeof data !== 'string') {
      return sendError(res, 400, 'Data must be a CSV string', reqOrigin);
    }

    const json = jtcsv.csvToJson(data, {
      delimiter: options.delimiter,
      autoDetect: options.autoDetect !== false,
      hasHeaders: options.hasHeaders !== false,
      trim: options.trim !== false,
      parseNumbers: options.parseNumbers === true,
      parseBooleans: options.parseBooleans === true
    });

    sendJson(res, 200, {
      success: true,
      result: json,
      rows: json.length
    }, reqOrigin);
  } catch (error) {
    sendError(res, statusFromBodyError(error), error.message, reqOrigin);
  }
}

/**
 * API Handler: Validate data
 */
async function handleValidate(req, res, reqOrigin?: string) {
  try {
    const body = await parseBody(req);
    const { data, format } = body;

    let isValid = false;
    const errors = [];

    if (format === 'json') {
      if (Array.isArray(data)) {
        isValid = data.every(item => typeof item === 'object' && item !== null);
        if (!isValid) {
          errors.push('All items must be objects');
        }
      } else {
        errors.push('Data must be an array');
      }
    } else if (format === 'csv') {
      if (typeof data === 'string') {
        try {
          const parsed = jtcsv.csvToJson(data);
          isValid = Array.isArray(parsed) && parsed.length > 0;
        } catch (error) {
          errors.push(error.message);
        }
      } else {
        errors.push('Data must be a string');
      }
    } else {
      errors.push('Format must be "json" or "csv"');
    }

    sendJson(res, 200, {
      success: true,
      valid: isValid,
      errors: errors
    }, reqOrigin);
  } catch (error) {
    sendError(res, statusFromBodyError(error), error.message, reqOrigin);
  }
}

/**
 * API Handler: Convert NDJSON to CSV
 */
async function handleNdjsonToCsv(req, res, reqOrigin?: string) {
  try {
    const body = await parseBody(req);
    const { data, options = {} } = body;

    if (typeof data !== 'string') {
      return sendError(res, 400, 'Data must be an NDJSON string', reqOrigin);
    }

    const json = jtcsv.ndjsonToJson(data);
    const csv = jtcsv.jsonToCsv(json, {
      delimiter: options.delimiter || ',',
      includeHeaders: options.includeHeaders !== false
    });

    sendJson(res, 200, {
      success: true,
      result: csv,
      records: json.length
    }, reqOrigin);
  } catch (error) {
    sendError(res, statusFromBodyError(error), error.message, reqOrigin);
  }
}

/**
 * API Handler: Convert CSV to NDJSON
 */
async function handleCsvToNdjson(req, res, reqOrigin?: string) {
  try {
    const body = await parseBody(req);
    const { data, options = {} } = body;

    if (typeof data !== 'string') {
      return sendError(res, 400, 'Data must be a CSV string', reqOrigin);
    }

    const json = jtcsv.csvToJson(data, {
      delimiter: options.delimiter,
      autoDetect: options.autoDetect !== false,
      hasHeaders: options.hasHeaders !== false
    });

    const ndjson = jtcsv.jsonToNdjson(json);

    sendJson(res, 200, {
      success: true,
      result: ndjson,
      records: json.length
    }, reqOrigin);
  } catch (error) {
    sendError(res, statusFromBodyError(error), error.message, reqOrigin);
  }
}

/**
 * Serve static HTML page
 */
function serveHomePage(res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JTCSV Web Interface</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { font-size: 1.1em; opacity: 0.9; }
    .main { padding: 30px; }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    label {
      font-weight: 600;
      color: #333;
      font-size: 0.9em;
    }
    select, input, button {
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
      transition: border-color 0.3s;
    }
    select:focus, input:focus {
      outline: none;
      border-color: #667eea;
    }
    .textarea-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .textarea-wrapper { display: flex; flex-direction: column; }
    .textarea-wrapper label { margin-bottom: 8px; }
    textarea {
      width: 100%;
      height: 300px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      resize: vertical;
      transition: border-color 0.3s;
    }
    textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    .button-group {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-bottom: 20px;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 30px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .info-box {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
      margin-bottom: 20px;
      font-size: 0.9em;
      color: #666;
    }
    .error {
      background: #fee;
      border-left-color: #f44;
      color: #c33;
    }
    .success {
      background: #efe;
      border-left-color: #4a4;
      color: #363;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .stat-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 0.85em;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 JTCSV Web Interface</h1>
      <p>High-performance CSV ↔ JSON converter</p>
    </div>
    
    <div class="main">
      <div class="controls">
        <div class="control-group">
          <label for="operation">Operation:</label>
          <select id="operation">
            <option value="json-to-csv">JSON → CSV</option>
            <option value="csv-to-json">CSV → JSON</option>
            <option value="ndjson-to-csv">NDJSON → CSV</option>
            <option value="csv-to-ndjson">CSV → NDJSON</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="delimiter">CSV Delimiter:</label>
          <select id="delimiter">
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>
      </div>
      
      <div class="control-group" style="margin-bottom: 20px;">
        <label>
          <input type="checkbox" id="parseNumbers" style="width: auto; margin-right: 8px;">
          Parse Numbers (CSV → JSON)
        </label>
        <label>
          <input type="checkbox" id="parseBooleans" style="width: auto; margin-right: 8px;">
          Parse Booleans (CSV → JSON)
        </label>
        <label>
          <input type="checkbox" id="includeHeaders" checked style="width: auto; margin-right: 8px;">
          Include Headers (JSON → CSV)
        </label>
      </div>
      
      <div class="textarea-group">
        <div class="textarea-wrapper">
          <label for="input">Input:</label>
          <textarea id="input" placeholder="Paste your JSON or CSV data here..."></textarea>
        </div>
        
        <div class="textarea-wrapper">
          <label for="output">Output:</label>
          <textarea id="output" placeholder="Converted data will appear here..." readonly></textarea>
        </div>
      </div>
      
      <div class="button-group">
        <button id="convertBtn">Convert</button>
        <button id="clearBtn" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">Clear</button>
        <button id="copyBtn" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">Copy Output</button>
      </div>
      
      <div id="messageBox" style="display: none;"></div>
      
      <div class="stats" id="stats" style="display: none;">
        <div class="stat-card">
          <div class="stat-value" id="recordsCount">0</div>
          <div class="stat-label">Records</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="bytesCount">0</div>
          <div class="stat-label">Bytes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="timeCount">0</div>
          <div class="stat-label">ms</div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const API_URL = 'http://${HOST}:${PORT}/api';
    
    const elements = {
      operation: document.getElementById('operation'),
      delimiter: document.getElementById('delimiter'),
      parseNumbers: document.getElementById('parseNumbers'),
      parseBooleans: document.getElementById('parseBooleans'),
      includeHeaders: document.getElementById('includeHeaders'),
      input: document.getElementById('input'),
      output: document.getElementById('output'),
      convertBtn: document.getElementById('convertBtn'),
      clearBtn: document.getElementById('clearBtn'),
      copyBtn: document.getElementById('copyBtn'),
      messageBox: document.getElementById('messageBox'),
      stats: document.getElementById('stats'),
      recordsCount: document.getElementById('recordsCount'),
      bytesCount: document.getElementById('bytesCount'),
      timeCount: document.getElementById('timeCount')
    };
    
    function showMessage(message, type = 'info') {
      elements.messageBox.textContent = message;
      elements.messageBox.className = 'info-box ' + type;
      elements.messageBox.style.display = 'block';
      setTimeout(() => {
        elements.messageBox.style.display = 'none';
      }, 5000);
    }
    
    function updateStats(records, bytes, time) {
      elements.recordsCount.textContent = records || 0;
      elements.bytesCount.textContent = bytes || 0;
      elements.timeCount.textContent = time || 0;
      elements.stats.style.display = 'grid';
    }
    
    async function convert() {
      const input = elements.input.value.trim();
      if (!input) {
        showMessage('Please enter input data', 'error');
        return;
      }
      
      elements.convertBtn.disabled = true;
      elements.convertBtn.textContent = 'Converting...';
      
      try {
        const operation = elements.operation.value;
        const options = {
          delimiter: elements.delimiter.value,
          parseNumbers: elements.parseNumbers.checked,
          parseBooleans: elements.parseBooleans.checked,
          includeHeaders: elements.includeHeaders.checked
        };
        
        let endpoint = '';
        let requestData = {};
        
        if (operation === 'json-to-csv') {
          endpoint = '/json-to-csv';
          requestData = { data: JSON.parse(input), options };
        } else if (operation === 'csv-to-json') {
          endpoint = '/csv-to-json';
          requestData = { data: input, options };
        } else if (operation === 'ndjson-to-csv') {
          endpoint = '/ndjson-to-csv';
          requestData = { data: input, options };
        } else if (operation === 'csv-to-ndjson') {
          endpoint = '/csv-to-ndjson';
          requestData = { data: input, options };
        }
        
        const startTime = Date.now();
        const response = await fetch(API_URL + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        const elapsed = Date.now() - startTime;
        
        if (result.success) {
          if (operation.includes('json')) {
            elements.output.value = JSON.stringify(result.result, null, 2);
          } else {
            elements.output.value = result.result;
          }
          showMessage('Conversion successful!', 'success');
          updateStats(result.records || result.rows || 0, result.bytes || 0, elapsed);
        } else {
          showMessage('Error: ' + result.error, 'error');
        }
      } catch (error) {
        showMessage('Error: ' + error.message, 'error');
      } finally {
        elements.convertBtn.disabled = false;
        elements.convertBtn.textContent = 'Convert';
      }
    }
    
    function clear() {
      elements.input.value = '';
      elements.output.value = '';
      elements.stats.style.display = 'none';
      elements.messageBox.style.display = 'none';
    }
    
    function copyToClipboard() {
      const output = elements.output.value;
      if (!output) {
        showMessage('Nothing to copy', 'error');
        return;
      }
      
      navigator.clipboard.writeText(output).then(() => {
        showMessage('Copied to clipboard!', 'success');
      }).catch(() => {
        showMessage('Failed to copy', 'error');
      });
    }
    
    elements.convertBtn.addEventListener('click', convert);
    elements.clearBtn.addEventListener('click', clear);
    elements.copyBtn.addEventListener('click', copyToClipboard);
    
    // Load example data
    elements.input.value = JSON.stringify([
      { name: "Alice", age: 30, city: "New York" },
      { name: "Bob", age: 25, city: "London" },
      { name: "Charlie", age: 35, city: "Paris" }
    ], null, 2);
  </script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(html);
}

/**
 * Request handler
 */
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const reqOrigin: string | undefined = req.headers?.origin;

  // Handle CORS preflight against the resolved allowlist.
  if (req.method === 'OPTIONS') {
    const allowed = resolveCorsOrigin(reqOrigin);
    if (!allowed) {
      // No allowlist match — refuse the preflight rather than silently
      // sending no CORS headers (the browser would block anyway, but a
      // 403 is clearer to operators reading logs).
      res.statusCode = 403;
      res.end();
      return;
    }
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }
  
  // Home page
  if (pathname === '/' && req.method === 'GET') {
    return serveHomePage(res);
  }
  
  // API endpoints
  if (req.method === 'POST') {
    if (pathname === '/api/json-to-csv') {
      return handleJsonToCsv(req, res, reqOrigin);
    }
    if (pathname === '/api/csv-to-json') {
      return handleCsvToJson(req, res, reqOrigin);
    }
    if (pathname === '/api/validate') {
      return handleValidate(req, res, reqOrigin);
    }
    if (pathname === '/api/ndjson-to-csv') {
      return handleNdjsonToCsv(req, res, reqOrigin);
    }
    if (pathname === '/api/csv-to-ndjson') {
      return handleCsvToNdjson(req, res, reqOrigin);
    }
  }

  // 404
  sendError(res, 404, 'Not found', reqOrigin);
}

/**
 * Start server
 */
function startServer(options: any = {}) {
  const port = options.port || PORT;
  const host = options.host || HOST;
  
  const server = http.createServer(handleRequest);
  
  server.listen(port, host, () => {
    console.log('\n🌐 JTCSV Web Server started!');
    console.log(`\n📍 URL: http://${host}:${port}`);
    console.log('\n📡 API Endpoints:');
    console.log('   POST /api/json-to-csv');
    console.log('   POST /api/csv-to-json');
    console.log('   POST /api/ndjson-to-csv');
    console.log('   POST /api/csv-to-ndjson');
    console.log('   POST /api/validate');
    console.log('\n✨ Press Ctrl+C to stop\n');
  });
  
  server.on('error', (error) => {
    if ((error as any).code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${port} is already in use`);
      console.error('   Try a different port: jtcsv web --port=3001\n');
    } else {
      console.error(`\n❌ Server error: ${error.message}\n`);
    }
    process.exit(1);
  });
  
  return server;
}

export default { startServer };

// Run as standalone
if (require.main === module) {
  startServer();
}
