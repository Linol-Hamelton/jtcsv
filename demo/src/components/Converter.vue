<template>
  <div class="converter">
    <div class="converter-header">
      <h3><i class="fas fa-exchange-alt"></i> JSON ↔ CSV Converter</h3>
      <div class="converter-stats">
        <span class="stat"><i class="fas fa-clock"></i> Ready</span>
        <span class="stat"><i class="fas fa-memory"></i> 0 MB</span>
      </div>
    </div>

    <div class="converter-body">
      <!-- Input Section -->
      <div class="input-section">
        <div class="section-header">
          <h4><i class="fas fa-arrow-down"></i> Input</h4>
          <div class="input-format">
            <label>
              <input type="radio" v-model="inputFormat" value="json" /> JSON
            </label>
            <label>
              <input type="radio" v-model="inputFormat" value="csv" /> CSV
            </label>
          </div>
        </div>
        
        <div class="input-area">
          <textarea 
            v-model="inputText" 
            placeholder="Paste your JSON or CSV data here..."
            @input="handleInputChange"
            class="input-textarea"
          ></textarea>
          <div class="input-actions">
            <button @click="clearInput" class="btn-secondary">
              <i class="fas fa-trash"></i> Clear
            </button>
            <button @click="loadExample" class="btn-secondary">
              <i class="fas fa-file-alt"></i> Load Example
            </button>
            <button @click="uploadFile" class="btn-primary">
              <i class="fas fa-upload"></i> Upload File
            </button>
          </div>
        </div>
      </div>

      <!-- Controls Section -->
      <div class="controls-section">
        <div class="controls-grid">
          <div class="control-group">
            <label>Delimiter:</label>
            <select v-model="options.delimiter">
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="|">Pipe (|)</option>
              <option value="\t">Tab</option>
            </select>
          </div>
          
          <div class="control-group">
            <label>
              <input type="checkbox" v-model="options.preventCsvInjection" />
              CSV Injection Protection
            </label>
          </div>
          
          <div class="control-group">
            <label>
              <input type="checkbox" v-model="options.parseNumbers" />
              Parse Numbers
            </label>
          </div>
          
          <div class="control-group">
            <label>
              <input type="checkbox" v-model="options.includeHeaders" />
              Include Headers
            </label>
          </div>
        </div>
        
        <div class="convert-button">
          <button @click="convertData" class="btn-primary convert-btn">
            <i class="fas fa-sync-alt"></i> Convert {{ inputFormat.toUpperCase() }} → {{ outputFormat.toUpperCase() }}
          </button>
        </div>
      </div>

      <!-- Output Section -->
      <div class="output-section">
        <div class="section-header">
          <h4><i class="fas fa-arrow-up"></i> Output ({{ outputFormat.toUpperCase() }})</h4>
          <div class="output-actions">
            <button @click="copyOutput" class="btn-secondary">
              <i class="fas fa-copy"></i> Copy
            </button>
            <button @click="downloadOutput" class="btn-primary">
              <i class="fas fa-download"></i> Download
            </button>
          </div>
        </div>
        
        <div class="output-area">
          <div class="output-preview">
            <pre>{{ outputPreview }}</pre>
          </div>
          <div class="output-stats">
            <div class="stat-item">
              <span class="stat-label">Lines:</span>
              <span class="stat-value">{{ stats.lines }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Size:</span>
              <span class="stat-value">{{ stats.size }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Time:</span>
              <span class="stat-value">{{ stats.time }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { jtcsv } from '../utils/jtcsv-integration.js'

// Reactive state
const inputFormat = ref('json')
const inputText = ref('')
const outputText = ref('')
const isConverting = ref(false)
const conversionError = ref(null)

// Options
const options = ref({
  delimiter: ',',
  preventCsvInjection: true,
  parseNumbers: true,
  includeHeaders: true,
  autoDetect: true
})

// Computed properties
const outputFormat = computed(() => inputFormat.value === 'json' ? 'csv' : 'json')

const outputPreview = computed(() => {
  if (!outputText.value) return '// Output will appear here...'
  const lines = outputText.value.split('\n')
  return lines.slice(0, 20).join('\n') + (lines.length > 20 ? '\n...' : '')
})

const stats = computed(() => {
  const lines = outputText.value ? outputText.value.split('\n').length : 0
  const size = outputText.value ? (new Blob([outputText.value]).size / 1024).toFixed(2) + ' KB' : '0 KB'
  return {
    lines,
    size,
    time: 0 // Will be updated after conversion
  }
})

// Methods
const handleInputChange = () => {
  conversionError.value = null
}

const clearInput = () => {
  inputText.value = ''
  outputText.value = ''
  conversionError.value = null
}

const loadExample = () => {
  if (inputFormat.value === 'json') {
    inputText.value = JSON.stringify([
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, active: true },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, active: false },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: true }
    ], null, 2)
  } else {
    inputText.value = 'id,name,email,age,active\n1,John Doe,john@example.com,30,true\n2,Jane Smith,jane@example.com,25,false\n3,Bob Johnson,bob@example.com,35,true'
  }
}

