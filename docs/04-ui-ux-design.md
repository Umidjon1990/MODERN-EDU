# 04 — UI/UX Design

> Design bar: *Would this screen be good enough to compete with Telegram, Discord, Notion, Slack, and Linear in 2026?* If no, redesign before building. Portfolio-level quality, production-ready.

Modern Edu should feel like entering a **real digital classroom** — calm, premium, alive — not a corporate LMS dashboard. The aesthetic blends **Telegram's chat comfort**, **Notion's structured calm**, **Linear's crispness**, **Discord's liveliness**, and **Apple's polish**, with its own warm, education-forward identity.

---

## 1. Design philosophy

- **Calm focus.** Generous whitespace, clear hierarchy, one primary action per view. The product should reduce cognitive load so students focus on learning.
- **Content-first.** Chrome recedes; messages, materials, and people are the heroes.
- **Soft & tactile.** Rounded corners, soft layered shadows, gentle gradients, subtle depth — never flat-and-cold, never skeuomorphic-heavy.
- **Alive but never noisy.** Micro-interactions reward and guide; motion clarifies state changes; nothing animates just to show off.
- **Friendly, not childish.** Warm and human, but credible enough for teachers and serious for older students.

---

## 2. Design tokens (foundation)

### Color
- **System:** semantic tokens, not raw hex in components. `--bg`, `--surface`, `--surface-elevated`, `--text`, `--text-muted`, `--border`, `--primary`, `--primary-fg`, `--accent`, `--success`, `--warning`, `--danger`, `--info`.
- **Brand primary:** a confident indigo/violet (education + trust + premium), e.g. a 50–950 ramp. **Accent:** a warm secondary (amber/teal) for highlights and celebrations.
- **Light & Dark are first-class equals** — dark mode is designed, not auto-inverted. Dark uses near-black layered neutrals (`#0B0B0F`-ish surfaces) with elevated surfaces lightening, not bright-white text on pure black (reduces halation).
- **Contrast:** all text meets **WCAG AA (4.5:1)**; interactive/large text targets AAA where feasible.

### Typography
- **UI/body:** a modern geometric-humanist sans (e.g. Inter / Geist) for clarity at all sizes.
- **Display/headings:** slightly more characterful companion for warmth; tight, confident tracking.
- **Type scale:** modular (e.g. 12 / 14 / 16 / 20 / 24 / 32 / 40), generous line-height (1.5 body), max line length ~65ch for reading comfort.
- **Numerics:** tabular figures for gradebook/counters.

### Spacing, radius, elevation
- **4px base grid**; spacing scale 4→8→12→16→24→32→48→64.
- **Radius:** `sm 8` (inputs/chips), `md 12` (cards/bubbles), `lg 16` (modals/panels), `xl 24` (hero surfaces), `full` (avatars/FAB).
- **Shadows:** soft, multi-layer, low-opacity — `shadow-sm` for resting cards, `shadow-md` on hover/active, `shadow-lg` for overlays. Dark mode leans on borders + subtle glow over heavy shadows.

### Glass & gradient (used sparingly)
- **Glassmorphism** only on floating/overlay chrome (top bars, command palette, floating composer on scroll) — backdrop blur + translucency, never on dense reading content.
- **Gradients** for empty-state illustrations, onboarding, celebration moments, and the brand mark — subtle, not loud.

### Iconography & illustration
- **Icons:** one consistent set (Lucide/Phosphor), 1.5–2px stroke, optically aligned, sized on the grid.
- **Illustrations:** a small bespoke set for empty states, onboarding, and achievements — friendly, on-brand, lightweight (SVG/Lottie).

---

## 3. Layout system

**Desktop-first, then tablet, then phone**, with a single responsive component set.

- **Desktop (≥1024px):** three-zone shell —
  1. **Left rail** — compact nav (Classroom, Assignments, Tests, Members, AI Tutor) + class switcher (only the classrooms a user belongs to; students typically see one).
  2. **Center** — the active surface (chat is default).
  3. **Right context panel** — collapsible: pinned messages, upcoming, class info, thread view.
