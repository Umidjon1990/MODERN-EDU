# 05 — Implementation Roadmap

The project is split into **small, strictly dependency-ordered phases**. Each phase is sized to be completed and reviewed safely in isolation, depends only on phases before it, and ends in a **working, demonstrable, reviewed** state. **No phase is skipped. No phase is started before its predecessor passes review** (correctness, security, performance, scalability — see `06-development-rules.md`).

> Reminder: this roadmap is the build plan. **No code is written until the blueprint is approved.**

---

## Stage 0 — Foundations (no product features yet)

**Phase 0.1 — Monorepo & tooling**
pnpm + Turborepo workspace; `apps/*` and `packages/*` skeletons; shared TypeScript/ESLint/Prettier config; commit hooks; CI pipeline (typecheck, lint, test) on PRs.
*Depends on:* nothing. *Done when:* `pnpm build`/`lint`/`test` run green in CI on an empty skeleton.

**Phase 0.2 — Infra & environments (IaC)**
Provision dev/staging via Terraform: Postgres, Redis, object storage bucket, secrets manager. Containerization + local docker-compose for dev parity.
*Depends on:* 0.1. *Done when:* a developer can spin the full stack locally and a staging environment exists.

**Phase 0.3 — Shared contracts package**
`packages/contracts`: Zod schemas + DTO types for the core entities defined in `03-database-design.md`. The single source of truth for all later API/client work.
*Depends on:* 0.1.

---

## Stage 1 — Identity, tenancy & access (the security spine)

**Phase 1.1 — Database core + migrations**
Implement `organizations`, `users`, `auth_sessions`, `permissions`, `role_permissions` via the migration tool + seeders. PgBouncer wired.
*Depends on:* 0.2, 0.3.

**Phase 1.2 — Authentication**
Login (username/password, Argon2id), access+refresh JWT with rotating opaque refresh tokens, session table, forced first-login password rotation, logout/revoke. Rate limiting + lockout on auth.
*Depends on:* 1.1.

**Phase 1.3 — Authorization layer**
The `can(actor, action, resource)` policy/guard layer; RBAC from `role_permissions`; membership-scoping plumbing (even before classes exist, the guard contract is fixed). Audit-log table + writer.
*Depends on:* 1.2.

**Phase 1.4 — Admin → Teacher provisioning**
Admin creates Teacher accounts (permissioned, audited); credential issuance; basic admin management endpoints.
*Depends on:* 1.3.

---

## Stage 2 — Classes & membership (the privacy boundary)

**Phase 2.1 — Classes + memberships schema & API**
`classes`, `class_members`; Teacher creates a Class; data-layer membership scoping enforced + tested (a user can only ever read classes they belong to).
*Depends on:* 1.4.

**Phase 2.2 — Teacher → Student provisioning**
Bulk student account creation, temp-password issuance, credential export artifact (sheet/QR), reset-credentials, soft removal/archival. All audited.
*Depends on:* 2.1.

**Phase 2.3 — "My classroom" routing**
Login → land directly in the user's classroom; class switcher (only owned/enrolled classes). Cross-classroom isolation verified by automated tests.
*Depends on:* 2.2.

---

## Stage 3 — Frontend shell & design system

**Phase 3.1 — Design system foundation**
`packages/ui`: tokens (color/type/spacing/radius/shadow), theming (light/dark), core primitives (Button, Input, Card, Modal/Sheet, Avatar, Toast, Skeleton, EmptyState). Visual tests.
*Depends on:* 0.1.

**Phase 3.2 — Web app shell**
Next.js app: auth flows (login, first-login rotation), responsive three-zone shell, navigation, theme toggle, route transitions, typed SDK (`packages/sdk`) consuming the REST API.
*Depends on:* 2.3, 3.1.

**Phase 3.3 — Classroom home (static-data version)**
The classroom landing layout (announcement banner, pinned strip, quick-glance, empty states) wired to real class/membership data — chat placeholder for now.
*Depends on:* 3.2.

---

## Stage 4 — Messaging (the core)

**Phase 4.1 — Message persistence & REST**
`messages` (+ partitioning), per-class `seq` allocation, send/edit/delete (soft), cursor pagination, idempotency via `client_msg_id`. Membership-scoped.
*Depends on:* 2.3.

**Phase 4.2 — Realtime gateway**
Standalone WebSocket service; room = class (membership-verified); Redis pub/sub fan-out; reconnect + gap sync (`after_seq`); presence & typing (Redis TTL).
*Depends on:* 4.1.

**Phase 4.3 — Chat UI**
Telegram-grade chat: virtualized list, bubbles, grouping, date separators, composer, optimistic send, reconnect/backfill, scroll-to-bottom + unread divider.
*Depends on:* 4.2, 3.3.

**Phase 4.4 — Reactions, replies, read state**
`message_reactions`, replies (`reply_to_id`), `last_read_seq` unread counters + read indicators. UI: reaction bar, quoted replies, unread badges.
*Depends on:* 4.3.

---

## Stage 5 — Media

