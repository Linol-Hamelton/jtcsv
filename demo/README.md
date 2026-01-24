# 🚀 JTCSV Web Demo

Modern, interactive web interface for JTCSV Converter with real-time JSON ↔ CSV conversion.

## 🌐 Live Demo

Access the demo at: [http://localhost:3000](http://localhost:3000)

## ✨ Features

### 🎯 Core Conversion
- **Bidirectional Conversion**: JSON ↔ CSV with full type preservation
- **Real-time Preview**: Instant conversion results with syntax highlighting
- **Multiple Delimiters**: Support for comma, semicolon, pipe, and tab
- **Auto-detection**: Automatic format and delimiter detection

### 🔒 Security Features
- **CSV Injection Protection**: Built-in protection against formula execution attacks
- **Data Validation**: Comprehensive error handling and validation
- **RFC 4180 Compliance**: Proper CSV formatting and escaping

### ⚡ Performance
- **Fast-Path Engine**: Optimized parsing with automatic strategy selection
- **Real-time Statistics**: Conversion time, size, and line count tracking
- **Efficient Processing**: Memory-efficient handling of large datasets

### 🛠️ Advanced Options
- **Parse Numbers**: Automatic numeric type detection
- **Include Headers**: Flexible header management
- **Custom Delimiters**: Support for any delimiter character
- **Error Handling**: Comprehensive error messages and recovery

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
# Navigate to demo directory
cd demo

# Install dependencies
npm install

# Start development server
npm run dev
```

From the repo root you can also run:
```bash
npm run demo:web
```

### Build for Production
```bash
# Build optimized version
npm run build

# Preview production build
npm run preview

# Preview production build on port 3000
npm run serve
```

## 🎮 Usage Guide

### 1. Input Data
- **Paste Directly**: Copy and paste JSON or CSV data into the input area
- **Load Example**: Click "Load Example" for sample data
- **Upload File**: Use the upload button for file processing

### 2. Configure Options
- **Select Format**: Choose input format (JSON or CSV)
- **Choose Delimiter**: Select CSV delimiter character
- **Security Options**: Enable/disable CSV injection protection
- **Parsing Options**: Configure number parsing and header inclusion

### 3. Convert & Export
- **Convert**: Click the convert button for instant transformation
- **Copy Output**: Copy results to clipboard with one click
- **Download**: Save converted data as a file
- **View Stats**: Monitor conversion performance metrics

## 🏗️ Architecture

### Tech Stack
- **Vue 3**: Modern reactive framework
- **Vite**: Fast build tool and dev server
- **JTCSV Core**: Real JTCSV library integration
- **CSS3**: Modern styling with CSS Grid and Flexbox

### Project Structure
```
demo/
├── src/
│   ├── components/     # Vue components
│   │   ├── Header.vue      # Application header
│   │   └── Converter.vue   # Main converter interface
│   ├── utils/         # Utility functions
│   │   └── jtcsv-integration.js  # JTCSV library integration
│   ├── App.vue        # Root component
│   └── main.js        # Application entry point
├── public/            # Static assets
├── index.html         # HTML template
├── vite.config.js     # Build configuration
└── package.json       # Dependencies and scripts
```

## 🔌 Integration with JTCSV

The demo integrates with the real JTCSV library through:

### Direct Import
```javascript
import { jtcsv } from '../utils/jtcsv-integration.js'

// Convert JSON to CSV
const csv = await jtcsv.jsonToCsv(data, options)

// Convert CSV to JSON
const json = await jtcsv.csvToJson(csv, options)
```

### Simulation Mode
If the JTCSV library cannot be loaded, the demo falls back to simulation mode with:
- Basic CSV parsing/generation
- RFC 4180 compliance
- CSV injection protection
- Error handling

## 📊 Performance Metrics

### Conversion Speed
- **Small files (<1MB)**: <100ms
- **Medium files (1-10MB)**: 100-500ms
- **Large files (10-100MB)**: 500-2000ms

### Memory Usage
- **Input processing**: ~2x file size
- **Output generation**: ~1.5x file size
- **Peak memory**: <100MB for typical usage

## 🎨 UI/UX Features

### Responsive Design
- **Desktop**: Full-featured interface with side-by-side panels
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Streamlined interface for small screens

### Visual Feedback
- **Real-time validation**: Immediate format detection
- **Progress indicators**: Visual feedback during conversion
- **Error highlighting**: Clear error messages and suggestions
- **Success states**: Visual confirmation of operations

### Accessibility
- **Keyboard navigation**: Full keyboard support
- **Screen reader friendly**: ARIA labels and semantic HTML
- **High contrast**: Accessible color scheme
- **Focus management**: Logical tab order

## 🔧 Development

### Available Scripts
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Preview production build on port 3000
npm run serve

```

### Adding Features
1. Create new Vue component in `src/components/`
2. Add utility functions in `src/utils/`
3. Update `App.vue` to include new components
4. Test with `npm run dev`

## 📈 Roadmap

### Planned Features
- [ ] **File Upload**: Direct file processing
- [ ] **Batch Processing**: Multiple file conversion
- [ ] **Advanced Options**: More conversion settings
- [ ] **Theme Support**: Light/dark mode toggle
- [ ] **Export Formats**: Additional output formats
- [ ] **API Integration**: REST API backend
- [ ] **Plugin System**: Extensible functionality

### Performance Improvements
- [ ] **Web Workers**: Background processing
- [ ] **Streaming**: Chunked file processing
- [ ] **Caching**: Result caching for repeated operations
- [ ] **Optimized Parsing**: Improved algorithm performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see the main project LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Vue 3](https://vuejs.org/)
- Powered by [Vite](https://vitejs.dev/)
- Integrated with [JTCSV](https://github.com/Linol-Hamelton/jtcsv)
- Icons by [Font Awesome](https://fontawesome.com/)

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Linol-Hamelton/jtcsv/issues)
- **Documentation**: [Full JTCSV documentation](https://github.com/Linol-Hamelton/jtcsv#readme)
- **Examples**: [Example code and demos](https://github.com/Linol-Hamelton/jtcsv/tree/main/demo)

---

**Happy converting!** If you find this demo useful, please consider giving the JTCSV project a star on GitHub ⭐



