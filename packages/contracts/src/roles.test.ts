import { describe, expect, it } from 'vitest';
import { classRoleSchema, userRoleSchema } from './roles.js';
import { CONTRACTS_VERSION } from './index.js';

describe('userRoleSchema', () => {
  it("barcha to'g'ri rollarni qabul qiladi", () => {
    for (const role of ['super_admin', 'admin', 'teacher', 'co_teacher', 'student']) {
      expect(userRoleSchema.parse(role)).toBe(role);
    }
  });

  it("noma'lum rolni rad etadi", () => {
    expect(() => userRoleSchema.parse('hacker')).toThrow();
  });
});

describe('classRoleSchema', () => {
  it('sinf ichidagi rollarni qabul qiladi', () => {
    expect(classRoleSchema.parse('teacher')).toBe('teacher');
    expect(classRoleSchema.parse('student')).toBe('student');
  });

  it('super_admin sinf roli emas', () => {
    expect(() => classRoleSchema.parse('super_admin')).toThrow();
  });
});

describe('CONTRACTS_VERSION', () => {
  it('aniqlangan', () => {
    expect(CONTRACTS_VERSION).toBe('0.0.0');
  });
});