const uploadFile = () => {
  // File upload implementation would go here
  alert('File upload feature will be implemented in the next version')
}

const convertData = async () => {
  if (!inputText.value.trim()) {
    conversionError.value = 'Please enter some data to convert'
    return
  }

  isConverting.value = true
  conversionError.value = null
  
  try {
    const startTime = performance.now()
    
    // Use real JTCSV library
    if (inputFormat.value === 'json') {
      const jsonData = JSON.parse(inputText.value)
      outputText.value = await jtcsv.jsonToCsv(jsonData, options.value)
    } else {
      outputText.value = JSON.stringify(
        await jtcsv.csvToJson(inputText.value, options.value),
        null, 2
      )
    }
    
    const endTime = performance.now()
    stats.value.time = Math.round(endTime - startTime)
    
  } catch (error) {
    conversionError.value = `Conversion error: ${error.message}`
    outputText.value = ''
  } finally {
    isConverting.value = false
  }
}

const copyOutput = () => {
  if (!outputText.value) return
  navigator.clipboard.writeText(outputText.value)
    .then(() => alert('Copied to clipboard!'))
    .catch(err => console.error('Failed to copy:', err))
}

const downloadOutput = () => {
  if (!outputText.value) return
  const blob = new Blob([outputText.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `converted.${outputFormat.value}`
  a.click()
  URL.revokeObjectURL(url)
}

// Watch for format changes
watch(inputFormat, () => {
  outputText.value = ''
  conversionError.value = null
})
</script>

<style scoped>
.converter {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.converter-header {
  padding: 20px;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.converter-header h3 {
  font-size: 1.3rem;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.converter-stats {
  display: flex;
  gap: 15px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.9rem;
  color: #94a3b8;
}

.converter-body {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  font-size: 1.1rem;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-format {
  display: flex;
  gap: 15px;
}

.input-format label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #94a3b8;
}

.input-area {
  margin-bottom: 25px;
}

.input-textarea {
  width: 100%;
  min-height: 150px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e2e8f0;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  resize: vertical;
  margin-bottom: 10px;
}

.input-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.input-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.controls-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  cursor: pointer;
}

.control-group select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
}

.control-group select:focus {
  outline: none;
  border-color: #3b82f6;
}

.convert-button {
  text-align: center;
}

.convert-btn {
  padding: 12px 30px;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.output-area {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  overflow: hidden;
}

.output-preview {
  max-height: 300px;
  overflow-y: auto;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
}

.output-preview pre {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #3b82f6;
}

.output-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .converter-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .controls-grid {
    grid-template-columns: 1fr;
  }
  
  .output-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .input-actions {
    justify-content: center;
  }
}
</style>