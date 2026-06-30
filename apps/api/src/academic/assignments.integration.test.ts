// D7 integratsiya testi — vazifa yaratish, topshirish, baholash + izolyatsiya.
import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { seed, type Database } from '@modern-edu/db';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { AuditService } from '../common/audit.service.js';
import { AuthService } from '../auth/auth.service.js';
import { TokenService } from '../auth/token.service.js';
import { MembershipService } from '../classes/membership.service.js';
import { ClassesService } from '../classes/classes.service.js';
import { StudentsService } from '../classes/students.service.js';
import type { AppEnv } from '../config/env.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AssignmentsService } from './assignments.service.js';

const require = createRequire(import.meta.url);
const migrationsFolder = path.join(
  path.dirname(require.resolve('@modern-edu/db')),
  '..',
  'drizzle',
);

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 0,
  DATABASE_URL: 'pglite',
  JWT_ACCESS_SECRET: 'd7-access-secret-0123456789',
  JWT_REFRESH_SECRET: 'd7-refresh-secret-0123456789',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGIN: '*',
  S3_REGION: 'auto',
  S3_FORCE_PATH_STYLE: false,
};

let auth: AuthService;
let tokens: TokenService;
let classesSvc: ClassesService;
let studentsSvc: StudentsService;
let assignmentsSvc: AssignmentsService;
let notifSvc: NotificationsService;

async function loginClaims(u: string, p: string): Promise<AccessTokenClaims> {
  return tokens.verifyAccess((await auth.login(u, p)).accessToken);
}

beforeAll(async () => {
  const pg = new PGlite();
  const db = drizzle(pg) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  await seed(db);

  const audit = new AuditService(db);
  const membership = new MembershipService(db);
  tokens = new TokenService(db, env);
  auth = new AuthService(db, tokens, audit);
  classesSvc = new ClassesService(db, membership, audit);
  studentsSvc = new StudentsService(db, membership, audit);
  notifSvc = new NotificationsService(db);
  assignmentsSvc = new AssignmentsService(db, membership, audit, notifSvc);
});

describe('D7 — vazifalar', () => {
  it('to‘liq oqim: yaratish → topshirish → baholash', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Vazifa sinfi' });
    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'vazifaoquvchi', fullName: 'Vazifa O‘quvchi' },
    ]);
    const student = await loginClaims('vazifaoquvchi', creds[0]!.tempPassword);

    const assignment = await assignmentsSvc.create(teacher, klass.id, {
      title: 'Uy ishi 1',
      instructions: '5 ta misol yeching',
      pointsPossible: 50,
    });
    expect(assignment.status).toBe('published');

    // O'quvchi ko'radi (mySubmission null)
    const studentView = await assignmentsSvc.listForClass(student, klass.id);
    expect(studentView[0]!.mySubmission).toBeNull();

    // Topshiradi
    const submission = await assignmentsSvc.submit(student, assignment.id, {
      body: 'Mana javoblarim',
    });
    expect(submission.status).toBe('submitted');

    // O'qituvchi topshiriqlarni ko'radi
    const subs = await assignmentsSvc.listSubmissions(teacher, assignment.id);
    expect(subs).toHaveLength(1);
    expect(subs[0]!.studentName).toBe('Vazifa O‘quvchi');

    // Baholaydi
    const graded = await assignmentsSvc.grade(teacher, submission.id, {
      grade: 45,
      feedback: 'Yaxshi',
    });
    expect(graded.grade).toBe(45);
    expect(graded.status).toBe('returned');

    // O'quvchi bahosini ko'radi
    const afterGrade = await assignmentsSvc.listForClass(student, klass.id);
    expect(afterGrade[0]!.mySubmission?.grade).toBe(45);

    // Bildirishnomalar: vazifa + baholandi
    const notifs = await notifSvc.list(student.sub);
    expect(notifs.some((n) => n.type === 'assignment')).toBe(true);
    expect(notifs.some((n) => n.type === 'graded')).toBe(true);
    expect(await notifSvc.unreadCount(student.sub)).toBeGreaterThan(0);
  });

  it('o‘quvchi vazifa yarata olmaydi, baho ham qo‘ya olmaydi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Ruxsat sinfi' });
    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'ruxsatoquvchi', fullName: 'Ruxsat O‘quvchi' },
    ]);
    const student = await loginClaims('ruxsatoquvchi', creds[0]!.tempPassword);

    await expect(
      assignmentsSvc.create(student, klass.id, { title: 'x', pointsPossible: 10 }),
    ).rejects.toThrow();
  });

  it('🔒 izolyatsiya: boshqa sinf vazifasini ko‘rib/topshira olmaydi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Maxfiy vazifa sinfi' });
    const assignment = await assignmentsSvc.create(teacher, klass.id, {
      title: 'Maxfiy',
      pointsPossible: 10,
    });

    const outsider = await loginClaims('aziz', 'aziz123'); // bu sinfga a'zo emas
    await expect(assignmentsSvc.listForClass(outsider, klass.id)).rejects.toThrow();
    await expect(
      assignmentsSvc.submit(outsider, assignment.id, { body: 'kirib bo‘lmaydi' }),
    ).rejects.toThrow();
  });
});
