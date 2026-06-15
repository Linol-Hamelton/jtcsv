---
title: Ecosystem
description: All the packages, codemods, framework adapters, and integrations that ship with jtcsv.
---

# jtcsv Ecosystem

jtcsv is a JSON ↔ CSV toolkit shipped as ONE small published package (~18 KB
gz) with optional siblings for Excel, codemods, framework adapters, and a
terminal UI. This page is the map.

## Distinguishing pillars

- ~18 KB gzipped for `jtcsv/csv` — about half of papaparse for the same workhorse.
- CSV-injection guard by default (`preventCsvInjection: true` covers `=`, `+`, `-`, `@` prefixes per OWASP).
- Tree-shakable subpath imports across 9 entries (`jtcsv/csv`, `/json`, `/streams`, `/ndjson`, `/tsv`, `/errors`, `/browser`, `/plugins`, `/schema`).
- Three formats in one package — CSV, NDJSON, and TSV first-class (one dependency, not three).
- TypeScript-native source — `.d.ts` generated from real types; strict-tsconfig clean on the public surface with a CI ratchet.
- Zero runtime dependencies in the core; Sigstore-signed npm provenance (`npm audit signatures jtcsv` verifies).
- Migration codemod — `npx jtcsv-codemod papaparse|csvtojson` rewrites imports and call sites. No competitor ships one.
- Worker threads (Node) opt-in via `useWorkers`; Web Workers (browser) via the `jtcsv-workers` subpath.

## Published packages

| Package | Version | Role | Install |
|---|---|---|---|
| jtcsv | 3.2.3 | Core JSON↔CSV/NDJSON/TSV toolkit. Streaming, browser-safe, zero deps. | `npm i jtcsv` |
| jtcsv-codemod | 0.2.0 | jscodeshift transforms for migrations from papaparse / csvtojson / csv-parser. | `npx jtcsv-codemod papaparse` |
| jtcsv-excel | 2.1.0 | Excel (.xlsx) round-trip via exceljs as a peer dep. | `npm i jtcsv-excel exceljs jtcsv` |
| jtcsv-react   | 0.1.0 | React hooks + components for jtcsv (useCsvUpload, useCsvParse, `<CsvDropZone>`). | `npm i jtcsv-react jtcsv react` |
| jtcsv-vue     | 0.1.0 | Vue 3 plugin + composables + v-csv-upload directive. | `npm i jtcsv-vue jtcsv vue` |

Note: `jtcsv-excel` is staged for npm publish in the Phase 4 release window.
Until then it lives in the monorepo and can be linked locally via npm
workspaces.

All three of jtcsv-excel, jtcsv-react, jtcsv-vue are staged for unscoped publish in Phase 5 — see [docs/ECOSYSTEM_RENAMES.md](/ECOSYSTEM_RENAMES) for the rename plan; the imminent jtcsv@3.3.0-beta.0 cut on the next dist-tag is the first opportunity to publish them alongside the core.

## Planned packages

| Current name | Target name | Status | What it does |
|---|---|---|---|
| @jtcsv/validator | jtcsv-validator | private, Phase 5 W13 | Zod-like schema validation over CSV/JSON pipelines |
| @jtcsv/tui | jtcsv-tui | private, Phase 5 W14 | Terminal UI for interactive CSV inspection (blessed) |
| @jtcsv/express-middleware | jtcsv-express | private, Phase 5 W13 | Express middleware for CSV/JSON request bodies |
| @jtcsv/fastify | jtcsv-fastify | private, Phase 5 W13 | Fastify plugin (peer fastify-plugin ^4 \|\| ^5) |
| @jtcsv/hono | jtcsv-hono | private, Phase 5 W14 | Hono middleware (peer hono ^4) |
| @jtcsv/nestjs | jtcsv-nestjs | private, Phase 5 W14 | NestJS module (peer @nestjs/common+core ^9 \|\| ^10 \|\| ^11, rxjs ^7) |
| @jtcsv/nextjs | jtcsv-nextjs | private, Phase 5 W14 | Next.js App Router + Pages API routes + React hooks |

