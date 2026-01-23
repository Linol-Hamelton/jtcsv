# 🖥️ jtcsv TUI - Terminal User Interface

## ✨ Features

### 🎯 **Interactive Terminal Interface**
- **Real-time preview** of conversions
- **Multiple modes**: JSON→CSV, CSV→JSON, Batch processing, Settings
- **Visual feedback** with progress bars and status updates
- **Keyboard shortcuts** for efficient navigation

### 🎨 **Beautiful UI Components**
- **Header bar** with application title and shortcuts
- **Mode selector** with intuitive navigation
- **Input/Output areas** with syntax highlighting
- **Options panel** for configuration
- **Status bar** with real-time feedback
- **Progress indicators** for long operations

### 🚀 **Quick Start**

```bash
# Install jtcsv globally
npm install -g jtcsv

# Launch TUI interface
jtcsv tui

# Or using npx
npx jtcsv tui
```

### 🎮 **Navigation Guide**

#### **Keyboard Shortcuts**
| Shortcut | Action |
|----------|--------|
| `Tab` | Switch between UI elements |
| `Arrow Keys` | Navigate lists and menus |
| `Enter` | Select/Activate |
| `Ctrl+S` | Save output to file |
| `Ctrl+P` | Preview conversion |
| `Ctrl+Q` | Quit application |
| `Esc` | Return to main mode |
| `F1` | Show help |

#### **Modes**
1. **JSON → CSV** - Convert JSON data to CSV format
2. **CSV → JSON** - Convert CSV data to JSON format
3. **Batch Process** - Process multiple files at once
4. **Settings** - Configure conversion options

### ⚙️ **Configuration Options**

#### **Delimiter Selection**
- Comma (,) - Standard CSV format
- Semicolon (;) - European CSV format
- Tab (\t) - TSV format
- Pipe (|) - PSV format
- Custom delimiter

#### **Conversion Options**
- Include/exclude headers
- Parse numeric values
- Parse boolean values
- CSV injection protection
- RFC 4180 compliance

### 📊 **Batch Processing**

#### **Features**
- **Multi-file selection** with visual browser
- **Progress tracking** for each file
- **Error handling** with detailed reports
- **Summary statistics** after processing

#### **Supported Operations**
- Convert multiple JSON files to CSV
- Convert multiple CSV files to JSON
- Mixed batch operations
- Directory recursion

### 🛡️ **Security Features**

#### **Built-in Protection**
- **CSV Injection Prevention** - Automatic escaping of Excel formulas
- **Path Traversal Protection** - Safe file path validation
- **Input Validation** - Type checking and sanitization
- **Size Limits** - Prevent DoS attacks

#### **Real-time Validation**
- JSON syntax validation
- CSV format validation
- Schema validation (if provided)
- Size limit warnings

### 🎯 **Use Cases**

#### **For Developers**
- Quick data format conversion
- Testing conversion options
- Previewing large datasets
- Batch processing automation

#### **For Data Analysts**
- Interactive data transformation
- Real-time format validation
- Visual feedback on conversions
- Easy configuration

#### **For System Administrators**
- Batch file processing
- Security-conscious conversions
- Progress monitoring
- Error reporting

### 🚀 **Performance**

#### **Memory Efficiency**
- **Streaming support** for large files
- **Incremental processing** to avoid memory overload
- **Real-time preview** without full conversion

#### **Speed Optimization**
- **Async operations** for responsive UI
- **Background processing** for large files
- **Cached results** for repeated operations

### 📱 **Platform Support**

#### **Terminal Requirements**
- **Minimum**: 80x24 characters
- **Recommended**: 100x40 characters
- **Colors**: 256-color support recommended

#### **Operating Systems**
- ✅ Linux
- ✅ macOS
- ✅ Windows (with proper terminal)
- ✅ WSL (Windows Subsystem for Linux)

### 🔧 **Installation Options**

#### **Global Installation**
```bash
npm install -g jtcsv
jtcsv tui
```

#### **Local Project**
```bash
npm install jtcsv
npx jtcsv tui
```

#### **Docker**
```bash
docker run -it --rm node:alpine sh -c \
  "npm install -g jtcsv && jtcsv tui"
```

### 🎨 **UI Screenshots**

*(Screenshots would be added here in actual documentation)*

### 📚 **Advanced Usage**

#### **Custom Themes**
```javascript
// Custom theme configuration
const customTheme = {
  header: { bg: 'magenta', fg: 'white' },
  input: { bg: 'black', fg: 'green' },
  output: { bg: 'black', fg: 'cyan' }
};
```

#### **Keyboard Customization**
```javascript
// Custom key bindings
const customKeys = {
  'C-s': 'save',
  'C-p': 'preview',
  'C-e': 'export',
  'C-i': 'import'
};
```

#### **Plugin System**
```javascript
// Custom plugins (future feature)
const plugins = [
  'csv-validator',
  'json-schema',
  'data-transformer'
];
```

### 🐛 **Troubleshooting**

#### **Common Issues**
1. **Terminal doesn't support colors**
   - Set `TERM=xterm-256color`
   - Use `--no-color` flag

2. **Input lag on large files**
   - Enable streaming mode
   - Increase buffer size
   - Use batch processing

3. **Missing dependencies**
   ```bash
   npm install blessed blessed-contrib
   ```

#### **Debug Mode**
```bash
DEBUG=jtcsv* jtcsv tui
```

### 🤝 **Contributing**

#### **UI Development**
1. Fork the repository
2. Install dependencies: `npm install`
3. Run TUI: `npm run tui`
4. Make changes to `cli-tui.js`
5. Submit Pull Request

#### **Testing**
```bash
# Run UI tests
npm test -- --testPathPattern=tui

# Test with coverage
npm run test:coverage
```

### 📄 **License**

MIT © Ruslan Fomenko

### 🔗 **Links**

- **GitHub**: https://github.com/Linol-Hamelton/jtcsv
- **npm**: https://www.npmjs.com/package/jtcsv
- **Issues**: https://github.com/Linol-Hamelton/jtcsv/issues
- **Documentation**: https://github.com/Linol-Hamelton/jtcsv#readme

---

## 🎯 **Why TUI Instead of GUI?**

### **Advantages of TUI**
1. **Lightweight** - No browser or heavy GUI framework required
2. **Fast** - Instant startup, minimal resource usage
3. **Remote-friendly** - Works over SSH and in containers
4. **Keyboard-centric** - Efficient for power users
5. **Scriptable** - Can be integrated into automation pipelines

### **Perfect For**
- **Server environments** where GUI is not available
- **Development workflows** in terminal
- **CI/CD pipelines** for automated conversions
- **Remote administration** over SSH
- **Resource-constrained environments**

### **Future Enhancements**
- **Plugin system** for extended functionality
- **Theme engine** for custom styling
- **Macro recording** for repetitive tasks
- **Integration with editors** (VSCode, Vim, Emacs)
- **API server mode** for remote access




