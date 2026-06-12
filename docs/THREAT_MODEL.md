---
title: Threat Model
description: STRIDE breakdown, trust boundaries, and ADRs for jtcsv.
---

# jtcsv Threat Model

> Last updated: Phase 2 Week 6 — Linked from SECURITY.md.
> Owner: maintainer. Disclosure path lives in `SECURITY.md`.

This document is the authoritative source for what jtcsv claims to
defend against — and, just as importantly, what it does **not**. If a
behavior surprises you against this document, that is a security bug.
Report it via the channel in `SECURITY.md`.

## 1. Scope

| Component                         | In scope | Reason                                           |
|-----------------------------------|:--------:|--------------------------------------------------|
| `jtcsv` (CSV ⇄ JSON core)         | ✅        | The package — every direct dependent inherits.   |
| `jtcsv/csv`, `/json`, `/streams`, `/ndjson`, `/tsv`, `/errors` | ✅ | Subpath surfaces — same trust level as the core. |
| `jtcsv/browser` (browser bundle)  | ✅        | Embedded in third-party web apps.                |
| `jtcsv/plugins` (Node plugin host)| ✅ (host) | The host is in scope; user plugins are not.      |
| `jtcsv/schema` (Zod-backed)       | ✅        | Validation surface — defense in depth.           |
| `src/utils/transform-loader.ts`   | ⚠️ partial| See ADR-001 — the `vm.Script` sandbox is NOT a security boundary. |
| `src/web-server/index.ts`         | ✅        | Localhost dev convenience; hardened in Week 6.   |
| `jtcsv-codemod` (sibling pkg)     | ➖        | Dev-time codemod; runs on the user's source tree under their existing trust. |
| Anything a user `require()`s or imports from their own code | ❌ | User code is the user's trust boundary. |

## 2. Trust Boundaries

```
┌────────────────────────────────────────────────────────────────────┐
│  UNTRUSTED INPUT                                                   │
│  • CSV / TSV / NDJSON text from network, files, user paste         │
│  • JSON input to jsonToCsv                                         │
│  • HTTP request body to the dev web-server                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  validated, parsed, emitted
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  jtcsv LIBRARY CODE (in scope)                                     │
│  • Parsers (fast-path + standard quote-aware)                      │
│  • Serializers, streams, codemod (separate pkg)                    │
│  • Schema validators                                               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  function returns / stream emits
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  CALLER APPLICATION (trusted — user's own code)                    │
│  • Persists results, sends them downstream, renders them, etc.     │
└────────────────────────────────────────────────────────────────────┘
```

The same boundaries map onto trust labels we use throughout the code:
**INPUT** (everything from the outside), **LIB** (in this repo), and
**APP** (the caller).

## 3. STRIDE — by category

For each STRIDE category we list the threat as it applies to jtcsv,
the defense, and the test/code that proves it. `n/a` rows are listed
explicitly so callers can see what's deliberately out of scope.

