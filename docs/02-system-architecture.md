# 02 — System Architecture

This document defines the production architecture for Modern Edu, designed to scale to **1M+ users** without re-platforming. The guiding principle: **start as a well-factored modular monolith, but draw every internal boundary as if it were already a microservice**, so we can extract services under load without rewrites.

---

## 1. Architecture at a glance

```
                         ┌───────────────────────────────────────────┐
                         │                 Clients                    │
                         │  Web (Next.js)   iOS/Android (React Native)│
                         └───────────────┬─────────────┬─────────────┘
                                         │ HTTPS/REST  │ WSS (realtime)
                                         ▼             ▼
                              ┌──────────────────────────────────┐
                              │        Edge / CDN / WAF           │
                              │  TLS, DDoS, static + media cache  │
                              └───────────────┬──────────────────┘
                                              ▼
                                   ┌────────────────────┐
                                   │   API Gateway /     │  rate-limit, authN,
                                   │   Load Balancer     │  routing, tracing
                                   └─────┬─────────┬─────┘
                       ┌─────────────────┘         └──────────────────┐
                       ▼                                              ▼
            ┌────────────────────┐                       ┌─────────────────────────┐
            │   API service       │                      │  Realtime Gateway        │
            │   (NestJS)          │◄──── Redis pub/sub ──►│  (WebSocket cluster)     │
            │  modular monolith   │                      │  presence, fan-out       │
            └───┬───────┬─────────┘                      └───────────┬─────────────┘
                │       │                                            │
        ┌───────┘       └────────┐                                  │
        ▼                        ▼                                  ▼
┌───────────────┐      ┌──────────────────┐               ┌──────────────────┐
│ PostgreSQL 16 │      │   Redis           │              │  Async Workers    │
│ primary +     │      │ cache / sessions  │              │  (BullMQ queues)  │
│ read replicas │      │ presence / pubsub │              │ media, AI, email, │
└───────────────┘      └──────────────────┘               │ notifications     │
        │                                                  └────────┬─────────┘
        ▼                                                           ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────┐  ┌────────────────────┐
│ Object storage│   │ Search (FTS →  │   │ AI Provider    │  │ Observability       │
│ (S3) + CDN    │   │ OpenSearch)    │   │ Abstraction    │  │ logs/metrics/traces │
└───────────────┘   └────────────────┘   │ (Claude, etc.) │  └────────────────────┘
                                          └───────────────┘
```

---

## 2. Frontend

### 2.1 Web — Next.js (App Router)
- **Why:** SSR/streaming for fast first paint and good SEO-irrelevant-but-fast loads, React Server Components to keep bundles small, mature ecosystem, first-class TypeScript.
- **Rendering:** App shell + authenticated dashboards are mostly client-interactive; static marketing pages are statically generated. Classroom data fetched via REST; live updates via the realtime socket.
- **State:**
  - **Server state:** TanStack Query (caching, optimistic updates, retries).
  - **Realtime state:** a dedicated socket client layer that hydrates the Query cache (single source of truth — no parallel store divergence).
  - **Local UI state:** Zustand for ephemeral UI (composer, modals, theme).
- **Styling:** Tailwind CSS + a token-driven design system (see `04-ui-ux-design.md`). Headless primitives (Radix) for accessible components; Framer Motion for motion.
- **Forms/validation:** React Hook Form + Zod (Zod schemas shared with backend via a `packages/contracts` package).

### 2.2 Mobile — React Native + Expo
- **Why over native Kotlin/Swift:** shares ~80% of business logic, types, validation, and API/socket clients with web through the monorepo; one team; fastest path to parity. Expo gives OTA updates, push notifications, and managed builds. Native modules can be dropped in later for anything Expo can't do (advanced audio, etc.).
- Shares `packages/contracts`, `packages/sdk` (typed API + socket client), and domain logic with web. Only the presentation layer differs.

### 2.3 Shared monorepo
```
/apps
  /web         (Next.js)
  /mobile      (Expo / React Native)
  /api         (NestJS)
  /realtime    (WebSocket gateway)
  /workers     (background jobs)
/packages
  /contracts   (Zod schemas + DTO types — single source of truth)
  /sdk         (typed REST + socket client used by web & mobile)
  /ui          (shared design tokens, some cross-platform primitives)
  /config      (eslint, tsconfig, tailwind preset)
  /db          (Prisma/Drizzle schema, migrations, seeders)
```
Tooling: **pnpm workspaces + Turborepo** for fast, cached builds.

---

## 3. Backend (API)

