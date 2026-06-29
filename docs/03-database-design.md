# 03 — Database Design (PostgreSQL 16)

Designed as a senior PostgreSQL architect for **millions of users**, correct normalization (3NF, no duplicated source-of-truth data), referential integrity, and a clear scaling path (replicas → partitioning → org sharding).

## 0. Conventions

- **PKs:** `UUID v7` (`id`) — globally unique (shard- and merge-safe) yet **time-ordered**, so they index well and avoid the random-UUID write-amplification problem. Generated app-side or via `uuidv7()`.
- **Timestamps:** `timestamptz` (UTC). Every table has `created_at`; mutable tables have `updated_at`; soft-deletable tables have `deleted_at` (NULL = live).
- **Tenancy:** every domain table carries `org_id` for tenant isolation and future sharding.
- **Enums:** native Postgres `ENUM` types for closed sets (roles, statuses), kept small and migration-aware.
- **No duplicated truth:** denormalized counters (unread, member counts) are *derived caches*, clearly marked, and rebuildable — never the authority.
- **Money/grades:** numeric/`decimal`, never float.
- **Money of record:** all academic records soft-delete (archival), never hard-delete by default.

---

## 1. Identity & tenancy

### `organizations`
Multi-tenant root (a school / tutoring company).
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `slug` | citext UNIQUE | url-safe handle |
| `status` | enum(`active`,`suspended`) | |
| `settings` | jsonb | feature flags, AI policy, branding |
| `created_at` / `updated_at` | timestamptz | |

### `users`
A person. **Not** tied to a single class (membership handles that).
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations(id) | tenant scope |
| `role` | enum(`super_admin`,`admin`,`teacher`,`co_teacher`,`student`) | base role |
| `username` | citext NOT NULL | login id; **UNIQUE per org** |
| `email` | citext NULL | optional (teachers/admins); UNIQUE per org when present |
| `full_name` | text | |
| `password_hash` | text NOT NULL | Argon2id |
| `must_change_password` | boolean DEFAULT true | forced first-login rotation |
| `status` | enum(`active`,`invited`,`suspended`,`archived`) | |
| `avatar_media_id` | uuid FK → media(id) NULL | |
| `created_by` | uuid FK → users(id) NULL | who provisioned this account (audit) |
| `last_login_at` | timestamptz NULL | |
| `created_at`/`updated_at`/`deleted_at` | timestamptz | |

**Constraints/indexes**
- `UNIQUE (org_id, lower(username))`
- `UNIQUE (org_id, lower(email)) WHERE email IS NOT NULL`
- `INDEX (org_id, role)`
- `INDEX (created_by)`

### `auth_sessions`
Refresh-token/session family per device.
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `session_id` in JWT |
| `user_id` | uuid FK → users(id) ON DELETE CASCADE | |
| `refresh_token_hash` | text NOT NULL | hashed, rotating |
| `device_info` | jsonb | UA, platform |
| `ip_last` | inet | |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz NULL | reuse-detection / logout |
| `created_at` | timestamptz | |

`INDEX (user_id) WHERE revoked_at IS NULL`.

### `user_2fa` (phased)
TOTP secrets/backup codes for privileged accounts. 1:1 with users.

---

## 2. Permissions (RBAC + scoped)

### `permissions` (static seed)
`id`, `key` (e.g. `class.create`, `message.delete_any`), `description`. Closed catalog.

### `role_permissions`
Default permission set per base role. Composite PK `(role, permission_id)`.

### `class_member_overrides` (optional, phased)
Per-membership grants/revocations for edge cases (e.g. promote a student to a class helper) without changing base role.

> Authorization at runtime = base role permissions **±** overrides, scoped by membership. Stored declaratively so policy changes need no code deploy.

---

## 3. Classes & membership

### `classes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations(id) | |
| `name` | text NOT NULL | "Grade 9-B Math" |
| `subject` | text NULL | |
| `description` | text NULL | |
| `owner_teacher_id` | uuid FK → users(id) | primary teacher |
| `cover_media_id` | uuid FK → media(id) NULL | |
| `settings` | jsonb | DM policy, AI tutor on/off, slow-mode, etc. |
| `status` | enum(`active`,`archived`) | term-end archival |
| `last_message_seq` | bigint DEFAULT 0 | denormalized cache of max seq (for unread math) |
| `created_at`/`updated_at`/`archived_at` | timestamptz | |

`INDEX (org_id, status)`, `INDEX (owner_teacher_id)`.

