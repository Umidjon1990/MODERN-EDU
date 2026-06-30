// D3 integratsiya testi — sinflar, o'quvchilar, xabarlar va MAXFIYLIK
// IZOLYATSIYASI (boshqa sinfni ko'rib bo'lmaydi). PGlite ustida haqiqiy DB.
import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { media, seed, type Database } from '@modern-edu/db';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from '../common/audit.service.js';
import { AuthService } from '../auth/auth.service.js';
import { TokenService } from '../auth/token.service.js';
import type { AppEnv } from '../config/env.js';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { MembershipService } from './membership.service.js';
import { ClassesService } from './classes.service.js';
import { StudentsService } from './students.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';

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
  JWT_ACCESS_SECRET: 'd3-access-secret-0123456789',
  JWT_REFRESH_SECRET: 'd3-refresh-secret-0123456789',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGIN: '*',
};

let auth: AuthService;
let tokens: TokenService;
let classesSvc: ClassesService;
let studentsSvc: StudentsService;
let messagesSvc: MessagesService;
let db: Database;

async function loginClaims(username: string, password: string): Promise<AccessTokenClaims> {
  const res = await auth.login(username, password);
  return tokens.verifyAccess(res.accessToken);
}

beforeAll(async () => {
  const pg = new PGlite();
  db = drizzle(pg) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  await seed(db);

  const audit = new AuditService(db);
  const membership = new MembershipService(db);
  tokens = new TokenService(db, env);
  auth = new AuthService(db, tokens, audit);
  classesSvc = new ClassesService(db, membership, audit);
  studentsSvc = new StudentsService(db, membership, audit);
  const realtime = new RealtimePublisher({} as AppEnv); // REDIS_URL yo'q → no-op
  messagesSvc = new MessagesService(db, membership, realtime);
});