**Phase 5.1 — Upload pipeline**
`media` table, pre-signed direct-to-S3 upload, finalize, async workers (scan → validate → thumbnail/transcode/page-preview), signed access URLs scoped to membership.
*Depends on:* 4.1.

**Phase 5.2 — Rich media in chat**
Images (lightbox/gallery), files (cards), PDF viewer, **voice messages** (record + waveform playback), server-side link previews (SSRF-safe).
*Depends on:* 5.1, 4.3.

---

## Stage 6 — Classroom structure

**Phase 6.1 — Pinned messages & announcements**
`pinned_messages`; announcement message type + banner; pin/unpin moderation; pinned strip live.
*Depends on:* 4.4.

**Phase 6.2 — Moderation tools**
Mute/remove member, delete-any-message, slow mode, per-class DM policy; teacher moderation surfaces. Audited.
*Depends on:* 6.1.

**Phase 6.3 — Message search**
Postgres FTS over class messages; search UI with highlight + jump-to-message.
*Depends on:* 4.4.

---

## Stage 7 — Academics

**Phase 7.1 — Assignments**
`assignments` + attachments + `submissions` + submission attachments; teacher create/publish, student submit (text+file, draft autosave), teacher grade + feedback, due-date logic.
*Depends on:* 5.1, 6.1.

**Phase 7.2 — Tests/Quizzes**
`tests`/`questions`/`question_options`/`test_attempts`/`attempt_answers`; runner (focus mode, timer, autosave), auto-grading for objective types, results screen with reveal policy.
*Depends on:* 7.1.

**Phase 7.3 — Gradebook**
Materialized gradebook view from submissions + attempts; teacher gradebook UI; student grades view.
*Depends on:* 7.2.

---

## Stage 8 — Notifications

**Phase 8.1 — In-app + push**
`notifications`, `devices`, `notification_prefs`; event-driven notification workers; in-app inbox; push via APNs/FCM (Expo); quiet hours + digests.
*Depends on:* 4.4 (and relevant feature events as they land).

---

## Stage 9 — AI modules (phased, behind provider abstraction)

**Phase 9.1 — AI infrastructure**
`ai` module + provider-abstraction layer (managed Claude default), call logging (`ai_messages` cost/latency), per-org budgets/limits, feature flags.
*Depends on:* 1.3.

**Phase 9.2 — Moderation & safety (invisible)**
`moderation_events`; async classification of messages/uploads → teacher safety queue; policy actions (flag/block).
*Depends on:* 9.1, 5.1, 4.4.

**Phase 9.3 — Teacher Assist**
Lesson/quiz generation, grading help, summarization — opt-in, always teacher-reviewed before students see output.
*Depends on:* 9.1, 7.2.

**Phase 9.4 — Student AI Tutor (RAG)**
`ai_documents`/`ai_chunks` with pgvector; ingest class materials → embeddings; class-scoped grounded tutor with citations, streaming, and guardrails (e.g. disabled during active graded tests).
*Depends on:* 9.1, 7.2, 5.1.

---

## Stage 10 — Mobile apps

**Phase 10.1 — Mobile shell**
Expo/React Native app reusing `packages/contracts` + `packages/sdk`: auth, navigation (bottom tabs), theming.
*Depends on:* mature, stable APIs (post Stage 4–7).

**Phase 10.2 — Mobile chat & classroom**
Native-feeling chat (swipe reply, voice messages, push), classroom home, assignments/tests.
*Depends on:* 10.1.

---

## Stage 11 — Hardening & scale

**Phase 11.1 — Observability**
Structured logs, OpenTelemetry tracing, Prometheus/Grafana metrics, Sentry, SLO alerts.
*Depends on:* services in place.

**Phase 11.2 — Performance & scale**
Read replicas, caching layers, message-table partitioning rollout, load testing to 1M-user projections, query/index tuning.
*Depends on:* 11.1.

**Phase 11.3 — Security & compliance**
Pen-test pass, rate-limit/abuse review, GDPR/COPPA/FERPA flows (export, erasure, residency), backup **restore drills**, DR runbook.
*Depends on:* 11.1.

**Phase 11.4 — Microservice extraction (as needed)**
Promote internal event bus to a real broker; extract realtime → media → AI → messaging → notifications under measured load. Only when metrics justify it.
*Depends on:* 11.2.

---

## Development roadmap (milestone view)

| Milestone | Stages | Outcome |
|---|---|---|
| **M0 — Walking skeleton** | 0 | Monorepo, CI, infra, contracts |
| **M1 — Accounts work** | 1–2 | Admin→Teacher→Student provisioning; private classrooms; isolation proven |
| **M2 — It looks premium** | 3 | Design system + app shell + classroom home |
| **M3 — Classrooms are alive** | 4–6 | Realtime chat, media, pins/announcements, moderation, search |
| **M4 — Real teaching** | 7–8 | Assignments, tests, gradebook, notifications |
| **M5 — Intelligent** | 9 | Moderation AI, teacher assist, student tutor |
| **M6 — Everywhere** | 10 | iOS/Android apps |
| **M7 — Production-grade at scale** | 11 | Observability, scale, security/compliance, service extraction |

Each milestone is independently demonstrable and shippable to a pilot before the next begins.
