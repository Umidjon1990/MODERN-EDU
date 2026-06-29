// Boshlang'ich ma'lumotlar (idempotent). Railway'da `db:seed` orqali ishlaydi.
import { and, eq } from 'drizzle-orm';
import { createDb, type Database } from './client.js';
import { hashPassword } from './password.js';
import { classMembers, classes, messages, organizations, pinnedMessages, users } from './schema.js';

async function getOrCreateUser(
  db: Database,
  data: {
    orgId: string;
    role: 'admin' | 'teacher' | 'student';
    username: string;
    fullName: string;
    password: string;
    avatarColor: string;
    email?: string;
    createdById?: string;
  },
): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, data.orgId), eq(users.username, data.username)))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [row] = await db
    .insert(users)
    .values({
      orgId: data.orgId,
      role: data.role,
      username: data.username,
      email: data.email ?? null,
      fullName: data.fullName,
      passwordHash: await hashPassword(data.password),
      mustChangePassword: false,
      avatarColor: data.avatarColor,
      createdById: data.createdById ?? null,
    })
    .returning({ id: users.id });
  return row!.id;
}

async function ensureMember(
  db: Database,
  classId: string,
  userId: string,
  role: 'teacher' | 'student',
) {
  const existing = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(classMembers).values({ classId, userId, roleInClass: role });
  }
}

export async function seed(db: Database): Promise<void> {
  // Tashkilot
  let [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'demo-maktab'))
    .limit(1);
  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({ name: 'Demo Maktab', slug: 'demo-maktab' })
      .returning();
  }
  const orgId = org!.id;

  const adminId = await getOrCreateUser(db, {
    orgId,
    role: 'admin',
    username: 'admin',
    email: 'admin@demo.uz',
    fullName: 'Bosh Administrator',
    password: 'admin123',
    avatarColor: '#4f46e5',
  });

  const teacherId = await getOrCreateUser(db, {
    orgId,
    role: 'teacher',
    username: 'teacher',
    email: 'dilnoza@demo.uz',
    fullName: 'Dilnoza Karimova',
    password: 'teacher123',
    avatarColor: '#4f46e5',
    createdById: adminId,
  });

  // Sinf
  let [klass] = await db
    .select()
    .from(classes)
    .where(eq(classes.ownerTeacherId, teacherId))
    .limit(1);
  if (!klass) {
    [klass] = await db
      .insert(classes)
      .values({
        orgId,
        name: '9-B sinf · Matematika',
        subject: 'Algebra va geometriya',
        ownerTeacherId: teacherId,
      })
      .returning();
  }
  const classId = klass!.id;
  await ensureMember(db, classId, teacherId, 'teacher');

  const studentDefs = [
    { username: 'aziz', fullName: 'Aziz Rahimov', color: '#0ea5e9', pw: 'aziz123' },
    { username: 'malika', fullName: 'Malika Yusupova', color: '#ec4899', pw: 'malika123' },
    { username: 'jasur', fullName: 'Jasur Toirov', color: '#f59e0b', pw: 'jasur123' },
  ];
  const studentIds: Record<string, string> = {};
  for (const s of studentDefs) {
    const id = await getOrCreateUser(db, {
      orgId,
      role: 'student',
      username: s.username,
      fullName: s.fullName,
      password: s.pw,
      avatarColor: s.color,
      createdById: teacherId,
    });
    studentIds[s.username] = id;
    await ensureMember(db, classId, id, 'student');
  }

  // Namuna xabarlar (faqat bo'sh bo'lsa)
  const existingMsgs = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.classId, classId))
    .limit(1);
  if (!existingMsgs[0]) {
    const now = Date.now();
    const min = (m: number) => new Date(now - m * 60_000);
    const defs = [
      {
        seq: 1,
        sender: teacherId,
        type: 'announcement' as const,
        body: 'Assalomu alaykum! Ertaga 2-bobdan kichik test bo‘ladi. Tayyorlaning 📘',
        at: min(240),
        pin: true,
      },
      {
        seq: 2,
        sender: studentIds['aziz']!,
        type: 'text' as const,
        body: 'Rahmat! 2-bobdagi misollar javoblari ham bo‘ladimi?',
        at: min(180),
      },
      {
        seq: 3,
        sender: teacherId,
        type: 'text' as const,
        body: 'Ha, bugun kechqurun javoblarni fayl qilib tashlayman.',
        at: min(176),
      },
      {
        seq: 4,
        sender: studentIds['malika']!,
        type: 'text' as const,
        body: 'Men 14-misolni yecholmadim, tushuntirib bera olasizmi? 😅',
        at: min(120),
      },
      {
        seq: 5,
        sender: studentIds['jasur']!,
        type: 'text' as const,
        body: 'Avval qavsni ochasan, keyin x ni bir tomonga yig‘asan.',
        at: min(118),
      },
      {
        seq: 6,
        sender: studentIds['malika']!,
        type: 'text' as const,
        body: 'Bo‘ldi, chiqdi! x = 5 ekan ✅ Rahmat!',
        at: min(40),
      },
    ];
    let pinnedMessageId: string | null = null;
    for (const m of defs) {
      const [created] = await db
        .insert(messages)
        .values({
          classId,
          orgId,
          seq: m.seq,
          senderId: m.sender,
          type: m.type,
          body: m.body,
          createdAt: m.at,
        })
        .returning({ id: messages.id });
      if (m.pin) pinnedMessageId = created!.id;
    }
    await db.update(classes).set({ lastMessageSeq: defs.length }).where(eq(classes.id, classId));
    if (pinnedMessageId) {
      await db
        .insert(pinnedMessages)
        .values({ classId, messageId: pinnedMessageId, pinnedById: teacherId });
    }
  }
}

// CLI sifatida ishga tushirilganda
const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[/\\]/, ''));
if (isCli) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL aniqlanmagan.');
    process.exit(1);
  }
  const db = createDb(url, { max: 1 });
  seed(db)
    .then(() => {
      console.warn('✅ Seed tugadi.');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
