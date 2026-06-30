import { describe, expect, it } from 'vitest';
import { can } from './policy.js';
import { PERMISSIONS } from './permissions.js';

describe('avtorizatsiya siyosati', () => {
  it('admin o‘qituvchi yarata oladi', () => {
    expect(can('admin', PERMISSIONS.TEACHER_CREATE)).toBe(true);
  });

  it('o‘qituvchi o‘qituvchi yarata olmaydi', () => {
    expect(can('teacher', PERMISSIONS.TEACHER_CREATE)).toBe(false);
  });

  it('o‘qituvchi sinf yarata oladi', () => {
    expect(can('teacher', PERMISSIONS.CLASS_CREATE)).toBe(true);
  });

  it('o‘quvchi xabar yoza oladi, lekin sinf yarata olmaydi', () => {
    expect(can('student', PERMISSIONS.MESSAGE_POST)).toBe(true);
    expect(can('student', PERMISSIONS.CLASS_CREATE)).toBe(false);
    expect(can('student', PERMISSIONS.MESSAGE_DELETE_ANY)).toBe(false);
  });

  it('super_admin barcha ruxsatlarga ega', () => {
    for (const p of Object.values(PERMISSIONS)) {
      expect(can('super_admin', p)).toBe(true);
    }
  });
});
