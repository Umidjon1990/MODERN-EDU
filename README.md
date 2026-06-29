# Modern Edu

> Maxfiy, sun'iy intellekt asosidagi sinfxona platformasi — Telegram va Notion'ning sokin, premium hissi ta'lim uchun maxsus moslangan.

Modern Edu — bu **ommaviy ijtimoiy tarmoq emas** va **oddiy messenjer ham emas**. Bu **maxfiy sinfxona ekotizimi**. Hech kim o'zini o'zi ro'yxatdan o'tkaza olmaydi. Har bir hisob (akkaunt) yuqoridan pastga tartibda yaratiladi: Adminlar O'qituvchilarni yaratadi, O'qituvchilar Sinflarni va O'quvchi hisoblarini yaratadi. O'quvchi tizimga kiradi va to'g'ridan-to'g'ri o'z sinfxonasiga tushadi — hamda boshqa hech qanday sinfxonani ko'rmaydi.

Har bir sinfxona xuddi maxfiy Telegram guruhi kabi ishlaydi, lekin ustiga vazifalar, testlar, e'lonlar, qadalgan (pin) xabarlar, fayllar va AI-repetitor qo'shilgan.

---

## Ushbu repozitoriya

Bu **arxitektura va dizayn bosqichi**. Hozircha hech qanday dastur kodi yozilmagan — bu ataylab shunday. Quyidagi hujjatlar tasdiqlanishi kutilayotgan blueprint (loyiha rejasi) bo'lib, har qanday amalga oshirish (implementatsiya) boshlanishidan oldin o'qilishi shart.

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

> **Holat:** Tasdiq kutilmoqda. Blueprint imzolanmaguncha hech qanday implementatsiya yo'q.
