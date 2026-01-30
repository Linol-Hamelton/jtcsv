module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }]
  ,
    '@babel/preset-react'
  ],
  plugins: [
    // Поддержка динамических импортов
    '@babel/plugin-syntax-dynamic-import',
    // Поддержка опциональных цепочек
    '@babel/plugin-proposal-optional-chaining',
    // Поддержка нулевого слияния
    '@babel/plugin-proposal-nullish-coalescing-operator',
    // JSX syntax support for tests
    '@babel/plugin-syntax-jsx'
  ]
};