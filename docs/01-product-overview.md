# 01 — Product Overview

## 1. What Modern Edu is

Modern Edu is a **private, AI-powered classroom platform**. The mental model is a *modern educational Telegram group*, but the product is deliberately narrower and safer than a messenger or social network:

- **Private by construction.** There is no public sign-up, no discovery, no friend graph, no cross-classroom visibility.
- **Top-down provisioning.** Accounts only exist because someone with authority created them.
- **Classroom-centric.** The classroom — not the user's feed — is the home object. A student opens the app and is *already inside* their classroom.

## 2. Roles

| Role | Created by | Scope | Core powers |
|------|-----------|-------|-------------|
| **Admin** | System / other Admin (bootstrapped) | Whole tenant/organization | Create & manage Teachers, manage org settings, billing, audit, global moderation, AI policy |
| **Teacher** | Admin | One or many Classes they own/teach | Create Classes, create Student accounts, set credentials, post, moderate, create assignments/tests, pin, announce |
| **Student** | Teacher | Exactly the Class(es) they are enrolled in | Read/post in their classroom, DM classmates (policy-gated), submit assignments/tests, react, use AI tutor |

### Improvement on the brief — a fourth optional role
The original brief lists Admin / Teacher / Student. For a product heading to 1M users across many schools, I recommend reserving two additional roles in the data model from day one (even if hidden in v1 UI):

- **Org Owner / Super Admin** — owns one organization (a school or tutoring company), manages multiple Admins and billing. This makes Modern Edu **multi-tenant** instead of single-tenant, which is essential for selling to many schools without re-deploying.
- **Assistant / Co-Teacher** — a Teacher-scoped helper with moderation rights but not account-creation rights. Common in real classrooms (teaching assistants).

These are modeled as **role + granular permissions**, not hard-coded `if` checks, so we can ship Admin/Teacher/Student in v1 and switch the others on later with zero schema migration. See `02-system-architecture.md` §Permissions.

## 3. The account & classroom lifecycle

```
Admin (provisioned)
  └── creates Teacher account  ──► Teacher receives username + temp password
        └── creates Class (e.g. "Grade 9-B Math")
              └── creates Student accounts ──► hands student username + password
                    └── Student logs in
                          └── lands DIRECTLY in their classroom
                                └── never sees any other classroom
```

### Improvements to the workflow
1. **Forced password rotation.** Teacher-issued passwords are *temporary*. On first login the student must set a new password. The teacher never needs to know the final password. (Security + privacy.)
2. **Credential delivery artifact.** When a Teacher creates students, the system generates a printable/exportable credential sheet (username + one-time temp password + optional QR deep-link) so distribution in a real classroom is practical.
3. **Enrollment, not ownership.** A student account is a *person*; a *membership* links them to a class. This lets a student belong to multiple classes (e.g. Math and Physics with different teachers) without duplicate accounts — important and impossible if class membership is baked into the user row.
4. **Invite/QR onboarding (optional, still private).** A Teacher can generate a single-use, expiring join link/QR for a specific class. It does not allow self-registration into arbitrary classes — it only activates a pre-created seat. Keeps privacy while removing manual password typing on phones.
5. **Soft archival, never hard delete.** Graduating a class, removing a student, or ending a term *archives* rather than destroys, preserving academic record and audit. Hard deletion is an explicit, permissioned, logged action (GDPR/right-to-erasure path).

## 4. Inside a classroom (feature surface)

**Realtime communication**
- Group chat (Telegram-grade): grouping, reactions, replies, edits, deletes, typing, presence, read state, unread counters, date separators, search.
- Voice messages, images (with preview), files, PDF (in-app viewer), link previews.
- Pinned messages and announcements (announcements are a distinguished, teacher-only, high-priority message type).
- Threaded discussions on assignments/announcements (keeps the main chat calm).

**Academics**
- Assignments: prompt + attachments + due date → student submissions (files/text) → teacher grading + feedback.
- Tests/Quizzes: question bank, multiple types (MCQ, true/false, short answer, file upload), timed, auto-grading where possible, AI-assisted grading for free text.
- Gradebook per class.

**Moderation & safety**
- Teachers can delete/mute/pin, restrict student-to-student DMs per class policy, and review an AI-assisted safety queue.

**AI (phased — see §5)**
- Class-scoped AI Tutor (answers grounded in class materials).
- Teacher Assist (lesson/quiz generation, grading help, summarization).
- Background moderation/safety (toxicity, PII, spam, self-harm signals → human queue).

## 5. AI strategy (phased)

AI is a first-class subsystem but introduced in safe increments, behind a **provider-abstraction layer** so we can switch between managed Claude models and self-hosted/open models without touching feature code.

- **Phase A — Moderation & safety (invisible).** Lowest risk, highest trust payoff. Runs on messages/uploads server-side.
- **Phase B — Teacher Assist.** Teachers opt in; output is always teacher-reviewed before students see it.
- **Phase C — Student AI Tutor.** Class-scoped, retrieval-grounded in that class's materials, with guardrails (no answers to active graded tests, age-appropriate tone, teacher-configurable strictness).

Every AI call is logged (prompt, model, latency, cost, policy decisions) for cost control, audit, and safety review.

## 6. Non-negotiable product principles

1. **Privacy isolation is sacred.** A student must *never* be able to read, enumerate, or even infer another classroom's existence. Enforced at the data layer (row-scoping by membership), not just the UI.
2. **Calm over noisy.** This is a learning space. No infinite feed, no vanity metrics, no addictive dark patterns. Notifications are purposeful.
3. **Responsive & mobile-first-ready.** Every surface is designed desktop-first but must collapse gracefully to tablet and phone, and the API/realtime contracts must be consumable by native mobile apps from day one.
4. **Premium feel.** Apple-level polish, Telegram-grade chat smoothness, Notion/Linear-grade structure. (See `04-ui-ux-design.md`.)
5. **Auditable.** Every privileged action (account creation, credential reset, deletion, moderation, role change) is recorded in an immutable audit log.

## 7. Out of scope (explicitly, for v1)

- Public/anonymous access, open communities, friend graphs.
- Video conferencing/live lessons (reserved as a future module; architecture leaves room via a media-server integration point).
- Payments/marketplace (org billing is modeled but not student-facing commerce).
- Federation between organizations.
