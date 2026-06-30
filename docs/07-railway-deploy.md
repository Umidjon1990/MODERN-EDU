# 07 — Railway'ga to'liq deploy rejasi

Ushbu hujjat Modern Edu'ni **Railway**'da to'liq, ishlab chiqarish (production) darajasida ishga tushirish rejasini belgilaydi. Maqsad: barcha quyi tizimlar (ma'lumotlar bazasi, API, realtime, veb) bir-biri bilan to'g'ri ulanган va **mukammal ishlaydigan** holatda bo'lishi.

Statik GitHub Pages preview'i (faqat demo, lokal ma'lumot) bilan adashtirmang — bu yerda **haqiqiy backend + Postgres + realtime** quriladi.

---

## 1. Railway arxitekturasi

Railway'da har bir komponent alohida **servis** sifatida joylashtiriladi va ular Railwayning **ichki tarmog'i** (`*.railway.internal`) orqali bir-biri bilan gaplashadi.

```
                       Internet (brauzer / mobil)
                                │
                 ┌─────────────┴──────────────┐
                 ▼                             ▼
        ┌──────────────────┐         ┌──────────────────────┐
        │  web (Next.js)   │  REST   │  api (NestJS)         │
        │  public domain   │────────►│  public domain        │
        │  next start      │   WSS   │  REST /api/v1/*       │
        └──────────────────┘────┐    └─────────┬────────────┘
                                 │              │ ichki tarmoq
                                 ▼              ▼
                       ┌──────────────────┐  ┌──────────────────┐
                       │ realtime (WS)    │  │ PostgreSQL       │
                       │ public domain    │  │ (Railway plugin) │
                       │ Socket.IO        │  └──────────────────┘
                       └────────┬─────────┘            ▲
                                │ ichki tarmoq         │
                                ▼                      │
                       ┌──────────────────┐            │
                       │ Redis            │◄───────────┘
                       │ (Railway plugin) │   (api ham Redis'ga ulanadi)
                       └──────────────────┘
                                ▲
                       ┌────────┴─────────┐
                       │ workers (fon)    │  (media, bildirishnoma, AI — keyingi bosqich)
                       └──────────────────┘
```

### Servislar ro'yxati (Railway loyihasida)

| Servis         | Manba (monorepo) | Tur                         | Public domain              | Ulanadi                           |
| -------------- | ---------------- | --------------------------- | -------------------------- | --------------------------------- |
| **PostgreSQL** | Railway plugin   | Boshqariladigan DB          | yo'q (ichki)               | —                                 |
| **Redis**      | Railway plugin   | Boshqariladigan kesh/pubsub | yo'q (ichki)               | —                                 |
| **api**        | `apps/api`       | NestJS HTTP                 | ✅ `api-...up.railway.app` | Postgres, Redis                   |
| **realtime**   | `apps/realtime`  | WebSocket gateway           | ✅ `rt-...up.railway.app`  | Redis, Postgres                   |
| **web**        | `apps/web`       | Next.js (server)            | ✅ `...up.railway.app`     | api (REST), realtime (WSS)        |
| **workers**    | `apps/workers`   | Fon ishchilari              | yo'q                       | Postgres, Redis (keyingi bosqich) |

---

## 2. Texnologik qarorlar (deploy uchun)

