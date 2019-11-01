module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  plugins: [
    'vuetify'
  ],
  rules: {
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    'no-debugger': 'error',
    'camelcase': 'off',
    'vue/script-indent': ['error', 4, { 'baseIndent': 1, 'switchCase': 1 }],
    'vue/html-indent': ['error', 4, { 'attribute': 2 }],
    'vue/order-in-components': 'error',
    'vue/this-in-template': 'error',
    'vue/no-spaces-around-equal-signs-in-attribute': 'error',
    'vue/no-multi-spaces': 'error',
    'vue/multiline-html-element-content-newline': 'error',
    'vue/html-end-tags': 'error',
    'vue/html-closing-bracket-spacing': 'error',
    'vue/mustache-interpolation-spacing': 'error',
    'vue/name-property-casing': 'error',
    'vue/prop-name-casing': 'error',
    'vue/attribute-hyphenation': 'error',
    'vuetify/grid-unknown-attributes': 'warn',
    'vuetify/no-deprecated-classes': 'warn'
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        'indent': 'off'
      }
    }
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  globals: {
    '_': false
  }
}
