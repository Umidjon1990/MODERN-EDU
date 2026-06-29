// Sxema testi — PGlite (WASM Postgres) ustida haqiqiy migratsiya + so'rovlar.
// Tashqi DB talab qilmaydi, shu sababli lokal va CI'da ishlaydi.
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from './schema.js';
import { seed } from './seed.js';
import type { Database } from './client.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  const pg = new PGlite();
  db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder });
});

describe('sxema migratsiyasi', () => {
  it('jadvallar yaratiladi va asosiy yozuvni saqlaydi', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Maktab', slug: 'test-maktab' })
      .returning();
    expect(org!.id).toBeTruthy();

    const [user] = await db
      .insert(schema.users)
      .values({
        orgId: org!.id,
        role: 'teacher',
        username: 'oqituvchi',
        fullName: 'Test O‘qituvchi',
        passwordHash: 'x',
      })
      .returning();
    expect(user!.mustChangePassword).toBe(true);
  });

  it('tashkilot bo‘yicha username noyob (unique constraint)', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Maktab 2', slug: 'maktab-2' })
      .returning();
    await db.insert(schema.users).values({
      orgId: org!.id,
      role: 'student',
      username: 'dup',
      fullName: 'A',
      passwordHash: 'x',
    });
    await expect(
      db.insert(schema.users).values({
        orgId: org!.id,
        role: 'student',
        username: 'dup',
        fullName: 'B',
        passwordHash: 'x',
      }),
    ).rejects.toThrow();
  });
});

describe('seed', () => {
  it('idempotent: ikki marta ishlaydi, dublikat yaratmaydi', async () => {
    await seed(db as unknown as Database);
    await seed(db as unknown as Database);

    const orgs = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, 'demo-maktab'));
    expect(orgs.length).toBe(1);

    const members = await db.select().from(schema.classMembers);
    // 1 o'qituvchi + 3 o'quvchi = 4 a'zo (dublikatsiz)
    expect(members.length).toBe(4);

    const msgs = await db.select().from(schema.messages);
    expect(msgs.length).toBe(6);

    const aziz = await db.select().from(schema.users).where(eq(schema.users.username, 'aziz'));
    expect(aziz.length).toBe(1);
  });
});
