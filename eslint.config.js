import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import configPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  //general rules
  {
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'eslint.config.js', 'front/'],
  },
  // TypeScript files
  {
    files: ['src/**/*.{ts,js}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    linterOptions: {
      noInlineConfig: true, // запрет eslint-disable (точечные отключения)
    },
    plugins: {
      prettier: configPrettier,
    },
    rules: {
      'no-console': 'off', // разрешим console.log для Node
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  configPrettier,
];
