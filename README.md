# Modern Edu

> A private, AI-powered classroom platform — the calm, premium feel of Telegram and Notion, purpose-built for education.

Modern Edu is **not** a public social network and **not** a general messenger. It is a **private classroom ecosystem**. Nobody self-registers. Every account is provisioned top-down: Admins create Teachers, Teachers create Classes and Student accounts. Students log in and land directly inside their own classroom — and they never see any other classroom.

Each classroom behaves like a private Telegram group, enriched with assignments, tests, announcements, pinned messages, files, and an AI tutor.

---

## This repository

This is the **architecture & design phase**. No application code has been written yet — by design. The documents below are the approved-blueprint-in-progress and must be read before any implementation begins.

| Doc | Purpose |
|-----|---------|
| [`docs/01-product-overview.md`](docs/01-product-overview.md) | Product definition, roles, lifecycle, and the improvements made on top of the original brief |
| [`docs/02-system-architecture.md`](docs/02-system-architecture.md) | Full technical architecture: frontend, backend, realtime, auth, storage, security, scalability, caching, observability, backups, AI |
| [`docs/03-database-design.md`](docs/03-database-design.md) | PostgreSQL schema: every table, relationship, key, index, and the scaling/partitioning strategy |
| [`docs/04-ui-ux-design.md`](docs/04-ui-ux-design.md) | Design system, screen-by-screen UX, the chat experience, motion, dark mode, accessibility |
| [`docs/05-implementation-roadmap.md`](docs/05-implementation-roadmap.md) | The project split into small, dependency-ordered phases safe for incremental AI-assisted build |
| [`docs/06-development-rules.md`](docs/06-development-rules.md) | Permanent engineering rules that govern every future change |

## Headline technology decisions (2026)

- **TypeScript everywhere** — one language across web, mobile, and API.
- **Web:** Next.js (App Router, RSC) · **Mobile:** React Native + Expo · **API:** NestJS (modular monolith, microservice-ready).
- **Database:** PostgreSQL 16 + **Redis** (cache, presence, pub/sub) · **Search:** Postgres FTS now, OpenSearch later.
- **Realtime:** dedicated WebSocket gateway (Socket.IO/`ws`) backed by Redis pub/sub and a durable message store.
- **Storage:** S3-compatible object storage + CDN, with transcoding/thumbnailing pipeline.
- **AI:** managed **Claude** models behind a provider-abstraction layer (self-host-ready), used for tutoring, teacher assistance, and moderation.
- **Infra:** containers on Kubernetes, infrastructure-as-code, blue/green deploys.

> **Status:** Awaiting approval. No implementation until the blueprint is signed off.
