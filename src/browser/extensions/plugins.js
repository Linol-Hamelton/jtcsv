// Расширение плагинов для jtcsv
// Подключает все плагины (express, fastify, nextjs и т.д.)

const jtcsvPlugins = {
  // Плагины будут добавлены динамически при импорте
  // Это placeholder для будущей реализации
};

// Динамический импорт плагинов (ленивая загрузка)
// Пути относительно корня проекта (плагины находятся в plugins/)
async function loadExpressPlugin() {
  const mod = await import('../../../plugins/express-middleware/index.js');
  return mod.default || mod;
}

async function loadFastifyPlugin() {
  const mod = await import('../../../plugins/fastify-plugin/index.js');
  return mod.default || mod;
}

async function loadNextJsPlugin() {
  const mod = await import('../../../plugins/nextjs-api/index.js');
  return mod.default || mod;
}

async function loadNestJsPlugin() {
  const mod = await import('../../../plugins/nestjs/index.js');
  return mod.default || mod;
}

async function loadRemixPlugin() {
  const mod = await import('../../../plugins/remix/index.js');
  return mod.default || mod;
}

async function loadNuxtPlugin() {
  const mod = await import('../../../plugins/nuxt/index.js');
  return mod.default || mod;
}

async function loadSvelteKitPlugin() {
  const mod = await import('../../../plugins/sveltekit/index.js');
  return mod.default || mod;
}

async function loadHonoPlugin() {
  const mod = await import('../../../plugins/hono/index.js');
  return mod.default || mod;
}

async function loadTrpcPlugin() {
  const mod = await import('../../../plugins/trpc/index.js');
  return mod.default || mod;
}

Object.assign(jtcsvPlugins, {
  loadExpressPlugin,
  loadFastifyPlugin,
  loadNextJsPlugin,
  loadNestJsPlugin,
  loadRemixPlugin,
  loadNuxtPlugin,
  loadSvelteKitPlugin,
  loadHonoPlugin,
  loadTrpcPlugin
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jtcsvPlugins;
} else if (typeof define === 'function' && define.amd) {
  define([], () => jtcsvPlugins);
} else if (typeof window !== 'undefined' && window.jtcsv) {
  // Расширяем глобальный jtcsv, если он существует
  if (!window.jtcsv.plugins) {
    window.jtcsv.plugins = {};
  }
  Object.assign(window.jtcsv.plugins, jtcsvPlugins);
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
  loadTrpcPlugin
};