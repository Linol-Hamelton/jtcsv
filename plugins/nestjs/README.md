# @jtcsv/nestjs
Current version: 3.1.0


NestJS interceptors for parsing CSV payloads and returning CSV responses.

## Install
```bash
npm install @jtcsv/nestjs jtcsv
```

## Usage
```typescript
import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { CsvParserInterceptor, CsvDownloadDecorator } from '@jtcsv/nestjs';

@Controller('data')
export class DataController {
  @Post('upload')
  @CsvParserInterceptor({ delimiter: ',' })
  upload(@Body() body: any[]) {
    return { rows: body };
  }

  @Post('export')
  @CsvDownloadDecorator({ filename: 'export.csv' })
  exportCsv() {
    return [{ id: 1, name: 'Jane' }];
  }
}
```

## Exports
- CsvParserInterceptor
- CsvDownloadDecorator
- createCsvParserInterceptor
- createCsvDownloadInterceptor
