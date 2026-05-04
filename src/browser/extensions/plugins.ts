/**
 * Browser-side plugin loader stub.
 *
 * Earlier versions of this module exposed `loadExpressPlugin` /
 * `loadNestJsPlugin` / etc. as dynamic imports — but every one of those
 * adapters depends on Node-only modules (express, fastify, @nestjs/*),
 * so they could never actually run in a browser. Pulling them in via
 * dynamic import only succeeded in dragging stale type declarations
 * into the rollup graph.
 *
 * In 3.2.0 we keep the public shape (`window.jtcsv.plugins` + named
 * exports) but each loader now throws a clear error explaining that
 * the package belongs in a Node import. Use the published @jtcsv/*
 * packages directly from your server code instead.
 */

const browserUnsupported = (name: string) => async () => {
  throw new Error(
    `${name} is a Node-only adapter; install @jtcsv/${name.toLowerCase()} from your server bundle.`,
  );
};

const loadExpressPlugin = browserUnsupported('express');
const loadFastifyPlugin = browserUnsupported('fastify');
const loadNextJsPlugin = browserUnsupported('nextjs');
const loadNestJsPlugin = browserUnsupported('nestjs');
const loadHonoPlugin = browserUnsupported('hono');

// Demoted to examples/frameworks/* in 3.2.0; no published packages.
const loadRemixPlugin = browserUnsupported('remix');
const loadNuxtPlugin = browserUnsupported('nuxt');
const loadSvelteKitPlugin = browserUnsupported('sveltekit');
const loadTrpcPlugin = browserUnsupported('trpc');

const jtcsvPlugins = {
  loadExpressPlugin,
  loadFastifyPlugin,
  loadNextJsPlugin,
  loadNestJsPlugin,
  loadHonoPlugin,
  loadRemixPlugin,
  loadNuxtPlugin,
  loadSvelteKitPlugin,
  loadTrpcPlugin,
};

if (typeof window !== 'undefined' && (window as { jtcsv?: { plugins?: object } }).jtcsv) {
  const w = window as { jtcsv: { plugins?: object } };
  if (!w.jtcsv.plugins) w.jtcsv.plugins = {};
  Object.assign(w.jtcsv.plugins, jtcsvPlugins);
}

export default jtcsvPlugins;
export {
  loadExpressPlugin,
  loadFastifyPlugin,
  loadNextJsPlugin,
  loadNestJsPlugin,
  loadRemixPlugin,
  loadNuxtPlugin,
  loadSvelteKitPlugin,
  loadHonoPlugin,
  loadTrpcPlugin,
};
