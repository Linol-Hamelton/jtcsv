---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 Bug Description

A clear and concise description of what the bug is.

## 📋 Steps to Reproduce

1. Use JTCSV version '...'
2. Run this code:
```typescript
// Your code here
```
3. See error

## ✅ Expected Behavior

A clear and concise description of what you expected to happen.

## ❌ Actual Behavior

A clear and concise description of what actually happened.

## 📊 Code Sample

```typescript
import { csvToJson } from 'jtcsv';

// Minimal reproducible example
const csv = `a,b,c
1,2,3`;

const result = csvToJson(csv);
console.log(result);
```

## 🔧 Environment

- **JTCSV version**: [e.g. 3.1.0]
- **Node.js version**: [e.g. 20.10.0]
- **OS**: [e.g. Windows 11, macOS 14, Ubuntu 22.04]
- **TypeScript version**: [e.g. 5.3.0]

## 📝 Error Message

```
Paste the full error message here
```

## 📸 Screenshots

If applicable, add screenshots to help explain your problem.

## 📚 Additional Context

Add any other context about the problem here.

- Does this happen consistently or intermittently?
- Did this work in a previous version?
- Any workarounds you've found?
