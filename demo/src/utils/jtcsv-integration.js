// JTCSV Integration Utility - Complete Edition
// Provides full JTCSV functionality to the demo with streaming, preprocessing, and all options

export class JtcsvIntegration {
  constructor() {
    this.jtcsv = null
    this.initialized = false
    this.mode = 'simulation' // 'real' or 'simulation'
  }

  /**
   * Initialize JTCSV library
   */
  async init() {
    if (this.initialized) return
    
    try {
      // Prefer browser entry for demo
      this.jtcsv = await import('../../../src/browser/index.js')
      this.mode = 'real'
      console.log('[OK] JTCSV loaded from browser entry')
    } catch (error) {
      try {
        this.jtcsv = await import('../../../index.js')
        this.mode = 'real'
        console.log('[OK] JTCSV loaded from local build')
      } catch (error2) {
        console.warn('[WARN] Could not load JTCSV, using enhanced simulation mode:', error2.message)
        this.jtcsv = this.createEnhancedSimulation()
        this.mode = 'simulation'
      }
    }

    this.initialized = true
  }

  /**
   * Create enhanced simulation with all JTCSV features
   */
  createEnhancedSimulation() {
    console.log('🔧 Using enhanced simulation mode for JTCSV')

    const escapeCsvField = (value, delimiter, preventCsvInjection, rfc4180Compliant) => {
      if (value === null || value === undefined || value === '') {
        return ''
      }

      let strValue = String(value)

      if (preventCsvInjection && /^[=+@-]/.test(strValue)) {
        strValue = "'" + strValue
      }

      const needsQuoting = rfc4180Compliant
        ? (strValue.includes(delimiter) ||
           strValue.includes('"') ||
           strValue.includes('\\n') ||
           strValue.includes('\\r'))
        : false

      if (needsQuoting) {
        return `"${strValue.replace(/"/g, '""')}"`
      }

      return strValue
    }

    const parseCsvLine = (line, delimiter) => {
      const result = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result
    }

    const autoDetectDelimiter = (csv, candidates = [';', ',', '\\t', '|']) => {
      if (!csv || typeof csv !== 'string') {
        return ';'
      }

      const lines = csv.split('\\n').filter(line => line.trim().length > 0)
      if (lines.length === 0) {
        return ';'
      }

      const firstLine = lines[0]
      const counts = {}

      candidates.forEach(delim => {
        const escapedDelim = delim.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')
        const regex = new RegExp(escapedDelim, 'g')
        const matches = firstLine.match(regex)
        counts[delim] = matches ? matches.length : 0
      })

      let maxCount = -1
      let detectedDelimiter = ';'

      for (const [delim, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          detectedDelimiter = delim
        }
      }

      return maxCount === 0 ? ';' : detectedDelimiter
    }

    const deepUnwrap = (value, depth = 0, maxDepth = 5, visited = new Set()) => {
      if (depth >= maxDepth) {
        return '[Too Deep]'
      }

      if (value === null || value === undefined) {
        return ''
      }

      if (typeof value === 'object') {
        if (visited.has(value)) {
          return '[Circular Reference]'
        }
        visited.add(value)
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return ''
        }
        const unwrappedItems = value.map(item =>
          deepUnwrap(item, depth + 1, maxDepth, visited)
        ).filter(item => item !== '')
        return unwrappedItems.join(', ')
      }

      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch (error) {
          return '[Unstringifiable Object]'
        }
      }