### `class_members`
The join between a user and a class — **the privacy/security boundary**.
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid FK → classes(id) ON DELETE CASCADE | |
| `user_id` | uuid FK → users(id) ON DELETE CASCADE | |
| `role_in_class` | enum(`teacher`,`co_teacher`,`student`) | |
| `last_read_seq` | bigint DEFAULT 0 | drives unread counters |
| `muted` | boolean DEFAULT false | moderation |
| `notifications` | jsonb | per-class notification prefs |
| `joined_at` | timestamptz | |
| `removed_at` | timestamptz NULL | soft removal (keeps history) |

**Constraints/indexes**
- `UNIQUE (class_id, user_id)`
- `INDEX (user_id) WHERE removed_at IS NULL` — "my classrooms" lookup
- `INDEX (class_id) WHERE removed_at IS NULL` — roster

### `class_invites` (optional onboarding)
Single-use, expiring activation links/QR for **pre-created** seats. `id`, `class_id`, `target_user_id` NULL, `token_hash`, `expires_at`, `used_at`. Never enables arbitrary self-registration.

---

## 4. Messaging (the high-volume core)

### `messages` — **partitioned**
The hottest table; engineered for billions of rows.
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK (v7) | |
| `class_id` | uuid FK → classes(id) | partition/scoping key |
| `org_id` | uuid | carried for sharding/RLS |
| `seq` | bigint NOT NULL | **monotonic per class** (gap detection, ordering, unread) |
| `sender_id` | uuid FK → users(id) | NULL allowed for system/AI messages |
| `type` | enum(`text`,`image`,`file`,`pdf`,`voice`,`link`,`system`,`announcement`,`ai`) | |
| `body` | text NULL | text/markdown content |
| `reply_to_id` | uuid FK → messages(id) NULL | threading/replies |
| `client_msg_id` | uuid | idempotency / optimistic UI dedup |
| `edited_at` | timestamptz NULL | |
| `deleted_at` | timestamptz NULL | soft delete (tombstone shown as "deleted") |
| `metadata` | jsonb | link preview, mentions, formatting |
| `created_at` | timestamptz | |

**Partitioning:** `PARTITION BY LIST (class_id)` via hash sub-partitioning, **or** range-by-time (`created_at` monthly) depending on access pattern. Recommendation: **hash partition by `class_id`** so a class's history stays co-located and queries hit one partition; add time-based sub-partitioning for very large classes and cheap cold-data archival.

**Sequence allocation:** `seq` is allocated atomically per class (e.g. `UPDATE classes SET last_message_seq = last_message_seq + 1 RETURNING` inside the insert txn, or a dedicated per-class counter). Guarantees gapless ordering for sync.

**Indexes**
- `UNIQUE (class_id, seq)` — ordering + gap sync (`WHERE seq > :last`)
- `UNIQUE (class_id, client_msg_id)` — idempotency
- `INDEX (class_id, created_at DESC)` — history pagination
- `INDEX (reply_to_id) WHERE reply_to_id IS NOT NULL`
- Partial: `INDEX (class_id) WHERE deleted_at IS NULL`

### `message_attachments`
A message can have many media items (normalized, not jsonb-stuffed).
`id`, `message_id` FK ON DELETE CASCADE, `media_id` FK → media(id), `position` int. `INDEX (message_id)`.

### `message_reactions`
| Column | Type | Notes |
|---|---|---|
| `message_id` | uuid FK → messages(id) ON DELETE CASCADE | |
| `user_id` | uuid FK → users(id) | |
| `emoji` | text | unicode/shortcode |
| `created_at` | timestamptz | |

PK `(message_id, user_id, emoji)` — one of each emoji per user per message. `INDEX (message_id)` for aggregation. Counts are aggregated on read / cached in Redis, **not** duplicated as a column.

### `pinned_messages`
`id`, `class_id` FK, `message_id` FK, `pinned_by` FK → users(id), `pinned_at`. `UNIQUE (class_id, message_id)`, `INDEX (class_id)`.

### `message_reads` (optional, granular receipts)
For per-message read detail beyond `last_read_seq`. High-volume — only enable if product needs per-message ✓✓. Otherwise `class_members.last_read_seq` covers unread counts cheaply.

> **Presence & typing are NOT tables.** They live in Redis with TTL (ephemeral, high-churn). Persisting them would be a write-amplification mistake.

---

## 5. Media

### `media`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK | |
| `owner_id` | uuid FK → users(id) | uploader |
| `kind` | enum(`image`,`video`,`audio`,`file`,`pdf`) | |
| `storage_key` | text NOT NULL | S3 object key (private) |
| `mime_type` | text | sniffed, not trusted from client |
| `size_bytes` | bigint | |
| `status` | enum(`pending`,`scanning`,`ready`,`failed`) | pipeline state |
| `variants` | jsonb | thumbnails, transcodes, waveform, page-preview |
| `checksum` | text | dedup / integrity |
| `created_at`/`deleted_at` | timestamptz | |

