/**
 * @modern-edu/contracts — veb, mobil va API o'rtasidagi yagona haqiqat manbai.
 * Bu paket Zod sxemalari va ulardan kelib chiqadigan TypeScript tiplarini eksport qiladi.
 *
 * Hozircha poydevor (0.1-bosqich). To'liq sxemalar 0.3-bosqichda qo'shiladi.
 */
export const CONTRACTS_VERSION = '0.0.0' as const;

export * from './common.js';
export * from './roles.js';
export * from './auth.js';
export * from './classes.js';
export * from './media.js';
export * from './messaging.js';
export * from './realtime.js';
