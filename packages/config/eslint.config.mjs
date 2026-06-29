// @modern-edu/config — umumiy ESLint flat konfiguratsiyasi (ESLint 9).
// Boshqa paketlar buni `eslint.config.mjs` faylida import qiladi va kengaytiradi.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'out/**', 'coverage/**', '.turbo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Prettier oxirgi: uslub bilan ziddiyatli qoidalarni o'chiradi.
  prettier,
];

export default baseConfig;
