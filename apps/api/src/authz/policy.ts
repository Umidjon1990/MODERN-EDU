import type { UserRole } from '@modern-edu/contracts';
import { permissionsForRole, type Permission } from './permissions.js';

/**
 * Markaziy avtorizatsiya tekshiruvi (docs/06 #24).
 * Rol-darajasidagi ruxsatni tekshiradi. Resurs-darajasidagi qamrov (a'zolik)
 * keyingi bosqichlarda (sinflar/xabarlar) qo'shiladi.
 */
export function can(role: UserRole, permission: Permission): boolean {
  return permissionsForRole(role).has(permission);
}
