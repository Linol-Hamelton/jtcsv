// JTCSV Integration Utility
// Provides real JTCSV functionality to the demo

export class JtcsvIntegration {
  constructor() {
    this.jtcsv = null
    this.initialized = false
  }

  /**
   * Initialize JTCSV library
   */
  async init() {
    if (this.initialized) return
    
    try {
      // Try to load from local build
      this.jtcsv = await import('../../../index.js')
      console.log('✅ JTCSV loaded from local build')
    } catch (error) {
      console.warn('⚠️ Could not load local JTCSV, using simulation mode:', error.message)
      this.jtcsv = this.createSimulation()
    }
    
    this.initialized = true
  }

  /**
   * Create simulation functions for demo purposes
   */
  createSimulation() {
    console.log('🔧 Using simulation mode for JTCSV')
    
    return {
      jsonToCsv: (data, options = {}) => {
        const delimiter = options.delimiter || ','
        const includeHeaders = options.includeHeaders !== false
        const preventCsvInjection = options.preventCsvInjection !== false
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Data must be a non-empty array')
        }
        
        const headers = Object.keys(data[0])
        
        // Escape CSV injection if enabled
        const escapeValue = (value) => {
          if (!preventCsvInjection) return String(value)
          
          const str = String(value)
          if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
            return "'" + str
          }
          return str
        }
        
        // Build CSV
        let csv = ''
        
        if (includeHeaders) {
          csv += headers.map(h => this.escapeCsvField(h, delimiter)).join(delimiter) + '\n'
        }
        
        csv += data.map(row => {
          return headers.map(header => {
            const value = row[header]
            return this.escapeCsvField(escapeValue(value), delimiter)
          }).join(delimiter)
        }).join('\n')
        
        return csv
      },
      
      csvToJson: (csv, options = {}) => {
        const delimiter = options.delimiter || ','
        const autoDetect = options.autoDetect !== false
        const parseNumbers = options.parseNumbers !== false
        const hasHeaders = options.hasHeaders !== false
        
        // Simple CSV parser for demo
        const lines = csv.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          return []
        }
        
        let headers = []
        let startIndex = 0
        
        if (hasHeaders) {
          headers = this.parseCsvLine(lines[0], delimiter)
          startIndex = 1
        } else {
          // Generate column names
          const firstRow = this.parseCsvLine(lines[0], delimiter)
          headers = firstRow.map((_, i) => `column_${i + 1}`)
        }
        
        const result = []
        
        for (let i = startIndex; i < lines.length; i++) {
          const values = this.parseCsvLine(lines[i], delimiter)
          const row = {}
          
          headers.forEach((header, index) => {
            let value = values[index] || ''
            
            // Parse numbers if enabled
            if (parseNumbers && !isNaN(value) && value.trim() !== '') {
              value = Number(value)
            }
            
            row[header] = value
          })
          
          result.push(row)
        }
        
        return result
      },
      
      escapeCsvField: (field, delimiter) => {
        if (field === null || field === undefined) {
          return ''
        }
        
        const str = String(field)
        
        // RFC 4180 compliance
        if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter)) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        
        return str
      },
      
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
              i++ // Skip next quote
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
    }
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
   * Convert JSON to CSV using JTCSV
   */
  async jsonToCsv(data, options = {}) {
    await this.init()
    
    try {
      // Parse JSON if it's a string
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data
      
      return this.jtcsv.jsonToCsv(jsonData, options)
    } catch (error) {
      console.error('JSON to CSV conversion error:', error)
      throw error
    }
  }

  /**
   * Convert CSV to JSON using JTCSV
   */
  async csvToJson(csv, options = {}) {
    await this.init()
    
    try {
      return this.jtcsv.csvToJson(csv, options)
    } catch (error) {
      console.error('CSV to JSON conversion error:', error)
      throw error
    }
  }

  /**
   * Get library info
   */
  getInfo() {
    return {
      name: 'JTCSV Converter',
      version: '2.1.0',
      mode: this.jtcsv && this.jtcsv.jsonToCsv ? 'real' : 'simulation',
      features: [
        'JSON ↔ CSV bidirectional conversion',
        'CSV injection protection',
        'RFC 4180 compliant',
        'Auto delimiter detection',
        'Streaming support',
        'Plugin system'
      ]
    }
  }
}

// Export singleton instance
export const jtcsv = new JtcsvIntegration()