- **ORM: Drizzle.** Sof TypeScript (engine yuklab olmaydi), tip-xavfsiz so'rovlar, drizzle-kit migratsiyalari, Railway Postgres bilan a'lo ishlaydi. Sxema `docs/03-malumotlar-bazasi.md` ni aks ettiradi. `packages/db` paketida joylashadi. (PGlite bilan lokal/CI'da haqiqiy testlanadi.)
- **Web rejimi:** Railway'da Next.js **server rejimida** (`next start`) ishlaydi — statik eksport emas. `output: 'export'` faqat `GITHUB_PAGES=true` bo'lganda yoqiladi, shuning uchun Pages preview ham, Railway server rejimi ham ishlaydi.
- **Build: har bir servis uchun Dockerfile.** pnpm workspace'ni to'g'ri qurish uchun ko'p bosqichli (multi-stage) Dockerfile eng ishonchli. Railway Dockerfile'ni avtomatik aniqlaydi.
- **Migratsiyalar:** `api` servisi ishga tushishidan oldin `prisma migrate deploy` bajaradi (release bosqichi).
- **Sirlar:** barcha maxfiy qiymatlar Railway **Variables** (muhit o'zgaruvchilari) orqali beriladi — repoda hech qachon saqlanmaydi.

---

## 3. Muhit o'zgaruvchilari (Variables)

Railway plaginlari avtomatik `DATABASE_URL` va `REDIS_URL` beradi. Servislararo havola uchun Railway "reference variables" (`${{Postgres.DATABASE_URL}}`) ishlatiladi.

**api** servisi:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
REDIS_URL    = ${{Redis.REDIS_URL}}
JWT_ACCESS_SECRET   = <tasodifiy 32+ bayt>
JWT_REFRESH_SECRET  = <tasodifiy 32+ bayt>
CORS_ORIGIN  = https://<web-domain>.up.railway.app
NODE_ENV     = production
PORT         = 8080            # Railway PORT'ni avtomatik beradi
```

**realtime** servisi:

```
REDIS_URL    = ${{Redis.REDIS_URL}}
DATABASE_URL = ${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET = <api bilan bir xil>
CORS_ORIGIN  = https://<web-domain>.up.railway.app
PORT         = 8080
```

**web** servisi:

```
NEXT_PUBLIC_API_URL      = https://<api-domain>.up.railway.app
NEXT_PUBLIC_REALTIME_URL = https://<realtime-domain>.up.railway.app
NODE_ENV = production
PORT     = 3000
```

> **Maslahat:** sirlarni generatsiya qilish — `openssl rand -base64 48`.

---

## 4. Deploy qadamlari (Railway UI)

1. **Loyiha yaratish:** Railway → _New Project_ → _Deploy from GitHub repo_ → `Umidjon1990/MODERN-EDU` ni tanlang. Branch: `claude/modern-edu-architecture-pjhg7s` (yoki keyin `main`).
2. **Postgres qo'shish:** _+ New_ → _Database_ → _Add PostgreSQL_.
3. **Redis qo'shish:** _+ New_ → _Database_ → _Add Redis_.
4. **api servisi:** _+ New_ → _GitHub Repo_ → root sifatida `apps/api` (yoki Dockerfile yo'lini ko'rsating). Variables (yuqoridagi) ni qo'shing. Public domain yoqing (_Settings → Networking → Generate Domain_).
5. **realtime servisi:** xuddi shunday, `apps/realtime`. Public domain yoqing.
6. **web servisi:** `apps/web`. `NEXT_PUBLIC_*` o'zgaruvchilarini (api va realtime domainlari bilan) qo'shing. Public domain yoqing.
7. **Migratsiyalar:** api servisi release buyrug'ida `pnpm --filter @modern-edu/db db:migrate` (Drizzle migratsiyalari) + ixtiyoriy `db:seed` bajaradi.
8. **Tekshirish:** web domain'ni oching → admin/o'qituvchi bilan kiring → sinfxona va chat ishlashini tekshiring.

Har bir GitHub push avtomatik qayta deploy qiladi (CI/CD).

---

## 5. CORS, domainlar va WebSocket

- **CORS:** api va realtime faqat web domain'idan so'rovlarni qabul qiladi (`CORS_ORIGIN`).
- **WebSocket:** realtime servisi `wss://` orqali ishlaydi; Railway public domainlar TLS bilan keladi. Web mijoz `NEXT_PUBLIC_REALTIME_URL` ga ulanadi.
- **Cookie/Auth:** access token qisqa umrli; refresh token httpOnly cookie. Cross-subdomain bo'lgani uchun `SameSite=None; Secure` yoki token'ni Authorization header orqali yuborish (mobil uchun ham qulay) — biz **Bearer access token + httpOnly refresh** yondashuvini ishlatamiz.

---

## 6. Qurish rejasi (deploy qilinadigan bosqichlar)

Har bir bosqich oxirida tizim Railway'ga deploy qilinadi va **ishlaydi**. Hech narsa yarim qolmaydi.

### D1 — Ma'lumotlar bazasi yadrosi (`packages/db`)

Prisma sxema: `organizations`, `users`, `auth_sessions`, `classes`, `class_members`, `messages`, `message_reactions`, `pinned_messages`. Migratsiyalar + seed (1 admin, 1 o'qituvchi, 1 sinf, o'quvchilar, namuna xabarlar).

### D2 — API: autentifikatsiya + admin (`apps/api`)

NestJS: login (Argon2id), access+refresh JWT, birinchi-kirish parol almashtirish, `can()` guard, audit log. Admin → o'qituvchi yaratish.

### D3 — API: sinflar + a'zolik + xabarlar

Sinf yaratish, o'quvchi yaratish (login eksport), a'zolik-qamrovli xabar API (ro'yxat/yuborish/tahrir/o'chirish, reaksiya, pin). **Birinchi to'liq Railway deploy: api + Postgres.**

### D4 — Web'ni haqiqiy API'ga ulash

Mock o'rniga `packages/sdk` orqali haqiqiy API. Server rejimi, real login (cookie), sinfxona va xabarlar Postgres'dan. **web + api + Postgres Railway'da birga ishlaydi.**

### D5 — Realtime (`apps/realtime`)

WS gateway, Redis pub/sub, xona=sinf, presence/typing, jonli xabar yetkazish, qayta ulanish + gap sync. **Chat haqiqiy realtime bo'ladi (ko'p foydalanuvchi).**

### D6 — Media (yuklash)

S3-mos xotira (Railway Volume yoki tashqi S3/R2), oldindan imzolangan yuklash, rasm/fayl/PDF/ovozli xabar. `workers` servisi.

### D7 — Akademik

Vazifalar, testlar, gradebook.

### D8 — Bildirishnomalar + AI

Push/email, moderatsiya AI, o'qituvchi yordami, o'quvchi repetitori (Claude).

> **Birinchi "to'liq ishlaydigan" maqsad: D1→D5.** Bu — haqiqiy hisoblar, maxfiy sinfxonalar va jonli chat bilan to'liq ishlaydigan tizim. Qolgan bosqichlar ustiga qo'shiladi.

---

## 7. Taxminiy narx (Railway)

- **Hobby reja:** ~$5/oy kredit, kichik servislar uchun yetarli (sinov/pilot).
- Postgres + Redis + 3 servis: foydalanishga qarab ~$5–20/oy boshlanish uchun.
- Masshtab kerak bo'lganda: replicalar, ko'proq resurs — `docs/02` §9 masshtablash yo'li bo'yicha.

---

## 8. Keyingi qadam

Qurishni **D1 (Prisma sxema + migratsiya)** dan boshlaymiz va har bir bosqichni Railway'da ishlaydigan holatда yetkazamiz. Har deploy'dan keyin siz Railway'da tekshirib ko'rasiz.
