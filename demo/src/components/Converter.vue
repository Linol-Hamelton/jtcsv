<template>
  <div class="converter">
    <!-- Header with tabs -->
    <div class="converter-header">
      <div class="header-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i> {{ tab.label }}
        </button>
      </div>
      <div class="converter-stats">
        <span class="stat" :class="{ warning: memoryUsage > 80 }">
          <i class="fas fa-memory"></i> {{ memoryUsage }}%
        </span>
        <span class="stat"> <i class="fas fa-clock"></i> {{ status }} </span>
        <span class="stat" v-if="batchMode">
          <i class="fas fa-layer-group"></i> {{ processedFiles }}/{{
            totalFiles
          }}
        </span>
      </div>
    </div>

    <!-- Main content area -->
    <div class="converter-body">
      <!-- Quick Convert Tab -->
      <div v-if="activeTab === 'quick'" class="tab-content">
        <div class="two-column-layout">
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
                <label>
                  <input type="radio" v-model="inputFormat" value="ndjson" />
                  NDJSON
                </label>
              </div>
            </div>

            <div class="input-area">
              <div class="textarea-container">
                <textarea
                  v-model="inputText"
                  :placeholder="inputPlaceholder"
                  @input="handleInputChange"
                  class="input-textarea"
                  ref="inputTextarea"
                ></textarea>
                <div class="textarea-info">
                  <span v-if="inputText">{{ inputStats }}</span>
                  <span v-else>Enter or paste data</span>
                </div>
              </div>

              <div class="input-actions">
                <div class="action-group">
                  <button @click="clearInput" class="btn-secondary">
                    <i class="fas fa-trash"></i> Clear
                  </button>
                  <button @click="loadExample" class="btn-secondary">
                    <i class="fas fa-file-alt"></i> Example
                  </button>
                  <button @click="toggleAdvancedOptions" class="btn-secondary">
                    <i class="fas fa-cog"></i>
                    {{ showAdvancedOptions ? "Basic" : "Advanced" }}
                  </button>
                </div>

                <div class="action-group">
                  <button @click="triggerFileUpload" class="btn-primary">
                    <i class="fas fa-upload"></i> Upload File
                  </button>
                  <input
                    type="file"
                    ref="fileInput"
                    @change="handleFileUpload"
                    :accept="fileAccept"
                    style="display: none"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Output Section -->
          <div class="output-section">
            <div class="section-header">
              <h4>
                <i class="fas fa-arrow-up"></i> Output ({{
                  outputFormat.toUpperCase()
                }})
              </h4>
              <div class="output-actions">
                <button
                  @click="copyOutput"
                  class="btn-secondary"
                  :disabled="!outputText"
                >
                  <i class="fas fa-copy"></i> Copy
                </button>
                <button
                  @click="downloadOutput"
                  class="btn-primary"
                  :disabled="!outputText"
                >
                  <i class="fas fa-download"></i> Download
                </button>
                <button
                  @click="saveToCloud"
                  class="btn-secondary"
                  :disabled="!outputText"
                >
                  <i class="fas fa-cloud"></i> Save
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
                <div class="stat-item">
                  <span class="stat-label">Mode:</span>
                  <span class="stat-value">{{ jtcsv.mode }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Section -->
        <div class="controls-section">
          <div class="controls-grid" :class="{ expanded: showAdvancedOptions }">
            <!-- Basic Options -->
            <div class="control-group">
              <label>Delimiter:</label>
              <select v-model="options.delimiter">
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
                <option value="\t">Tab</option>
                <option value="custom">Custom...</option>
              </select>
              <input
                v-if="options.delimiter === 'custom'"
                v-model="customDelimiter"
                placeholder="Enter custom delimiter"
                class="custom-delimiter"
                @input="updateCustomDelimiter"
              />
            </div>

            <div class="control-group">
              <label>
                <input type="checkbox" v-model="options.includeHeaders" />
                Include Headers
              </label>
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

            <!-- Advanced Options (collapsible) -->
            <div v-if="showAdvancedOptions" class="advanced-options">
              <div class="control-group">
                <label>Auto-detect:</label>
                <select v-model="options.autoDetect">
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="options.parseBooleans" />
                  Parse Booleans
                </label>
              </div>

              <div class="control-group" v-if="inputFormat === 'csv'">
                <label>
                  <input type="checkbox" v-model="options.useFastPath" />
                  Fast Path
                </label>
              </div>

              <div class="control-group" v-if="inputFormat === 'csv'">
                <label>Fast Path Mode:</label>
                <select v-model="options.fastPathMode">
                  <option value="objects">Objects</option>
                  <option value="compact">Compact</option>
                </select>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="options.rfc4180Compliant" />
                  RFC 4180 Compliant
                </label>
              </div>

              <div class="control-group">
                <label>Max Records:</label>
                <input
                  type="number"
                  v-model="options.maxRecords"
                  placeholder="No limit"
                  min="1"
                />
              </div>

              <div class="control-group">
                <label>Rename Map (JSON):</label>
                <textarea
                  v-model="renameMapJson"
                  placeholder='{"oldName": "newName"}'
                  rows="2"
                  @input="updateRenameMap"
                ></textarea>
              </div>

              <div class="control-group">
                <label>Template (JSON):</label>
                <textarea
                  v-model="templateJson"
                  placeholder='{"column1": "", "column2": ""}'
                  rows="2"
                  @input="updateTemplate"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="convert-button">
            <button
              @click="convertData"
              class="btn-primary convert-btn"
              :disabled="isConverting || !inputText.trim()"
            >
              <i
                class="fas"
                :class="isConverting ? 'fa-spinner fa-spin' : 'fa-sync-alt'"
              ></i>
              {{ convertButtonText }}
            </button>

            <div class="conversion-mode">
              <label>
                <input type="checkbox" v-model="streamingMode" />
                Streaming Mode (for large files)
              </label>
              <span class="hint" v-if="streamingMode">
                <i class="fas fa-info-circle"></i> Processes file in chunks
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Batch Processing Tab -->
      <div v-if="activeTab === 'batch'" class="tab-content">
        <div class="batch-processing">
          <div class="batch-header">
            <h4><i class="fas fa-layer-group"></i> Batch Processing</h4>
            <p>Process multiple files at once with parallel execution</p>
          </div>

          <div
            class="batch-upload-area"
            @dragover.prevent
            @drop.prevent="handleBatchDrop"
          >
            <div v-if="batchFiles.length === 0" class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Drag & drop files here or click to browse</p>
              <button @click="triggerBatchUpload" class="btn-primary">
                <i class="fas fa-folder-open"></i> Select Files
              </button>
              <input
                type="file"
                ref="batchFileInput"
                @change="handleBatchFileSelect"
                multiple
                accept=".json,.csv,.ndjson"
                style="display: none"
              />
            </div>

            <div v-else class="file-list">
              <div class="file-list-header">
                <span>{{ batchFiles.length }} files selected</span>
                <button @click="clearBatchFiles" class="btn-secondary">
                  <i class="fas fa-trash"></i> Clear All
                </button>
              </div>

              <div class="files-grid">
                <div
                  v-for="(file, index) in batchFiles"
                  :key="index"
                  class="file-item"
                >
                  <div class="file-icon">
                    <i :class="getFileIcon(file.name)"></i>
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                  <div class="file-actions">
                    <button @click="removeBatchFile(index)" class="btn-icon">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="batch-options">
            <div class="control-group">
              <label>Output Format:</label>
              <select v-model="batchOutputFormat">
                <option value="same">Same as input</option>
                <option value="csv">Convert all to CSV</option>
                <option value="json">Convert all to JSON</option>
              </select>
            </div>

            <div class="control-group">
              <label>Parallel Processing:</label>
              <select v-model="batchParallel">
                <option :value="1">1 file at a time</option>
                <option :value="2">2 files at a time</option>
                <option :value="4">4 files at a time</option>
                <option :value="8">8 files at a time</option>
              </select>
            </div>

            <div class="control-group">
              <label>
                <input type="checkbox" v-model="batchOverwrite" />
                Overwrite existing files
              </label>
            </div>
          </div>

          <div class="batch-actions">
            <button
              @click="startBatchProcessing"
              class="btn-primary"
              :disabled="batchFiles.length === 0 || isBatchProcessing"
            >
              <i
                class="fas"
                :class="isBatchProcessing ? 'fa-spinner fa-spin' : 'fa-play'"
              ></i>
              {{
                isBatchProcessing ? "Processing..." : "Start Batch Processing"
              }}
            </button>

            <button
              @click="downloadBatchResults"
              class="btn-secondary"
              :disabled="!batchResults.length"
            >
              <i class="fas fa-download"></i> Download Results
            </button>
          </div>

          <div v-if="batchResults.length > 0" class="batch-results">
            <h5>Processing Results</h5>
            <div class="results-summary">
              <div class="result-stat success">
                <i class="fas fa-check-circle"></i>
                <span>Successful: {{ successfulBatchFiles }}</span>
              </div>
              <div class="result-stat error">
                <i class="fas fa-times-circle"></i>
                <span>Failed: {{ failedBatchFiles }}</span>
              </div>
              <div class="result-stat total">
                <i class="fas fa-file-alt"></i>
                <span>Total: {{ batchFiles.length }}</span>
              </div>
            </div>

            <div class="results-list">
              <div
                v-for="(result, index) in batchResults"
                :key="index"
                :class="['result-item', result.success ? 'success' : 'error']"
              >
                <div class="result-icon">
                  <i
                    :class="result.success ? 'fas fa-check' : 'fas fa-times'"
                  ></i>
                </div>
                <div class="result-info">
                  <div class="result-file">{{ result.file }}</div>
                  <div class="result-message" v-if="result.success">
                    Converted successfully ({{ formatFileSize(result.size) }})
                  </div>
                  <div class="result-message error" v-else>
                    {{ result.error }}
                  </div>
                </div>
                <div
                  class="result-actions"
                  v-if="result.success && result.output"
                >
                  <button
                    @click="downloadSingleResult(result)"
                    class="btn-icon"
                  >
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Streaming Tab -->
      <div v-if="activeTab === 'streaming'" class="tab-content">
        <div class="streaming-processing">
          <div class="streaming-header">
            <h4><i class="fas fa-stream"></i> Streaming Processing</h4>
            <p>
              Process large files (>100MB) without loading them entirely into
              memory
            </p>
          </div>

          <div class="streaming-upload">
            <div
              class="upload-card"
              @dragover.prevent
              @drop.prevent="handleStreamingDrop"
            >
              <div v-if="!streamingFile" class="upload-placeholder">
                <i class="fas fa-file-upload"></i>
                <p>Drag & drop a large file here or click to browse</p>
                <p class="hint">Supports files up to 2GB</p>
                <button @click="triggerStreamingUpload" class="btn-primary">
                  <i class="fas fa-file"></i> Select Large File
                </button>
                <input
                  type="file"
                  ref="streamingFileInput"
                  @change="handleStreamingFileSelect"
                  style="display: none"
                />
              </div>

              <div v-else class="file-selected">
                <div class="file-details">
                  <div class="file-icon">
                    <i :class="getFileIcon(streamingFile.name)"></i>
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ streamingFile.name }}</div>
                    <div class="file-size">
                      {{ formatFileSize(streamingFile.size) }}
                    </div>
                    <div class="file-progress" v-if="streamingProgress > 0">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :style="{ width: streamingProgress + '%' }"
                        ></div>
                      </div>
                      <span class="progress-text"
                        >{{ streamingProgress }}%</span
                      >
                    </div>
                  </div>
                </div>
                <button @click="clearStreamingFile" class="btn-secondary">
                  <i class="fas fa-times"></i> Remove
                </button>
              </div>
            </div>
          </div>

          <div class="streaming-options">
            <div class="control-group">
              <label>Chunk Size:</label>
              <select v-model="streamingChunkSize">
                <option :value="1024 * 1024">1 MB</option>
                <option :value="5 * 1024 * 1024">5 MB</option>
                <option :value="10 * 1024 * 1024">10 MB</option>
                <option :value="50 * 1024 * 1024">50 MB</option>
              </select>
            </div>

            <div class="control-group">
              <label>Processing Mode:</label>
              <select v-model="streamingModeType">
                <option value="json2csv">JSON → CSV</option>
                <option value="csv2json">CSV → JSON</option>
                <option value="preprocess">Preprocess JSON</option>
              </select>
            </div>

            <div class="control-group">
              <label>
                <input type="checkbox" v-model="streamingShowProgress" />
                Show real-time progress
              </label>
            </div>

            <div class="control-group">
              <label>
                <input type="checkbox" v-model="streamingAutoDownload" />
                Auto-download result
              </label>
            </div>
          </div>

          <div class="streaming-actions">
            <button
              @click="startStreamingProcessing"
              class="btn-primary"
              :disabled="!streamingFile || isStreamingProcessing"
            >
              <i
                class="fas"
                :class="
                  isStreamingProcessing ? 'fa-spinner fa-spin' : 'fa-play'
                "
              ></i>
              {{
                isStreamingProcessing
                  ? "Processing..."
                  : "Start Streaming Processing"
              }}
            </button>

            <button
              @click="pauseStreaming"
              class="btn-secondary"
              :disabled="!isStreamingProcessing"
            >
              <i class="fas fa-pause"></i> Pause
            </button>

            <button
              @click="cancelStreaming"
              class="btn-secondary"
              :disabled="!isStreamingProcessing"
            >
              <i class="fas fa-stop"></i> Cancel
            </button>
          </div>

          <div v-if="streamingLogs.length > 0" class="streaming-logs">
            <h5>Processing Logs</h5>
            <div class="logs-container">
              <div
                v-for="(log, index) in streamingLogs"
                :key="index"
                :class="['log-entry', log.type]"
              >
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preprocessing Tab -->
      <div v-if="activeTab === 'preprocess'" class="tab-content">
        <div class="preprocessing">
          <div class="preprocessing-header">
            <h4><i class="fas fa-code-branch"></i> JSON Preprocessing</h4>
            <p>
              Unwrap nested structures and prepare complex JSON for conversion
            </p>
          </div>

          <div class="two-column-layout">
            <!-- Input JSON -->
            <div class="input-section">
              <div class="section-header">
                <h4><i class="fas fa-code"></i> Complex JSON Input</h4>
              </div>

              <div class="input-area">
                <div class="textarea-container">
                  <textarea
                    v-model="preprocessInput"
                    placeholder="Paste complex JSON with nested objects/arrays..."
                    @input="handlePreprocessInput"
                    class="input-textarea"
                    rows="10"
                  ></textarea>
                  <div class="textarea-info">
                    <span v-if="preprocessInput">{{
                      preprocessInputStats
                    }}</span>
                    <span v-else>Enter JSON with nested structures</span>
                  </div>
                </div>

                <div class="input-actions">
                  <button @click="loadComplexExample" class="btn-secondary">
                    <i class="fas fa-file-code"></i> Complex Example
                  </button>
                  <button @click="clearPreprocessInput" class="btn-secondary">
                    <i class="fas fa-trash"></i> Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Preprocessed Output -->
            <div class="output-section">
              <div class="section-header">
                <h4><i class="fas fa-layer-group"></i> Preprocessed Output</h4>
                <div class="output-actions">
                  <button
                    @click="copyPreprocessed"
                    class="btn-secondary"
                    :disabled="!preprocessedOutput"
                  >
                    <i class="fas fa-copy"></i> Copy
                  </button>
                  <button
                    @click="downloadPreprocessed"
                    class="btn-primary"
                    :disabled="!preprocessedOutput"
                  >
                    <i class="fas fa-download"></i> Download
                  </button>
                </div>
              </div>

              <div class="output-area">
                <div class="output-preview">
                  <pre>{{ preprocessedPreview }}</pre>
                </div>
                <div class="output-stats">
                  <div class="stat-item">
                    <span class="stat-label">Depth Reduced:</span>
                    <span class="stat-value"
                      >{{ preprocessingStats.depthReduction }} levels</span
                    >
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Objects Unwrapped:</span>
                    <span class="stat-value">{{
                      preprocessingStats.objectsUnwrapped
                    }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Arrays Flattened:</span>
                    <span class="stat-value">{{
                      preprocessingStats.arraysFlattened
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preprocessing Options -->
          <div class="preprocessing-options">
            <div class="control-group">
              <label>Max Depth:</label>
              <input
                type="range"
                v-model="preprocessOptions.maxDepth"
                min="1"
                max="10"
                @input="updatePreprocessOptions"
              />
              <span class="range-value">{{ preprocessOptions.maxDepth }}</span>
            </div>

            <div class="control-group">
              <label>
                <input
                  type="checkbox"
                  v-model="preprocessOptions.unwrapArrays"
                />
                Unwrap Arrays
              </label>
            </div>

            <div class="control-group">
              <label>
                <input
                  type="checkbox"
                  v-model="preprocessOptions.stringifyObjects"
                />
                Stringify Objects
              </label>
            </div>

            <div class="control-group">
              <label>
                <input
                  type="checkbox"
                  v-model="preprocessOptions.handleCircular"
                />
                Handle Circular References
              </label>
            </div>

            <div class="control-group">
              <label>
                <input
                  type="checkbox"
                  v-model="preprocessOptions.preserveNull"
                />
                Preserve Null Values
              </label>
            </div>
          </div>

          <div class="preprocessing-actions">
            <button
              @click="runPreprocessing"
              class="btn-primary"
              :disabled="!preprocessInput.trim() || isPreprocessing"
            >
              <i
                class="fas"
                :class="isPreprocessing ? 'fa-spinner fa-spin' : 'fa-magic'"
              ></i>
              {{ isPreprocessing ? "Preprocessing..." : "Run Preprocessing" }}
            </button>

            <button
              @click="convertPreprocessedToCsv"
              class="btn-secondary"
              :disabled="!preprocessedOutput"
            >
              <i class="fas fa-file-csv"></i> Convert to CSV
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="tab-content">
        <div class="settings">
          <div class="settings-header">
            <h4><i class="fas fa-cog"></i> Settings</h4>
          </div>

          <div class="settings-grid">
            <div class="settings-section">
              <h5><i class="fas fa-sliders-h"></i> General Settings</h5>

              <div class="control-group">
                <label>Theme:</label>
                <select v-model="settings.theme">
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div class="control-group">
                <label>Default Delimiter:</label>
                <select v-model="settings.defaultDelimiter">
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                </select>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="settings.autoConvert" />
                  Auto-convert on paste
                </label>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="settings.autoDownload" />
                  Auto-download results
                </label>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="settings.showLineNumbers" />
                  Show line numbers
                </label>
              </div>
            </div>

            <div class="settings-section">
              <h5><i class="fas fa-tachometer-alt"></i> Performance</h5>

              <div class="control-group">
                <label>Default Chunk Size:</label>
                <select v-model="settings.defaultChunkSize">
                  <option :value="1024 * 1024">1 MB</option>
                  <option :value="5 * 1024 * 1024">5 MB</option>
                  <option :value="10 * 1024 * 1024">10 MB</option>
                </select>
              </div>

              <div class="control-group">
                <label>Max Parallel Files:</label>
                <select v-model="settings.maxParallelFiles">
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                  <option :value="4">4</option>
                  <option :value="8">8</option>
                </select>
              </div>

              <div class="control-group">
                <label>Memory Warning Threshold:</label>
                <input
                  type="range"
                  v-model="settings.memoryWarningThreshold"
                  min="50"
                  max="95"
                />
                <span class="range-value"
                  >{{ settings.memoryWarningThreshold }}%</span
                >
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="settings.enableWebWorkers" />
                  Enable Web Workers
                </label>
                <span class="hint">Use background threads for processing</span>
              </div>
            </div>

            <div class="settings-section">
              <h5><i class="fas fa-shield-alt"></i> Security</h5>

              <div class="control-group">
                <label>
                  <input
                    type="checkbox"
                    v-model="settings.enableCsvInjectionProtection"
                  />
                  CSV Injection Protection
                </label>
              </div>

              <div class="control-group">
                <label>
                  <input type="checkbox" v-model="settings.validateJson" />
                  Validate JSON before processing
                </label>
              </div>

              <div class="control-group">
                <label>Max File Size:</label>
                <select v-model="settings.maxFileSize">
                  <option :value="100 * 1024 * 1024">100 MB</option>
                  <option :value="500 * 1024 * 1024">500 MB</option>
                  <option :value="1024 * 1024 * 1024">1 GB</option>
                  <option :value="2 * 1024 * 1024 * 1024">2 GB</option>
                </select>
              </div>

              <div class="control-group">
                <label>Allowed File Types:</label>
                <div class="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      v-model="settings.allowedTypes.json"
                    />
                    JSON
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      v-model="settings.allowedTypes.csv"
                    />
                    CSV
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      v-model="settings.allowedTypes.ndjson"
                    />
                    NDJSON
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      v-model="settings.allowedTypes.txt"
                    />
                    TXT
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-actions">
            <button @click="saveSettings" class="btn-primary">
              <i class="fas fa-save"></i> Save Settings
            </button>

            <button @click="resetSettings" class="btn-secondary">
              <i class="fas fa-undo"></i> Reset to Defaults
            </button>

            <button @click="exportSettings" class="btn-secondary">
              <i class="fas fa-file-export"></i> Export Settings
            </button>

            <button @click="importSettings" class="btn-secondary">
              <i class="fas fa-file-import"></i> Import Settings
            </button>
          </div>

          <div class="settings-info">
            <h5><i class="fas fa-info-circle"></i> System Information</h5>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">JTCSV Version:</span>
                <span class="info-value">{{ jtcsvInfo.version }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Mode:</span>
                <span class="info-value">{{ jtcsvInfo.mode }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Browser:</span>
                <span class="info-value">{{ browserInfo }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Memory:</span>
                <span class="info-value">{{ memoryInfo }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Features:</span>
                <span class="info-value">{{ jtcsvInfo.features.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error/Notification Area -->
    <div v-if="conversionError || notification" class="notification-area">
      <div :class="['notification', notificationType]" v-if="notification">
        <i :class="notificationIcon"></i>
        <span>{{ notification }}</span>
        <button @click="clearNotification" class="btn-icon">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="error-message" v-if="conversionError">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ conversionError }}</span>
        <button @click="clearError" class="btn-icon">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- Progress Modal -->
    <div v-if="showProgressModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h4><i class="fas fa-spinner fa-spin"></i> Processing...</h4>
          <button @click="cancelProcessing" class="btn-icon">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: progress + '%' }"
              ></div>
            </div>
            <div class="progress-text">
              <span>{{ progress }}% Complete</span>
              <span class="progress-details">{{ progressDetails }}</span>
            </div>
          </div>

          <div class="progress-stats">
            <div class="stat-item">
              <span class="stat-label">Processed:</span>
              <span class="stat-value">{{ processedItems }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Remaining:</span>
              <span class="stat-value">{{ remainingItems }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Speed:</span>
              <span class="stat-value">{{ processingSpeed }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Time:</span>
              <span class="stat-value">{{ elapsedTime }}</span>
            </div>
          </div>

          <div class="progress-logs" v-if="progressLogs.length > 0">
            <h5>Recent Activity</h5>
            <div class="logs-list">
              <div
                v-for="(log, index) in progressLogs"
                :key="index"
                class="log-item"
              >
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="pauseProcessing" class="btn-secondary">
            <i class="fas" :class="isPaused ? 'fa-play' : 'fa-pause'"></i>
            {{ isPaused ? "Resume" : "Pause" }}
          </button>
          <button @click="cancelProcessing" class="btn-secondary">
            <i class="fas fa-stop"></i> Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { jtcsv } from "../utils/jtcsv-integration";

// Tabs configuration
const tabs = [
  { id: "quick", label: "Quick Convert", icon: "fas fa-bolt" },
  { id: "batch", label: "Batch Processing", icon: "fas fa-layer-group" },
  { id: "streaming", label: "Streaming", icon: "fas fa-stream" },
  { id: "preprocess", label: "Preprocessing", icon: "fas fa-code-branch" },
  { id: "settings", label: "Settings", icon: "fas fa-cog" },
];

// Reactive state
const activeTab = ref("quick");
const inputFormat = ref("json");
const inputText = ref("");
const outputText = ref("");
const isConverting = ref(false);
const conversionError = ref(null);
const showAdvancedOptions = ref(false);
const streamingMode = ref(false);
const customDelimiter = ref("");
const renameMapJson = ref("");
const templateJson = ref("");

// Options with all JTCSV features
const options = ref({
  delimiter: ",",
  includeHeaders: true,
  preventCsvInjection: true,
  parseNumbers: true,
  parseBooleans: false,
  autoDetect: true,
  rfc4180Compliant: true,
  maxRecords: null,
  maxRows: null,
  warnExtraFields: false,
  renameMap: {},
  template: {},
  candidates: [";", ",", "\t", "|"],
  trim: true,
  hasHeaders: true,
  useFastPath: true,
  fastPathMode: "objects",
});

// Batch processing state
const batchMode = ref(false);
const batchFiles = ref([]);
const batchOutputFormat = ref("same");
const batchParallel = ref(4);
const batchOverwrite = ref(false);
const isBatchProcessing = ref(false);
const batchResults = ref([]);
const processedFiles = ref(0);
const totalFiles = ref(0);

// Streaming state
const streamingFile = ref(null);
const streamingChunkSize = ref(1024 * 1024); // 1MB
const streamingModeType = ref("json2csv");
const streamingShowProgress = ref(true);
const streamingAutoDownload = ref(true);
const isStreamingProcessing = ref(false);
const streamingProgress = ref(0);
const streamingLogs = ref([]);

// Preprocessing state
const preprocessInput = ref("");
const preprocessedOutput = ref("");
const isPreprocessing = ref(false);
const preprocessOptions = ref({
  maxDepth: 5,
  unwrapArrays: true,
  stringifyObjects: true,
  handleCircular: true,
  preserveNull: false,
});

// Settings state
const settings = ref({
  theme: "dark",
  defaultDelimiter: ",",
  autoConvert: false,
  autoDownload: false,
  showLineNumbers: true,
  defaultChunkSize: 1024 * 1024,
  maxParallelFiles: 4,
  memoryWarningThreshold: 80,
  enableWebWorkers: true,
  enableCsvInjectionProtection: true,
  validateJson: true,
  maxFileSize: 100 * 1024 * 1024,
  allowedTypes: {
    json: true,
    csv: true,
    ndjson: true,
    txt: true,
  },
});

// Progress modal state
const showProgressModal = ref(false);
const progress = ref(0);
const progressDetails = ref("");
const processedItems = ref(0);
const remainingItems = ref(0);
const processingSpeed = ref("0/s");
const elapsedTime = ref("0s");
const progressLogs = ref([]);
const isPaused = ref(false);

// Notification state
const notification = ref("");
const notificationType = ref("info");
const notificationIcon = ref("fas fa-info-circle");

// Memory monitoring
const memoryUsage = ref(0);
const status = ref("Ready");

// Computed properties
const outputFormat = computed(() => {
  if (batchMode.value && batchOutputFormat.value !== "same") {
    return batchOutputFormat.value;
  }
  return inputFormat.value === "json" ? "csv" : "json";
});

const inputPlaceholder = computed(() => {
  switch (inputFormat.value) {
    case "json":
      return "Paste JSON array here or upload a .json file...";
    case "csv":
      return "Paste CSV data here or upload a .csv file...";
    case "ndjson":
      return "Paste NDJSON (Newline Delimited JSON) here...";
    default:
      return "Paste your data here...";
  }
});

const fileAccept = computed(() => {
  switch (inputFormat.value) {
    case "json":
      return ".json,.txt";
    case "csv":
      return ".csv,.txt";
    case "ndjson":
      return ".ndjson,.jsonl,.txt";
    default:
      return ".json,.csv,.txt";
  }
});

const convertButtonText = computed(() => {
  if (isConverting.value) return "Converting...";
  if (streamingMode.value) return "Convert with Streaming";
  return `Convert ${inputFormat.value.toUpperCase()} → ${outputFormat.value.toUpperCase()}`;
});

const inputStats = computed(() => {
  if (!inputText.value) return "";

  const lines = inputText.value.split("\n").length;
  const size = new Blob([inputText.value]).size;
  const kb = (size / 1024).toFixed(2);

  return `${lines} lines, ${kb} KB`;
});

const outputPreview = computed(() => {
  if (!outputText.value) return "// Output will appear here...";

  const lines = outputText.value.split("\n");
  const previewLines = 20;

  if (lines.length <= previewLines) {
    return outputText.value;
  }

  return (
    lines.slice(0, previewLines).join("\n") +
    "\n... (" +
    (lines.length - previewLines) +
    " more lines)"
  );
});

const stats = computed(() => {
  const lines = outputText.value ? outputText.value.split("\n").length : 0;
  const size = outputText.value ? new Blob([outputText.value]).size : 0;
  const kb = (size / 1024).toFixed(2);

  return {
    lines,
    size: size > 1024 ? `${kb} KB` : `${size} bytes`,
    time: 0,
  };
});

const preprocessInputStats = computed(() => {
  if (!preprocessInput.value) return "";

  try {
    const data = JSON.parse(preprocessInput.value);
    const isArray = Array.isArray(data);
    const count = isArray ? data.length : 1;
    const size = new Blob([preprocessInput.value]).size;
    const kb = (size / 1024).toFixed(2);

    return `${count} ${isArray ? "items" : "object"}, ${kb} KB`;
  } catch {
    return "Invalid JSON";
  }
});

const preprocessedPreview = computed(() => {
  if (!preprocessedOutput.value)
    return "// Preprocessed output will appear here...";

  try {
    const data =
      typeof preprocessedOutput.value === "string"
        ? JSON.parse(preprocessedOutput.value)
        : preprocessedOutput.value;

    return JSON.stringify(data, null, 2);
  } catch {
    return preprocessedOutput.value;
  }
});

const preprocessingStats = computed(() => {
  // These would be calculated during preprocessing
  return {
    depthReduction: 0,
    objectsUnwrapped: 0,
    arraysFlattened: 0,
  };
});

const successfulBatchFiles = computed(() => {
  return batchResults.value.filter((r) => r.success).length;
});

const failedBatchFiles = computed(() => {
  return batchResults.value.filter((r) => !r.success).length;
});

const jtcsvInfo = computed(() => {
  return jtcsv.getInfo();
});

const browserInfo = computed(() => {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown";
});

const memoryInfo = computed(() => {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    const percent = ((used / total) * 100).toFixed(1);
    return `${(used / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB (${percent}%)`;
  }
  return "Not available";
});

// Methods
const handleInputChange = () => {
  conversionError.value = null;
  if (settings.value.autoConvert && inputText.value.trim()) {
    // Debounced auto-conversion could be implemented here
  }
};

const clearInput = () => {
  inputText.value = "";
  outputText.value = "";
  conversionError.value = null;
};

const loadExample = () => {
  if (inputFormat.value === "json") {
    inputText.value = JSON.stringify(
      [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          age: 30,
          active: true,
          tags: ["admin", "user"],
          metadata: { created: "2024-01-01", updated: "2024-01-15" },
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          age: 25,
          active: false,
          tags: ["user"],
          metadata: { created: "2024-01-02", updated: "2024-01-10" },
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          age: 35,
          active: true,
          tags: ["admin", "manager"],
          metadata: { created: "2024-01-03", updated: "2024-01-20" },
        },
      ],
      null,
      2,
    );
  } else if (inputFormat.value === "csv") {
    inputText.value =
      'id,name,email,age,active,tags,metadata\n1,John Doe,john@example.com,30,true,"admin,user","{""created"":""2024-01-01"",""updated"":""2024-01-15""}"\n2,Jane Smith,jane@example.com,25,false,user,"{""created"":""2024-01-02"",""updated"":""2024-01-10""}"\n3,Bob Johnson,bob@example.com,35,true,"admin,manager","{""created"":""2024-01-03"",""updated"":""2024-01-20""}"';
  } else {
    inputText.value =
      '{"id":1,"name":"John","active":true}\n{"id":2,"name":"Jane","active":false}\n{"id":3,"name":"Bob","active":true}';
  }
};

const toggleAdvancedOptions = () => {
  showAdvancedOptions.value = !showAdvancedOptions.value;
};

const updateCustomDelimiter = () => {
  if (customDelimiter.value && customDelimiter.value.length === 1) {
    options.value.delimiter = customDelimiter.value;
  }
};

const updateRenameMap = () => {
  try {
    if (renameMapJson.value.trim()) {
      options.value.renameMap = JSON.parse(renameMapJson.value);
    } else {
      options.value.renameMap = {};
    }
  } catch (error) {
    showNotification("Invalid rename map JSON", "error");
  }
};

const updateTemplate = () => {
  try {
    if (templateJson.value.trim()) {
      options.value.template = JSON.parse(templateJson.value);
    } else {
      options.value.template = {};
    }
  } catch (error) {
    showNotification("Invalid template JSON", "error");
  }
};

const triggerFileUpload = () => {
  const fileInput = document.querySelector('input[type="file"]');
  fileInput?.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Check file size
  if (file.size > settings.value.maxFileSize) {
    showNotification(
      `File too large (max ${settings.value.maxFileSize / 1024 / 1024}MB)`,
      "error",
    );
    return;
  }

  // Check file type
  const ext = file.name.split(".").pop().toLowerCase();
  if (!settings.value.allowedTypes[ext] && !settings.value.allowedTypes.txt) {
    showNotification(`File type .${ext} not allowed`, "error");
    return;
  }

  try {
    const text = await readFileAsText(file);
    inputText.value = text;

    // Auto-detect format from file extension
    if (file.name.endsWith(".json")) {
      inputFormat.value = "json";
    } else if (file.name.endsWith(".csv")) {
      inputFormat.value = "csv";
    } else if (file.name.endsWith(".ndjson") || file.name.endsWith(".jsonl")) {
      inputFormat.value = "ndjson";
    }

    showNotification(`File "${file.name}" loaded successfully`, "success");
  } catch (error) {
    showNotification(`Error reading file: ${error.message}`, "error");
  }
};

const convertData = async () => {
  if (!inputText.value.trim()) {
    conversionError.value = "Please enter some data to convert";
    return;
  }

  isConverting.value = true;
  conversionError.value = null;
  showProgressModal.value = true;

  try {
    const startTime = performance.now();

    if (streamingMode.value && streamingFile.value) {
      // Use streaming for large files
      await processWithStreaming();
    } else {
      // Use regular conversion
      if (inputFormat.value === "json") {
        const jsonData = JSON.parse(inputText.value);
        outputText.value = await jtcsv.jsonToCsv(jsonData, options.value);
      } else if (inputFormat.value === "csv") {
        const jsonData = await jtcsv.csvToJson(inputText.value, options.value);
        outputText.value = JSON.stringify(jsonData, null, 2);
      } else if (inputFormat.value === "ndjson") {
        // Handle NDJSON
        const lines = inputText.value.split("\n").filter((line) => line.trim());
        const jsonData = lines.map((line) => JSON.parse(line));
        outputText.value = await jtcsv.jsonToCsv(jsonData, options.value);
      }
    }

    const endTime = performance.now();
    stats.value.time = Math.round(endTime - startTime);

    showNotification("Conversion successful!", "success");
  } catch (error) {
    conversionError.value = `Conversion error: ${error.message}`;
    showNotification("Conversion failed", "error");
  } finally {
    isConverting.value = false;
    showProgressModal.value = false;
  }
};

const processWithStreaming = async () => {
  showProgressModal.value = true;
  progress.value = 0;
  progressDetails.value = "Starting streaming processing...";

  try {
    if (!streamingFile.value) {
      throw new Error("No streaming file selected");
    }

    const mode = inputFormat.value === "json" ? "json2csv" : "csv2json";
    await runStreamingConversion(streamingFile.value, mode);
  } catch (error) {
    throw error;
  }
};

const copyOutput = () => {
  if (!outputText.value) return;

  navigator.clipboard
    .writeText(outputText.value)
    .then(() => showNotification("Copied to clipboard!", "success"))
    .catch((err) => {
      console.error("Failed to copy:", err);
      showNotification("Failed to copy to clipboard", "error");
    });
};

const downloadOutput = () => {
  if (!outputText.value) return;

  const blob = new Blob([outputText.value], {
    type: outputFormat.value === "json" ? "application/json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `converted.${outputFormat.value}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification("File downloaded!", "success");
};

const saveToCloud = () => {
  // This would integrate with cloud storage services
  showNotification("Cloud storage integration coming soon!", "info");
};

// Batch processing methods
const triggerBatchUpload = () => {
  const fileInput = document.querySelector('input[ref="batchFileInput"]');
  fileInput?.click();
};

const handleBatchFileSelect = (event) => {
  const files = Array.from(event.target.files);
  addBatchFiles(files);
};

const handleBatchDrop = (event) => {
  const files = Array.from(event.dataTransfer.files);
  addBatchFiles(files);
};

const addBatchFiles = (files) => {
  const validFiles = files.filter((file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    return settings.value.allowedTypes[ext] || settings.value.allowedTypes.txt;
  });

  batchFiles.value.push(...validFiles);
  totalFiles.value = batchFiles.value.length;

  showNotification(`Added ${validFiles.length} file(s)`, "success");
};

const removeBatchFile = (index) => {
  batchFiles.value.splice(index, 1);
  totalFiles.value = batchFiles.value.length;
};

const clearBatchFiles = () => {
  batchFiles.value = [];
  batchResults.value = [];
  processedFiles.value = 0;
  totalFiles.value = 0;
};

const getFileIcon = (fileName) => {
  if (fileName.endsWith(".json")) return "fas fa-file-code";
  if (fileName.endsWith(".csv")) return "fas fa-file-csv";
  if (fileName.endsWith(".ndjson") || fileName.endsWith(".jsonl"))
    return "fas fa-file-alt";
  return "fas fa-file";
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const startBatchProcessing = async () => {
  if (batchFiles.value.length === 0) return;

  isBatchProcessing.value = true;
  batchResults.value = [];
  processedFiles.value = 0;
  showProgressModal.value = true;
  progress.value = 0;

  try {
    const results = await jtcsv.batchProcess(batchFiles.value, {
      ...options.value,
      outputFormat: batchOutputFormat.value,
      parallel: batchParallel.value,
      onProgress: (processed, total) => {
        progress.value = Math.round((processed / total) * 100);
        processedFiles.value = processed;
        progressDetails.value = `Processed ${processed} of ${total} files`;
        addProgressLog(`Processed ${processed}/${total} files`);
      },
    });

    batchResults.value = results;
    showNotification(
      `Batch processing completed! ${successfulBatchFiles.value} successful, ${failedBatchFiles.value} failed`,
      "success",
    );
  } catch (error) {
    showNotification(`Batch processing error: ${error.message}`, "error");
  } finally {
    isBatchProcessing.value = false;
    showProgressModal.value = false;
  }
};

const downloadBatchResults = () => {
  if (!batchResults.value.length) return;

  const iterator = (async function* () {
    yield "[";
    let first = true;
    for (const result of batchResults.value) {
      const payload = {
        file: result.file,
        success: result.success,
        size: result.size,
        outputFormat: result.outputFormat,
        output: result.output,
        error: result.error,
      };
      const json = JSON.stringify(payload);
      yield (first ? "" : ",") + json;
      first = false;
    }
    yield "]";
  })();

  const stream = createReadableStreamFromIterator(iterator);
  downloadStreamToFile(stream, "jtcsv-batch-results.json", "application/json")
    .then(() => showNotification("Batch results downloaded!", "success"))
    .catch((error) => {
      console.error("Batch download failed:", error);
      showNotification("Batch download failed", "error");
    });
};

const downloadSingleResult = (result) => {
  if (!result.output) return;

  const blob = new Blob([result.output], {
    type: result.outputMime || "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  // Determine output filename
  const inputName = result.file;
  const outputName = inputName.replace(
    /\.[^/.]+$/,
    `.${result.outputExt || "txt"}`,
  );

  a.download = outputName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Streaming methods
const triggerStreamingUpload = () => {
  const fileInput = document.querySelector('input[ref="streamingFileInput"]');
  fileInput?.click();
};

const handleStreamingFileSelect = (event) => {
  const file = event.target.files[0];
  if (file && file.size <= settings.value.maxFileSize) {
    streamingFile.value = file;
    showNotification(
      `Selected file: ${file.name} (${formatFileSize(file.size)})`,
      "success",
    );
  } else {
    showNotification("File too large or invalid", "error");
  }
};

const handleStreamingDrop = (event) => {
  const file = event.dataTransfer.files[0];
  if (file && file.size <= settings.value.maxFileSize) {
    streamingFile.value = file;
    showNotification(
      `Dropped file: ${file.name} (${formatFileSize(file.size)})`,
      "success",
    );
  }
};

const clearStreamingFile = () => {
  streamingFile.value = null;
  streamingProgress.value = 0;
  streamingLogs.value = [];
};

const startStreamingProcessing = async () => {
  if (!streamingFile.value) return;

  isStreamingProcessing.value = true;
  streamingProgress.value = 0;
  streamingLogs.value = [];
  showProgressModal.value = true;

  try {
    addStreamingLog("Starting streaming processing...", "info");

    // Determine processing mode based on file extension
    const fileName = streamingFile.value.name.toLowerCase();
    let mode = streamingModeType.value;

    if (mode === "auto") {
      if (fileName.endsWith(".json")) mode = "json2csv";
      else if (fileName.endsWith(".csv")) mode = "csv2json";
    }

    await runStreamingConversion(streamingFile.value, mode);
    addStreamingLog("Streaming processing completed!", "success");
  } catch (error) {
    addStreamingLog(`Error: ${error.message}`, "error");
    showNotification("Streaming processing failed", "error");
  } finally {
    isStreamingProcessing.value = false;
    showProgressModal.value = false;
  }
};

const pauseStreaming = () => {
  // Implement pause functionality
  showNotification("Pause functionality coming soon!", "info");
};

const cancelStreaming = () => {
  isStreamingProcessing.value = false;
  streamingProgress.value = 0;
  addStreamingLog("Processing cancelled", "warning");
  showNotification("Streaming processing cancelled", "warning");
};

const createReadableStreamFromIterator = (iterator) => {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
  });
};

const streamToPreview = async (stream, limit = 20000) => {
  let preview = "";
  let truncated = false;
  for await (const chunk of stream) {
    if (preview.length < limit) {
      const remaining = limit - preview.length;
      preview += chunk.slice(0, remaining);
      if (chunk.length > remaining) {
        truncated = true;
      }
    } else {
      truncated = true;
    }
  }

  return { preview, truncated };
};

const downloadStreamToFile = async (stream, filename, mimeType) => {
  if (typeof TransformStream === "undefined" || typeof TextEncoder === "undefined") {
    let text = "";
    for await (const chunk of stream) {
      text += chunk;
    }
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const encodedStream = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(new TextEncoder().encode(chunk));
      },
    }),
  );

  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: mimeType,
          accept: { [mimeType]: [`.${filename.split(".").pop()}`] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await encodedStream.pipeTo(writable);
    return;
  }

  const blob = await new Response(encodedStream).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const runStreamingConversion = async (file, mode) => {
  const fileName = file.name.toLowerCase();
  let outputExt = "txt";
  let outputMime = "text/plain";
  let outputStream = null;

  if (mode === "json2csv") {
    const inputFormat = fileName.endsWith(".ndjson") || fileName.endsWith(".jsonl")
      ? "ndjson"
      : "json-array";
    outputExt = "csv";
    outputMime = "text/csv";
    outputStream = await jtcsv.jsonToCsvStream(file, {
      ...options.value,
      inputFormat,
    });
  } else if (mode === "csv2json") {
    outputExt = "json";
    outputMime = "application/json";
    outputStream = await jtcsv.csvToJsonStream(file, {
      ...options.value,
      outputFormat: "json",
    });
  } else {
    throw new Error(`Unsupported streaming mode: ${mode}`);
  }

  const outputName = file.name.replace(/\.[^/.]+$/, `.${outputExt}`);
  let previewStream = outputStream;

  if (streamingAutoDownload.value && outputStream.tee) {
    const tee = outputStream.tee();
    previewStream = tee[0];
    await downloadStreamToFile(tee[1], outputName, outputMime);
  }

  const { preview, truncated } = await streamToPreview(previewStream);
  outputText.value = truncated ? `${preview}\n... (preview truncated)` : preview;
  streamingProgress.value = 100;
  progress.value = 100;
  progressDetails.value = "Streaming conversion completed";

  if (streamingAutoDownload.value && !outputStream.tee) {
    await downloadStreamToFile(outputStream, outputName, outputMime);
  }
};

const addStreamingLog = (message, type = "info") => {
  const time = new Date().toLocaleTimeString();
  streamingLogs.value.unshift({
    time,
    message,
    type,
  });

  // Keep only last 50 logs
  if (streamingLogs.value.length > 50) {
    streamingLogs.value = streamingLogs.value.slice(0, 50);
  }
};

// Preprocessing methods
const loadComplexExample = () => {
  preprocessInput.value = JSON.stringify(
    {
      users: [
        {
          id: 1,
          name: "John Doe",
          contact: {
            email: "john@example.com",
            phone: "+1234567890",
            addresses: [
              { type: "home", street: "123 Main St", city: "New York" },
              { type: "work", street: "456 Office Ave", city: "New York" },
            ],
          },
          preferences: {
            notifications: true,
            theme: "dark",
            language: "en",
          },
          metadata: {
            created: "2024-01-01T10:00:00Z",
            updated: "2024-01-15T14:30:00Z",
            tags: ["active", "premium", "verified"],
          },
        },
        {
          id: 2,
          name: "Jane Smith",
          contact: {
            email: "jane@example.com",
            phone: "+0987654321",
            addresses: [
              { type: "home", street: "789 Park Blvd", city: "Los Angeles" },
            ],
          },
          preferences: {
            notifications: false,
            theme: "light",
            language: "es",
          },
        },
      ],
      stats: {
        total: 2,
        active: 1,
        locations: ["New York", "Los Angeles"],
        timestamps: {
          start: "2024-01-01",
          end: "2024-12-31",
        },
      },
    },
    null,
    2,
  );
};

const clearPreprocessInput = () => {
  preprocessInput.value = "";
  preprocessedOutput.value = "";
};

const handlePreprocessInput = () => {
  // Validate JSON as user types
  if (preprocessInput.value.trim()) {
    try {
      JSON.parse(preprocessInput.value);
      // JSON is valid
    } catch (error) {
      // JSON is invalid - could show inline error
    }
  }
};

const updatePreprocessOptions = () => {
  // Options are already reactive
};

const runPreprocessing = async () => {
  if (!preprocessInput.value.trim()) return;

  isPreprocessing.value = true;

  try {
    const jsonData = JSON.parse(preprocessInput.value);
    const processed = await jtcsv.preprocessData(
      jsonData,
      preprocessOptions.value,
    );

    preprocessedOutput.value = JSON.stringify(processed, null, 2);
    showNotification("Preprocessing completed!", "success");
  } catch (error) {
    showNotification(`Preprocessing error: ${error.message}`, "error");
  } finally {
    isPreprocessing.value = false;
  }
};

const copyPreprocessed = () => {
  if (!preprocessedOutput.value) return;

  navigator.clipboard
    .writeText(preprocessedOutput.value)
    .then(() => showNotification("Preprocessed data copied!", "success"))
    .catch((err) => {
      console.error("Failed to copy:", err);
      showNotification("Failed to copy to clipboard", "error");
    });
};

const downloadPreprocessed = () => {
  if (!preprocessedOutput.value) return;

  const blob = new Blob([preprocessedOutput.value], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preprocessed.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification("Preprocessed file downloaded!", "success");
};

const convertPreprocessedToCsv = async () => {
  if (!preprocessedOutput.value) return;

  try {
    const jsonData =
      typeof preprocessedOutput.value === "string"
        ? JSON.parse(preprocessedOutput.value)
        : preprocessedOutput.value;

    const csv = await jtcsv.jsonToCsv(jsonData, options.value);
    outputText.value = csv;

    // Switch to quick convert tab to show result
    activeTab.value = "quick";
    showNotification("Converted preprocessed data to CSV!", "success");
  } catch (error) {
    showNotification(`Conversion error: ${error.message}`, "error");
  }
};

// Settings methods
const saveSettings = () => {
  localStorage.setItem("jtcsv-settings", JSON.stringify(settings.value));
  showNotification("Settings saved!", "success");
};

const resetSettings = () => {
  // Reset to defaults
  settings.value = {
    theme: "dark",
    defaultDelimiter: ",",
    autoConvert: false,
    autoDownload: false,
    showLineNumbers: true,
    defaultChunkSize: 1024 * 1024,
    maxParallelFiles: 4,
    memoryWarningThreshold: 80,
    enableWebWorkers: true,
    enableCsvInjectionProtection: true,
    validateJson: true,
    maxFileSize: 100 * 1024 * 1024,
    allowedTypes: {
      json: true,
      csv: true,
      ndjson: true,
      txt: true,
    },
  };
  showNotification("Settings reset to defaults!", "success");
};

const exportSettings = () => {
  const dataStr = JSON.stringify(settings.value, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jtcsv-settings.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification("Settings exported!", "success");
};

const importSettings = () => {
  // Create file input for settings import
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          settings.value = { ...settings.value, ...importedSettings };
          showNotification("Settings imported!", "success");
        } catch (error) {
          showNotification("Invalid settings file", "error");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

// Progress modal methods
const addProgressLog = (message) => {
  const time = new Date().toLocaleTimeString();
  progressLogs.value.unshift({
    time,
    message,
  });

  // Keep only last 20 logs
  if (progressLogs.value.length > 20) {
    progressLogs.value = progressLogs.value.slice(0, 20);
  }
};

const pauseProcessing = () => {
  isPaused.value = !isPaused.value;
  addProgressLog(isPaused.value ? "Processing paused" : "Processing resumed");
};

const cancelProcessing = () => {
  showProgressModal.value = false;
  isConverting.value = false;
  isBatchProcessing.value = false;
  isStreamingProcessing.value = false;
  isPreprocessing.value = false;
  isPaused.value = false;

  showNotification("Processing cancelled", "warning");
};

// Notification methods
const showNotification = (message, type = "info") => {
  notification.value = message;
  notificationType.value = type;

  const icons = {
    info: "fas fa-info-circle",
    success: "fas fa-check-circle",
    warning: "fas fa-exclamation-triangle",
    error: "fas fa-times-circle",
  };
  notificationIcon.value = icons[type] || icons.info;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (notification.value === message) {
      clearNotification();
    }
  }, 5000);
};

const clearNotification = () => {
  notification.value = "";
};

const clearError = () => {
  conversionError.value = null;
};

// Helper functions
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Monitor memory usage
const monitorMemory = () => {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    memoryUsage.value = Math.round((used / total) * 100);

    if (memoryUsage.value > settings.value.memoryWarningThreshold) {
      status.value = "High Memory Usage";
      showNotification(`High memory usage: ${memoryUsage.value}%`, "warning");
    } else {
      status.value = "Ready";
    }
  }
};

// Lifecycle hooks
onMounted(() => {
  // Load saved settings
  const savedSettings = localStorage.getItem("jtcsv-settings");
  if (savedSettings) {
    try {
      settings.value = { ...settings.value, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.warn("Failed to load saved settings:", error);
    }
  }

  // Apply theme
  applyTheme(settings.value.theme);

  // Start memory monitoring
  const memoryInterval = setInterval(monitorMemory, 5000);

  // Cleanup on unmount
  onUnmounted(() => {
    clearInterval(memoryInterval);
  });
});

const applyTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    // Auto theme based on system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.setAttribute(
      "data-theme",
      prefersDark ? "dark" : "light",
    );
  }
};

// Watch for theme changes
watch(
  () => settings.value.theme,
  (newTheme) => {
    applyTheme(newTheme);
  },
);

// Watch for input format changes
watch(inputFormat, () => {
  outputText.value = "";
  conversionError.value = null;

  // Reset options for new format
  if (inputFormat.value === "json") {
    options.value.parseNumbers = true;
    options.value.parseBooleans = false;
  } else if (inputFormat.value === "csv") {
    options.value.parseNumbers = true;
    options.value.parseBooleans = true;
  }
});

// Watch for batch output format changes
watch(batchOutputFormat, () => {
  if (batchOutputFormat.value !== "same") {
    batchMode.value = true;
  }
});
</script>

<style scoped>
.converter {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
}

.converter-header {
  padding: 15px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.header-tabs {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.tab-button {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.tab-button:hover {
  background: var(--bg-hover);
}

.tab-button.active {
  color: white;
  border-color: var(--primary-color);
}

.converter-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;

  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.stat.warning {
  color: var(--warning-color);
  background: rgba(255, 193, 7, 0.1);
}

.converter-body {
  padding: 20px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
}

.input-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.section-header h4 {
  font-size: 1.1rem;

  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.input-format {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.input-format label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.textarea-container {
  position: relative;
  flex: 1;
}

.input-textarea {
  width: 100%;
  min-height: 200px;
  padding: 15px;

  border: 1px solid var(--border-color);
  border-radius: 8px;

  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.input-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.textarea-info {
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: 0.8rem;
  color: var(--text-secondary);

  padding: 2px 8px;
  border-radius: 4px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.action-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-icon {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-primary {
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  cursor: not-allowed;
}

.btn-secondary {
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn-icon {
  padding: 6px;
  background: transparent;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--bg-hover);
}

.output-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.output-area {
  flex: 1;
  display: flex;
  flex-direction: column;

  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.output-preview {
  flex: 1;
  max-height: 300px;
  overflow-y: auto;
  padding: 15px;
}

.output-preview pre {
  margin: 0;

  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
}

.controls-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.controls-grid.expanded {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

  cursor: pointer;
  font-size: 0.9rem;
}

.control-group select,
.control-group input[type="text"],
.control-group input[type="number"],
.control-group textarea {
  padding: 8px 12px;

  border: 1px solid var(--border-color);
  border-radius: 6px;

  font-size: 0.9rem;
}

.control-group select:focus,
.control-group input:focus,
.control-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.custom-delimiter {
  margin-top: 5px;
}

.advanced-options {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;

  border-radius: 8px;
  border: 1px solid var(--border-color);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.convert-button {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.convert-btn {
  padding: 12px 30px;
  font-size: 1.1rem;
  min-width: 200px;
}

.conversion-mode {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Batch Processing Styles */
.batch-processing {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.batch-header {
  text-align: center;
  margin-bottom: 10px;
}

.batch-header h4 {
  font-size: 1.3rem;

  margin-bottom: 5px;
}

.batch-header p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.batch-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: var(--text-secondary);
}

.upload-placeholder i {
  font-size: 3rem;
  color: var(--text-tertiary);
}

.file-list {
  width: 100%;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;

  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.file-icon {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.9rem;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.batch-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;

  border-radius: 8px;
}

.batch-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.batch-results {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.results-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.result-stat.success {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.result-stat.error {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.result-stat.total {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.success {
  border-left: 3px solid rgb(34, 197, 94);
}

.result-item.error {
  border-left: 3px solid rgb(239, 68, 68);
}

.result-icon {
  font-size: 1rem;
}

.result-item.success .result-icon {
  color: rgb(34, 197, 94);
}

.result-item.error .result-icon {
  color: rgb(239, 68, 68);
}

.result-info {
  flex: 1;
}

.result-file {
  font-size: 0.9rem;

  margin-bottom: 2px;
}

.result-message {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.result-message.error {
  color: rgb(239, 68, 68);
}

/* Streaming Styles */
.streaming-processing {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.streaming-header {
  text-align: center;
}

.upload-card {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-selected {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  min-width: 0;
}

.file-progress {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 8px;

  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;

  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 40px;
}

.streaming-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;

  border-radius: 8px;
}

.streaming-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.streaming-logs {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.streaming-logs h5 {
  margin-top: 0;
  margin-bottom: 15px;
}

.logs-container {
  max-height: 200px;
  overflow-y: auto;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
}

.log-entry {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.info {
  color: var(--text-secondary);
}

.log-entry.success {
  color: rgb(34, 197, 94);
}

.log-entry.warning {
  color: rgb(245, 158, 11);
}

.log-entry.error {
  color: rgb(239, 68, 68);
}

.log-time {
  color: var(--text-tertiary);
  min-width: 70px;
}

/* Preprocessing Styles */
.preprocessing {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preprocessing-header {
  text-align: center;
}

.preprocessing-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;

  border-radius: 8px;
}

.range-value {
  margin-left: 10px;
  color: var(--primary-color);
  font-weight: 600;
}

.preprocessing-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

/* Settings Styles */
.settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-header {
  text-align: center;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.settings-section h5 {
  margin-top: 0;
  margin-bottom: 15px;

  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 5px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.settings-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  padding: 20px;

  border-radius: 8px;
}

.settings-info {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.settings-info h5 {
  margin-top: 0;
  margin-bottom: 15px;

  display: flex;
  align-items: center;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;

  border-radius: 6px;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.info-value {
  font-size: 0.9rem;

  font-weight: 500;
}

/* Notification Area */
.notification-area {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

.notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  animation: slideInRight 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification.info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: rgb(59, 130, 246);
}

.notification.success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: rgb(34, 197, 94);
}

.notification.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: rgb(245, 158, 11);
}

.notification.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: rgb(239, 68, 68);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: rgb(239, 68, 68);
  margin-bottom: 10px;
}

/* Progress Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h4 {
  margin: 0;

  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-body {
  padding: 20px;
}

.progress-container {
  margin-bottom: 20px;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.progress-details {
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.progress-logs {
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);
}

.progress-logs h5 {
  margin-top: 0;
  margin-bottom: 10px;
}

.logs-list {
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.85rem;
}

.log-item {
  padding: 5px 0;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--text-tertiary);
  min-width: 70px;
}

.log-message {
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .converter-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-tabs {
    justify-content: center;
  }

  .converter-stats {
    justify-content: center;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .input-format {
    width: 100%;
    justify-content: space-between;
  }

  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-group {
    justify-content: center;
  }

  .output-actions {
    justify-content: center;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }

  .batch-options {
    grid-template-columns: 1fr;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 10px;
  }
}

/* Dark/Light Theme Variables */
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --bg-hover: #4d4d4d;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-tertiary: #707070;
  --border-color: #404040;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --warning-color: #f59e0b;
}

:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;
  --bg-hover: #d5d5d5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #d1d1d1;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --warning-color: #f59e0b;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Loading Animation */
.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Tooltip */
[title] {
  position: relative;
}

[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary);

  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 1000;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles for accessibility */
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Print styles */
@media print {
  .converter-header,
  .input-actions,
  .output-actions,
  .controls-section,
  .notification-area,
  .modal-overlay {
    display: none !important;
  }

  .converter {
    border: none !important;
    box-shadow: none !important;
  }

  .input-textarea,
  .output-preview pre {
    border: 1px solid #000 !important;
    background: white !important;
    color: black !important;
  }
}
</style>