- **Tablet (640–1024px):** rail collapses to icons; right panel becomes an overlay/sheet.
- **Phone (<640px):** single column; bottom tab bar (Chat · Work · Tutor · Profile); right panel and threads become full-screen sheets; **FAB** for primary actions (new message / new assignment depending on context). Designed for **thumb reach** and one-handed use.

Breakpoints align with mobile-app parity so React Native screens mirror web information architecture.

---

## 4. Key screens

### 4.1 Onboarding & login
- **Login:** a single calm, centered card on a soft gradient field; username + password; clear error states; "first login" flow guides the student through setting a new password with a friendly, encouraging tone and a strength meter.
- **First-run (student):** a short, beautiful 2–3 step welcome — who their teacher is, what this classroom is, how chat/assignments work — with on-brand illustrations. Skippable, never naggy.
- **Teacher onboarding:** guided "Create your first class → add students → here's your credential sheet" flow, reducing time-to-value.

### 4.2 Classroom home (the heart)
The default landing for a student. **Never feels empty.** A calm, scannable layout that surfaces, above the chat:
- **Announcement banner** (if any active teacher announcement) — distinct, gentle, dismissible.
- **Pinned strip** — horizontally scrollable pinned message cards.
- **Quick glance row** — *Upcoming* (next lesson/due date), *Assignments due*, *Recent discussions*, *Quick actions* (ask AI tutor, submit work, message teacher).
- **Live chat** below/centered as the primary continuous surface.

Empty states are designed and warm ("No assignments yet — you're all caught up ✨"), never blank.

### 4.3 The chat experience (must be exceptional)
Telegram-grade comfort is the bar. Specifics:

- **Message bubbles:** rounded (`md`), own-vs-others differentiated by alignment + tint (not garish), comfortable padding, clear sender name/avatar for others, grouped consecutive messages from the same sender (single avatar, tight stacking).
- **Date separators** as soft centered pills; **unread divider** ("New messages") line.
- **Smooth virtualized scrolling** (windowed list) for thousands of messages with no jank; **scroll-to-bottom** FAB with unread count; preserves position on history load.
- **Reactions:** tap/hover → emoji bar; reaction chips under the bubble with counts; satisfying spring animation on add.
- **Reply:** swipe-to-reply (mobile) / hover action (desktop); quoted preview above the bubble; tap quote scrolls to original with a highlight pulse.
- **Edit/Delete:** inline edit with "edited" tag; delete leaves a subtle tombstone ("message deleted") to preserve thread coherence.
- **Composer:** auto-growing input, attach (image/file/PDF), emoji picker, **voice message** (press-and-hold with live waveform + slide-to-cancel, Telegram-style), send on Enter (Shift+Enter newline). Sticky; turns glassy when floating over content.
- **Media:** inline image thumbnails with lightbox preview + swipe gallery; **PDF** opens an in-app viewer; **files** as tidy cards (icon, name, size, download); **link previews** as rich cards (title, description, image) generated server-side.
- **Voice messages:** waveform with scrubbable playback, speed control, and a played/unplayed indicator.
- **Status:** typing indicators (animated dots), online/last-seen presence dots, read indicators (✓ / ✓✓), per-class unread counters in the rail.
- **Search:** in-class message search with highlighted results and jump-to-message.
- **Slow mode / muting** surfaced gracefully when a teacher enables moderation.

### 4.4 Assignments & tests
- **Assignment card/detail:** clear title, due countdown, attachments, instructions; student submit panel (text + file drop) with autosave-draft and a confident "Submitted ✓" state; teacher grading view with inline feedback and a smooth grade entry.
- **Tests:** distraction-reduced "focus mode" runner — one or paginated questions, a calm timer, autosave, clear progress; results screen with score and per-question feedback (respecting reveal policy).
- **Gradebook (teacher):** clean tabular view, sticky student column, color-coded status, fast filtering; never an overwhelming enterprise grid.

