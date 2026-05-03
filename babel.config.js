// Minimal babel config — only used by jest's babel-jest to transform .js files
// in `plugins/*/index.js` which still use ESM syntax. Engines.node >=18.17 means
// preset-env barely transpiles anything (just module syntax).
//
// TODO P1.2 (plugins triage): rewrite plugins/*.js as .ts; then drop @babel/core,
// @babel/preset-env, and remove the babel-jest transform from jest.config.js.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'classic' }]
  ]
};