Note: the `@jtcsv` npm scope is squatted by an unrelated user; all sibling
packages ship unscoped. See [Ecosystem renames](/ECOSYSTEM_RENAMES) for the
rename plan.

## Framework recipes

Copy-paste examples (not published as packages) live under
`examples/frameworks/` for: Angular, Nuxt, Remix, Svelte, SvelteKit, tRPC,
Vue. If one deserves a published wrapper, open an issue.

| Framework | Doc | Summary |
|---|---|---|
| Express | [/integrations/express](/integrations/express) | CSV uploads via Busboy + createCsvToJsonStream |
| Fastify | [/integrations/fastify](/integrations/fastify) | CSV uploads via @fastify/multipart + createCsvToJsonStream |
| React Hook Form | [/integrations/react-hook-form](/integrations/react-hook-form) | Import CSV into a form using parseCsvFile from jtcsv/browser |
| Next.js App Router | [/integrations/nextjs-app-router](/integrations/nextjs-app-router) | Parse CSV uploads in an App Router POST route via csvToJson |
| Drizzle ORM | [/integrations/drizzle-orm](/integrations/drizzle-orm) | Import CSV into Postgres via csvToJson + Drizzle (pg) |
| GraphQL | [/integrations/graphql](/integrations/graphql) | Accept CSV uploads via Apollo Server + graphql-upload |

## Command-line binaries

| Binary | Provided by | Purpose |
|---|---|---|
| `jtcsv` | `jtcsv` | Convert / stream / inspect CSV ↔ JSON / NDJSON / TSV from the shell. |
| `jtcsv-codemod` | `jtcsv-codemod` | Run jscodeshift transforms to rewrite papaparse / csvtojson sources to jtcsv. |
| `jtcsv-tui` | (planned) | Terminal UI for interactive CSV inspection (blessed + blessed-contrib). |

## Plugin host

`jtcsv/plugins` is a Node-only subpath providing the plugin manager.
Plugins are first-class user code — the host calls registered hooks but does
NOT sandbox them; treat plugin paths like `require()` — never
untrusted-string-derived. See [Plugin authoring](/PLUGIN_AUTHORING) and
[Plugins overview](/PLUGINS).

## Browser bundle

`jtcsv/browser` is a self-contained UMD + ESM bundle (~16 KB ESM / ~16 KB
UMD — browser ESM bundle, distinct from the ~18 KB gz `jtcsv/csv` subpath)
with a separate Web Worker integration via the `jtcsv-workers` subpath (see
[Browser Workers](/BROWSER_WORKERS)).

## Codemods

The `jtcsv-codemod` package ships jscodeshift transforms that rewrite
imports + call sites from the most common alternatives to jtcsv:

```bash
# papaparse → jtcsv
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'

# csvtojson → jtcsv
npx jtcsv-codemod csvtojson 'src/**/*.{js,ts,tsx}'
```

Both transforms handle imports, option renames, and call-site rewrites.
Lossy conversions (event-emitter style `.on('json')`, csvtojson's
`preFileLine`, papaparse's `step`) are surfaced as inline TODO comments
instead of being silently dropped.

## Security & provenance

Every release ≥3.0 is published with `--provenance` via GitHub Actions; the
Sigstore attestation is verifiable with `npm audit signatures jtcsv`.
Supply-chain controls: zero runtime deps in the core, OpenSSF Scorecard run
nightly, all GitHub Actions SHA-pinned, Dependabot weekly. See
[Threat Model](/THREAT_MODEL) for STRIDE + ADRs.

## What's NOT in the ecosystem

- Excel formulas (xlsx is round-trip only; pivot tables / chart objects are out of scope).
- HTML table parsing (use jsdom + jtcsv yourself).
- AWS S3 / GCS adapters (use the cloud SDK stream into createCsvToJsonStream — that's the recipe).
- Real-time tail / fs.watch wrappers — out of scope; pipe `tail -f` into the CLI instead.

## Contributing

Want to ship an adapter / plugin / codemod? See
[docs/PLUGIN_AUTHORING.md](/PLUGIN_AUTHORING) and open a discussion on
GitHub.
