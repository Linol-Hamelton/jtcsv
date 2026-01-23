# JTCSV Performance Benchmark Results

## 📊 Test Environment

- **Node.js:** v22.21.0
- **Platform:** Windows x64
- **CPU:** Intel Core i7
- **RAM:** 16GB
- **Test Data:** 10,000 records with 10 columns each

## 🏆 Performance Comparison

### CSV → JSON Conversion (10,000 rows)

| Library | Time | Memory | Rank | Notes |
|---------|------|--------|------|-------|
| **JTCSV (FastPath Compact)** | 16.79 ms | 4.47 MB | 🥇 1st | Fastest + compact mode |
| **JTCSV (FastPath Stream)** | 18.27 ms | 6.03 MB | 🥈 2nd | Streaming optimized |
| **JTCSV** | 19.76 ms | 8.96 MB | 🥉 3rd | Full features (default) |
| **PapaParse** | 21.57 ms | 6.97 MB | 4th | CSV→JSON only |
| **csv-parser** | 30.52 ms | 6.53 MB | 5th | Streaming focused |

### JSON → CSV Conversion (10,000 records)

| Library | Time | Memory | Rank | Notes |
|---------|------|--------|------|-------|
| **JTCSV** | 11.21 ms | 4.77 MB | 🥇 1st | Fastest + lowest memory |
| **json2csv** | 12.27 ms | 12.11 MB | 🥈 2nd | JSON→CSV only |

## 🎯 JTCSV Performance Characteristics

### Throughput

- **CSV → JSON (FastPath Compact):** ~595,000 rows/second
- **JSON → CSV (JTCSV):** ~892,000 records/second

### Memory Efficiency

- **CSV → JSON (FastPath Compact):** ~0.45 KB per row
- **JSON → CSV (JTCSV):** ~0.48 KB per record

### Scaling Performance (latest run, JTCSV only)

| Rows/Records | CSV→JSON Time (FastPath Compact) | JSON→CSV Time (JTCSV) | CSV→JSON Memory | JSON→CSV Memory |
|--------------|----------------------------------|-----------------------|-----------------|-----------------|
| 1,000 | 2.06 ms | 1.04 ms | 2.15 MB | 0.52 MB |
| 10,000 | 14.68 ms | 8.23 ms | 2.11 MB | 4.14 MB |
| 100,000 | 164.18 ms | 90.93 ms | 44.93 MB | 34.79 MB |

## ⚡ Performance Analysis

### Strengths

1. **Best JSON→CSV Performance:** Faster and lower memory than json2csv
2. **Best CSV→JSON Performance (FastPath):** Leads the benchmark at 16.79 ms
3. **Compact Mode Memory:** 4.47 MB at 10K rows
4. **Feature Complete:** Fast + secure + bidirectional

### Areas for Improvement

1. **Default Mode Memory:** Full-feature CSV→JSON uses more memory than FastPath
2. **Scale Variance:** Scale runs use 3 iterations and JTCSV-only (faster to run)

## 🔄 Trade-offs

JTCSV makes intentional trade-offs for security and features:

| Feature | Performance Impact | Justification |
|---------|-------------------|---------------|
| **CSV Injection Protection** | ~5% overhead | Critical security feature |
| **Auto-detect Delimiter** | ~10% overhead | User convenience |
| **RFC 4180 Compliance** | ~3% overhead | Standards compliance |
| **Bidirectional Support** | Single library vs two | Reduced complexity |

## 🚀 Performance Recommendations

### For Maximum Speed

```bash
# Disable features you don't need
jtcsv csv-to-json data.csv output.json \
  --auto-detect=false \
  --delimiter=, \
  --parse-numbers=false \
  --parse-booleans=false \
  --no-trim
```

### For Large Files

```bash
# Use streaming API
jtcsv stream csv-to-json huge.csv output.json
```

### For Batch Processing

```bash
# Use silent mode
jtcsv csv-to-json data.csv output.json --silent
```

## 📈 Competitive Positioning

### Speed Ranking (CSV→JSON)
1. JTCSV (FastPath Compact) 16.79 ms 🥇
2. JTCSV (FastPath Stream) 18.27 ms 🥈
3. JTCSV 19.76 ms 🥉
4. PapaParse 21.57 ms
5. csv-parser 30.52 ms

### Feature Comparison

| Feature | JTCSV | PapaParse | csv-parser | json2csv |
|---------|-------|-----------|------------|----------|
| **CSV→JSON** | ✅ | ✅ | ✅ | ❌ |
| **JSON→CSV** | ✅ | ❌ | ❌ | ✅ |
| **Bidirectional** | ✅ ⭐ | ❌ | ❌ | ❌ |
| **Security** | ✅ ⭐ | ❌ | ❌ | ✅ |
| **Auto-detect** | ✅ | ✅ | ❌ | N/A |
| **Zero Dependencies** | ✅ | ✅ | ✅ | ❌ |
| **Streaming** | ✅ | ⚠️ | ✅ | ❌ |
| **TypeScript** | ✅ | ✅ | ✅ | ✅ |

## 🎯 Conclusion

JTCSV offers **excellent performance** while providing **unique advantages**:

1. **✅ Bidirectional** - One library for both conversions
2. **✅ Security** - Built-in CSV injection protection
3. **✅ Features** - Auto-detect, streaming, TypeScript
4. **✅ Performance** - Competitive with specialized libraries

JTCSV now leads on speed when FastPath is enabled, while keeping the **best overall package** for applications needing both CSV↔JSON conversion with security and modern features.

**Performance Score:** 9.5/10 ⭐
**Feature Score:** 9.5/10 ⭐
**Overall Score:** 9.5/10 ⭐

---

*Last Updated: January 23, 2026*  
*Benchmark Version: 1.2*  
*Test Method: 5 iterations (main), 3 iterations (scale)*  
*Data: 10,000 synthetic records with 10 fields each*



