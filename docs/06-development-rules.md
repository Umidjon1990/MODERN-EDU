# 06 — Development Rules (permanent)

These rules govern **every** future change to Modern Edu. They are binding for all contributors (human and AI). When any rule conflicts with speed or convenience, **the rule wins**. When uncertain, **choose maintainability and safety over shortcuts**.

---

## A. Process & scope discipline

1. **Build one module at a time.** Never generate the whole project at once. Complete, review, and stabilize a module before starting the next.
2. **Respect the phase order.** Never start a phase before its dependencies (per `05-implementation-roadmap.md`) are complete and reviewed. Never skip steps.
3. **Never rewrite completed, working modules** to satisfy a new feature. Extend via clean interfaces, events, or composition instead.
4. **Never break existing features.** Every change keeps prior functionality green. If a change forces a breaking edit, it is a deliberate, reviewed migration — not a silent side effect.
5. **Self-review every module before moving on**, against: correctness, security, performance, scalability, accessibility. Refactor if any fails. Only then continue.
6. **Don't rush.** Think before writing. A slower, correct, maintainable solution beats a fast fragile one every time.

## B. Architecture integrity

7. **Preserve the architecture** in `02-system-architecture.md`. Don't introduce patterns, services, or data stores that contradict it without an explicit, documented decision.
8. **Honor bounded-context boundaries.** Modules talk through defined service interfaces and domain events — never reach into another module's internals or tables directly.
9. **Keep services stateless.** All shared state lives in Postgres/Redis/object storage so any instance can scale horizontally.
10. **Design every boundary as if it will become a microservice.** No hidden coupling that would block extraction.
11. **Single source of truth for types.** API/client contracts come from `packages/contracts` (Zod/DTO). Never hand-duplicate types across web, mobile, and API.

## C. Code quality

12. **Always write production-quality code.** No throwaway, no "temporary" hacks shipped to main. TODOs are tracked, not abandoned in code.
13. **Separate UI from business logic.** Components render; logic lives in hooks/services/domain layers. No business rules buried in JSX or controllers.
14. **Reusable components and utilities.** Prefer composing the shared design system and shared packages over re-implementing. DRY without over-abstracting prematurely.
15. **Strong typing end-to-end.** No `any` in committed code without a justified, commented exception. Leverage the type system to make illegal states unrepresentable.
16. **Consistent style** enforced by lint/format in CI; reviews focus on substance, not whitespace.
17. **Match the surrounding code.** New code reads like the code around it — naming, structure, idioms, comment density.

## D. Data & correctness

18. **No data duplication of source-of-truth.** Normalize (3NF). Denormalized values are explicitly-labeled, rebuildable caches only.
19. **Referential integrity is enforced in the database** (FKs, constraints, sensible `ON DELETE`), not just in app code.
20. **Soft-delete academic and account records by default.** Hard deletion is an explicit, permissioned, audited flow.
21. **Migrations are forward-only, versioned, reviewed**, and use expand-then-contract for zero-downtime. Never edit a shipped migration.
22. **Every privileged/sensitive action writes to the immutable audit log.**

## E. Security & privacy (non-negotiable)

23. **Privacy isolation is sacred.** A user can never read, enumerate, or infer another classroom. Enforce at the **data layer** (membership scoping / RLS), never relying on the UI.
24. **Authorize on the server, always.** Every endpoint and socket event checks `can(actor, action, resource)`. Client-side checks are UX only.
25. **Validate all input at the edge** (Zod) and treat all client/classroom/AI content as untrusted (XSS, SSRF, prompt-injection defenses).
26. **No secrets in the repo.** Use the secrets manager; least-privilege credentials per service.
27. **Minimize student data**; honor data-residency, consent, export, and erasure obligations (GDPR/COPPA/FERPA-aware). Don't log PII; redact in AI logs.
28. **Security review gate:** auth, permissions, file handling, and AI surfaces get explicit security review before merge.

## F. Performance & scalability

29. **Always maintain scalability.** Assume 1M+ users in every design decision: cursor pagination (never OFFSET at scale), proper indexes for the access path, no N+1 queries, async-offload non-interactive work.
30. **Cache deliberately** with event-driven invalidation; never cache as a band-aid for a bad query.
31. **Keep the request path thin.** Heavy/slow work goes to idempotent, retryable background jobs.
32. **Animate only `transform`/`opacity`; virtualize long lists; target 60fps on mid/low-end mobile.** Performance is a feature.

## G. UX & accessibility

33. **Hold the design bar:** every screen should credibly compete with Telegram/Notion/Linear in 2026. If it wouldn't, redesign before building.
34. **Always provide empty, loading (skeleton), and error states.** No blank screens, no raw spinners on primary content.
35. **Accessibility is built in, not bolted on:** WCAG 2.2 AA, full keyboard nav, screen-reader support, reduced-motion, ≥44px touch targets, color never the sole signal.
36. **Light and dark are equals.** Design and test both.
37. **Responsive by default:** every surface works desktop → tablet → phone and maps cleanly to the mobile apps.

## H. Reliability & operations

38. **Observability is part of "done":** structured logs with trace IDs, metrics, and error tracking ship with each feature.
39. **Backups are restore-tested.** An untested backup does not count. Maintain the DR runbook and meet RPO/RTO targets.
40. **Background jobs are idempotent, retried with backoff, and dead-lettered with alerting.**
41. **Feature-flag risky rollouts** (especially AI) for progressive, reversible delivery.

## I. Testing & verification

42. **Every module ships with tests** appropriate to its risk: unit for logic, integration for API + DB, isolation tests for cross-classroom privacy, e2e for critical flows (login, send message, submit assignment).
43. **CI must be green to merge:** typecheck, lint, tests. No merging red.
44. **Verify behavior, not just compilation.** Confirm the feature actually works (and prior features still do) before calling it done.

## J. Documentation & decisions

45. **Always document important decisions.** Significant architectural or product choices get a short ADR (Architecture Decision Record) capturing context, decision, and consequences.
46. **Keep these blueprint docs current.** When reality diverges from the design, update the docs in the same change — docs are part of the deliverable, not an afterthought.
47. **Leave the codebase clearer than you found it.** Naming, structure, and comments should reduce the next person's effort.

---

### The tie-breaker
> When two paths exist and you're unsure, choose the one that a senior engineer would still be glad to maintain a year from now. **Maintainability, safety, and clarity over shortcuts — always.**
