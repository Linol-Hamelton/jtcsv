import { defineConfig } from 'vitepress';

// VitePress site config — Phase 2 Week 7 (DOCS M2) lift-and-shift.
// All human-readable Markdown in /docs is now part of the published site.
// Public deploy URL is decided in Phase 4 W11 (DOCS M7); for now this
// builds locally and into the gh-pages preview slot.
// - DOCS M6 (Week 10): switched local search to a richer MiniSearch config —
//   custom tokenize/processTerm + AND-combine, branded translations.
export default defineConfig({
  title: 'jtcsv',
  description:
    'JSON ↔ CSV toolkit for Node.js and the browser. Streaming. Tree-shakable. 18 KB gz core. Zero deps.',
  // We currently host static type-doc output under /api/. Keep the
  // VitePress site under the root so cross-links from README work.
  base: '/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'mask-icon', href: '/favicon.svg', color: '#0EA5A4' }],
    // OpenGraph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'jtcsv — JSON ↔ CSV toolkit' }],
    ['meta', { property: 'og:description', content: 'JSON ↔ CSV in Node and the browser. Streaming. Tree-shakable. ~18 KB gz core. Zero runtime deps in core.' }],
    ['meta', { property: 'og:image', content: 'https://raw.githubusercontent.com/Linol-Hamelton/jtcsv/main/docs/public/og-image.svg' }],
    ['meta', { property: 'og:url', content: 'https://linol-hamelton.github.io/jtcsv/' }],
    ['meta', { property: 'og:site_name', content: 'jtcsv' }],
    // Twitter
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'jtcsv — JSON ↔ CSV toolkit' }],
    ['meta', { name: 'twitter:description', content: 'JSON ↔ CSV in Node and the browser. ~18 KB gz core. Zero runtime deps in core.' }],
    ['meta', { name: 'twitter:image', content: 'https://raw.githubusercontent.com/Linol-Hamelton/jtcsv/main/docs/public/og-image.svg' }],
    // Theme color (PWA + Safari)
    ['meta', { name: 'theme-color', content: '#0EA5A4' }],
  ],

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

  // Exclude Russian-internal working docs, the generated TypeDoc HTML bundle
  // (classes/functions/interfaces + the static *.html roots under /api/), and
  // /embeds/ code fragments. We KEEP /api/*.md — the four hand-authored
  // subpath reference pages (csv/json/streams/errors) live there.
  srcExclude: [
    '**/FINAL_REPORT.md',
    '**/FINAL_SUMMARY.md',
    '**/PROGRESS.md',
    '**/TZ_JTCSV_BROWSER_SUPPORT.md',
    '**/BUILD_INSTRUCTIONS.md',
    '**/TESTING.md',
    '**/QUICK_START.md',
    '**/POSITIONING_DRAFT.md',
    '**/README_ALL_DOCS.md',
    '**/BEST_PRACTICES_AND_INSIGHTS.md',
    '**/api/classes/**',
    '**/api/functions/**',
    '**/api/interfaces/**',
    '**/api/assets/**',
    '**/api/index.html',
    '**/api/hierarchy.html',
    '**/api/modules.html',
    '**/embeds/**',
  ],

  themeConfig: {
    logo: {
      light: '/logo.svg',
      dark: '/logo.svg',
      alt: 'jtcsv',
    },
    siteTitle: 'jtcsv',

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
    sidebar: [
      { text: 'Start', items: [
        { text: 'README', link: '/README' },
        { text: 'Getting Started', link: '/GETTING_STARTED' },
        { text: 'Positioning', link: '/POSITIONING' },
        { text: 'FAQ', link: '/FAQ' },
        { text: 'How-to', link: '/HOWTO' },
      ]},
      { text: 'API', items: [
        { text: 'Intro', link: '/API_INTRO' },
        { text: 'Decision Tree', link: '/API_DECISION_TREE' },
        { text: 'Canonicalization', link: '/API_CANONICALIZATION' },
        { text: 'Migration (internal API)', link: '/API_MIGRATION' },
        { text: 'Errors', link: '/ERRORS' },
        { text: 'Schema Validator', link: '/SCHEMA_VALIDATOR' },
      ]},
      {
        text: 'API Reference (Subpaths)',
        items: [
          { text: 'jtcsv/csv', link: '/api/csv' },
          { text: 'jtcsv/json', link: '/api/json' },
          { text: 'jtcsv/streams', link: '/api/streams' },
          { text: 'jtcsv/errors', link: '/api/errors' },
        ],
      },
      { text: 'Recipes', collapsed: true, items: [
        { text: 'Index', link: '/recipes/' },
        { text: 'Upload & parse', link: '/recipes/01-upload-parse-table' },
        { text: 'Validation errors', link: '/recipes/02-csv-validation-errors' },
        { text: 'Transform / rename / filter', link: '/recipes/03-transform-rename-filter' },
        { text: 'Convert formats', link: '/recipes/04-convert-formats' },
        { text: 'Performance — large files', link: '/recipes/05-performance-large-files' },
        { text: 'Type coercion', link: '/recipes/06-type-coercion-custom-parsing' },
        { text: 'Encoding', link: '/recipes/07-special-characters-encoding' },
        { text: 'react-hook-form', link: '/recipes/08-react-hook-form' },
        { text: 'Database import (Prisma)', link: '/recipes/09-database-import-prisma' },
        { text: 'CLI automation', link: '/recipes/10-cli-automation' },
      ]},
      { text: 'Guides', items: [
        { text: 'Streaming', link: '/STREAMING_GUIDE' },
        { text: 'Browser', link: '/BROWSER' },
        { text: 'Browser Workers', link: '/BROWSER_WORKERS' },
        { text: 'CLI', link: '/CLI' },
        { text: 'TUI', link: '/TUI-README' },
        { text: 'Troubleshooting', link: '/TROUBLESHOOTING' },
      ]},
      { text: 'Plugins', items: [
        { text: 'Overview', link: '/PLUGINS' },
        { text: 'Plugin Authoring', link: '/PLUGIN_AUTHORING' },
        { text: 'Plugin Registry', link: '/PLUGIN_REGISTRY' },
      ]},
      { text: 'Migration', items: [
        { text: 'From papaparse', link: '/MIGRATION_PAPAPARSE' },
        { text: 'From csvtojson', link: '/MIGRATION_CSVTOJSON' },
        { text: 'Comparison matrix', link: '/COMPARISON' },
      ]},
      { text: 'Performance', items: [
        { text: 'Performance', link: '/PERFORMANCE' },
        { text: 'Benchmarks', link: '/BENCHMARKS' },
        { text: 'Testing Guide', link: '/TESTING_GUIDE' },
      ]},
      { text: 'Security', items: [
        { text: 'Threat Model', link: '/THREAT_MODEL' },
      ]},
      { text: 'Ecosystem', items: [
        { text: 'Overview', link: '/ECOSYSTEM' },
        { text: 'Renames', link: '/ECOSYSTEM_RENAMES' },
      ]},
      { text: 'Brand', items: [
        { text: 'Brand Kit', link: '/BRAND_KIT' },
      ]},
      { text: 'Integrations', collapsed: true, items: [
        { text: 'Index', link: '/integrations/' },
        { text: 'Express', link: '/integrations/express' },
        { text: 'Fastify', link: '/integrations/fastify' },
        { text: 'Next.js (App Router)', link: '/integrations/nextjs-app-router' },
        { text: 'react-hook-form', link: '/integrations/react-hook-form' },
        { text: 'Drizzle ORM', link: '/integrations/drizzle-orm' },
        { text: 'GraphQL', link: '/integrations/graphql' },
      ]},
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Linol-Hamelton/jtcsv' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/jtcsv' },
      // The following two are placeholders — handles registered Phase 5 W15 operator follow-up:
      // { icon: 'bluesky', link: 'https://bsky.app/profile/jtcsv.bsky.social' },
      // { icon: 'mastodon', link: 'https://fosstodon.org/@jtcsv' },
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
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: 'Search docs',
            buttonAriaLabel: 'Search documentation',
          },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset search',
            backButtonTitle: 'Close search',
            noResultsText: 'No results for',
            footer: {
              selectText: 'to select',
              navigateText: 'to navigate',
              closeText: 'to close',
            },
          },
        },
        miniSearch: {
          options: {
            tokenize: (text) => text.split(/[\s\-_/.,;:!?()[\]{}'"`]+/u),
            processTerm: (term) => {
              const t = term.toLowerCase().trim();
              if (t.length < 2) return null;
              const stop = new Set([
                'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is',
                'it', 'for', 'on', 'with', 'as', 'by', 'be', 'this', 'that',
              ]);
              return stop.has(t) ? null : t;
            },
          },
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
            combineWith: 'AND',
          },
        },
      },
    },
  },

  // DOCS M2: fail the build on dead links — link-fixer has patched all known
  // dead links across the lifted Markdown set. Two narrow exceptions:
  //   - localhost links (TESTING_GUIDE uses http://localhost:3000 as an example)
  //   - /api/ TypeDoc bundle: the directory is published as static HTML alongside
  //     VitePress output, so the pages exist at runtime but aren't VitePress routes.
  ignoreDeadLinks: [
    /^https?:\/\/localhost/,
    /^\.\.?\/api\//,
    /^\/api\//,
  ],
});
