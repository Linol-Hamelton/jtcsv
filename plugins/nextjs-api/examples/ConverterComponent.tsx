/**
 * Пример React компонента для конвертации CSV/JSON
 * Использование в Next.js приложении
 */

import React, { useState } from 'react';
import { useJtcsv, CsvFileUploader, downloadCsv } from '../index';

/**
 * Компонент для конвертации CSV ↔ JSON
 */
export default function ConverterComponent() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState('csv'); // 'csv' или 'json'
  const [delimiter, setDelimiter] = useState(',');
  
  const { 
    convertCsvToJson, 
    convertJsonToCsv, 
    isLoading, 
    error, 
    stats 
  } = useJtcsv({
    delimiter,
    parseNumbers: true,
    parseBooleans: true,
    preventCsvInjection: true
  });
  
  const handleConvert = async () => {
    if (!input.trim()) return;
    
    try {
      if (format === 'csv') {
        // Конвертируем CSV в JSON
        const result = await convertCsvToJson(input);
        setOutput(JSON.stringify(result, null, 2));
      } else {
        // Конвертируем JSON в CSV
        const json = JSON.parse(input);
        const result = await convertJsonToCsv(json);
        setOutput(result);
      }
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };
  
  const handleFileUpload = (result, fileStats) => {
    setInput(JSON.stringify(result, null, 2));
    setFormat('json');
    
    console.log('File converted:', fileStats);
  };
  
  const handleDownload = async () => {
    if (!output) return;
    
    try {
      if (format === 'csv') {
        // Скачиваем как CSV
        const json = JSON.parse(input);
        await downloadCsv(json, 'converted.csv', { delimiter });
      } else {
        // Скачиваем как JSON
        const blob = new Blob([output], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'converted.json';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };
  
  const handleExample = () => {
    if (format === 'csv') {
      setInput('name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25');
    } else {
      setInput(JSON.stringify([
        { name: 'John Doe', email: 'john@example.com', age: 30 },
        { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ], null, 2));
    }
  };
  
  const handleClear = () => {
    setInput('');
    setOutput('');
  };
  
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔄 JTCSV Converter</h1>
      
      <div style={styles.controls}>
        <div style={styles.formatSelector}>
          <label>
            <input
              type="radio"
              value="csv"
              checked={format === 'csv'}
              onChange={(e) => setFormat(e.target.value)}
            />
            CSV → JSON
          </label>
          <label>
            <input
              type="radio"
              value="json"
              checked={format === 'json'}
              onChange={(e) => setFormat(e.target.value)}
            />
            JSON → CSV
          </label>
        </div>
        
        <div style={styles.delimiterSelector}>
          <label>
            Разделитель:
            <select 
              value={delimiter} 
              onChange={(e) => setDelimiter(e.target.value)}
              style={styles.select}
            >
              <option value=",">Запятая (,)</option>
              <option value=";">Точка с запятой (;)</option>
              <option value="\t">Табуляция (\t)</option>
              <option value="|">Вертикальная черта (|)</option>
            </select>
          </label>
        </div>
      </div>
      
      <div style={styles.inputSection}>
        <div style={styles.inputHeader}>
          <h3 style={styles.sectionTitle}>
            {format === 'csv' ? 'CSV Input' : 'JSON Input'}
          </h3>
          <div style={styles.inputActions}>
            <CsvFileUploader 
              onConvert={handleFileUpload}
              options={{ delimiter }}
            >
              <button style={styles.buttonSecondary}>📁 Upload CSV</button>
            </CsvFileUploader>
            <button 
              onClick={handleExample}
              style={styles.buttonSecondary}
            >
              📋 Example
            </button>
            <button 
              onClick={handleClear}
              style={styles.buttonSecondary}
            >
              🗑️ Clear
            </button>
          </div>
        </div>
        
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={format === 'csv' 
            ? 'Введите CSV данные...\nПример:\nname,email,age\nJohn,john@example.com,30' 
            : 'Введите JSON данные...\nПример:\n[{"name":"John","age":30}]'
          }
          style={styles.textarea}
          rows={10}
        />
      </div>
      
      <div style={styles.convertButtonContainer}>
        <button
          onClick={handleConvert}
          disabled={isLoading || !input.trim()}
          style={{
            ...styles.buttonPrimary,
            opacity: isLoading || !input.trim() ? 0.6 : 1,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 Converting...' : '🚀 Convert'}
        </button>
        
        {stats && (
          <div style={styles.stats}>
            <span>⏱️ {stats.processingTime}ms</span>
            <span>📊 {stats.rows || stats.size} {stats.rows ? 'rows' : 'chars'}</span>
          </div>
        )}
      </div>
      
      {error && (
        <div style={styles.error}>
          ❌ Error: {error}
        </div>
      )}
      
      <div style={styles.outputSection}>
        <div style={styles.outputHeader}>
          <h3 style={styles.sectionTitle}>
            {format === 'csv' ? 'JSON Output' : 'CSV Output'}
          </h3>
          <div style={styles.outputActions}>
            <button
              onClick={handleDownload}
              disabled={!output}
              style={styles.buttonSecondary}
            >
              ⬇️ Download
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(output)}
              disabled={!output}
              style={styles.buttonSecondary}
            >
              📋 Copy
            </button>
          </div>
        </div>
        
        <pre style={styles.output}>
          {output || 'Результат появится здесь...'}
        </pre>
      </div>
      
      <div style={styles.info}>
        <p>💡 <strong>Подсказки:</strong></p>
        <ul style={styles.tipsList}>
          <li>Используйте кнопку "Example" для быстрого заполнения</li>
          <li>Загружайте CSV файлы через кнопку "Upload CSV"</li>
          <li>Выберите разделитель соответствующий вашим данным</li>
          <li>Скачивайте результат в нужном формате</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  title: {
    color: '#333',
    textAlign: 'center',
    marginBottom: '30px'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  formatSelector: {
    display: 'flex',
    gap: '20px'
  },
  delimiterSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  select: {
    padding: '5px 10px',
    marginLeft: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  inputSection: {
    marginBottom: '20px'
  },
  inputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  inputActions: {
    display: 'flex',
    gap: '10px'
  },
  sectionTitle: {
    margin: '0',
    color: '#555'
  },
  textarea: {
    width: '100%',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  convertButtonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    margin: '20px 0'
  },
  buttonPrimary: {
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  buttonSecondary: {
    padding: '8px 16px',
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  stats: {
    display: 'flex',
    gap: '20px',
    color: '#666',
    fontSize: '14px'
  },
  error: {
    padding: '15px',
    background: '#fee',
    border: '1px solid #f99',
    borderRadius: '8px',
    color: '#c00',
    marginBottom: '20px'
  },
  outputSection: {
    marginTop: '20px'
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  outputActions: {
    display: 'flex',
    gap: '10px'
  },
  output: {
    padding: '15px',
    background: '#f8f8f8',
    border: '1px solid #ddd',
    borderRadius: '8px',
    minHeight: '200px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    fontSize: '14px'
  },
  info: {
    marginTop: '30px',
    padding: '20px',
    background: '#f0f8ff',
    border: '1px solid #cce5ff',
    borderRadius: '8px'
  },
  tipsList: {
    margin: '10px 0 0 20px',
    color: '#555'
  }
};

