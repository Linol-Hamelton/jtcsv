# @jtcsv/nestjs

Current version: 1.0.0

NestJS module for jtcsv - high-performance CSV/JSON conversion library for NestJS applications.

## Install

```bash
npm install @jtcsv/nestjs @nestjs/common @nestjs/core jtcsv
```

## Quick Start

### Import Module

```typescript
import { Module } from '@nestjs/common';
import { JtcsvModule } from '@jtcsv/nestjs';

@Module({
  imports: [JtcsvModule.forRoot()],
  // ...
})
export class AppModule {}
```

### Use Service

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { JtcsvService } from '@jtcsv/nestjs';

@Controller('convert')
export class ConvertController {
  constructor(private jtcsv: JtcsvService) {}

  @Post('csv-to-json')
  csvToJson(@Body() body: { csv: string }) {
    return this.jtcsv.csvToJson(body.csv);
  }

  @Post('json-to-csv')
  jsonToCsv(@Body() body: { json: any[] }) {
    return this.jtcsv.jsonToCsv(body.json);
  }
}
```

### Use Pipes

```typescript
import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ParseCsvPipe, JsonToCsvPipe } from '@jtcsv/nestjs';

@Controller('data')
export class DataController {
  @Post('parse')
  @UsePipes(new ParseCsvPipe({ delimiter: ',' }))
  parseCsv(@Body() data: any[]) {
    return data;
  }

  @Post('export')
  @UsePipes(new JsonToCsvPipe())
  exportCsv(@Body() data: any[]) {
    return data;
  }
}
```

### Use Interceptors

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CsvDownloadDecorator } from '@jtcsv/nestjs';

@Controller('export')
export class ExportController {
  @Get('csv')
  @UseInterceptors(CsvDownloadDecorator({ filename: 'data.csv' }))
  exportCsv() {
    return [
      { name: 'Product A', price: 29.99 },
      { name: 'Product B', price: 49.99 }
    ];
  }
}
```

## API

### JtcsvService

- `csvToJson(csv, options)` - Convert CSV to JSON
- `jsonToCsv(json, options)` - Convert JSON to CSV
- `csvToJsonAsync(csv, options)` - Async CSV to JSON
- `jsonToCsvAsync(json, options)` - Async JSON to CSV

### Pipes

- `ParseCsvPipe` - Pipe for CSV parsing
- `JsonToCsvPipe` - Pipe for JSON to CSV

### Interceptors

- `CsvParserInterceptor` - Interceptor for CSV parsing
- `CsvDownloadDecorator` - Interceptor for CSV download

## Example

See [example.ts](example.ts) for complete example.
