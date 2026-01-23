/**
 * JTCSV Terminal User Interface (TUI)
 * 
 * Interactive terminal interface for JSON↔CSV conversion
 * with real-time preview, batch processing, and visual feedback.
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
let jtcsv;
try {
  jtcsv = require('jtcsv');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    jtcsv = require('../../../index.js');
  } else {
    throw error;
  }
}

class JtcsvTUI {
  constructor() {
    this.screen = null;
    this.grid = null;
    this.currentMode = 'main';
    this.conversionOptions = {
      delimiter: ';',
      includeHeaders: true,
      parseNumbers: false,
      parseBooleans: false,
      preventCsvInjection: true,
      prettyPrint: false,
      autoDetect: true,
      useFastPath: true,
      fastPathMode: 'objects'
    };
    this.inputFile = '';
    this.outputFile = '';
    this.inputText = '';
    this.outputText = '';
    this.isConverting = false;
  }

  /**
   * Initialize and start the TUI
   */
  start() {
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'JTCSV Terminal Interface',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true
      }
    });

    // Create grid layout
    this.grid = new contrib.grid({ 
      rows: 12, 
      cols: 12, 
      screen: this.screen 
    });

    // Quit on Escape, q, or Ctrl+C
    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

    // Show main menu
    this.showMainMenu();

    // Render screen
    this.screen.render();
  }

  /**
   * Show main menu
   */
  showMainMenu() {
    this.currentMode = 'main';
    this.screen.title = 'JTCSV - Main Menu';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    // Create title box
    const titleBox = blessed.box({
      top: 0,
      left: 'center',
      width: '50%',
      height: 3,
      content: '{center}{bold}JTCSV Terminal Interface{/bold}{/center}',
      tags: true,
      style: {
        fg: 'cyan',
        bg: 'black',
        bold: true
      },
      border: {
        type: 'line'
      }
    });
    this.screen.append(titleBox);

    // Create menu box
    const menuBox = blessed.list({
      top: 4,
      left: 'center',
      width: '50%',
      height: 10,
      items: [
        '1. JSON → CSV Conversion',
        '2. CSV → JSON Conversion',
        '3. Preprocess JSON',
        '4. Batch Processing',
        '5. Settings',
        '6. File Browser',
        '7. Help',
        '8. Exit'
      ],
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'white'
        }
      },
      border: {
        type: 'line'
      }
    });

    // Handle menu selection
    menuBox.on('select', (item, index) => {
      switch (index) {
        case 0:
          this.showJsonToCsv();
          break;
        case 1:
          this.showCsvToJson();
          break;
        case 2:
          this.showPreprocess();
          break;
        case 3:
          this.showBatchProcessing();
          break;
        case 4:
          this.showSettings();
          break;
        case 5:
          this.showFileBrowser();
          break;
        case 6:
          this.showHelp();
          break;
        case 7:
          process.exit(0);
          break;
      }
    });

    this.screen.append(menuBox);

    // Add status bar
    const statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '←→ Navigate | ↑↓ Select | Enter Confirm | q Quit',
      style: {
        fg: 'yellow',
        bg: 'black'
      }
    });
    this.screen.append(statusBar);

    // Focus menu
    menuBox.focus();
    this.screen.render();
  }

  /**
   * Show JSON to CSV conversion screen
   */
  showJsonToCsv() {
    this.currentMode = 'json2csv';
    this.screen.title = 'JTCSV - JSON → CSV';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    // Create layout
    const inputBox = blessed.box({
      top: 0,
      left: 0,
      width: '50%',
      height: '80%',
      label: ' Input (JSON) ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      }
    });

    const outputBox = blessed.box({
      top: 0,
      left: '50%',
      width: '50%',
      height: '80%',
      label: ' Output (CSV) ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        }
      }
    });

    const controlsBox = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: '20%',
      label: ' Controls ',
      border: {
        type: 'line'
      }
    });

    this.screen.append(inputBox);
    this.screen.append(outputBox);
    this.screen.append(controlsBox);

    // Create input textarea
    const inputText = blessed.textarea({
      parent: inputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      value: this.inputText || 'Paste JSON here or load from file...',
      inputOnFocus: true,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Create output textarea (read-only)
    const outputText = blessed.box({
      parent: outputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      content: this.outputText || 'CSV output will appear here...',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue'
        }
      },
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Create control buttons
    const buttonY = 1;
    const buttonHeight = 3;
    
    const loadButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 2,
      width: 15,
      height: buttonHeight,
      content: '{center}Load File{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const convertButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 20,
      width: 15,
      height: buttonHeight,
      content: '{center}Convert{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'green',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const saveButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 38,
      width: 15,
      height: buttonHeight,
      content: '{center}Save As...{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'magenta',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const backButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 56,
      width: 15,
      height: buttonHeight,
      content: '{center}Back{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'red',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    // Create options toggle
    const optionsText = blessed.box({
      parent: controlsBox,
      top: buttonY + buttonHeight + 1,
      left: 2,
      width: '100%-4',
      height: 3,
      content: `Options: Delimiter=${this.conversionOptions.delimiter} | Headers=${this.conversionOptions.includeHeaders} | ParseNumbers=${this.conversionOptions.parseNumbers}`,
      style: {
        fg: 'yellow'
      }
    });

    // Button event handlers
    loadButton.on('press', () => {
      this.showFilePicker((filePath) => {
        if (filePath) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            inputText.setValue(content);
            this.inputText = content;
            this.inputFile = filePath;
            inputBox.setLabel(` Input (JSON) - ${path.basename(filePath)} `);
            this.screen.render();
          } catch (error) {
            this.showMessage(`Error loading file: ${error.message}`, 'error');
          }
        }
      });
    });

    convertButton.on('press', async () => {
      if (this.isConverting) return;
      
      this.isConverting = true;
      convertButton.setContent('{center}Converting...{/center}');
      this.screen.render();
      
      try {
        const jsonText = inputText.getValue();
        if (!jsonText.trim()) {
          throw new Error('Please enter JSON data');
        }
        
        const jsonData = JSON.parse(jsonText);
        const csvData = jtcsv.jsonToCsv(jsonData, this.conversionOptions);
        
        this.outputText = csvData;
        outputText.setContent(csvData);
        
        // Update output box label with stats
        const lines = csvData.split('\n').length;
        const size = Buffer.byteLength(csvData, 'utf8');
        outputBox.setLabel(` Output (CSV) - ${lines} lines, ${this.formatBytes(size)} `);
        
        this.showMessage('Conversion successful!', 'success');
      } catch (error) {
        this.showMessage(`Conversion error: ${error.message}`, 'error');
      } finally {
        this.isConverting = false;
        convertButton.setContent('{center}Convert{/center}');
        this.screen.render();
      }
    });

    saveButton.on('press', () => {
      if (!this.outputText) {
        this.showMessage('No output to save', 'warning');
        return;
      }
      
      this.showFileSaver((filePath) => {
        if (filePath) {
          try {
            fs.writeFileSync(filePath, this.outputText, 'utf8');
            this.showMessage(`File saved: ${filePath}`, 'success');
          } catch (error) {
            this.showMessage(`Error saving file: ${error.message}`, 'error');
          }
        }
      });
    });

    backButton.on('press', () => {
      this.showMainMenu();
    });

    // Options toggle
    optionsText.on('click', () => {
      this.showOptionsMenu();
    });

    // Focus input textarea
    inputText.focus();
    
    // Handle keyboard navigation
    this.screen.key(['tab'], () => {
      if (this.screen.focused === inputText) {
        convertButton.focus();
      } else if (this.screen.focused === convertButton) {
        saveButton.focus();
      } else if (this.screen.focused === saveButton) {
        backButton.focus();
      } else {
        inputText.focus();
      }
      this.screen.render();
    });

    this.screen.render();
  }

  /**
   * Show CSV to JSON conversion screen
   */
  showCsvToJson() {
    this.currentMode = 'csv2json';
    this.screen.title = 'JTCSV - CSV → JSON';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    // Create layout (similar to JSON to CSV but reversed)
    const inputBox = blessed.box({
      top: 0,
      left: 0,
      width: '50%',
      height: '80%',
      label: ' Input (CSV) ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      }
    });

    const outputBox = blessed.box({
      top: 0,
      left: '50%',
      width: '50%',
      height: '80%',
      label: ' Output (JSON) ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        }
      }
    });

    const controlsBox = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: '20%',
      label: ' Controls ',
      border: {
        type: 'line'
      }
    });

    this.screen.append(inputBox);
    this.screen.append(outputBox);
    this.screen.append(controlsBox);

    // Create input textarea
    const inputText = blessed.textarea({
      parent: inputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      value: this.inputText || 'Paste CSV here or load from file...',
      inputOnFocus: true,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Create output textarea (read-only)
    const outputText = blessed.box({
      parent: outputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      content: this.outputText || 'JSON output will appear here...',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue'
        }
      },
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Create control buttons (similar to JSON to CSV)
    const buttonY = 1;
    const buttonHeight = 3;
    
    const loadButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 2,
      width: 15,
      height: buttonHeight,
      content: '{center}Load File{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const convertButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 20,
      width: 15,
      height: buttonHeight,
      content: '{center}Convert{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'green',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const saveButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 38,
      width: 15,
      height: buttonHeight,
      content: '{center}Save As...{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'magenta',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const backButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 56,
      width: 15,
      height: buttonHeight,
      content: '{center}Back{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'red',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    // Create options toggle
    const optionsText = blessed.box({
      parent: controlsBox,
      top: buttonY + buttonHeight + 1,
      left: 2,
      width: '100%-4',
      height: 3,
      content: `Options: Delimiter=${this.conversionOptions.delimiter} | AutoDetect=${this.conversionOptions.autoDetect} | FastPath=${this.conversionOptions.useFastPath} | Mode=${this.conversionOptions.fastPathMode}`,
      style: {
        fg: 'yellow'
      }
    });

    // Button event handlers
    loadButton.on('press', () => {
      this.showFilePicker((filePath) => {
        if (filePath) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            inputText.setValue(content);
            this.inputText = content;
            this.inputFile = filePath;
            inputBox.setLabel(` Input (CSV) - ${path.basename(filePath)} `);
            this.screen.render();
          } catch (error) {
            this.showMessage(`Error loading file: ${error.message}`, 'error');
          }
        }
      });
    });

    convertButton.on('press', async () => {
      if (this.isConverting) return;
      
      this.isConverting = true;
      convertButton.setContent('{center}Converting...{/center}');
      this.screen.render();
      
      try {
        const csvText = inputText.getValue();
        if (!csvText.trim()) {
          throw new Error('Please enter CSV data');
        }
        
        const jsonData = jtcsv.csvToJson(csvText, this.conversionOptions);
        const jsonOutput = this.conversionOptions.prettyPrint 
          JSON.stringify(jsonData);
        
        this.outputText = jsonOutput;
        outputText.setContent(jsonOutput);
        
        // Update output box label with stats
        const records = jsonData.length;
        const size = Buffer.byteLength(jsonOutput, 'utf8');
        outputBox.setLabel(` Output (JSON) - ${records} records, ${this.formatBytes(size)} `);
        
        this.showMessage('Conversion successful!', 'success');
      } catch (error) {
        this.showMessage(`Conversion error: ${error.message}`, 'error');
      } finally {
        this.isConverting = false;
        convertButton.setContent('{center}Convert{/center}');
        this.screen.render();
      }
    });

    saveButton.on('press', () => {
      if (!this.outputText) {
        this.showMessage('No output to save', 'warning');
        return;
      }
      
      this.showFileSaver((filePath) => {
        if (filePath) {
          try {
            fs.writeFileSync(filePath, this.outputText, 'utf8');
            this.showMessage(`File saved: ${filePath}`, 'success');
          } catch (error) {
            this.showMessage(`Error saving file: ${error.message}`, 'error');
          }
        }
      });
    });

    backButton.on('press', () => {
      this.showMainMenu();
    });

    // Options toggle
    optionsText.on('click', () => {
      this.showOptionsMenu();
    });

    // Focus input textarea
    inputText.focus();
    
    // Handle keyboard navigation
    this.screen.key(['tab'], () => {
      if (this.screen.focused === inputText) {
        convertButton.focus();
      } else if (this.screen.focused === convertButton) {
        saveButton.focus();
      } else if (this.screen.focused === saveButton) {
        backButton.focus();
      } else {
        inputText.focus();
      }
      this.screen.render();
    });

    this.screen.render();
  }

  /**
   * Show preprocessing screen
   */
  showPreprocess() {
    this.currentMode = 'preprocess';
    this.screen.title = 'JTCSV - Preprocess JSON';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const messageBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      content: '{center}Preprocessing feature coming soon!{/center}\n{center}Press any key to return to main menu.{/center}',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'yellow',
        border: {
          fg: 'yellow'
        }
      }
    });

    this.screen.append(messageBox);
    
    // Return to main menu on any key
    this.screen.key(['enter', 'space', 'escape'], () => {
      this.showMainMenu();
    });

    this.screen.render();
  }

  /**
   * Show batch processing screen
   */
  showBatchProcessing() {
    this.currentMode = 'batch';
    this.screen.title = 'JTCSV - Batch Processing';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const messageBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      content: '{center}Batch processing feature coming soon!{/center}\n{center}Press any key to return to main menu.{/center}',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'yellow',
        border: {
          fg: 'yellow'
        }
      }
    });

    this.screen.append(messageBox);
    
    // Return to main menu on any key
    this.screen.key(['enter', 'space', 'escape'], () => {
      this.showMainMenu();
    });

    this.screen.render();
  }

  /**
   * Show settings screen
   */
  showSettings() {
    this.currentMode = 'settings';
    this.screen.title = 'JTCSV - Settings';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    // Create settings form
    const form = blessed.form({
      top: 'center',
      left: 'center',
      width: '60%',
      height: '70%',
      keys: true,
      vi: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Title
    const title = blessed.box({
      parent: form,
      top: 0,
      left: 'center',
      width: '90%',
      height: 3,
      content: '{center}{bold}Conversion Settings{/bold}{/center}',
      tags: true,
      style: {
        fg: 'white',
        bold: true
      }
    });

    // Delimiter selection
    const delimiterLabel = blessed.box({
      parent: form,
      top: 4,
      left: 2,
      width: '40%',
      height: 1,
      content: 'CSV Delimiter:',
      style: {
        fg: 'white'
      }
    });

    const delimiterSelect = blessed.list({
      parent: form,
      top: 5,
      left: 2,
      width: '40%',
      height: 6,
      items: ['Semicolon (;)', 'Comma (,)', 'Tab (\\t)', 'Pipe (|)', 'Custom...'],
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    // Options checkboxes
    const optionsY = 12;
    
    const headersCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY,
      left: 2,
      width: '90%',
      height: 1,
      content: ' Include headers in CSV output',
      checked: this.conversionOptions.includeHeaders,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    const parseNumbersCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY + 2,
      left: 2,
      width: '90%',
      height: 1,
      content: ' Parse numbers in CSV',
      checked: this.conversionOptions.parseNumbers,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    const parseBooleansCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY + 4,
      left: 2,
      width: '90%',
      height: 1,
      content: ' Parse booleans in CSV',
      checked: this.conversionOptions.parseBooleans,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    const injectionCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY + 6,
      left: 2,
      width: '90%',
      height: 1,
      content: ' CSV injection protection',
      checked: this.conversionOptions.preventCsvInjection,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    const prettyPrintCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY + 8,
      left: 2,
      width: '90%',
      height: 1,
      content: ' Pretty print JSON output',
      checked: this.conversionOptions.prettyPrint,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    const autoDetectCheckbox = blessed.checkbox({
      parent: form,
      top: optionsY + 10,
      left: 2,
      width: '90%',
      height: 1,
      content: ' Auto-detect CSV delimiter',
      checked: this.conversionOptions.autoDetect,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });

    // Buttons
    const saveButton = blessed.button({
      parent: form,
      bottom: 3,
      left: '25%',
      width: 20,
      height: 3,
      content: '{center}Save{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'green',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    const cancelButton = blessed.button({
      parent: form,
      bottom: 3,
      left: '50%',
      width: 20,
      height: 3,
      content: '{center}Cancel{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'red',
        focus: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      }
    });

    // Event handlers
    delimiterSelect.on('select', (item, index) => {
      if (index === 4) { // Custom...
        this.promptForCustomDelimiter((delimiter) => {
          if (delimiter) {
            this.conversionOptions.delimiter = delimiter;
            delimiterSelect.setItem(4, `Custom (${delimiter})`);
            this.screen.render();
          }
        });
      } else {
        const delimiters = [';', ',', '\t', '|'];
        if (index < delimiters.length) {
          this.conversionOptions.delimiter = delimiters[index];
        }
      }
    });

    saveButton.on('press', () => {
      // Update options from checkboxes
      this.conversionOptions.includeHeaders = headersCheckbox.checked;
      this.conversionOptions.parseNumbers = parseNumbersCheckbox.checked;
      this.conversionOptions.parseBooleans = parseBooleansCheckbox.checked;
      this.conversionOptions.preventCsvInjection = injectionCheckbox.checked;
      this.conversionOptions.prettyPrint = prettyPrintCheckbox.checked;
      this.conversionOptions.autoDetect = autoDetectCheckbox.checked;
      
      this.showMessage('Settings saved!', 'success');
      this.showMainMenu();
    });

    cancelButton.on('press', () => {
      this.showMainMenu();
    });

    // Set initial delimiter selection
    const delimiters = [';', ',', '\t', '|'];
    const delimiterIndex = delimiters.indexOf(this.conversionOptions.delimiter);
    if (delimiterIndex !== -1) {
      delimiterSelect.select(delimiterIndex);
    } else {
      delimiterSelect.setItem(4, `Custom (${this.conversionOptions.delimiter})`);
      delimiterSelect.select(4);
    }

    this.screen.append(form);
    delimiterSelect.focus();
    this.screen.render();
  }

  /**
   * Show file browser
   */
  showFileBrowser() {
    this.currentMode = 'filebrowser';
    this.screen.title = 'JTCSV - File Browser';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const messageBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      content: '{center}File browser feature coming soon!{/center}\n{center}Press any key to return to main menu.{/center}',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'yellow',
        border: {
          fg: 'yellow'
        }
      }
    });

    this.screen.append(messageBox);
    
    // Return to main menu on any key
    this.screen.key(['enter', 'space', 'escape'], () => {
      this.showMainMenu();
    });

    this.screen.render();
  }

  /**
   * Show help screen
   */
  showHelp() {
    this.currentMode = 'help';
    this.screen.title = 'JTCSV - Help';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const helpText = `
{center}{bold}JTCSV Terminal Interface Help{/bold}{/center}

{underline}Navigation:{/underline}
• Use arrow keys to navigate menus
• Press Enter to select items
• Press Tab to switch between controls
• Press Escape or 'q' to quit

{underline}Conversion:{/underline}
• JSON → CSV: Convert JSON arrays to CSV format
• CSV → JSON: Convert CSV data to JSON arrays
• Load files using the 'Load File' button
• Adjust settings in the Settings menu

{underline}Options:{/underline}
• Delimiter: Choose CSV separator character
• Headers: Include/exclude header row in CSV
• Parse Numbers: Convert numeric strings to numbers
• CSV Injection Protection: Prevent formula execution

{underline}Keyboard Shortcuts:{/underline}
• F1: Show this help
• Ctrl+S: Save current output
• Ctrl+L: Load file
• Ctrl+Q: Quit application

Press any key to return to main menu.
    `;

    const helpBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: helpText,
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue'
        }
      },
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });

    this.screen.append(helpBox);
    
    // Return to main menu on any key
    this.screen.key(['enter', 'space', 'escape'], () => {
      this.showMainMenu();
    });

    this.screen.render();
  }

  /**
   * Show options menu
   */
  showOptionsMenu() {
    const optionsMenu = blessed.list({
      top: 'center',
      left: 'center',
      width: '40%',
      height: '60%',
      items: [
        'Change Delimiter',
        'Toggle Headers',
        'Toggle Parse Numbers',
        'Toggle Parse Booleans',
        'Toggle CSV Injection Protection',
        'Toggle Pretty Print',
        'Toggle Auto Detect',
        'Toggle Fast Path',
        'Cycle Fast Path Mode',
        'Back'
      ],
      keys: true,
      border: {
        type: 'line'
      },
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    optionsMenu.on('select', (item, index) => {
      switch (index) {
        case 0:
          this.promptForCustomDelimiter((delimiter) => {
            if (delimiter) {
              this.conversionOptions.delimiter = delimiter;
              this.showMessage(`Delimiter set to: ${delimiter}`, 'success');
            }
            optionsMenu.destroy();
            this.screen.render();
          });
          break;
        case 1:
          this.conversionOptions.includeHeaders = !this.conversionOptions.includeHeaders;
          this.showMessage(`Headers: ${this.conversionOptions.includeHeaders ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 2:
          this.conversionOptions.parseNumbers = !this.conversionOptions.parseNumbers;
          this.showMessage(`Parse Numbers: ${this.conversionOptions.parseNumbers ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 3:
          this.conversionOptions.parseBooleans = !this.conversionOptions.parseBooleans;
          this.showMessage(`Parse Booleans: ${this.conversionOptions.parseBooleans ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 4:
          this.conversionOptions.preventCsvInjection = !this.conversionOptions.preventCsvInjection;
          this.showMessage(`CSV Injection Protection: ${this.conversionOptions.preventCsvInjection ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 5:
          this.conversionOptions.prettyPrint = !this.conversionOptions.prettyPrint;
          this.showMessage(`Pretty Print: ${this.conversionOptions.prettyPrint ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 6:
          this.conversionOptions.autoDetect = !this.conversionOptions.autoDetect;
          this.showMessage(`Auto Detect: ${this.conversionOptions.autoDetect ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 7:
          this.conversionOptions.useFastPath = !this.conversionOptions.useFastPath;
          this.showMessage(`Fast Path: ${this.conversionOptions.useFastPath ? 'ON' : 'OFF'}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        case 8: {
          const nextMode = this.conversionOptions.fastPathMode === 'objects' ? 'compact' : 'objects';
          this.conversionOptions.fastPathMode = nextMode;
          this.showMessage(`Fast Path Mode: ${nextMode}`, 'success');
          optionsMenu.destroy();
          this.screen.render();
          break;
        }
        case 9:
          optionsMenu.destroy();
          this.screen.render();
          break;
      }
    });

    this.screen.append(optionsMenu);
    optionsMenu.focus();
    this.screen.render();
  }

  /**
   * Show file picker dialog
   */
  showFilePicker(callback) {
    const dialog = blessed.prompt({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 7,
      label: ' Select File ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    dialog.input('Enter file path:', '', (err, value) => {
      dialog.destroy();
      this.screen.render();
      if (value && !err) {
        callback(value);
      } else {
        callback(null);
      }
    });

    this.screen.render();
  }

  /**
   * Show file saver dialog
   */
  showFileSaver(callback) {
    const dialog = blessed.prompt({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 7,
      label: ' Save File ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    dialog.input('Enter file path:', '', (err, value) => {
      dialog.destroy();
      this.screen.render();
      if (value && !err) {
        callback(value);
      } else {
        callback(null);
      }
    });

    this.screen.render();
  }

  /**
   * Prompt for custom delimiter
   */
  promptForCustomDelimiter(callback) {
    const dialog = blessed.prompt({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 7,
      label: ' Custom Delimiter ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'yellow'
        }
      }
    });

    dialog.input('Enter custom delimiter character:', ',', (err, value) => {
      dialog.destroy();
      this.screen.render();
      if (value && !err && value.length === 1) {
        callback(value);
      } else if (value && value.length > 0) {
        this.showMessage('Delimiter must be a single character', 'error');
        callback(null);
      } else {
        callback(null);
      }
    });

    this.screen.render();
  }

  /**
   * Show message dialog
   */
  showMessage(message, type = 'info') {
    const colors = {
      info: 'cyan',
      success: 'green',
      warning: 'yellow',
      error: 'red'
    };

    const messageBox = blessed.message({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      border: {
        type: 'line'
      },
      style: {
        fg: colors[type] || 'white',
        border: {
          fg: colors[type] || 'white'
        }
      }
    });

    messageBox.display(message, 3000, () => {
      messageBox.destroy();
      this.screen.render();
    });

    this.screen.render();
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Export the class
module.exports = JtcsvTUI;

// If this file is run directly, start the TUI
if (require.main === module) {
  try {
    // Check if blessed is installed
    require('blessed');
    require('blessed-contrib');
    
    const tui = new JtcsvTUI();
    tui.start();
  } catch (error) {
    console.error('Error: Required dependencies not found');
    console.log('Install dependencies with:');
    console.log('  npm install blessed blessed-contrib');
    process.exit(1);
  }
}
