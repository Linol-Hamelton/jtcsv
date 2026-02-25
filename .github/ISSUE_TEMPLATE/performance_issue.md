---
name: Performance Issue
about: Report a performance problem
title: '[PERF] '
labels: performance
assignees: ''
---

## 🐌 Performance Issue Description

A clear and concise description of the performance issue.

## 📊 Benchmark Data

Please provide benchmark data if available:

```typescript
// Benchmark code
import { csvToJson } from 'jtcsv';

console.time('parse');
const result = csvToJson(largeCsv);
console.timeEnd('parse');
// Result: X ms
```

## 📁 Test Data

- **File size**: [e.g. 100MB]
- **Number of rows**: [e.g. 1,000,000]
- **Number of columns**: [e.g. 50]

## 🔧 Environment

- **JTCSV version**: [e.g. 3.1.0]
- **Node.js version**: [e.g. 20.10.0]
- **OS**: [e.g. Windows 11]
- **CPU**: [e.g. Intel i7-12700K]
- **RAM**: [e.g. 32GB]

## 📈 Memory Usage

What is the memory usage during the operation?

- **Before**: X MB
- **During**: X MB
- **After**: X MB

## 🔄 Comparison

How does this compare to other libraries?

| Library | Time | Memory |
|---------|------|--------|
| JTCSV | X ms | X MB |
| Papa Parse | X ms | X MB |
| csv-parser | X ms | X MB |

## 🎯 Expected Performance

What performance would you expect?

## 💭 Possible Solutions

Have you identified any potential causes or solutions?

## 📚 Additional Context

Add any other context about the performance issue here.

- Are you using streaming?
- Are you using Web Workers?
- What options are you passing to the function?
