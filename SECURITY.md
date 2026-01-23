# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅                 |
| 0.x.x   | ✅ (security fixes only) |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in jtcsv, please report it via email to the maintainer:

**Email**: security@example.com (replace with actual security contact)

Please include the following information in your report:
- Type of vulnerability (e.g., CSV injection, path traversal, etc.)
- Steps to reproduce the vulnerability
- Potential impact
- Any suggested fixes

### Response Time
- **Initial Response**: Within 48 hours
- **Fix Timeline**: Within 7-14 days for critical vulnerabilities
- **Disclosure**: Coordinated disclosure after fix is released

## Security Features

### Built-in Protections

jtcsv includes several security features by default:

1. **CSV Injection Protection**
   - Automatic escaping of Excel formulas (`=`, `+`, `-`, `@`)
   - Prevents formula execution in spreadsheet applications
   - Configurable through options

2. **Path Traversal Protection**
   - Validation of file paths to prevent `../` attacks
   - Restriction to `.csv` file extensions only
   - Absolute path resolution with security checks

3. **Input Validation**
   - Type checking for all input parameters
   - Size limits to prevent memory exhaustion
   - Array bounds checking

4. **Error Handling**
   - Custom error classes for different failure modes
   - No exposure of sensitive information in error messages
   - Graceful degradation

### Security Best Practices

When using jtcsv, follow these security best practices:

#### 1. **Validate Input Data**
```javascript
// Always validate user input before processing
const { jsonToCsv } = require('jtcsv');

function safeConvert(userData) {
  if (!Array.isArray(userData)) {
    throw new Error('Input must be an array');
  }
  
  // Limit data size
  if (userData.length > 10000) {
    throw new Error('Data size exceeds limit');
  }
  
  return jsonToCsv(userData, { maxRecords: 10000 });
}
```

#### 2. **Use Safe File Paths**
```javascript
const { saveAsCsv } = require('jtcsv');

// Safe: Use user-provided filename with validation
async function exportUserData(data, userId) {
  // Generate safe filename
  const safeFilename = `export-${userId}-${Date.now()}.csv`;
  const safePath = `./exports/${safeFilename}`;
  
  await saveAsCsv(data, safePath, {
    validatePath: true // Default is true
  });
}
```

#### 3. **Handle CSV Injection Risks**
```javascript
// User data may contain malicious formulas
const dangerousData = [
  { id: 1, formula: '=HYPERLINK("http://evil.com","Click me")' },
  { id: 2, formula: '@IMPORTANT' }
];

// jtcsv automatically escapes these
const safeCsv = jsonToCsv(dangerousData);
// Formulas are prefixed with ' to prevent execution
```

#### 4. **Set Appropriate Limits**
```javascript
// Prevent memory exhaustion attacks
const options = {
  maxRecords: 100000, // Limit total records
  maxRows: 100000     // Limit CSV rows for csvToJson
};
```

## Known Security Considerations

### 1. **Memory Usage**
- Large CSV files (>100MB) may cause high memory usage
- Consider using streaming for very large files
- Set appropriate `maxRecords`/`maxRows` limits

### 2. **File System Access**
- File operations require appropriate permissions
- Directory traversal protection is enabled by default
- Only `.csv` files are allowed for read/write operations

### 3. **Character Encoding**
- UTF-8 encoding is used by default
- Special characters are properly escaped
- Excel compatibility may vary with non-ASCII characters

### 4. **Third-party Dependencies**
- jtcsv has **zero dependencies**
- No external packages are required
- Reduced attack surface

## Security Updates

Security updates will be released as:
- **Patch versions** (1.0.x) for critical vulnerabilities
- **Minor versions** (1.x.0) for security enhancements
- **Security advisories** published on GitHub

## Responsible Disclosure Timeline

1. **Report received**: Acknowledge within 48 hours
2. **Investigation**: 3-5 days to confirm vulnerability
3. **Fix development**: 7-14 days for critical issues
4. **Testing**: 2-3 days of security testing
5. **Release**: Patch released with security advisory
6. **Disclosure**: Public disclosure 30 days after patch release

## Credits

Security researchers who responsibly disclose vulnerabilities will be credited in:
- Release notes
- SECURITY.md file
- GitHub security advisory

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security-related issues:
- **Email**: security@example.com
- **PGP Key**: [Link to PGP key if available]

For non-security issues, use the [GitHub Issues](https://github.com/Linol-Hamelton/jtcsv/issues) page.