`INDEX (org_id, owner_id)`, `INDEX (status) WHERE status <> 'ready'`.

---

## 6. Assignments & submissions

### `assignments`
`id`, `class_id` FK, `org_id`, `created_by` FK→users, `title`, `instructions` text, `due_at` timestamptz NULL, `points_possible` numeric, `status` enum(`draft`,`published`,`closed`), `settings` jsonb, timestamps. `INDEX (class_id, status)`, `INDEX (class_id, due_at)`.

### `assignment_attachments`
`assignment_id` FK, `media_id` FK, `position`. (Teacher-provided materials.)

### `submissions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `assignment_id` | uuid FK → assignments(id) | |
| `student_id` | uuid FK → users(id) | |
| `body` | text NULL | text answer |
| `status` | enum(`draft`,`submitted`,`returned`,`resubmitted`) | |
| `submitted_at` | timestamptz NULL | late = compare to assignment.due_at |
| `grade` | numeric NULL | |
| `feedback` | text NULL | |
| `graded_by` | uuid FK → users(id) NULL | |
| `graded_at` | timestamptz NULL | |
| timestamps | | |

`UNIQUE (assignment_id, student_id)` — one submission record per student (versions tracked separately if needed). `INDEX (assignment_id, status)`, `INDEX (student_id)`.

### `submission_attachments`
`submission_id` FK, `media_id` FK, `position`.

---

## 7. Tests / assessments

Normalized question model — reusable, multi-type, auto-gradable.

### `tests`
`id`, `class_id` FK, `org_id`, `created_by` FK, `title`, `instructions`, `time_limit_sec` int NULL, `available_from`/`available_to` timestamptz, `shuffle` bool, `status` enum(`draft`,`published`,`closed`), `points_possible` numeric, timestamps.

### `questions`
`id`, `test_id` FK ON DELETE CASCADE, `type` enum(`mcq`,`multi`,`true_false`,`short_answer`,`file_upload`), `prompt` text, `points` numeric, `position` int, `metadata` jsonb. `INDEX (test_id, position)`.

### `question_options` (for choice types)
`id`, `question_id` FK ON DELETE CASCADE, `label` text, `is_correct` boolean, `position` int. `INDEX (question_id)`. *(Correctness lives here, server-side only — never sent to students during an attempt.)*

### `test_attempts`
`id`, `test_id` FK, `student_id` FK, `started_at`, `submitted_at` NULL, `status` enum(`in_progress`,`submitted`,`graded`,`expired`), `score` numeric NULL, `graded_by` NULL, timestamps. `UNIQUE (test_id, student_id)` (or allow N attempts via `attempt_no`). `INDEX (test_id, status)`.

### `attempt_answers`
`id`, `attempt_id` FK ON DELETE CASCADE, `question_id` FK, `selected_option_ids` uuid[] NULL, `answer_text` text NULL, `answer_media_id` FK NULL, `awarded_points` numeric NULL, `auto_graded` boolean. `UNIQUE (attempt_id, question_id)`.

---

## 8. Gradebook

No separate source-of-truth table — grades live on `submissions` and `test_attempts`. The gradebook is a **materialized view** (or cached aggregate) per class joining those, refreshed on grade events. This avoids duplicating grade data while keeping reads fast.

`gradebook_class_view` (materialized): `class_id, student_id, item_type, item_id, points, points_possible, graded_at`. Refreshed via domain events; `INDEX (class_id, student_id)`.

---

## 9. Notifications

### `notifications`
`id`, `user_id` FK, `org_id`, `type` enum(`message`,`announcement`,`assignment_due`,`graded`,`mention`,`system`), `payload` jsonb, `read_at` timestamptz NULL, `created_at`. `INDEX (user_id, created_at DESC) WHERE read_at IS NULL`. High-volume → time-partition or prune old read rows.

### `notification_prefs`
1:1-ish with users (or per-class in `class_members.notifications`): channels (push/email/in-app), quiet hours, digest cadence.

### `devices`
Push tokens: `id`, `user_id` FK, `platform` enum(`ios`,`android`,`web`), `push_token`, `last_seen_at`. `UNIQUE (push_token)`.

---

## 10. AI

### `ai_conversations`
`id`, `org_id`, `class_id` FK NULL, `user_id` FK, `kind` enum(`tutor`,`assist`), `created_at`.

