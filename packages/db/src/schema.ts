// Modern Edu — Drizzle sxema (D1: yadro jadvallari).
// docs/03-malumotlar-bazasi.md bilan mos. Keyingi bosqichlarda media, vazifa,
// test, AI jadvallari qo'shiladi.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ---------- Enumlar ----------
export const userRole = pgEnum('user_role', [
  'super_admin',
  'admin',
  'teacher',
  'co_teacher',
  'student',
]);
export const classRole = pgEnum('class_role', ['teacher', 'co_teacher', 'student']);
export const userStatus = pgEnum('user_status', ['active', 'invited', 'suspended', 'archived']);
export const orgStatus = pgEnum('org_status', ['active', 'suspended']);
export const classStatus = pgEnum('class_status', ['active', 'archived']);
export const messageType = pgEnum('message_type', [
  'text',
  'image',
  'file',
  'pdf',
  'voice',
  'link',
  'system',
  'announcement',
  'ai',
]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

// ---------- Identifikatsiya va tenant ----------
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: orgStatus('status').notNull().default('active'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
    username: text('username').notNull(),
    email: text('email'),
    fullName: text('full_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: boolean('must_change_password').notNull().default(true),
    status: userStatus('status').notNull().default('active'),
    avatarColor: text('avatar_color'),
    createdById: uuid('created_by').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    lastLoginAt: ts('last_login_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: ts('deleted_at'),
  },
  (t) => [
    uniqueIndex('users_org_username_uq').on(t.orgId, t.username),
    uniqueIndex('users_org_email_uq').on(t.orgId, t.email),
    index('users_org_role_idx').on(t.orgId, t.role),
    index('users_created_by_idx').on(t.createdById),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    deviceInfo: jsonb('device_info').notNull().default({}),
    ipLast: text('ip_last'),
    expiresAt: ts('expires_at').notNull(),
    revokedAt: ts('revoked_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('auth_sessions_user_idx').on(t.userId)],
);

// ---------- Sinflar va a'zolik ----------
export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    subject: text('subject'),
    description: text('description'),
    ownerTeacherId: uuid('owner_teacher_id')
      .notNull()
      .references(() => users.id),
    settings: jsonb('settings').notNull().default({}),
    status: classStatus('status').notNull().default('active'),
    lastMessageSeq: integer('last_message_seq').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    archivedAt: ts('archived_at'),
  },
  (t) => [
    index('classes_org_status_idx').on(t.orgId, t.status),
    index('classes_owner_idx').on(t.ownerTeacherId),
  ],
);

export const classMembers = pgTable(
  'class_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleInClass: classRole('role_in_class').notNull(),
    lastReadSeq: integer('last_read_seq').notNull().default(0),
    muted: boolean('muted').notNull().default(false),
    joinedAt: ts('joined_at').notNull().defaultNow(),
    removedAt: ts('removed_at'),
  },
  (t) => [
    uniqueIndex('class_members_class_user_uq').on(t.classId, t.userId),
    index('class_members_user_idx').on(t.userId),
    index('class_members_class_idx').on(t.classId),
  ],
);

// ---------- Messaging ----------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull(),
    seq: integer('seq').notNull(),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    type: messageType('type').notNull().default('text'),
    body: text('body'),
    replyToId: uuid('reply_to_id').references((): AnyPgColumn => messages.id, {
      onDelete: 'set null',
    }),
    clientMsgId: uuid('client_msg_id'),
    editedAt: ts('edited_at'),
    deletedAt: ts('deleted_at'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('messages_class_seq_uq').on(t.classId, t.seq),
    uniqueIndex('messages_class_clientmsg_uq').on(t.classId, t.clientMsgId),
    index('messages_class_created_idx').on(t.classId, t.createdAt),
    index('messages_reply_idx').on(t.replyToId),
  ],
);

export const messageReactions = pgTable(
  'message_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('message_reactions_uq').on(t.messageId, t.userId, t.emoji),
    index('message_reactions_message_idx').on(t.messageId),
  ],
);

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    pinnedById: uuid('pinned_by')
      .notNull()
      .references(() => users.id),
    pinnedAt: ts('pinned_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('pinned_messages_uq').on(t.classId, t.messageId),
    index('pinned_messages_class_idx').on(t.classId),
  ],
);

// ---------- Audit ----------
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    context: jsonb('context').notNull().default({}),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_org_created_idx').on(t.orgId, t.createdAt),
    index('audit_actor_idx').on(t.actorId),
    index('audit_target_idx').on(t.targetType, t.targetId),
  ],
);

// Qulay tip eksportlari
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type ClassMember = typeof classMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