### 4.5 Members & profiles
- Roster with avatars, roles, online status; lightweight profile drawers; teacher moderation actions (mute, remove) behind clear confirmation dialogs.

### 4.6 AI Tutor
- A dedicated, chat-like panel with a distinct (but harmonious) visual identity so students always know they're talking to the tutor, not a person. Shows it's **grounded in class materials** (citations/sources), streams responses token-by-token, and clearly indicates when it's restricted (e.g. during an active graded test).

### 4.7 Admin & teacher management
- Calm management surfaces (create teacher/class/student, credential export) — productivity-app clarity (Linear-like), not a heavy dashboard. Bulk student creation has a delightful, low-friction flow with the printable/QR credential artifact at the end.

---

## 5. Motion & micro-interactions

- **Principles:** motion clarifies *state and spatial relationships*; fast (150–250ms) for UI feedback, slightly longer (300–400ms) for spatial transitions; **spring** physics for natural feel; everything respects `prefers-reduced-motion`.
- **Where:** page/route transitions (shared-element where meaningful), message send/receive (subtle rise + fade), reaction pop, optimistic states settling, button press depth, sheet/modal spring-in, list reordering, toast slide-ins, tab indicator glide.
- **Loading:** **skeleton screens** matching final layout (never spinners-on-blank for primary content); shimmer kept subtle; optimistic UI so actions feel instant (messages appear immediately, reconcile on ack).
- **Delight moments:** gentle confetti/badge animation on first submission, completing a test, or a streak — used sparingly so they stay special.
- **Performance guardrail:** animate only `transform`/`opacity` (GPU-friendly); virtualize long lists; keep 60fps on mid/low-end Android; degrade gracefully (fewer blurs, simpler shadows) on weak devices.

---

## 6. Dark mode

A designed theme, not an inversion: layered dark neutrals, elevated surfaces that lighten with elevation, reduced pure-white text (off-white) to cut glare, brand colors retuned for dark backgrounds to keep contrast and vibrancy, shadows replaced/augmented by subtle borders and glows. Toggle is instant with a smooth cross-fade; respects OS preference by default.

---

## 7. Accessibility (built in, not bolted on)

- **WCAG 2.2 AA** target across the app.
- Full **keyboard navigation**, visible focus rings, logical tab order, skip links.
- **Screen-reader** support: semantic HTML/ARIA, labeled controls, live regions for new messages/toasts, alt text for media.
- **Reduced motion** and **high-contrast** modes honored.
- **Touch targets** ≥ 44px; adequate spacing; no hover-only affordances on touch.
- **Dyslexia-friendly** option (font/spacing) and adjustable text size — valuable in education.
- Color is never the sole carrier of meaning (icons/labels accompany status).

---

## 8. Component library (shared design system)

A token-driven, documented component set (`packages/ui`) consumed by web (and mirrored in mobile): Buttons, Inputs, Select, Avatar, Badge, Chip, Card, Modal/Sheet, Tabs, Tooltip, Toast, Skeleton, MessageBubble, Composer, Reaction bar, MediaPreview, FileCard, LinkPreviewCard, EmptyState, Banner, Dialog/Confirm, AvatarStack, Progress/Timer, DataTable (gradebook). Built on accessible headless primitives, themed via tokens, covered by visual tests. **One source of truth → consistent, premium feel everywhere, and trivially themable.**

## 9. Quality bar checklist (applied to every screen)

- [ ] Clear single visual hierarchy and primary action
- [ ] Generous spacing; nothing cramped
- [ ] Meaningful empty, loading (skeleton), and error states
- [ ] Smooth, purposeful motion; reduced-motion fallback
- [ ] Beautiful in both light and dark
- [ ] Keyboard + screen-reader accessible; AA contrast
- [ ] 60fps on mid/low-end mobile
- [ ] Mirrors cleanly to tablet and phone layouts
- [ ] Would hold up next to Telegram / Notion / Linear in 2026