### `ai_messages`
`id`, `conversation_id` FK ON DELETE CASCADE, `role` enum(`user`,`assistant`,`system`), `content` text, `tokens_in`/`tokens_out` int, `model` text, `cost_usd` numeric, `created_at`. `INDEX (conversation_id, created_at)`.

### `ai_documents` / `ai_chunks` (RAG, phased)
Class materials → chunks → embeddings for grounded tutoring. `ai_chunks(id, class_id, source_media_id, content, embedding vector(N))` using **pgvector** with an `ivfflat`/`hnsw` index. Scoped strictly by `class_id`.

### `moderation_events`
`id`, `org_id`, `class_id`, `subject_type` enum(`message`,`media`,`submission`), `subject_id`, `verdict` jsonb (categories, scores), `action` enum(`none`,`flagged`,`blocked`), `reviewed_by` FK NULL, `created_at`. Feeds the teacher safety queue.

---

## 11. Audit

### `audit_log` (append-only, immutable)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK (v7) | |
| `org_id` | uuid | |
| `actor_id` | uuid FK → users(id) NULL | |
| `action` | text | e.g. `student.create`, `credential.reset`, `message.delete`, `role.change` |
| `target_type` / `target_id` | text / uuid | |
| `context` | jsonb | before/after, ip, ua |
| `created_at` | timestamptz | |

No `UPDATE`/`DELETE` permitted (enforced by DB grants). Time-partitioned by month; archived to cold storage. `INDEX (org_id, created_at DESC)`, `INDEX (actor_id)`, `INDEX (target_type, target_id)`.

---

## 12. Entity-relationship summary

```
organizations 1──* users
organizations 1──* classes
users 1──* auth_sessions
users *──* classes        (via class_members)              [privacy boundary]
classes 1──* messages
messages 1──* message_attachments *──1 media
messages 1──* message_reactions *──1 users
messages 1──* pinned_messages (subset)
messages 0..1 reply_to ─ messages (self-ref)
classes 1──* assignments 1──* submissions *──1 users(student)
classes 1──* tests 1──* questions 1──* question_options
tests 1──* test_attempts 1──* attempt_answers *──1 questions
users 1──* notifications / devices
classes 1──* ai_conversations 1──* ai_messages
classes 1──* ai_chunks            (RAG, pgvector)
* ──* audit_log                   (every privileged action)
```

---

## 13. Indexing & performance principles

1. **Index for the access path, not the column.** Composite indexes lead with the scoping key (`class_id`, `org_id`) that every query filters on.
2. **Partial indexes** for hot filtered queries (`WHERE deleted_at IS NULL`, `WHERE read_at IS NULL`, `WHERE status <> 'ready'`) — smaller, faster, cheaper to maintain.
3. **Cursor pagination** via `(class_id, seq)` or `(class_id, created_at, id)` — never `OFFSET` at scale.
4. **UUID v7** keeps PK B-trees append-friendly (avoids random-insert page splits of UUID v4).
5. **JSONB for open/evolving attributes only** (settings, metadata, preview) — never for relational data that needs joins, constraints, or indexing-as-rows.
6. **Foreign keys + `ON DELETE` rules** everywhere for integrity; cascades where a child cannot exist without its parent (attachments, options, answers); `RESTRICT`/soft-delete for academic records.
7. **`EXPLAIN ANALYZE` budget** on every hot query in review; no full-table scans on `messages`/`audit_log`.
8. **Connection pooling** via PgBouncer (transaction mode) — essential at 1M-user concurrency.

## 14. Scaling roadmap (DB)

| Stage | Trigger | Action |
|---|---|---|
| 1 | launch | single primary + 1 standby, PgBouncer |
| 2 | read-heavy load | **read replicas**; route history/search reads to replicas |
| 3 | messages table huge | **partition `messages`** (hash by `class_id` + time sub-partitions); archive cold partitions |
| 4 | audit/notifications huge | time-partition + cold-storage tiering |
| 5 | single primary write-saturated | **logical shard by `org_id`** (every table already org-scoped) → tenant routing layer |
| 6 | search load | move FTS → **OpenSearch**; embeddings stay in pgvector or dedicated vector DB |

Because **every table carries `org_id`** and the messaging core is **partition-ready from day one**, none of these stages require a destructive migration — they are operational steps, not rewrites.

## 15. Normalization stance

- Strict **3NF** for all transactional data; no field stores data derivable by join.
- The only denormalized values are **explicitly-labeled performance caches** (`classes.last_message_seq`, `class_members.last_read_seq`, Redis reaction/unread counts, materialized gradebook). Each is rebuildable from source and never treated as authority.
- This guarantees **no data duplication** while keeping the read path fast.