### 3.1 NestJS modular monolith
- **Why:** opinionated, dependency-injected, modular by design — each domain is a self-contained module with its own controller/service/repository. This *is* the microservice boundary; we deploy as one process now and split later.
- **Modules (bounded contexts):**
  `auth`, `identity` (users/roles), `org` (tenants), `class` (classes & memberships), `messaging` (chat/messages/pins), `media` (uploads), `assignments`, `assessments` (tests/quizzes), `gradebook`, `notifications`, `moderation`, `ai`, `audit`, `search`, `admin`.
- **Internal communication:** in-process method calls today, but each module exposes a clean service interface and emits **domain events** (e.g. `MessagePosted`, `StudentCreated`, `SubmissionGraded`) onto an internal event bus. When we extract a module into its own service, the event bus becomes a real broker (NATS/Kafka) with no caller changes.

### 3.2 API style
- **Primary:** versioned **REST** (`/api/v1/...`), resource-oriented, predictable, easy for mobile and third parties. Cursor-based pagination everywhere (no OFFSET at scale).
- **Contracts:** OpenAPI generated from code; Zod/DTO types shared with clients via `packages/contracts`. Clients never hand-roll types.
- **Realtime delta channel:** WebSocket for live events (see §5). REST remains the source of truth; sockets carry deltas + presence.
- **GraphQL:** intentionally deferred. REST + typed SDK covers our needs with less operational complexity; we can add a GraphQL/BFF gateway later for mobile if query-shaping pain appears.

### 3.3 Representative API surface (v1)
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password/first-set      # forced rotation on first login

# Admin
POST   /api/v1/teachers                      # admin creates teacher
GET    /api/v1/teachers

# Teacher
POST   /api/v1/classes
POST   /api/v1/classes/:id/students          # bulk create student accounts
POST   /api/v1/classes/:id/students/:sid/reset-credentials
GET    /api/v1/classes/:id/credentials/export

# Classroom
GET    /api/v1/classes/:id                   # classroom home payload
GET    /api/v1/classes/:id/messages?cursor=  # paginated history
POST   /api/v1/classes/:id/messages
PATCH  /api/v1/messages/:id                  # edit
DELETE /api/v1/messages/:id
POST   /api/v1/messages/:id/reactions
POST   /api/v1/classes/:id/messages/:mid/pin
GET    /api/v1/classes/:id/search?q=

# Media
POST   /api/v1/media/upload-url              # pre-signed direct-to-S3
POST   /api/v1/media/:id/finalize

# Academics
POST   /api/v1/classes/:id/assignments
POST   /api/v1/assignments/:id/submissions
POST   /api/v1/submissions/:id/grade
POST   /api/v1/classes/:id/tests
POST   /api/v1/tests/:id/attempts