### S — Spoofing

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| S1 | Tampered package published under our name | npm provenance (`--provenance`) signed publish; verified post-publish in [`scripts/verify-release.js`](https://github.com/Linol-Hamelton/jtcsv/blob/main/scripts/verify-release.js) | CI: `release.yml`; manual: `npm audit signatures` |
| S2 | Counterfeit lookalike package (e.g. `jtcs`, `jtcsv-pro`) | Out of npm's control; documented in `SECURITY.md` so users know to verify the publisher | n/a — process-only |

### T — Tampering

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| T1 | A row-shift / off-by-one parse silently emits cross-field data | `repairRowShifts` is opt-in; default `strictRowLengths: true` throws `ParsingError.fieldCountMismatch` with line + Hint | [`__tests__/edge-cases-hardening.test.ts`](https://github.com/Linol-Hamelton/jtcsv/blob/main/__tests__/edge-cases-hardening.test.ts) |
| T2 | An injected formula cell (`=cmd|'/c calc'!A0`) opens in Excel/Numbers | `csvInjectionGuard` is **on by default**; cells starting with `= + - @ \t \r` are quoted with a leading `'` | tests in `__tests__/` (injection suite) |
| T3 | Supply-chain compromise via transitive dep | Core is **zero deps**; lock file pinned; `Dependabot` weekly; `OpenSSF Scorecard` runs nightly | `dependabot.yml`, `scorecard.yml` |
| T4 | Compromised GitHub Action — silent build poisoning | All Actions SHA-pinned (16 actions); strict review of any SHA bumps | `.github/workflows/*` |

### R — Repudiation

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| R1 | "Did this artifact really come from this commit?" | Sigstore-backed provenance attests `(repo, ref, commit, workflow)` for every release ≥ 3.0 | `npm view jtcsv --json | jq .dist.signatures` |
| R2 | Releaser can disavow a release that broke users | Changesets + git tag + signed provenance is a tamper-evident trail | — |

### I — Information Disclosure

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| I1 | Parser leaks input fragments into error messages, helping an attacker probe the schema | `ParsingError` truncates `value` to 200 chars + ellipsis; no full input is ever embedded | [`__tests__/actionable-errors.test.ts`](https://github.com/Linol-Hamelton/jtcsv/blob/main/__tests__/actionable-errors.test.ts) |
| I2 | Dev web-server returns `Access-Control-Allow-Origin: *` and is reachable from the internet | Default bind is `127.0.0.1`; CORS is **allowlist-only** since Week 6 (`JTCSV_CORS_ALLOW`); README marks the server "dev-only" | `src/web-server/index.ts` |
| I3 | Stack traces in transform-loader expose host paths | Path is included intentionally for debuggability; product policy: web-server returns generic 500, library throws `ParsingError` with `value` truncated. Apps that surface library errors to end users must scrub the stack themselves. | — |

### D — Denial of Service

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| D1 | Catastrophic regex / ReDoS on malicious input | All regexes audited via [`scripts/audit-regex.js`](https://github.com/Linol-Hamelton/jtcsv/blob/main/scripts/audit-regex.js) with `safe-regex2`; 34 patterns curated; CI gate on every release | `prepublishOnly` runs `npm run audit:regex` |
| D2 | Unbounded memory blow-up on a single huge cell or row | Fast-path bailout when row exceeds bounds; standard parser is streaming-friendly via `createCsvToJsonStream` | [`__tests__/edge-cases-hardening.test.ts`](https://github.com/Linol-Hamelton/jtcsv/blob/main/__tests__/edge-cases-hardening.test.ts) |
| D3 | Dev web-server accepts unbounded request body | Body size cap (default 10 MB, env `JTCSV_MAX_BODY_BYTES`) added Week 6 | `src/web-server/index.ts` |
| D4 | DoS via repeated parse of attacker-controlled input | Out of scope for a library — rate limiting belongs in the caller (reverse proxy, framework middleware, etc.) | n/a — documented |
| D5 | Worker-thread spawn storm on tiny inputs | `useWorkers: true` opt-in; threshold (~1 MB / 5 K rows) before workers spin up; silent sync fallback otherwise | docs/BROWSER_WORKERS.md, `src/parallel/csv-parser-orchestrator.ts` |

### E — Elevation of Privilege

| # | Threat | Mitigation | Verified by |
|---|--------|------------|-------------|
| E1 | A user-supplied JS **transform file** executes arbitrary code with the host's privileges | **Not mitigated by sandboxing** — see [ADR-001](#adr-001-transform-loader-is-not-a-security-boundary). The loader is a developer-ergonomics convenience, NOT an isolation primitive. Operators must not pass attacker-controlled transform paths. | [`__tests__/transform-loader-security.test.ts`](https://github.com/Linol-Hamelton/jtcsv/blob/main/__tests__/transform-loader-security.test.ts) |
| E2 | Path traversal to load a non-transform file as JS | Rejected with `SecurityError`; `..` and `..\\` in path blocked at the entry function | same test file |
| E3 | A malicious cell value gets interpreted as a formula at the spreadsheet boundary | `csvInjectionGuard` (default on) prefixes with `'` | injection test suite |

## 4. Out of Scope (deliberate non-goals)

The library does NOT promise to defend against, and contributions should
not be filed claiming any of these are vulnerabilities:

- **The user feeds attacker-controlled data into a JS transform.** Once
  you opt into `transform=path/to.js`, the loader does its best to spot
  obvious bad patterns and reject `..` paths — but the loaded file
  runs in your Node process with your privileges. Treat transform
  paths like you'd treat `require()`: never untrusted-string-derived.
  See ADR-001.
- **Side-channel attacks** (timing, cache, memory). jtcsv is a CSV
  parser, not a constant-time crypto primitive.
- **DoS via legitimate-but-large input.** Throttling, queueing, and
  resource limits belong upstream of the library (reverse proxy,
  framework middleware, OS limits).
- **Sandbox / VM escape.** We do not run untrusted code in a sandbox.
  Where `vm.Script` is used (transform-loader), the sandbox is
  documented as non-isolating (ADR-001).
- **Counterfeit lookalike npm packages.** That's an npm/registry concern.
- **The user's own plugin code.** Plugins are first-class user code;
  jtcsv hosts them, not isolates them.

## 5. Decisions of Record (ADRs)

### ADR-001 — transform-loader is NOT a security boundary

**Context.** `src/utils/transform-loader.ts` loads user-supplied JS via
`vm.createContext` + `vm.Script`. A casual reader could conclude that
because `vm` is involved, the loaded code is sandboxed and isolated
from the host process.

**It is not.** The sandbox we construct exposes `require` — that's a
hard requirement for transforms to be useful (they need to import
helpers, dates, validators, etc.). With `require` in scope, the
"sandbox" can reach `fs`, `child_process`, `vm.runInThisContext`, and
anything else Node exposes. It is **trivial** to escape.

**Defense in depth still applies.** The loader:
1. Rejects path-traversal patterns (`..`, `..\\`) at the entry point.
2. Requires a `.js` extension.
3. Runs a heuristic `validateTransformSafety()` over the function
   source to flag `eval`, `new Function`, `require`, `fs.`,
   `setTimeout`, `while(true)`, and `process.exit`. The flag is
   surfaced to the caller; it does **not** block execution.
4. Throws on missing-file or syntax errors with a `ValidationError`.

**Decision.** Document the non-boundary explicitly and surface it in
two places:
1. **Here** — this ADR is the source of truth.
2. **CLI** — a future version (planned Phase 4) requires
   `--allow-unsafe-transforms` before any `transform=path.js` argument
   is accepted, with a clearly-worded warning in `--help`.

Until that CLI flag lands, the loader is exercised only by callers
that pass transform paths derived from their own configuration —
never from untrusted input.

**Status.** Accepted, Phase 2 Week 6. Owner: maintainer.

### ADR-002 — Web-server is dev-only, localhost-bound by default

**Context.** `src/web-server/index.ts` ships a tiny HTTP server so
users can `npx jtcsv serve` and use the package in a browser via
`fetch`. It is documented as a dev convenience.

**Decision.** Enforce in code:
1. Default `HOST=localhost` (already true).
2. CORS allowlist via `JTCSV_CORS_ALLOW` env var. Default behavior is
   to allow only same-origin (`http://localhost*` / `http://127.0.0.1*`).
   `*` is no longer the default.
3. Request body size cap, default 10 MB, env `JTCSV_MAX_BODY_BYTES`.
4. README + CLI `--help` carry the warning "do not expose to the
   public internet — put a reverse proxy in front, or use the library
   directly".

**Status.** Accepted, Phase 2 Week 6.

## 6. Reporting

Anything that contradicts the above is a security issue. Use the
disclosure path in [`SECURITY.md`](https://github.com/Linol-Hamelton/jtcsv/blob/main/SECURITY.md):
1. GitHub Private Vulnerability Reporting (preferred), or
2. `feldhausthorsen@gmail.com` (secondary).

SLA targets are in `SECURITY.md`.
