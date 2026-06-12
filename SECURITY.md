# Security Policy

## Supported versions

| Version | Status |
| ------- | ------ |
| 3.x     | ✅ Active — bug + security fixes |
| 2.x     | ⚠️ Security-fix only (until 2026-12-31) |
| 1.x     | ❌ End of life |
| 0.x     | ❌ End of life |

`jtcsv` follows semantic versioning. Security fixes are released as patch
versions on the active line; coordinated disclosures are tagged
`security/<advisory-id>` and listed on the GitHub Security tab.

## Reporting a vulnerability

**Do not** open a public GitHub issue or pull request for security bugs.

We accept reports through three channels, in order of preference:

1. **GitHub Private Vulnerability Reporting** — preferred.
   [Open a draft advisory](https://github.com/Linol-Hamelton/jtcsv/security/advisories/new).
   This creates a private, end-to-end-encrypted thread with the
   maintainer and survives email churn.

2. **Email** — `feldhausthorsen@gmail.com`. Subject must start with
   `[jtcsv-security]`. Encrypted email (PGP) is welcome but not required;
   we will respond from the same address and rotate to GitHub PVR for
   subsequent messages.

3. **OSV / Snyk / Sonatype** disclosure pipelines forward to the same
   inbox. If you discovered the issue through one of those programs,
   include their reference ID in your report.

Please include:

- a minimal reproducer (a few lines of CSV/JSON and the `jtcsv` call
  that triggers the issue);
- the `jtcsv` and Node.js versions you used;
- what behaviour you expected versus what happened;
- impact estimate (data leak? code execution? DoS? formula injection
  reaching a spreadsheet?);
- any suggested fix or mitigation.

### Response SLA

| Severity     | Acknowledgement | Patch target | Public disclosure |
| ------------ | --------------- | ------------ | ----------------- |
| Critical (RCE / data exfiltration) | 24 h | 7 days | within 30 days of patch |
| High (DoS, auth bypass, supply-chain) | 48 h | 14 days | within 45 days |
| Medium (logic bug with security implication) | 72 h | 30 days | next minor release |
| Low (hardening, defence-in-depth) | 7 days | next minor | with release notes |

The maintainer is a single person; SLA targets are best-effort, not
contractual. If 72 hours pass without acknowledgement, please ping via
GitHub PVR — the inbox may be missed but the advisory thread will not.

We follow [coordinated disclosure][cd]: we will work with you on the
disclosure timing and credit you in release notes and the advisory
unless you ask to remain anonymous.

[cd]: https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure

## Built-in security defaults

`jtcsv`'s factory defaults assume the input is untrusted:

| Default                  | Protects against            |
| ------------------------ | --------------------------- |
| `preventCsvInjection: true` | Excel formula execution (`=`, `+`, `-`, `@`-prefix cells with smart whitespace handling) |
| `validateFilePath` on read/write | Path traversal (`../`), UNC paths, non-`.csv`/`.json` extensions |
| `maxRows` / `maxRecords` opt-in | Memory exhaustion via large input |
| `normalizeQuotes: true` (write) | Smart-quote / backtick / single-quote injection that breaks downstream parsers |
| `rfc4180Compliant: true` (write) | Non-standard escaping causing data corruption when re-read |
| Granular error classes (no input echo by default) | Information leakage through error messages |
| Zero runtime dependencies | Transitive supply-chain attacks |

Override any of these consciously — every flag has a clearly named
option. See `docs/SECURITY.md` (forthcoming docs site) for a per-flag
threat-model rationale.

## Threat model boundaries

`jtcsv` treats the following as **untrusted by default**:

- the CSV/JSON/NDJSON/TSV content itself;
- column headers (used as object keys — they will not influence path
  resolution);
- file paths supplied by an end user.

We treat as **trusted**:

- the JavaScript / TypeScript source calling `jtcsv` (we assume the
  application code is not adversarial);
- the Node.js runtime and its built-ins;
- the local filesystem at the paths the calling code chose to operate
  on (we validate the path string but cannot reason about the
  filesystem's state).

Out of scope:

- denial-of-service from an attacker who controls input *and* memory
  policy (use `maxRows`/`maxRecords` + a process manager);
- malicious npm packages between you and the user (use `npm audit
  signatures` and lockfile-lint);
- timing or side-channel attacks against your application.

See `docs/THREAT_MODEL.md` (forthcoming) for the full STRIDE-style
breakdown.

## Hardening checklist for consumers

When you depend on `jtcsv` in a security-sensitive context:

```js
// 1. Verify supply-chain integrity at install time.
//    Run as part of CI; the publish workflow signs with Sigstore.
$ npm audit signatures jtcsv

// 2. Pin to a major version range.
"dependencies": { "jtcsv": "^3.2.0" }

// 3. Override defaults *only* with intent. The factory defaults assume
//    a hostile input.
const data = csvToJson(untrusted, {
  maxRows: 100_000,            // explicit memory cap
  preventCsvInjection: true,   // already default; restated to lock it
  parseNumbers: false,         // strings unless you really want coercion
});

// 4. Save to disk under a directory you own — never reuse the user's
//    filename without sanitisation, even though saveAsCsv guards
//    against traversal.
await saveAsCsv(data, path.join(EXPORTS_DIR, randomId() + '.csv'));
```

## Supply chain

- All `npm publish` runs from the official GitHub Actions release
  workflow include `--provenance` (npm + Sigstore attestation). Verify
  with `npm audit signatures jtcsv`.
- Releases are tagged `jtcsv@<version>` and the tag commit matches the
  published tarball commit.
- The runtime tree has **zero dependencies**. `optionalDependencies`
  contains only `glob` (used for batch CLI globbing; absent on browser
  installs).
- A Software Bill of Materials (CycloneDX format) is published with
  each tagged release (in progress — landing with 3.3.0).

## Past advisories

None published as of this release. Advisories will appear under
[GitHub Security Advisories][adv].

[adv]: https://github.com/Linol-Hamelton/jtcsv/security/advisories

## References

- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [Coordinated Vulnerability Disclosure](https://www.cisa.gov/coordinated-vulnerability-disclosure-process)