# AI
POST   /api/v1/classes/:id/ai/tutor          # student tutor query (policy-gated)
POST   /api/v1/ai/assist/*                   # teacher assist endpoints
```

---

## 4. Authentication & session management

### 4.1 Model
- **No self-registration.** The only credential-creating endpoints are admin→teacher and teacher→student, both permissioned and audited.
- **Login:** username + password (students often have no email). Email optional for teachers/admins (enables recovery + 2FA).
- **Password storage:** **Argon2id** (memory-hard) with per-user salt; pepper from secrets manager.
- **Forced first-login rotation:** teacher-issued passwords are flagged `must_change`; the session is restricted until the student sets a new password.

### 4.2 Tokens
- **Access token:** short-lived (~15 min) JWT (signed, contains `user_id`, `role`, `org_id`, and a `session_id`). Stateless verification on every request.
- **Refresh token:** long-lived, **opaque, rotating**, stored server-side (hashed) and bound to a session/device row. Rotation + reuse-detection (a replayed refresh token revokes the whole session family).
- **Web:** tokens in `httpOnly`, `Secure`, `SameSite=Lax` cookies (XSS-resistant). **Mobile:** tokens in secure storage (Keychain/Keystore).
- **Realtime:** the socket handshake authenticates with a short-lived access token (or a single-use socket ticket minted by the API), re-validated on reconnect.

### 4.3 Extras designed in (phased)
- **2FA/TOTP** for Admins/Teachers (privileged accounts).
- **Device/session management** UI (list & revoke sessions).
- **Account lockout + exponential backoff** on brute force; CAPTCHA escalation.
- **SSO/OAuth (Google/Microsoft Education)** as a later option for teachers/admins — students stay on managed credentials.

---

## 5. Realtime architecture

### 5.1 Gateway
- A **dedicated, horizontally scalable WebSocket service** (separate deployable from the API), built on `ws`/Socket.IO. Keeping it separate means chat load never starves request handling and each scales independently.
- **Rooms = classrooms.** On connect, a client joins exactly the rooms its memberships authorize (verified against the DB/cache — membership is the security boundary, never a client-supplied room id).
- **Fan-out across instances** via **Redis pub/sub** (or a managed equivalent). Any API/worker node publishes a `MessagePosted` event; every gateway instance hosting that room's subscribers delivers it.

### 5.2 Delivery guarantees & ordering
- Messages are **persisted first** (Postgres), then fanned out — the DB is the source of truth, the socket is a delivery accelerator.
- Each message carries a **monotonic per-class sequence** (`seq`) so clients can detect gaps and backfill via REST (`?after_seq=`). This gives Telegram-like reliability: drop the socket, reconnect, sync the gap, never lose a message.
- **Idempotency:** client-generated `client_msg_id` deduplicates retries and powers optimistic UI (the echoed server message reconciles the optimistic one).

### 5.3 Presence, typing, receipts
- **Presence & typing:** ephemeral, Redis-backed with TTL, never written to Postgres (high churn, low value to persist).
- **Read receipts / unread counters:** a per-member `last_read_seq` in Postgres (+ Redis cache). Unread = `class.max_seq − member.last_read_seq`. Cheap, accurate, scales.

### 5.4 Push notifications
- When a recipient is offline, a worker turns the event into a push (APNs/FCM via Expo) or email/digest, honoring per-user notification preferences and quiet hours.

---

## 6. Storage & media

- **Object storage:** S3-compatible bucket(s) behind a CDN. **Direct-to-storage uploads** via pre-signed URLs — large files (PDF, audio, images) never proxy through the API.
- **Pipeline (async workers):** virus/malware scan → type/size validation → image thumbnails & responsive variants → audio transcode/normalize (voice messages → web-friendly Opus/AAC + waveform) → PDF first-page preview. Status tracked on a `media` row (`pending → ready/failed`).
- **Access control:** media is private by default; served via short-lived signed CDN URLs scoped to the requester's classroom membership. No public buckets.
- **Link previews:** a sandboxed worker fetches OpenGraph metadata server-side (SSRF-protected: allowlist schemes, block internal IP ranges, timeouts).

---

## 7. Permissions model (authorization)

Authorization is **RBAC + scoped policy**, never scattered `if (role === 'teacher')` checks.

- **Roles** carry default permission sets; **memberships** scope a role to an org/class.
- A central **policy/guard layer** answers `can(actor, action, resource)` using: the actor's role, their membership in the resource's class/org, and resource-level rules (e.g. a student can edit *their own* message within an edit window).
- **Data-layer enforcement:** every classroom query is scoped by membership at the repository level (and optionally Postgres Row-Level Security as defense-in-depth). The UI hiding a button is *never* the security boundary.

Permission examples:
| Action | Admin | Teacher (owner) | Co-Teacher | Student |
|---|---|---|---|---|
| Create Teacher | ✓ | — | — | — |
| Create Class | ✓ | ✓ | — | — |
| Create Student | ✓ | ✓ | — | — |
| Post message | ✓ (any) | ✓ (own class) | ✓ | ✓ (own class) |
| Edit own message (≤ window) | ✓ | ✓ | ✓ | ✓ |
| Delete others' message | ✓ | ✓ | ✓ | — |
| Pin / Announce | ✓ | ✓ | ✓ | — |
| Create assignment/test | ✓ | ✓ | ✓ | — |
| Grade | ✓ | ✓ | ✓ | — |
| See another classroom | ✓ (audited) | — | — | — |

---

## 8. Security

- **Transport:** TLS 1.3 everywhere; HSTS; modern cipher suites only.
- **Tenant isolation:** every row carries `org_id`; classroom data additionally scoped by `class_id` + membership. Cross-tenant access is impossible by query construction and verified by tests.
- **Input:** Zod validation at the edge; parameterized queries / ORM (no string SQL); output encoding to prevent XSS; strict CSP.
- **Secrets:** in a managed secrets manager (not env files in repo); rotated; least-privilege IAM per service.
- **Rate limiting & abuse:** per-IP and per-user limits at the gateway; stricter limits on auth and AI endpoints; bot/brute-force protection.
- **File safety:** malware scanning, type sniffing (not trusting extensions), size caps, signed access.
- **AI safety:** prompt-injection mitigations (treat user/classroom content as untrusted, never let it override system policy), PII redaction in logs, output moderation.
- **Privacy/compliance:** student-data minimization, configurable data residency per org, GDPR/COPPA/FERPA-aware (consent, erasure, export, parental considerations for minors). Soft-delete by default; hard-delete is an explicit, logged, permissioned flow.
- **Audit log:** immutable, append-only record of every privileged/sensitive action.

---

## 9. Scalability & microservice readiness

- **Stateless services** (API, realtime, workers) scale horizontally behind load balancers; all shared state lives in Postgres/Redis/object storage.
- **Database scaling path:** vertical first → **read replicas** for read-heavy endpoints → **partitioning** of the messages table (by class or time) → **logical sharding by `org_id`** when a single primary is saturated. Schema designed for this from day one (every hot table is org/class-scoped). See `03-database-design.md`.
- **Extraction order under load** (modules → services): (1) **Realtime gateway** (already separate), (2) **Media pipeline** (already a worker fleet), (3) **AI service**, (4) **Messaging**, (5) **Notifications**. The event bus + clean module interfaces make each a lift-and-shift, not a rewrite.
- **Caching** (see §10), **CDN** for media/static, and **async offload** of anything non-interactive keep the request path thin.

## 10. Caching

| Layer | Tech | Cached |
|---|---|---|
| Edge | CDN | static assets, media (signed), public marketing |
| App | Redis | sessions/refresh lookups, permission checks, classroom home payload, hot message pages, presence, unread counts, rate-limit counters |
| Client | TanStack Query | server state with smart invalidation; realtime events patch the cache |
| DB | Postgres | materialized views for gradebook/analytics; partial indexes for hot paths |

Cache invalidation is **event-driven** — domain events (`MessagePosted`, `MemberJoined`, etc.) trigger targeted invalidations rather than blanket TTL guesswork.

## 11. Async processing

- **Queue:** BullMQ (Redis) now; swappable for SQS/NATS/Kafka when extracting services.
- **Job classes:** media processing, AI inference, push/email notifications, search indexing, digest generation, exports, scheduled tasks (due-date reminders, term archival).
- Jobs are **idempotent**, **retried with backoff**, and dead-lettered on repeated failure with alerting.

## 12. Logging, monitoring, observability

- **Structured logging** (JSON) with correlation/trace IDs propagated across API → realtime → workers.
- **Metrics:** Prometheus-style (request latency/error rates, socket connections, queue depth, AI cost/latency, DB pool saturation) → Grafana dashboards.
- **Tracing:** OpenTelemetry distributed tracing across services.
- **Error tracking:** Sentry (frontend + backend) with release health.
- **Alerting:** SLO-based alerts (availability, p95 latency, queue backlog, error budget burn) to on-call.
- **Product analytics:** privacy-respecting, aggregate-only (no surveillance of students); used to improve UX, not to profile minors.

## 13. Backups & disaster recovery

- **Postgres:** automated daily snapshots + continuous WAL archiving → **point-in-time recovery**. Cross-region replica for DR.
- **Object storage:** versioning + cross-region replication; lifecycle policies for cost.
- **Redis:** treated as cache/ephemeral — anything that must survive a flush is also in Postgres (presence/typing are intentionally disposable).
- **Targets:** define and test **RPO ≤ 5 min**, **RTO ≤ 1 hr**. Backups are **restore-tested on a schedule** (an untested backup is not a backup).
- **Migrations:** versioned, forward-only, reviewed; expand-then-contract pattern for zero-downtime schema changes.

## 14. AI subsystem architecture

```
Feature (tutor / assist / moderation)
        │
        ▼
  AI Orchestration (NestJS `ai` module)
   - prompt assembly + guardrails
   - retrieval (class materials → embeddings/vector store)
   - policy checks (e.g. block tutor during active graded test)
   - cost/rate budgeting per org
        │
        ▼
  Provider Abstraction Layer   ◄── swappable
   ├── Managed: Claude (default)
   └── (future) self-hosted / open models
        │
        ▼
  Logging & Eval (prompt, model, tokens, cost, latency, safety verdicts)
```

- **Provider abstraction** isolates every AI call behind one interface → we can change models/providers, A/B them, or self-host for cost at scale without touching features.
- **Grounded tutoring:** class materials are chunked + embedded into a vector store; tutor answers are retrieval-augmented and citation-aware, scoped strictly to that class.
- **Guardrails:** untrusted classroom content is never allowed to override system instructions; outputs pass moderation; teacher-configurable strictness; full auditability and per-org cost budgets/limits.

## 15. Infrastructure & deployment

- **Containers** orchestrated on **Kubernetes** (or a managed equivalent). One service per deployment (api, realtime, workers, web).
- **IaC** (Terraform) for reproducible environments: `dev → staging → prod`.
- **CI/CD:** PR → typecheck/lint/test → build → preview env → staging → prod with **blue/green or canary** deploys and automated rollback on SLO regression.
- **Feature flags** for safe progressive rollout (esp. AI features).
- **Environments isolated**; production data never flows to lower environments.
