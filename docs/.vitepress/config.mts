import { defineConfig } from 'vitepress';

// VitePress site config — Phase 2 Week 6 scaffold (DOCS M1).
// Lift-and-shift of existing /docs MD files happens in W7 (DOCS M2).
// Public deploy URL is decided in Phase 4 W11 (DOCS M7); for now this
// builds locally and into the gh-pages preview slot.
export default defineConfig({
  title: 'jtcsv',
  description:
    'JSON ↔ CSV toolkit for Node.js and the browser. Streaming. Tree-shakable. 18 KB gz core. Zero deps.',
  // We currently host static type-doc output under /api/. Keep the
  // VitePress site under the root so cross-links from README work.
  base: '/',
  cleanUrls: true,
  lastUpdated: true,

  // External links open in a new tab; relative MD links rewrite to the
  // generated route automatically (so /docs/POSITIONING.md → /POSITIONING).
  rewrites: {
    // The repo's /docs root maps to the site root.
    ':path(.*)': ':path',
  },

  // Source files live in /docs at the repo root — same directory we
  // already use for human-readable Markdown. VitePress reads from here.
  srcDir: '.',
  outDir: '.vitepress/dist',

  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/GETTING_STARTED' },
      { text: 'API', link: '/API_DECISION_TREE' },
      { text: 'Recipes', link: '/recipes/' },
      { text: 'Migration', link: '/MIGRATION_PAPAPARSE' },
      { text: 'Security', link: '/THREAT_MODEL' },
      {
        text: 'Links',
        items: [
          { text: 'npm', link: 'https://www.npmjs.com/package/jtcsv' },
          { text: 'GitHub', link: 'https://github.com/Linol-Hamelton/jtcsv' },
          { text: 'Changelog', link: 'https://github.com/Linol-Hamelton/jtcsv/blob/main/CHANGELOG.md' },
        ],
      },
    ],

    // Sidebar groups by topic — matches the README's "Documentation" table.
    // Adding/removing pages here is the only edit needed when DOCS M2 lifts
    // the rest of /docs/ into the published site.
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'README', link: '/README' },
          { text: 'Getting Started', link: '/GETTING_STARTED' },
          { text: 'Quick Start', link: '/QUICK_START' },
          { text: 'Positioning', link: '/POSITIONING' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Decision Tree', link: '/API_DECISION_TREE' },
          { text: 'Canonicalization', link: '/API_CANONICALIZATION' },
          { text: 'Errors', link: '/ERRORS' },
          { text: 'Schema Validator', link: '/SCHEMA_VALIDATOR' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Streaming', link: '/STREAMING_GUIDE' },
          { text: 'Browser', link: '/BROWSER' },
          { text: 'Browser Workers', link: '/BROWSER_WORKERS' },
          { text: 'CLI', link: '/CLI' },
          { text: 'Plugins', link: '/PLUGINS' },
          { text: 'Plugin Authoring', link: '/PLUGIN_AUTHORING' },
          { text: 'Best Practices', link: '/BEST_PRACTICES_AND_INSIGHTS' },
          { text: 'Troubleshooting', link: '/TROUBLESHOOTING' },
          { text: 'Performance', link: '/PERFORMANCE' },
          { text: 'Benchmarks', link: '/BENCHMARKS' },
        ],
      },
      {
        text: 'Migration',
        items: [
          { text: 'From papaparse', link: '/MIGRATION_PAPAPARSE' },
          { text: 'From csvtojson', link: '/MIGRATION_CSVTOJSON' },
          { text: 'Comparison matrix', link: '/COMPARISON' },
        ],
      },
      {
        text: 'Security',
        items: [
          { text: 'Threat Model', link: '/THREAT_MODEL' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Linol-Hamelton/jtcsv' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/jtcsv' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'jtcsv — JSON ↔ CSV toolkit',
    },

    editLink: {
      pattern: 'https://github.com/Linol-Hamelton/jtcsv/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },

  // Don't fail the build on dead links to files we haven't lifted yet —
  // DOCS M2 will complete the migration in Phase 2 Week 7.
  ignoreDeadLinks: true,
});
