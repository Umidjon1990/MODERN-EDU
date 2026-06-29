/**
 * PREVIEW MA'LUMOTLARI — faqat lokal sinab ko'rish uchun.
 * Bu modul 1.x–2.x bosqichlarda haqiqiy API (Postgres + NestJS) bilan almashtiriladi.
 * Tuzilma docs/03-malumotlar-bazasi.md sxemasini aks ettiradi.
 */
import type { UserRole, ClassRole } from '@modern-edu/contracts';

export type DemoUser = {
  id: string;
  username: string;
  password: string; // preview uchun ochiq; production'da Argon2id hash
  fullName: string;
  role: UserRole;
  avatarColor: string;
  classId: string;
};

export type DemoMessage = {
  id: string;
  seq: number;
  senderId: string;
  type: 'text' | 'system' | 'announcement';
  body: string;
  createdAt: string; // ISO
  reactions: { emoji: string; userIds: string[] }[];
  replyToId?: string;
  pinned?: boolean;
};

export type DemoClass = {
  id: string;
  name: string;
  subject: string;
  members: { userId: string; roleInClass: ClassRole }[];
};

const CLASS_ID = 'cls_9b_math';

export const demoUsers: DemoUser[] = [
  {
    id: 'usr_teacher',
    username: 'teacher',
    password: 'teacher123',
    fullName: 'Dilnoza Karimova',
    role: 'teacher',
    avatarColor: '#4f46e5',
    classId: CLASS_ID,
  },
  {
    id: 'usr_aziz',
    username: 'aziz',
    password: 'aziz123',
    fullName: 'Aziz Rahimov',
    role: 'student',
    avatarColor: '#0ea5e9',
    classId: CLASS_ID,
  },
  {
    id: 'usr_malika',
    username: 'malika',
    password: 'malika123',
    fullName: 'Malika Yusupova',
    role: 'student',
    avatarColor: '#ec4899',
    classId: CLASS_ID,
  },
  {
    id: 'usr_jasur',
    username: 'jasur',
    password: 'jasur123',
    fullName: 'Jasur Toirov',
    role: 'student',
    avatarColor: '#f59e0b',
    classId: CLASS_ID,
  },
];

export const demoClass: DemoClass = {
  id: CLASS_ID,
  name: '9-B sinf · Matematika',
  subject: 'Algebra va geometriya',
  members: [
    { userId: 'usr_teacher', roleInClass: 'teacher' },
    { userId: 'usr_aziz', roleInClass: 'student' },
    { userId: 'usr_malika', roleInClass: 'student' },
    { userId: 'usr_jasur', roleInClass: 'student' },
  ],
};

const now = Date.now();
const min = (m: number) => new Date(now - m * 60_000).toISOString();

export const demoMessages: DemoMessage[] = [
  {
    id: 'msg_1',
    seq: 1,
    senderId: 'usr_teacher',
    type: 'announcement',
    body: 'Assalomu alaykum! Ertaga 2-bobdan kichik test bo‘ladi. Tayyorlaning 📘',
    createdAt: min(240),
    reactions: [{ emoji: '👍', userIds: ['usr_aziz', 'usr_malika', 'usr_jasur'] }],
    pinned: true,
  },
  {
    id: 'msg_2',
    seq: 2,
    senderId: 'usr_aziz',
    type: 'text',
    body: 'Rahmat! 2-bobdagi misollar javoblari ham bo‘ladimi?',
    createdAt: min(180),
    reactions: [],
  },
  {
    id: 'msg_3',
    seq: 3,
    senderId: 'usr_teacher',
    type: 'text',
    body: 'Ha, bugun kechqurun javoblarni fayl qilib tashlayman.',
    createdAt: min(176),
    reactions: [{ emoji: '🙏', userIds: ['usr_aziz'] }],
    replyToId: 'msg_2',
  },
  {
    id: 'msg_4',
    seq: 4,
    senderId: 'usr_malika',
    type: 'text',
    body: 'Men 14-misolni yecholmadim, kimdir tushuntirib bera oladimi? 😅',
    createdAt: min(120),
    reactions: [],
  },
  {
    id: 'msg_5',
    seq: 5,
    senderId: 'usr_jasur',
    type: 'text',
    body: 'Malika, u yerda avval qavsni ochasan, keyin x ni bir tomonga yig‘asan.',
    createdAt: min(118),
    reactions: [{ emoji: '🔥', userIds: ['usr_malika', 'usr_teacher'] }],
    replyToId: 'msg_4',
  },
  {
    id: 'msg_6',
    seq: 6,
    senderId: 'usr_teacher',
    type: 'text',
    body: 'Barakalla Jasur! Aynan shunday. Malika, urinib ko‘r va natijani yoz.',
    createdAt: min(116),
    reactions: [{ emoji: '❤️', userIds: ['usr_malika'] }],
  },
  {
    id: 'msg_7',
    seq: 7,
    senderId: 'usr_malika',
    type: 'text',
    body: 'Bo‘ldi, chiqdi! x = 5 ekan ✅ Rahmat hammaga!',
    createdAt: min(40),
    reactions: [{ emoji: '🎉', userIds: ['usr_teacher', 'usr_jasur', 'usr_aziz'] }],
  },
];

export function findUserByCredentials(username: string, password: string): DemoUser | undefined {
  return demoUsers.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password,
  );
}

export function findUserById(id: string): DemoUser | undefined {
  return demoUsers.find((u) => u.id === id);
}

export function usersInClass(classId: string): DemoUser[] {
  return demoUsers.filter((u) => u.classId === classId);
}
