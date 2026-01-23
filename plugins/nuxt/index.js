const { defineNuxtModule, addPlugin, addImports, createResolver } = require('@nuxt/kit');

module.exports = defineNuxtModule({
  meta: {
    name: '@jtcsv/nuxt',
    configKey: 'jtcsv'
  },
  defaults: {
    autoimport: true
  },
  setup(options) {
    const resolver = createResolver(__dirname);
    addPlugin(resolver.resolve('runtime/plugin'));

    if (options.autoimport !== false) {
      addImports([
        { name: 'useJtcsv', from: resolver.resolve('runtime/composables/useJtcsv') }
      ]);
    }
  }
});
