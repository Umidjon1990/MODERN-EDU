import baseConfig from '@modern-edu/config/eslint';

export default [
  { ignores: ['dist/**'] },
  ...baseConfig,
  {
    rules: {
      // NestJS DI emitDecoratorMetadata uchun qiymat-importlar kerak —
      // consistent-type-imports DI bilan ziddiyatga keladi, shu sababli o'chirilgan.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
