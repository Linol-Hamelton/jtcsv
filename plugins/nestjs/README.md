# @jtcsv/nestjs

NestJS interceptors and decorators for JTCSV.

## Install
```bash
npm install @jtcsv/nestjs jtcsv
```

## Usage
```typescript
import { CsvParserInterceptor, CsvDownloadDecorator } from 'jtcsv/nestjs';
import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('data')
export class DataController {
  @Post('upload')
  @CsvParserInterceptor({ delimiter: ',' })
  uploadCsv(@Body() jsonData: any[]) {
    return { parsed: jsonData };
  }

  @Get('export')
  @CsvDownloadDecorator({ filename: 'export.csv' })
  exportData() {
    return [{ id: 1, name: 'John' }];
  }
}
```

## Notes
- `CsvParserInterceptor` expects CSV text in the request body.
- `CsvDownloadDecorator` converts the handler result to CSV and sets download headers.
