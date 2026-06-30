import type { UserRole } from '@modern-edu/contracts';

/** Ruxsatlar katalogi (kengaytiriladi). */
export const PERMISSIONS = {
  TEACHER_CREATE: 'teacher.create',
  CLASS_CREATE: 'class.create',
  STUDENT_CREATE: 'student.create',
  MESSAGE_POST: 'message.post',
  MESSAGE_DELETE_ANY: 'message.delete_any',
  MESSAGE_PIN: 'message.pin',
  CLASS_MODERATE: 'class.moderate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

/** Har bir rol uchun standart ruxsatlar (docs/02 §7). */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  super_admin: Object.values(P),
  admin: [
    P.TEACHER_CREATE,
    P.CLASS_CREATE,
    P.STUDENT_CREATE,
    P.MESSAGE_DELETE_ANY,
    P.MESSAGE_PIN,
    P.CLASS_MODERATE,
  ],
  teacher: [
    P.CLASS_CREATE,
    P.STUDENT_CREATE,
    P.MESSAGE_POST,
    P.MESSAGE_DELETE_ANY,
    P.MESSAGE_PIN,
    P.CLASS_MODERATE,
  ],
  co_teacher: [P.MESSAGE_POST, P.MESSAGE_DELETE_ANY, P.MESSAGE_PIN, P.CLASS_MODERATE],
  student: [P.MESSAGE_POST],
};

export function permissionsForRole(role: UserRole): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}