describe('D3 — sinflar, a’zolik, xabarlar', () => {
  it('o‘qituvchi sinf yaratadi va o‘z sinflarini ko‘radi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const created = await classesSvc.createClass(teacher, {
      name: 'Fizika 10-A',
      subject: 'Fizika',
    });
    expect(created.name).toBe('Fizika 10-A');

    const mine = await classesSvc.listMyClasses(teacher.sub);
    expect(mine.some((c) => c.id === created.id)).toBe(true);
  });

  it('o‘qituvchi o‘quvchi yaratadi, o‘quvchi kira oladi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Kimyo 11-B' });

    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'yangioquvchi', fullName: 'Yangi O‘quvchi' },
    ]);
    expect(creds).toHaveLength(1);
    expect(creds[0]!.tempPassword).toBeTruthy();

    const login = await auth.login('yangioquvchi', creds[0]!.tempPassword);
    expect(login.user.role).toBe('student');
    expect(login.user.mustChangePassword).toBe(true);
  });

  it('xabar yuboriladi, seq oshadi, tarix o‘qiladi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Tarix 9-C' });
    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'oquvchi2', fullName: 'O‘quvchi Ikki' },
    ]);
    const student = await loginClaims('oquvchi2', creds[0]!.tempPassword);

    const m1 = await messagesSvc.post(teacher, klass.id, { body: 'Salom sinf!', type: 'text' });
    const m2 = await messagesSvc.post(student, klass.id, {
      body: 'Assalomu alaykum!',
      type: 'text',
    });
    expect(m2.seq).toBe(m1.seq + 1);

    const history = await messagesSvc.list(teacher.sub, klass.id, { limit: 30 });
    expect(history.map((m) => m.body)).toEqual(['Salom sinf!', 'Assalomu alaykum!']);
  });

  it('idempotentlik: bir xil clientMsgId ikki marta yuborilsa bitta xabar', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Bio 8-A' });
    const cid = '99999999-9999-9999-9999-999999999999';
    const a = await messagesSvc.post(teacher, klass.id, {
      body: 'bir marta',
      type: 'text',
      clientMsgId: cid,
    });
    const b = await messagesSvc.post(teacher, klass.id, {
      body: 'bir marta',
      type: 'text',
      clientMsgId: cid,
    });
    expect(a.id).toBe(b.id);
  });

  it('reaksiya qo‘shiladi va olib tashlanadi (toggle)', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Geo 7-A' });
    const msg = await messagesSvc.post(teacher, klass.id, { body: 'reaksiya?', type: 'text' });

    const added = await messagesSvc.toggleReaction(teacher, msg.id, '👍');
    expect(added.reactions.find((r) => r.emoji === '👍')?.userIds).toContain(teacher.sub);

    const removed = await messagesSvc.toggleReaction(teacher, msg.id, '👍');
    expect(removed.reactions.find((r) => r.emoji === '👍')).toBeUndefined();
  });

  it('🔒 MAXFIYLIK: boshqa sinf a’zosi bo‘lmagan foydalanuvchi kira olmaydi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const privateClass = await classesSvc.createClass(teacher, { name: 'Maxfiy sinf' });
    await messagesSvc.post(teacher, privateClass.id, { body: 'Maxfiy xabar', type: 'text' });

    // Boshqa sinf o'quvchisi (seed'dagi aziz) bu sinfga a'zo emas
    const outsider = await loginClaims('aziz', 'aziz123');

    await expect(messagesSvc.list(outsider.sub, privateClass.id, { limit: 30 })).rejects.toThrow();
    await expect(classesSvc.getClassroom(outsider.sub, privateClass.id)).rejects.toThrow();
    await expect(
      messagesSvc.post(outsider, privateClass.id, { body: 'kirib bo‘lmaydi', type: 'text' }),
    ).rejects.toThrow();
  });

  it('o‘quvchi boshqa o‘quvchining xabarini o‘chira olmaydi, o‘qituvchi o‘chiradi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Moderatsiya sinfi' });
    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'modtest1', fullName: 'Mod Bir' },
      { username: 'modtest2', fullName: 'Mod Ikki' },
    ]);
    const s1 = await loginClaims('modtest1', creds[0]!.tempPassword);
    const s2 = await loginClaims('modtest2', creds[1]!.tempPassword);

    const msg = await messagesSvc.post(s1, klass.id, { body: 'mening xabarim', type: 'text' });

    // Boshqa o'quvchi o'chira olmaydi
    await expect(messagesSvc.remove(s2, msg.id)).rejects.toThrow();
    // O'qituvchi (moderator) o'chiradi
    await expect(messagesSvc.remove(teacher, msg.id)).resolves.toEqual({ ok: true });
  });

  it('pin/unpin faqat o‘qituvchi, o‘qilganlik kuzatiladi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Pin sinfi' });
    const creds = await studentsSvc.createStudents(teacher, klass.id, [
      { username: 'pintest', fullName: 'Pin Test' },
    ]);
    const student = await loginClaims('pintest', creds[0]!.tempPassword);
    const msg = await messagesSvc.post(teacher, klass.id, { body: 'muhim', type: 'text' });

    await expect(messagesSvc.setPin(student, klass.id, msg.id, true)).rejects.toThrow();
    await expect(messagesSvc.setPin(teacher, klass.id, msg.id, true)).resolves.toEqual({
      ok: true,
    });

    const room = await classesSvc.getClassroom(teacher.sub, klass.id);
    expect(room.pinned.some((m) => m.id === msg.id)).toBe(true);

    const read = await messagesSvc.markRead(student, klass.id, msg.seq);
    expect(read.lastReadSeq).toBe(msg.seq);
  });

  it('media biriktirma: rasm xabari attachments va to‘g‘ri tur bilan keladi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Media sinfi' });

    const [m] = await db
      .insert(media)
      .values({
        orgId: teacher.orgId,
        ownerId: teacher.sub,
        kind: 'image',
        storageKey: `${teacher.orgId}/test.png`,
        mimeType: 'image/png',
        sizeBytes: 1234,
        status: 'ready',
      })
      .returning();

    const sent = await messagesSvc.post(teacher, klass.id, { type: 'text', mediaIds: [m!.id] });
    expect(sent.type).toBe('image');
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments[0]!.kind).toBe('image');
    expect(sent.attachments[0]!.url).toContain(m!.id);

    const history = await messagesSvc.list(teacher.sub, klass.id, { limit: 30 });
    expect(history[0]!.attachments).toHaveLength(1);
  });
});
