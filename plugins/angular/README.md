# @jtcsv/angular

Current version: 1.0.0

Angular module for jtcsv - high-performance CSV/JSON conversion library for Angular applications.

## Install

```bash
npm install @jtcsv/angular @angular/core @angular/common jtcsv
```

## Quick Start

### Import Module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { JtcsvModule } from '@jtcsv/angular';

@NgModule({
  imports: [
    BrowserModule,
    JtcsvModule.forRoot()
  ],
  // ...
})
export class AppModule { }
```

### Use Service

```typescript
import { Component } from '@angular/core';
import { JtcsvService } from '@jtcsv/angular';

@Component({
  selector: 'app-converter',
  template: `
    <input type="file" (change)="onFileSelected($event)" accept=".csv" />
    <pre>{{ data | json }}</pre>
  `
})
export class ConverterComponent {
  data: any[] = [];

  constructor(private jtcsv: JtcsvService) {}

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    this.data = await this.jtcsv.parseCsvFile(file);
  }
}
```

### Use Pipes

```html
<!-- CSV to JSON -->
<div *ngFor="let item of csvData | csvToJson">
  {{ item.name }} - {{ item.age }}
</div>

<!-- JSON to CSV -->
<textarea>{{ jsonData | jsonToCsv }}</textarea>
```

## API

### JtcsvService

- `csvToJson(csv, options)` - Convert CSV to JSON
- `jsonToCsv(json, options)` - Convert JSON to CSV
- `parseCsvFile(file, options)` - Parse File object to JSON
- `downloadCsv(json, filename, options)` - Download as CSV file

### Pipes

- `csvToJson` - Pipe for CSV to JSON conversion
- `jsonToCsv` - Pipe for JSON to CSV conversion

## Example

See [example.ts](example.ts) for complete example.
