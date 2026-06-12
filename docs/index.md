---
layout: home

hero:
  name: jtcsv
  text: JSON ↔ CSV, fast and tree-shakable.
  tagline: 18 KB gz core. Zero deps. Streaming. Node + Browser.
  actions:
    - theme: brand
      text: Get started
      link: /GETTING_STARTED
    - theme: alt
      text: API decision tree
      link: /API_DECISION_TREE
    - theme: alt
      text: View on GitHub
      link: https://github.com/Linol-Hamelton/jtcsv

features:
  - title: 18 KB gz, tree-shakable
    details: >
      Subpath imports — `jtcsv/csv`, `jtcsv/json`, `jtcsv/streams`,
      `jtcsv/ndjson`, `jtcsv/tsv`, `jtcsv/errors`. Pay for what you
      import.
  - title: CSV injection guard by default
    details: >
      Cells starting with `= + - @ \t \r` are escaped before they ever
      reach Excel or Numbers. On by default — flip off only if you
      know why.
  - title: Streaming + worker threads
    details: >
      Node `Transform` streams, async iterators, and an opt-in
      worker-thread pool when the input is large enough to amortize
      spawn cost.
  - title: TypeScript-native
    details: >
      Strict TypeScript baseline, first-class `.d.ts`, and a regression
      ratchet that won't let strict errors climb back up.
  - title: Provenance-signed releases
    details: >
      Every release ≥ 3.0 ships with a Sigstore attestation. Verify
      with `npm audit signatures`.
  - title: Migration codemod
    details: >
      `npx jtcsv-codemod papaparse 'src/**/*.{js,ts}'` rewrites
      imports and call sites automatically.
---
