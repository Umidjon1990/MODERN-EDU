# Modern Edu

> Maxfiy, sun'iy intellekt asosidagi sinfxona platformasi — Telegram va Notion'ning sokin, premium hissi ta'lim uchun maxsus moslangan.

Modern Edu — bu **ommaviy ijtimoiy tarmoq emas** va **oddiy messenjer ham emas**. Bu **maxfiy sinfxona ekotizimi**. Hech kim o'zini o'zi ro'yxatdan o'tkaza olmaydi. Har bir hisob (akkaunt) yuqoridan pastga tartibda yaratiladi: Adminlar O'qituvchilarni yaratadi, O'qituvchilar Sinflarni va O'quvchi hisoblarini yaratadi. O'quvchi tizimga kiradi va to'g'ridan-to'g'ri o'z sinfxonasiga tushadi — hamda boshqa hech qanday sinfxonani ko'rmaydi.

Har bir sinfxona xuddi maxfiy Telegram guruhi kabi ishlaydi, lekin ustiga vazifalar, testlar, e'lonlar, qadalgan (pin) xabarlar, fayllar va AI-repetitor qo'shilgan.

---

## Ishga tushirish va sinab ko'rish

```bash
pnpm install          # bog'liqliklarni o'rnatish
pnpm dev              # barcha ilovalarni dev rejimida ishga tushirish
# yoki faqat veb:
pnpm --filter @modern-edu/web dev   # → http://localhost:3000
```

Brauzerda **http://localhost:3000** ni oching. Sinab ko'rish uchun namuna hisoblar:

| Rol           | Login     | Parol        |
| ------------- | --------- | ------------ |
| 👩‍🏫 O'qituvchi | `teacher` | `teacher123` |
| 🧑‍🎓 O'quvchi   | `aziz`    | `aziz123`    |
| 🧑‍🎓 O'quvchi   | `malika`  | `malika123`  |

Sinab ko'rish mumkin: kirish/chiqish, sinfxona chat (xabar yuborish, reaksiya, javob, qadalgan xabarlar, e'lon banneri), yorug'/qorong'i rejim, responsiv layout. **Eslatma:** hozircha ma'lumotlar lokal (preview); haqiqiy backend (Postgres + realtime WebSocket) 1–4-bosqichlarda ulanadi.

### Tekshiruv buyruqlari

```bash
pnpm verify           # lint · typecheck · test · build (butun monorepo)
pnpm format           # Prettier bilan formatlash
```

### GitHub Pages'da sinab ko'rish (bepul, ommaviy URL)

Ilova statik sayt sifatida ham eksport qilinadi va GitHub Pages'ga avtomatik deploy bo'ladi:

1. GitHub repo → **Settings → Pages → Build and deployment → Source: «GitHub Actions»** ni tanlang (bir marta).
2. `claude/modern-edu-architecture-pjhg7s` (yoki `main`) branchga push bo'lganda **«Deploy to GitHub Pages»** workflow ishga tushadi.
3. Manzil: **https://umidjon1990.github.io/modern-edu/**

> Agar deploy branch siyosati tufayli to'xtasa, branchni `main`ga merge qiling. Statik versiyada login client-side (localStorage) — faqat demo; haqiqiy server-autentifikatsiya 1–2-bosqichlarda keladi.

## Ushbu repozitoriya

Bu **arxitektura, dizayn va bosqichma-bosqich amalga oshirish** repozitoriyasi. Quyidagi hujjatlar blueprint (loyiha rejasi) bo'lib, har qanday yangi modul boshlanishidan oldin o'qilishi shart. Implementatsiya `docs/05` rejasidagi bosqichlar bo'yicha olib boriladi.

| Hujjat                                                                       | Maqsadi                                                                                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/01-mahsulot-tavsifi.md`](docs/01-mahsulot-tavsifi.md)                 | Mahsulot ta'rifi, rollar, hisob hayotiy sikli va dastlabki shartga kiritilgan yaxshilanishlar                                                            |
| [`docs/02-tizim-arxitekturasi.md`](docs/02-tizim-arxitekturasi.md)           | To'liq texnik arxitektura: frontend, backend, realtime, autentifikatsiya, saqlash, xavfsizlik, masshtablanish, keshlash, monitoring, zaxira nusxalar, AI |
| [`docs/03-malumotlar-bazasi.md`](docs/03-malumotlar-bazasi.md)               | PostgreSQL sxemasi: har bir jadval, bog'lanish, kalit, indeks va masshtablash strategiyasi                                                               |
| [`docs/04-ui-ux-dizayn.md`](docs/04-ui-ux-dizayn.md)                         | Dizayn tizimi, ekranma-ekran UX, chat tajribasi, animatsiya, qorong'i rejim, kirish imkoniyatlari                                                        |
| [`docs/05-amalga-oshirish-rejasi.md`](docs/05-amalga-oshirish-rejasi.md)     | Loyihaning kichik, bir-biriga bog'liq bosqichlarga bo'linishi (xavfsiz, bosqichma-bosqich qurish uchun)                                                  |
| [`docs/06-ishlab-chiqish-qoidalari.md`](docs/06-ishlab-chiqish-qoidalari.md) | Har bir kelajakdagi o'zgarishni boshqaruvchi doimiy muhandislik qoidalari                                                                                |

## Asosiy texnologik qarorlar (2026)

- **Hamma joyda TypeScript** — veb, mobil va API uchun bitta til.
- **Veb:** Next.js (App Router, RSC) · **Mobil:** React Native + Expo · **API:** NestJS (modulli monolit, mikroservisga tayyor).
- **Ma'lumotlar bazasi:** PostgreSQL 16 + **Redis** (kesh, presence, pub/sub) · **Qidiruv:** avval Postgres FTS, keyin OpenSearch.
- **Realtime:** alohida WebSocket gateway (Socket.IO/`ws`), Redis pub/sub va doimiy xabar saqlash bilan.
- **Saqlash:** S3-mos obyekt xotirasi + CDN, transkodlash/eskiz tayyorlash quvuri bilan.
- **AI:** boshqariladigan **Claude** modellari provayder-abstraksiya qatlami ortida (o'z serveringda joylashtirish imkoniga tayyor) — repetitorlik, o'qituvchiga yordam va moderatsiya uchun.
- **Infratuzilma:** Kubernetes'da konteynerlar, infrastruktura-kod sifatida (IaC), blue/green deploy.

> **Holat:** Blueprint tasdiqlandi. Implementatsiya boshlandi — 0.1 (monorepo + CI) ✅ va ishlaydigan veb-ilova preview slice'i (kirish → sinfxona → chat) ✅. Keyingisi: haqiqiy backend (1–2-bosqichlar) va realtime (4-bosqich).
