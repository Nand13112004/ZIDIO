const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    files: ['server.js', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
];