      return String(value)
    }
    
    const createStreamFromIterator = (iterator) => {
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
        }
      })
    }

    const simulation = {
      // JSON → CSV functions
      jsonToCsv: (data, options = {}) => {
        const delimiter = options.delimiter || ','
        const includeHeaders = options.includeHeaders !== false
        const preventCsvInjection = options.preventCsvInjection !== false
        const renameMap = options.renameMap || {}
        const template = options.template || {}
        const maxRecords = options.maxRecords
        const rfc4180Compliant = options.rfc4180Compliant !== false
        
        if (!Array.isArray(data)) {
          throw new Error('Data must be an array')
        }

        if (data.length === 0) {
          return ''
        }
        
        // Apply record limit
        let processedData = data
        if (maxRecords && data.length > maxRecords) {
          processedData = data.slice(0, maxRecords)
        }
        
        // Get all unique keys
        const allKeys = new Set()
        processedData.forEach(item => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach(key => allKeys.add(key))
          }
        })
        
        const originalKeys = Array.from(allKeys)
        
        // Apply rename map
        const headers = originalKeys.map(key => renameMap[key] || key)
        
        // Create reverse mapping
        const reverseRenameMap = {}
        originalKeys.forEach((key, index) => {
          reverseRenameMap[headers[index]] = key
        })
        
        // Apply template ordering
        let finalHeaders = headers
        if (Object.keys(template).length > 0) {
          const templateHeaders = Object.keys(template).map(key => renameMap[key] || key)
          const extraHeaders = headers.filter(h => !templateHeaders.includes(h))
          finalHeaders = [...templateHeaders, ...extraHeaders]
        }
        
        // Escape value function
        const escapeValue = (value) => {
          if (value === null || value === undefined || value === '') {
            return ''
          }
          
          let strValue = String(value)
          
          // CSV injection protection
          if (preventCsvInjection && /^[=+\-@]/.test(strValue)) {
            strValue = "'" + strValue
          }
          
          // RFC 4180 compliance
          const needsQuoting = rfc4180Compliant 
            ? (strValue.includes(delimiter) ||
               strValue.includes('"') ||
               strValue.includes('\n') ||
               strValue.includes('\r'))
            : false
            
          if (needsQuoting) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          
          return strValue
        }
        
        // Build CSV
        let csv = ''
        
        if (includeHeaders && finalHeaders.length > 0) {
          csv += finalHeaders.join(delimiter) + (rfc4180Compliant ? '\r\n' : '\n')
        }
        
        csv += processedData.map(row => {
          return finalHeaders.map(header => {
            const originalKey = reverseRenameMap[header] || header
            const value = row[originalKey]
            return escapeValue(value)
          }).join(delimiter)
        }).join(rfc4180Compliant ? '\r\n' : '\n')
        
        return csv
      },
      
      // CSV → JSON functions
      csvToJson: (csv, options = {}) => {
        const delimiter = options.delimiter || ','
        const autoDetect = options.autoDetect !== false
        const candidates = options.candidates || [';', ',', '\t', '|']
        const hasHeaders = options.hasHeaders !== false
        const renameMap = options.renameMap || {}
        const trim = options.trim !== false
        const parseNumbers = options.parseNumbers || false
        const parseBooleans = options.parseBooleans || false
        const maxRows = options.maxRows
        
        // Auto-detect delimiter
        let finalDelimiter = delimiter
        if (autoDetect && !delimiter) {
          finalDelimiter = autoDetectDelimiter(csv, candidates)
        }
        
        // Parse CSV
        const lines = csv.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          return []
        }
        
        // Apply row limit
        let processedLines = lines
        if (maxRows && lines.length > maxRows) {
          processedLines = lines.slice(0, maxRows)
        }
        
        let headers = []
        let startIndex = 0
        
        if (hasHeaders && processedLines.length > 0) {
          headers = parseCsvLine(processedLines[0], finalDelimiter)
            .map(header => {
              const trimmed = trim ? header.trim() : header
              return renameMap[trimmed] || trimmed
            })
          startIndex = 1
        } else {
          const firstRow = parseCsvLine(processedLines[0], finalDelimiter)
          headers = firstRow.map((_, i) => `column_${i + 1}`)
        }
        
        const result = []
        
        for (let i = startIndex; i < processedLines.length; i++) {
          const values = parseCsvLine(processedLines[i], finalDelimiter)
          const row = {}
          
          headers.forEach((header, index) => {
            let value = values[index] || ''
            
            if (trim) {
              value = value.trim()
            }
            
            // Parse numbers
            if (parseNumbers && !isNaN(value) && value.trim() !== '') {
              value = Number(value)
            }
            
            // Parse booleans
            if (parseBooleans) {
              const lowerValue = value.toLowerCase()
              if (lowerValue === 'true') value = true
              if (lowerValue === 'false') value = false
            }
            
            row[header] = value
          })
          
          result.push(row)
        }
        
        return result
      },

      csvToJsonIterator: async function* (input, options = {}) {
        let csvText = input

        if (typeof input !== 'string') {
          if (input && typeof input.text === 'function') {
            csvText = await input.text()
          } else {
            throw new Error('Input must be a CSV string or File/Blob')
          }
        }

        const rows = this.csvToJson(csvText, options)
        for (const row of rows) {
          yield row
        }
      },

      parseCsvFileStream: function (file, options = {}) {
        return this.csvToJsonIterator(file, options)
      },

      parseCSVWithWorker: async function (input, options = {}, onProgress = null) {
        let csvText = input

        if (typeof input !== 'string') {
          if (input && typeof input.text === 'function') {
            csvText = await input.text()
          } else {
            throw new Error('Input must be a CSV string or File/Blob')
          }
        }

        const result = this.csvToJson(csvText, options)
        if (onProgress) {
          onProgress({ processed: result.length, total: result.length, percentage: 100 })
        }
        return result
      },

      createWorkerPool: function () {
        return {
          exec: async () => {
            throw new Error('Worker pool is not available in simulation mode')
          }
        }
      },

      createWorkerPoolLazy: async function (options = {}) {
        return this.createWorkerPool(options)
      },

      parseCSVWithWorkerLazy: async function (input, options = {}, onProgress = null) {
        return this.parseCSVWithWorker(input, options, onProgress)
      },
      
      // JSON save functions
      saveAsJson: async (data, filePath, options = {}) => {
        const prettyPrint = options.prettyPrint || false
        const jsonStr = prettyPrint 
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data)
        
        // In browser simulation, return data URL
        const blob = new Blob([jsonStr], { type: 'application/json' })
        return URL.createObjectURL(blob)
      },
      
      // Preprocessing functions
      preprocessData: (data) => {
        if (!Array.isArray(data)) {
          return []
        }
        
        return data.map(item => {
          if (!item || typeof item !== 'object') {
            return {}
          }
          
          const processed = {}
          
          for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
              const value = item[key]
              if (value && typeof value === 'object') {
                processed[key] = deepUnwrap(value)
              } else {
                processed[key] = value
              }
            }
          }
          
          return processed
        })
      },
      
      deepUnwrap: (value, depth = 0, maxDepth = 5, visited = new Set()) => {
        if (depth >= maxDepth) {
          return '[Too Deep]'
        }
        
        if (value === null || value === undefined) {
          return ''
        }
        
        // Handle circular references
        if (typeof value === 'object') {
          if (visited.has(value)) {
            return '[Circular Reference]'
          }
          visited.add(value)
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return ''
          }
          const unwrappedItems = value.map(item => 
            deepUnwrap(item, depth + 1, maxDepth, visited)
          ).filter(item => item !== '')
          return unwrappedItems.join(', ')
        }
        
        // Handle objects
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value)
          } catch (error) {
            return '[Unstringifiable Object]'
          }
        }
        
        // Primitive values
        return String(value)
      },
      
      // Auto-detect delimiter
      autoDetectDelimiter: (csv, candidates = [';', ',', '\t', '|']) => {
        if (!csv || typeof csv !== 'string') {
          return ';'
        }
        
        const lines = csv.split('\n').filter(line => line.trim().length > 0)
        
        if (lines.length === 0) {
          return ';'
        }
        
        const firstLine = lines[0]
        const counts = {}
        
        candidates.forEach(delim => {
          const escapedDelim = delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escapedDelim, 'g')
          const matches = firstLine.match(regex)
          counts[delim] = matches ? matches.length : 0
        })
        
        let maxCount = -1
        let detectedDelimiter = ';'
        
        for (const [delim, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count
            detectedDelimiter = delim
          }
        }
        
        return maxCount === 0 ? ';' : detectedDelimiter
      },
      
      // Parse CSV line helper
      parseCsvLine: (line, delimiter) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          const nextChar = line[i + 1]
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim())
        return result
      },
      
      // Streaming simulation (for large files)
      createJsonToCsvStream: (options = {}) => {
        return {
          transform: async function* (dataStream) {
            const delimiter = options.delimiter || ','
            const includeHeaders = options.includeHeaders !== false
            
            let headers = null
            let headersWritten = false
            
            for await (const chunk of dataStream) {
              if (!headers) {
                const firstItem = Array.isArray(chunk) ? chunk[0] : chunk
                if (firstItem && typeof firstItem === 'object') {
                  headers = Object.keys(firstItem)
                }
              }
              
              const items = Array.isArray(chunk) ? chunk : [chunk]
              
              for (const item of items) {
                if (!headersWritten && includeHeaders && headers) {
                  yield headers.join(delimiter) + '\n'
                  headersWritten = true
                }
                
                const row = headers 
                  ? headers.map(header => escapeCsvField(item[header], delimiter)).join(delimiter)
                  : Object.values(item).map(val => escapeCsvField(val, delimiter)).join(delimiter)
                
                yield row + '\n'
              }
            }
          },
          
          escapeCsvField: (field, delimiter) => {
            if (field === null || field === undefined) {
              return ''
            }
            
            const str = String(field)
            
            if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter)) {
              return `"${str.replace(/"/g, '""')}"`
            }
            
            return str
          }
        }
      },
      
      createCsvToJsonStream: (options = {}) => {
        return {
          transform: async function* (csvStream) {
            const delimiter = options.delimiter || ','
            const hasHeaders = options.hasHeaders !== false
            
            let headers = null
            let isFirstChunk = true
            
            let buffer = ''
            
            for await (const chunk of csvStream) {
              buffer += chunk
              
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              
              for (const line of lines) {
                if (line.trim() === '') continue
                
                const values = parseCsvLine(line, delimiter)
                
                if (isFirstChunk && hasHeaders) {
                  headers = values
                  isFirstChunk = false
                  continue
                }
                
                if (!headers) {
                  headers = values.map((_, i) => `column_${i + 1}`)
                }
                
                const obj = {}
                const fieldCount = Math.min(values.length, headers.length)
                
                for (let i = 0; i < fieldCount; i++) {
                  obj[headers[i]] = values[i]
                }
                
                yield obj
              }
            }
          }
        }
      },
      jsonToCsvStream: (input, options = {}) => {
        const data = Array.isArray(input) ? input : []
        const csv = simulation.jsonToCsv(data, options)
        return createStreamFromIterator((async function* () {
          yield csv
        })())
      },

      jsonToNdjsonStream: (input, options = {}) => {
        const data = Array.isArray(input) ? input : []
        return createStreamFromIterator((async function* () {
          for (const item of data) {
            yield JSON.stringify(item) + '\n'
          }
        })())
      },

      csvToJsonStream: (input, options = {}) => {
        const outputFormat = options.outputFormat || 'ndjson'
        const jsonData = simulation.csvToJson(input, options)
        return createStreamFromIterator((async function* () {
          if (outputFormat === 'json' || outputFormat === 'json-array' || outputFormat === 'array') {
            yield JSON.stringify(jsonData)
            return
          }
          for (const row of jsonData) {
            yield JSON.stringify(row) + '\n'
          }
        })())
      }
    }
    
    return simulation
  }

  /**
   * Get JTCSV instance
   */
  getInstance() {
    if (!this.initialized) {
      throw new Error('JTCSV not initialized. Call init() first.')
    }
    return this.jtcsv
  }

  /**
   * Convert JSON to CSV
   */
  async jsonToCsv(data, options = {}) {
    await this.init()
    
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data
      const normalizedOptions = { ...options }
      if (typeof normalizedOptions.maxRecords === 'string') {
        const parsed = Number(normalizedOptions.maxRecords)
        normalizedOptions.maxRecords = Number.isFinite(parsed) ? parsed : undefined
      }
      if (normalizedOptions.maxRecords === '' || normalizedOptions.maxRecords === null) {
        delete normalizedOptions.maxRecords
      }
      return this.jtcsv.jsonToCsv(jsonData, normalizedOptions)
    } catch (error) {
      console.error('JSON to CSV conversion error:', error)
      throw error
    }
  }

  /**
   * Convert CSV to JSON
   */
  async csvToJson(csv, options = {}) {
    await this.init()
    
    try {
      const normalizedOptions = { ...options }
      if (typeof normalizedOptions.maxRows === 'string') {
        const parsed = Number(normalizedOptions.maxRows)
        normalizedOptions.maxRows = Number.isFinite(parsed) ? parsed : undefined
      }
      if (normalizedOptions.maxRows === '' || normalizedOptions.maxRows === null) {
        delete normalizedOptions.maxRows
      }

      return this.jtcsv.csvToJson(csv, normalizedOptions)
    } catch (error) {
      console.error('CSV to JSON conversion error:', error)
      throw error
    }
  }

  /**
   * Convert CSV to JSON as async iterator
   */
  async csvToJsonIterator(input, options = {}) {
    await this.init()

    if (this.jtcsv.csvToJsonIterator) {
      return this.jtcsv.csvToJsonIterator(input, options)
    }

    let csvText = input
    if (typeof input !== 'string') {
      if (input && typeof input.text === 'function') {
        csvText = await input.text()
      } else {
        throw new Error('Input must be a CSV string or File/Blob')
      }
    }

    const rows = await this.csvToJson(csvText, options)
    return (async function* () {
      for (const row of rows) {
        yield row
      }
    })()
  }

  /**
   * Stream JSON to CSV as a ReadableStream
   */
  async jsonToCsvStream(input, options = {}) {
    await this.init()

    if (this.jtcsv.jsonToCsvStream) {
      return this.jtcsv.jsonToCsvStream(input, options)
    }

    const csv = await this.jsonToCsv(input, options)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(csv)
        controller.close()
      }
    })
  }

  /**
   * Stream JSON to NDJSON as a ReadableStream
   */
  async jsonToNdjsonStream(input, options = {}) {
    await this.init()

    if (this.jtcsv.jsonToNdjsonStream) {
      return this.jtcsv.jsonToNdjsonStream(input, options)
    }

    const jsonData = typeof input === 'string' ? JSON.parse(input) : input
    const items = Array.isArray(jsonData) ? jsonData : [jsonData]
    return new ReadableStream({
      start(controller) {
        for (const item of items) {
          controller.enqueue(JSON.stringify(item) + '\n')
        }
        controller.close()
      }
    })
  }

  /**
   * Stream CSV to JSON as a ReadableStream
   */
  async csvToJsonStream(input, options = {}) {
    await this.init()

    if (this.jtcsv.csvToJsonStream) {
      return this.jtcsv.csvToJsonStream(input, options)
    }

    const jsonData = await this.csvToJson(input, options)
    const output = JSON.stringify(jsonData)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(output)
        controller.close()
      }
    })
  }

  /**
   * Stream CSV File without full buffering
   */
  async parseCsvFileStream(file, options = {}) {
    await this.init()

    if (this.jtcsv.parseCsvFileStream) {
      return this.jtcsv.parseCsvFileStream(file, options)
    }

    if (this.jtcsv.csvToJsonIterator) {
      return this.jtcsv.csvToJsonIterator(file, options)
    }

    throw new Error('Streaming CSV API not available')
  }

  /**
   * Lazy worker pool creation
   */
  async createWorkerPoolLazy(options = {}) {
    await this.init()

    if (this.jtcsv.createWorkerPoolLazy) {
      return this.jtcsv.createWorkerPoolLazy(options)
    }

    if (this.jtcsv.createWorkerPool) {
      return this.jtcsv.createWorkerPool(options)
    }

    throw new Error('Worker pool API not available')
  }

  /**
   * Parse CSV with lazy worker helper
   */
  async parseCSVWithWorkerLazy(input, options = {}, onProgress = null) {
    await this.init()

    if (this.jtcsv.parseCSVWithWorkerLazy) {
      return this.jtcsv.parseCSVWithWorkerLazy(input, options, onProgress)
    }

    if (this.jtcsv.parseCSVWithWorker) {
      return this.jtcsv.parseCSVWithWorker(input, options, onProgress)
    }

    throw new Error('Worker parsing API not available')
  }

  /**
   * Save data as JSON
   */
  async saveAsJson(data, fileName = 'data.json', options = {}) {
    await this.init()
    
    try {
      const dataUrl = await this.jtcsv.saveAsJson(data, fileName, options)
      
      // Create download link
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Revoke object URL after download
      setTimeout(() => URL.revokeObjectURL(dataUrl), 100)
      
      return dataUrl
    } catch (error) {
      console.error('Save JSON error:', error)
      throw error
    }
  }

  /**
   * Preprocess JSON data
   */
  async preprocessData(data, options = {}) {
    await this.init()
    
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data
      return this.jtcsv.preprocessData(jsonData, options)
    } catch (error) {
      console.error('Preprocessing error:', error)
      throw error
    }
  }

  /**
   * Deep unwrap nested structures
   */
  async deepUnwrap(value, options = {}) {
    await this.init()
    
    try {
      const maxDepth = options.maxDepth || 5
      return this.jtcsv.deepUnwrap(value, 0, maxDepth)
    } catch (error) {
      console.error('Deep unwrap error:', error)
      throw error
    }
  }

  /**
   * Stream JSON to CSV
   */
  async streamJsonToCsv(dataStream, options = {}) {
    await this.init()
    
    try {
      const outputStream = this.jtcsv.jsonToCsvStream
        ? this.jtcsv.jsonToCsvStream(dataStream, options)
        : this.jtcsv.createJsonToCsvStream(options).transform(dataStream)
      
      let result = ''
      for await (const chunk of outputStream) {
        result += chunk
      }
      
      return result
    } catch (error) {
      console.error('Streaming JSON to CSV error:', error)
      throw error
    }
  }

  /**
   * Stream CSV to JSON
   */
  async streamCsvToJson(csvStream, options = {}) {
    await this.init()
    
    try {
      const outputStream = this.jtcsv.csvToJsonStream
        ? this.jtcsv.csvToJsonStream(csvStream, { ...options, outputFormat: 'json' })
        : this.jtcsv.createCsvToJsonStream(options).transform(csvStream)
      
      let resultText = ''
      const resultObjects = []
      for await (const chunk of outputStream) {
        if (typeof chunk === 'string') {
          resultText += chunk
        } else {
          resultObjects.push(chunk)
        }
      }

      if (resultText) {
        return JSON.parse(resultText)
      }

      return resultObjects
    } catch (error) {
      console.error('Streaming CSV to JSON error:', error)
      throw error
    }
  }

  /**
   * Process large file in chunks
   */
  async processLargeFile(file, options = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const chunkSize = options.chunkSize || 1024 * 1024 // 1MB chunks
      let offset = 0
      const results = []
      
      reader.onload = async (e) => {
        const chunk = e.target.result
        
        try {
          let processedChunk
          if (options.mode === 'json2csv') {
            const jsonData = JSON.parse(chunk)
            processedChunk = await this.jsonToCsv(jsonData, options)
          } else if (options.mode === 'csv2json') {
            processedChunk = await this.csvToJson(chunk, options)
          }
          
          results.push(processedChunk)
          
          offset += chunkSize
          if (offset < file.size) {
            readNextChunk()
          } else {
            // All chunks processed
            const finalResult = options.mode === 'json2csv' 
              ? results.join('\n')
              : results.flat()
            resolve(finalResult)
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = (error) => {
        reject(error)
      }
      
      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize)
        reader.readAsText(slice)
      }
      
      // Start reading
      readNextChunk()
    })
  }

  /**
   * Batch process multiple files
   */
  async batchProcess(files, options = {}) {
    const results = []
    const parallelLimit = options.parallel || 4
    const outputFormat = options.outputFormat || 'same'
    
    for (let i = 0; i < files.length; i += parallelLimit) {
      const batch = files.slice(i, i + parallelLimit)
      const promises = batch.map(async (file) => {
        try {
          const content = await this.readFile(file)
          let output = ''
          let outputExt = 'txt'
          let outputMime = 'text/plain'
          let parsedJson = null

          const lowerName = file.name.toLowerCase()
          const isJson = lowerName.endsWith('.json')
          const isNdjson = lowerName.endsWith('.ndjson') || lowerName.endsWith('.jsonl')
          const isCsv = lowerName.endsWith('.csv')
          const inputType = isNdjson ? 'ndjson' : (isJson ? 'json' : (isCsv ? 'csv' : 'unknown'))

          const targetFormat = outputFormat === 'same'
            ? (inputType === 'csv' ? 'json' : 'csv')
            : outputFormat

          if (targetFormat === 'csv') {
            if (inputType === 'csv') {
              output = content
            } else {
              if (inputType === 'ndjson') {
                const lines = content.split('\n').filter((line) => line.trim())
                parsedJson = lines.map((line) => JSON.parse(line))
              } else {
                parsedJson = JSON.parse(content)
              }
              output = await this.jsonToCsv(parsedJson, options)
            }
            outputExt = 'csv'
            outputMime = 'text/csv'
          } else if (targetFormat === 'json') {
            if (inputType === 'json') {
              parsedJson = JSON.parse(content)
              output = JSON.stringify(parsedJson, null, 2)
            } else if (inputType === 'ndjson') {
              const lines = content.split('\n').filter((line) => line.trim())
              parsedJson = lines.map((line) => JSON.parse(line))
              output = JSON.stringify(parsedJson, null, 2)
            } else if (inputType === 'csv') {
              const jsonData = await this.csvToJson(content, options)
              output = JSON.stringify(jsonData, null, 2)
            }
            outputExt = 'json'
            outputMime = 'application/json'
          }

          return {
            file: file.name,
            success: true,
            result: output,
            output,
            outputFormat: targetFormat,
            outputExt,
            outputMime,
            size: file.size
          }
        } catch (error) {
          return {
            file: file.name,
            success: false,
            error: error.message,
            size: file.size
          }
        }
      })
      
      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
      
      // Progress callback
      if (options.onProgress) {
        options.onProgress(i + batch.length, files.length)
      }
    }
    
    return results
  }

  /**
   * Read file as text
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  /**
   * Get library info
   */
  getInfo() {
    return {
      name: 'JTCSV Converter',
      version: '2.1.4',
      mode: this.mode,
      features: [
        'JSON ↔ CSV bidirectional conversion',
        'CSV injection protection',
        'RFC 4180 compliant',
        'Auto delimiter detection',
        'Streaming support for large files',
        'Browser streaming iterator',
        'Lazy worker helpers',
        'Batch processing',
        'Deep unwrapping of nested structures',
        'Preprocessing utilities',
        'File upload/download',
        'Real-time preview'
      ],
      supportedOptions: {
        jsonToCsv: ['delimiter', 'includeHeaders', 'renameMap', 'template', 'maxRecords', 'preventCsvInjection', 'rfc4180Compliant'],
        csvToJson: ['delimiter', 'autoDetect', 'candidates', 'hasHeaders', 'renameMap', 'trim', 'parseNumbers', 'parseBooleans', 'maxRows', 'useFastPath', 'fastPathMode'],
        preprocessing: ['maxDepth', 'unwrapArrays', 'stringifyObjects'],
        streaming: ['chunkSize', 'bufferSize', 'addBOM'],
        batch: ['parallel', 'outputDir', 'overwrite']
      }
    }
  }
}

// Export singleton instance
export const jtcsv = new JtcsvIntegration()
