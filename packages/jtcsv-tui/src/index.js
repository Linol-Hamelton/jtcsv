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
    this.boundKeys = [];
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
    this.preprocessOptions = {
      maxDepth: 5
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

    // Allow global hotkeys even when text inputs grab keys.
    this.screen.ignoreLocked = (this.screen.ignoreLocked || []).concat([
      'f1', 'f2', 'f3', 'f4', 'f6', 'S-f6',
      'tab', 'S-tab', 'backtab', 'escape',
      'C-o', 'C-r', 'C-p', 'C-b', 'C-q', 'C-c'
    ]);

    // Create grid layout
    this.grid = new contrib.grid({ 
      rows: 12, 
      cols: 12, 
      screen: this.screen 
    });

    // Global key bindings
    this.screen.key(['C-c', 'C-q'], () => process.exit(0));
    this.screen.key(['escape'], () => {
      if (this.currentMode === 'main') {
        process.exit(0);
      } else {
        this.showMainMenu();
      }
    });
    this.screen.key(['f1'], () => this.showHelp());

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
    this.clearScreenKeys();

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
      height: 12,
      items: [
        '1. JSON → CSV Conversion',
        '2. CSV → JSON Conversion',
        '3. Preprocess JSON',
        '4. Batch Processing',
        '5. Stream Processing',
        '6. Settings',
        '7. File Browser',
        '8. Help',
        '9. Exit'
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
          this.showStreamProcessing();
          break;
        case 5:
          this.showSettings();
          break;
        case 6:
          this.showFileBrowser();
          break;
        case 7:
          this.showHelp();
          break;
        case 8:
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
      content: 'Arrows: navigate | Enter: select | Esc: quit | Ctrl+Q: quit | F1: help',
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
    this.clearScreenKeys();
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
      inputOnFocus: false,
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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

    const statusBar = blessed.box({
      parent: controlsBox,
      bottom: 0,
      left: 2,
      width: '100%-4',
      height: 1,
      content: 'Enter edit | F2/Ctrl+O Load | F3/Ctrl+R Convert | F4/Ctrl+P Save | Esc/Ctrl+B Back | Tab/F6 Next',
      style: {
        fg: 'cyan'
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

    this.setupFocusCycle([inputText, loadButton, convertButton, saveButton, backButton]);
    this.bindScreenKey(['f2', 'C-o'], () => this.triggerButton(loadButton));
    this.bindScreenKey(['f3', 'C-r'], () => this.triggerButton(convertButton));
    this.bindScreenKey(['f4', 'C-p'], () => this.triggerButton(saveButton));
    this.bindScreenKey(['C-b'], () => this.triggerButton(backButton));

    // Focus input textarea
    inputText.focus();

    this.screen.render();
  }

  /**
   * Show CSV to JSON conversion screen
   */
  showCsvToJson() {
    this.currentMode = 'csv2json';
    this.clearScreenKeys();
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
      inputOnFocus: false,
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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

    const statusBar = blessed.box({
      parent: controlsBox,
      bottom: 0,
      left: 2,
      width: '100%-4',
      height: 1,
      content: 'Enter edit | F2/Ctrl+O Load | F3/Ctrl+R Convert | F4/Ctrl+P Save | Esc/Ctrl+B Back | Tab/F6 Next',
      style: {
        fg: 'cyan'
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
        
        const jsonData = jtcsv.csvToJson(csvText, this.buildCsvToJsonOptions());
        const jsonOutput = this.conversionOptions.prettyPrint
          ? JSON.stringify(jsonData, null, 2)
          : JSON.stringify(jsonData);
        
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

    this.setupFocusCycle([inputText, loadButton, convertButton, saveButton, backButton]);
    this.bindScreenKey(['f2', 'C-o'], () => this.triggerButton(loadButton));
    this.bindScreenKey(['f3', 'C-r'], () => this.triggerButton(convertButton));
    this.bindScreenKey(['f4', 'C-p'], () => this.triggerButton(saveButton));
    this.bindScreenKey(['C-b'], () => this.triggerButton(backButton));

    // Focus input textarea
    inputText.focus();

    this.screen.render();
  }

  /**
   * Show preprocessing screen
   */
  showPreprocess() {
    this.currentMode = 'preprocess';
    this.clearScreenKeys();
    this.screen.title = 'JTCSV - Preprocess JSON';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

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

    const inputText = blessed.textarea({
      parent: inputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      value: this.inputText || 'Paste JSON here or load from file...',
      inputOnFocus: false,
      keys: true,
      mouse: true,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    const outputText = blessed.box({
      parent: outputBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      content: this.outputText || 'Preprocessed JSON output will appear here...',
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
      keys: true,
      mouse: true,
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

    const preprocessButton = blessed.button({
      parent: controlsBox,
      top: buttonY,
      left: 20,
      width: 15,
      height: buttonHeight,
      content: '{center}Preprocess{/center}',
      tags: true,
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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
      keys: true,
      mouse: true,
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

    const optionsText = blessed.box({
      parent: controlsBox,
      top: buttonY + buttonHeight + 1,
      left: 2,
      width: '100%-4',
      height: 3,
      content: `Options: MaxDepth=${this.preprocessOptions.maxDepth}`,
      style: {
        fg: 'yellow'
      }
    });

    const statusBar = blessed.box({
      parent: controlsBox,
      bottom: 0,
      left: 2,
      width: '100%-4',
      height: 1,
      content: 'Enter edit | F2/Ctrl+O Load | F3/Ctrl+R Preprocess | F4/Ctrl+P Save | Esc/Ctrl+B Back | Tab/F6 Next',
      style: {
        fg: 'cyan'
      }
    });

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

    preprocessButton.on('press', async () => {
      try {
        const jsonText = inputText.getValue();
        if (!jsonText.trim()) {
          throw new Error('Please enter JSON data');
        }

        const parsed = JSON.parse(jsonText);
        const processed = this.preprocessJsonData(parsed, this.preprocessOptions.maxDepth);
        const output = JSON.stringify(processed, null, 2);

        this.outputText = output;
        outputText.setContent(output);

        const size = Buffer.byteLength(output, 'utf8');
        outputBox.setLabel(` Output (JSON) - ${this.formatBytes(size)} `);
        this.showMessage('Preprocess complete!', 'success');
      } catch (error) {
        this.showMessage(`Preprocess error: ${error.message}`, 'error');
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

    optionsText.on('click', async () => {
      const value = await this.promptForValue('Max Depth', 'Enter max depth:', String(this.preprocessOptions.maxDepth));
      const next = value ? parseInt(value, 10) : this.preprocessOptions.maxDepth;
      if (!Number.isFinite(next) || next <= 0) {
        this.showMessage('Max depth must be a positive number', 'warning');
        return;
      }
      this.preprocessOptions.maxDepth = next;
      optionsText.setContent(`Options: MaxDepth=${this.preprocessOptions.maxDepth}`);
      this.screen.render();
    });

    this.setupFocusCycle([inputText, loadButton, preprocessButton, saveButton, backButton]);
    this.bindScreenKey(['f2', 'C-o'], () => this.triggerButton(loadButton));
    this.bindScreenKey(['f3', 'C-r'], () => this.triggerButton(preprocessButton));
    this.bindScreenKey(['f4', 'C-p'], () => this.triggerButton(saveButton));
    this.bindScreenKey(['C-b'], () => this.triggerButton(backButton));

    inputText.focus();
    this.screen.render();
  }

  /**
   * Show stream processing screen
   */
  showStreamProcessing() {
    this.currentMode = 'stream';
    this.clearScreenKeys();
    this.screen.title = 'JTCSV - Stream Processing';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const infoBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '50%',
      content:
        '{center}{bold}Stream Processing{/bold}{/center}\n\n' +
        'Stream processing mode for large files (>100MB).\n' +
        'Memory-efficient processing with real-time progress.\n\n' +
        'Supported operations:\n' +
        '- JSON → CSV streaming\n' +
        '- CSV → JSON streaming\n' +
        '- NDJSON → CSV streaming\n' +
        '- CSV → NDJSON streaming\n\n' +
        'Features:\n' +
        '- Low memory footprint\n' +
        '- Real-time progress bar\n' +
        '- All conversion options supported\n' +
        '- Handles files of any size',
      tags: true,
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

    const progressBox = blessed.box({
      top: '50%',
      left: 0,
      width: '100%',
      height: '30%',
      label: ' Progress ',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      }
    });

    const progressBar = blessed.progressbar({
      parent: progressBox,
      top: 1,
      left: 2,
      width: '100%-4',
      height: 3,
      orientation: 'horizontal',
      style: {
        bar: {
          bg: 'green'
        },
        border: {
          fg: 'cyan'
        }
      },
      border: {
        type: 'line'
      },
      filled: 0
    });

    const statusText = blessed.box({
      parent: progressBox,
      top: 5,
      left: 2,
      width: '100%-4',
      height: 3,
      content: 'Ready to start streaming...',
      style: {
        fg: 'cyan'
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

    const runButton = blessed.button({
      parent: controlsBox,
      top: 1,
      left: 2,
      width: 18,
      height: 3,
      content: '{center}Start Stream{/center}',
      tags: true,
      keys: true,
      mouse: true,
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

    const backButton = blessed.button({
      parent: controlsBox,
      top: 1,
      left: 22,
      width: 15,
      height: 3,
      content: '{center}Back{/center}',
      tags: true,
      keys: true,
      mouse: true,
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

    const statusBar = blessed.box({
      parent: controlsBox,
      bottom: 0,
      left: 2,
      width: '100%-4',
      height: 1,
      content: 'F3/Ctrl+R Start | Esc/Ctrl+B Back | Tab/F6 Next',
      style: {
        fg: 'cyan'
      }
    });

    runButton.on('press', async () => {
      await this.runStreamProcess(progressBar, statusText);
    });

    backButton.on('press', () => {
      this.showMainMenu();
    });

    this.screen.append(infoBox);
    this.screen.append(progressBox);
    this.screen.append(controlsBox);

    this.setupFocusCycle([runButton, backButton]);
    this.bindScreenKey(['f3', 'C-r'], () => this.triggerButton(runButton));
    this.bindScreenKey(['C-b'], () => this.triggerButton(backButton));

    runButton.focus();
    this.screen.render();
  }

  /**
   * Run stream processing
   */
  async runStreamProcess(progressBar, statusText) {
    const modeInput = await this.promptForValue(
      'Stream Mode',
      'Enter mode (json-to-csv, csv-to-json, ndjson-to-csv, csv-to-ndjson):',
      'json-to-csv'
    );
    if (!modeInput) {
      return;
    }

    const mode = modeInput.toLowerCase();
    const validModes = ['json-to-csv', 'csv-to-json', 'ndjson-to-csv', 'csv-to-ndjson'];
    if (!validModes.includes(mode)) {
      this.showMessage('Invalid mode. Use: json-to-csv, csv-to-json, ndjson-to-csv, or csv-to-ndjson', 'error');
      return;
    }

    const inputPath = await this.promptForValue('Input File', 'Enter input file path:');
    if (!inputPath || !fs.existsSync(inputPath)) {
      this.showMessage('Input file not found', 'error');
      return;
    }

    const outputPath = await this.promptForValue('Output File', 'Enter output file path:');
    if (!outputPath) {
      return;
    }

    // Get file size for progress calculation
    const stats = fs.statSync(inputPath);
    const fileSize = stats.size;
    let processedBytes = 0;

    statusText.setContent(`Starting ${mode} streaming...`);
    progressBar.setProgress(0);
    this.screen.render();

    try {
      const readStream = fs.createReadStream(inputPath, 'utf8');
      const writeStream = fs.createWriteStream(outputPath, 'utf8');

      // Track progress
      readStream.on('data', (chunk) => {
        processedBytes += Buffer.byteLength(chunk, 'utf8');
        const progress = Math.min(100, Math.floor((processedBytes / fileSize) * 100));
        progressBar.setProgress(progress);
        statusText.setContent(
          `Processing: ${this.formatBytes(processedBytes)} / ${this.formatBytes(fileSize)} (${progress}%)`
        );
        this.screen.render();
      });

      let recordCount = 0;
      const startTime = Date.now();

      if (mode === 'json-to-csv' || mode === 'ndjson-to-csv') {
        // JSON/NDJSON to CSV streaming
        let buffer = '';
        let headersWritten = false;

        readStream.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const obj = JSON.parse(line);
                recordCount++;

                if (!headersWritten && this.conversionOptions.includeHeaders) {
                  const headers = Object.keys(obj);
                  writeStream.write(headers.join(this.conversionOptions.delimiter) + '\n');
                  headersWritten = true;
                }

                const row = Object.values(obj)
                  .map((value) => {
                    const str = String(value);
                    if (
                      str.includes(this.conversionOptions.delimiter) ||
                      str.includes('"') ||
                      str.includes('\n')
                    ) {
                      return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                  })
                  .join(this.conversionOptions.delimiter) + '\n';

                writeStream.write(row);
              } catch (error) {
                // Skip invalid JSON lines
              }
            }
          }
        });

        readStream.on('end', () => {
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const obj = JSON.parse(buffer);
              recordCount++;

              if (!headersWritten && this.conversionOptions.includeHeaders) {
                const headers = Object.keys(obj);
                writeStream.write(headers.join(this.conversionOptions.delimiter) + '\n');
              }

              const row = Object.values(obj)
                .map((value) => {
                  const str = String(value);
                  if (
                    str.includes(this.conversionOptions.delimiter) ||
                    str.includes('"') ||
                    str.includes('\n')
                  ) {
                    return `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                })
                .join(this.conversionOptions.delimiter) + '\n';

              writeStream.write(row);
            } catch (error) {
              // Skip invalid JSON
            }
          }

          writeStream.end();
        });

        writeStream.on('finish', () => {
          const elapsed = Date.now() - startTime;
          progressBar.setProgress(100);
          statusText.setContent(
            `✓ Complete! Processed ${recordCount.toLocaleString()} records in ${elapsed}ms\n` +
            `Output: ${outputPath} (${this.formatBytes(fs.statSync(outputPath).size)})`
          );
          this.screen.render();
          this.showMessage(`Stream processing complete! ${recordCount} records processed.`, 'success');
        });

      } else if (mode === 'csv-to-json' || mode === 'csv-to-ndjson') {
        // CSV to JSON/NDJSON streaming
        let buffer = '';
        let headers = [];
        let isFirstRow = true;

        if (mode === 'csv-to-json') {
          writeStream.write('[\n');
        }

        readStream.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            const fields = this.parseCsvLineSimple(line, this.conversionOptions.delimiter);

            if (isFirstRow && this.conversionOptions.includeHeaders) {
              headers = fields;
              isFirstRow = false;
              continue;
            }

            recordCount++;
            const obj = {};
            const fieldCount = Math.min(fields.length, headers.length);

            for (let j = 0; j < fieldCount; j++) {
              const header = headers[j] || `column${j + 1}`;
              let value = fields[j];

              if (this.conversionOptions.parseNumbers) {
                // Fast numeric detection
                const trimmed = value.trim();
                const firstChar = trimmed.charAt(0);
                if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '.') {
                  const num = parseFloat(trimmed);
                  if (!isNaN(num) && isFinite(num)) {
                    if (String(num) === trimmed || (trimmed.includes('.') && !isNaN(Number(trimmed)))) {
                      value = num;
                    }
                  }
                }
              }

              if (this.conversionOptions.parseBooleans) {
                const lowerValue = value.toLowerCase();
                if (lowerValue === 'true') value = true;
                if (lowerValue === 'false') value = false;
              }

              obj[header] = value;
            }

            const jsonStr = JSON.stringify(obj);
            if (mode === 'csv-to-json') {
              if (recordCount > 1) {
                writeStream.write(',\n');
              }
              writeStream.write('  ' + jsonStr);
            } else {
              writeStream.write(jsonStr + '\n');
            }
          }
        });

        readStream.on('end', () => {
          // Process remaining buffer
          if (buffer.trim()) {
            const fields = this.parseCsvLineSimple(buffer.trim(), this.conversionOptions.delimiter);

            if (fields.length > 0 && !(isFirstRow && this.conversionOptions.includeHeaders)) {
              recordCount++;
              const obj = {};
              const fieldCount = Math.min(fields.length, headers.length);

              for (let j = 0; j < fieldCount; j++) {
                const header = headers[j] || `column${j + 1}`;
                obj[header] = fields[j];
              }

              const jsonStr = JSON.stringify(obj);
              if (mode === 'csv-to-json') {
                if (recordCount > 1) {
                  writeStream.write(',\n');
                }
                writeStream.write('  ' + jsonStr);
              } else {
                writeStream.write(jsonStr + '\n');
              }
            }
          }

          if (mode === 'csv-to-json') {
            writeStream.write('\n]');
          }
          writeStream.end();
        });

        writeStream.on('finish', () => {
          const elapsed = Date.now() - startTime;
          progressBar.setProgress(100);
          statusText.setContent(
            `✓ Complete! Processed ${recordCount.toLocaleString()} rows in ${elapsed}ms\n` +
            `Output: ${outputPath} (${this.formatBytes(fs.statSync(outputPath).size)})`
          );
          this.screen.render();
          this.showMessage(`Stream processing complete! ${recordCount} rows processed.`, 'success');
        });
      }

      readStream.on('error', (error) => {
        statusText.setContent(`✗ Stream error: ${error.message}`);
        this.screen.render();
        this.showMessage(`Stream error: ${error.message}`, 'error');
      });

      writeStream.on('error', (error) => {
        statusText.setContent(`✗ Write error: ${error.message}`);
        this.screen.render();
        this.showMessage(`Write error: ${error.message}`, 'error');
      });

    } catch (error) {
      statusText.setContent(`✗ Error: ${error.message}`);
      this.screen.render();
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Simple CSV line parser for streaming
   */
  parseCsvLineSimple(line, delimiter) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    fields.push(currentField);
    return fields;
  }

  /**
   * Show batch processing screen
   */
  showBatchProcessing() {
    this.currentMode = 'batch';
    this.clearScreenKeys();
    this.screen.title = 'JTCSV - Batch Processing';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const infoBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '70%',
      content:
        '{center}{bold}Batch Processing{/bold}{/center}\n\n' +
        'This mode converts all files in a directory (or a single file).\n' +
        'You will be prompted for:\n' +
        '- mode: json-to-csv or csv-to-json\n' +
        '- input file or directory\n' +
        '- output directory\n' +
        '- recursive scan (y/n)\n\n' +
        'Output files are written to the chosen directory with matching base names.',
      tags: true,
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

    const controlsBox = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: '30%',
      label: ' Controls ',
      border: {
        type: 'line'
      }
    });

    const runButton = blessed.button({
      parent: controlsBox,
      top: 1,
      left: 2,
      width: 18,
      height: 3,
      content: '{center}Run Batch{/center}',
      tags: true,
      keys: true,
      mouse: true,
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

    const backButton = blessed.button({
      parent: controlsBox,
      top: 1,
      left: 22,
      width: 15,
      height: 3,
      content: '{center}Back{/center}',
      tags: true,
      keys: true,
      mouse: true,
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

    const statusBar = blessed.box({
      parent: controlsBox,
      bottom: 0,
      left: 2,
      width: '100%-4',
      height: 1,
      content: 'F3/Ctrl+R Run | Esc/Ctrl+B Back | Tab/F6 Next',
      style: {
        fg: 'cyan'
      }
    });

    runButton.on('press', async () => {
      await this.runBatchProcess();
    });

    backButton.on('press', () => {
      this.showMainMenu();
    });

    this.screen.append(infoBox);
    this.screen.append(controlsBox);

    this.setupFocusCycle([runButton, backButton]);
    this.bindScreenKey(['f3', 'C-r'], () => this.triggerButton(runButton));
    this.bindScreenKey(['C-b'], () => this.triggerButton(backButton));

    runButton.focus();
    this.screen.render();
  }

  /**
   * Show settings screen
   */
  showSettings() {
    this.currentMode = 'settings';
    this.clearScreenKeys();
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
    this.clearScreenKeys();
    this.screen.title = 'JTCSV - File Browser';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const messageBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      content: '{center}File browser feature coming soon!{/center}\n{center}Press Esc to return to main menu.{/center}',
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
    
    this.bindScreenKey(['enter', 'space'], () => {
      this.showMainMenu();
    });

    this.screen.render();
  }

  /**
   * Show help screen
   */
  showHelp() {
    this.currentMode = 'help';
    this.clearScreenKeys();
    this.screen.title = 'JTCSV - Help';

    // Clear screen
    this.screen.children.slice().forEach(child => child.destroy());

    const helpText = `
{center}{bold}JTCSV Terminal Interface Help{/bold}{/center}

{underline}Navigation:{/underline}
- Use arrow keys to navigate menus
- Press Enter to select items
- Press Tab, Shift+Tab, or F6 to switch focus
- Press Esc to return to the main menu

{underline}Conversion:{/underline}
- JSON -> CSV: Convert JSON arrays to CSV format
- CSV -> JSON: Convert CSV data to JSON arrays
- Load files using the "Load File" button
- Adjust settings in the Settings menu

{underline}Options:{/underline}
- Delimiter: Choose CSV separator character
- Headers: Include/exclude header row in CSV
- Parse Numbers: Convert numeric strings to numbers
- CSV Injection Protection: Prevent formula execution

{underline}Keyboard Shortcuts:{/underline}
- F1: Show this help
- F2 or Ctrl+O: Load file
- F3 or Ctrl+R: Convert/Run
- F4 or Ctrl+P: Save output
- Esc or Ctrl+B: Back to menu
- Ctrl+Q: Quit application

Press Esc to return to the main menu.
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
    this.bindScreenKey(['enter', 'space'], () => {
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
   * Track screen-specific key bindings so they can be cleared on mode switch.
   */
  bindScreenKey(keys, handler) {
    this.screen.key(keys, handler);
    this.boundKeys.push({ keys, handler });
  }

  clearScreenKeys() {
    this.boundKeys.forEach(({ keys, handler }) => {
      this.screen.unkey(keys, handler);
    });
    this.boundKeys = [];
  }

  setupFocusCycle(widgets = []) {
    const focusables = widgets.filter(Boolean);
    if (focusables.length === 0) {
      return;
    }

    const focusNext = (direction) => {
      const current = this.screen.focused;
      const currentIndex = focusables.indexOf(current);
      const startIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = (startIndex + direction + focusables.length) % focusables.length;
      focusables[nextIndex].focus();
      this.screen.render();
    };

    this.bindScreenKey(['tab', 'f6'], () => focusNext(1));
    this.bindScreenKey(['S-tab', 'S-f6', 'backtab'], () => focusNext(-1));
  }

  triggerButton(button) {
    if (button) {
      button.emit('press');
    }
  }

  buildJsonToCsvOptions() {
    return {
      delimiter: this.conversionOptions.delimiter,
      includeHeaders: this.conversionOptions.includeHeaders,
      preventCsvInjection: this.conversionOptions.preventCsvInjection,
      rfc4180Compliant: true
    };
  }

  buildCsvToJsonOptions() {
    return {
      delimiter: this.conversionOptions.delimiter,
      autoDetect: this.conversionOptions.autoDetect,
      parseNumbers: this.conversionOptions.parseNumbers,
      parseBooleans: this.conversionOptions.parseBooleans,
      trim: true,
      hasHeaders: this.conversionOptions.includeHeaders,
      useFastPath: this.conversionOptions.useFastPath,
      fastPathMode: this.conversionOptions.fastPathMode,
      preventCsvInjection: this.conversionOptions.preventCsvInjection,
      rfc4180Compliant: true
    };
  }

  preprocessJsonData(data, maxDepth = 5) {
    const rows = Array.isArray(data) ? data : [data];
    return rows.map((item) => {
      if (!item || typeof item !== 'object') {
        return {};
      }
      const processed = {};
      Object.keys(item).forEach((key) => {
        const value = item[key];
        if (value && typeof value === 'object') {
          processed[key] = jtcsv.deepUnwrap(value, 0, maxDepth);
        } else {
          processed[key] = value;
        }
      });
      return processed;
    });
  }

  collectFiles(inputPath, extension, recursive) {
    if (!fs.existsSync(inputPath)) {
      return [];
    }

    const stats = fs.statSync(inputPath);
    if (stats.isFile()) {
      return inputPath.endsWith(extension) ? [inputPath] : [];
    }

    const results = [];
    const entries = fs.readdirSync(inputPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(inputPath, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          results.push(...this.collectFiles(fullPath, extension, recursive));
        }
        return;
      }
      if (entry.isFile() && fullPath.endsWith(extension)) {
        results.push(fullPath);
      }
    });
    return results;
  }

  promptForValue(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const dialog = blessed.prompt({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: 7,
        label: ` ${title} `,
        border: {
          type: 'line'
        },
        style: {
          border: {
            fg: 'cyan'
          }
        }
      });

      dialog.input(message, defaultValue, (err, value) => {
        dialog.destroy();
        this.screen.render();
        if (err) {
          resolve(null);
          return;
        }
        resolve(value && value.trim() ? value.trim() : null);
      });

      this.screen.render();
    });
  }

  async runBatchProcess() {
    const modeInput = await this.promptForValue(
      'Batch Mode',
      'Enter mode (json-to-csv or csv-to-json):',
      'json-to-csv'
    );
    if (!modeInput) {
      return;
    }

    const mode = modeInput.toLowerCase();
    const isJsonToCsv = mode === 'json-to-csv' || mode === 'json2csv';
    const isCsvToJson = mode === 'csv-to-json' || mode === 'csv2json';
    if (!isJsonToCsv && !isCsvToJson) {
      this.showMessage('Invalid mode. Use json-to-csv or csv-to-json.', 'error');
      return;
    }

    const inputPath = await this.promptForValue('Input Path', 'Enter input file or directory:');
    if (!inputPath) {
      return;
    }

    const outputPath = await this.promptForValue('Output Directory', 'Enter output directory:', './output');
    if (!outputPath) {
      return;
    }

    const recursiveInput = await this.promptForValue('Recursive', 'Recurse into subfolders? (y/n):', 'n');
    const recursive = recursiveInput && recursiveInput.toLowerCase().startsWith('y');

    const extension = isJsonToCsv ? '.json' : '.csv';
    const files = this.collectFiles(inputPath, extension, recursive);
    if (files.length === 0) {
      this.showMessage(`No ${extension} files found.`, 'warning');
      return;
    }

    fs.mkdirSync(outputPath, { recursive: true });
    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const base = path.basename(file, extension);
        if (isJsonToCsv) {
          const parsed = JSON.parse(raw);
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          const csv = jtcsv.jsonToCsv(rows, this.buildJsonToCsvOptions());
          const outFile = path.join(outputPath, `${base}.csv`);
          fs.writeFileSync(outFile, csv, 'utf8');
        } else {
          const json = jtcsv.csvToJson(raw, this.buildCsvToJsonOptions());
          const outFile = path.join(outputPath, `${base}.json`);
          fs.writeFileSync(outFile, JSON.stringify(json, null, 2), 'utf8');
        }
        success++;
      } catch (error) {
        failed++;
      }
    }

    this.showMessage(`Batch completed. Success: ${success}, Failed: ${failed}`, failed ? 'warning' : 'success');
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
