# 05 — Amalga oshirish rejasi

Loyiha **kichik, qat'iy bog'liqlik tartibidagi bosqichlarga** bo'linadi. Har bir bosqich alohida xavfsiz tarzda yakunlanib, ko'rib chiqilishi uchun o'lchamlangan, faqat o'zidan oldingi bosqichlarga bog'liq va **ishlaydigan, ko'rsatiladigan, ko'rib chiqilgan** holatda tugaydi. **Hech bir bosqich o'tkazib yuborilmaydi. Hech bir bosqich o'zidan oldingisi ko'rib chiqishdan o'tmaguncha boshlanmaydi** (to'g'rilik, xavfsizlik, unumdorlik, masshtablanish — qarang: `06-ishlab-chiqish-qoidalari.md`).

> Eslatma: bu reja — qurish rejasi. **Blueprint tasdiqlanmaguncha hech qanday kod yozilmaydi.**

---

## 0-bosqich — Poydevor (hali mahsulot funksiyalari yo'q)

**0.1 — Monorepo va asboblar**
pnpm + Turborepo workspace; `apps/*` va `packages/*` skeletlari; umumiy TypeScript/ESLint/Prettier konfiguratsiyasi; commit hooklar; CI quvuri (typecheck, lint, test).
*Bog'liq:* yo'q. *Tugadi:* bo'sh skeletда CI'da `pnpm build`/`lint`/`test` yashil.

**0.2 — Infratuzilma va muhitlar (IaC)**
Terraform orqali dev/staging: Postgres, Redis, obyekt xotira bucket, secrets manager. Dev pariteti uchun konteynerlash + lokal docker-compose.
*Bog'liq:* 0.1. *Tugadi:* dasturchi to'liq stekni lokal ishga tushira oladi va staging mavjud.

**0.3 — Umumiy contracts paketi**
`packages/contracts`: `03-malumotlar-bazasi.md`'dagi asosiy obyektlar uchun Zod sxemalari + DTO tiplari. Keyingi barcha API/mijoz ishi uchun yagona haqiqat manbai.
*Bog'liq:* 0.1.

---

## 1-bosqich — Identifikatsiya, tenant va kirish (xavfsizlik o'zagi)

**1.1 — Ma'lumotlar bazasi yadrosi + migratsiyalar**
`organizations`, `users`, `auth_sessions`, `permissions`, `role_permissions` ni migratsiya asbobi + seederlar orqali. PgBouncer ulanган.
*Bog'liq:* 0.2, 0.3.

**1.2 — Autentifikatsiya**
Kirish (login/parol, Argon2id), access+refresh JWT aylanuvchi shaffof bo'lmagan refresh tokenlar bilan, sessiya jadvali, birinchi kirishda majburiy parol almashtirish, chiqish/bekor qilish. Auth'da rate limiting + qulflash.
*Bog'liq:* 1.1.

**1.3 — Avtorizatsiya qatlami**
`can(actor, action, resource)` siyosat/guard qatlami; `role_permissions`'dan RBAC; a'zolik-qamrov tizimi. Audit-jurnal jadvali + yozuvchi.
*Bog'liq:* 1.2.

**1.4 — Admin → O'qituvchi taqdim etish**
Admin O'qituvchi hisoblarini yaratadi (ruxsatli, jurnaliga yoziladi); login berish; asosiy admin boshqaruv endpointlari.
*Bog'liq:* 1.3.

---

## 2-bosqich — Sinflar va a'zolik (maxfiylik chegarasi)

**2.1 — Sinflar + a'zoliklar sxemasi & API**
`classes`, `class_members`; O'qituvchi Sinf yaratadi; ma'lumotlar qatlamida a'zolik-qamrov ta'minlangan + sinalган (foydalanuvchi faqat o'zi a'zo bo'lgan sinflarni o'qiy oladi).
*Bog'liq:* 1.4.

**2.2 — O'qituvchi → O'quvchi taqdim etish**
O'quvchi hisoblarini ommaviy yaratish, vaqtinchalik parol berish, login hujjati (varaqa/QR), parolni tiklash, yumshoq chiqarish/arxivlash. Hammasi jurnaliga yoziladi.
*Bog'liq:* 2.1.

**2.3 — "Mening sinfxonam" marshrutlash**
Kirish → to'g'ridan-to'g'ri foydalanuvchi sinfxonasiga tushish; sinf almashtirgich (faqat egalik/a'zolik sinflari). Sinfxonalararo izolyatsiya avtomatik testlar bilan tasdiqlanган.
*Bog'liq:* 2.2.

---

## 3-bosqich — Frontend qobig'i va dizayn tizimi

**3.1 — Dizayn tizimi poydevori**
`packages/ui`: tokenlar (rang/tip/bo'sh joy/radius/soya), mavzulash (yorug'/qorong'i), asosiy primitivlar (Button, Input, Card, Modal/Sheet, Avatar, Toast, Skeleton, EmptyState). Vizual testlar.
*Bog'liq:* 0.1.

**3.2 — Veb ilova qobig'i**
Next.js ilova: auth oqimlari (kirish, birinchi-kirish almashtirish), moslashuvchan uch zonali qobiq, navigatsiya, mavzu o'tkazgich, marshrut o'tishlari, REST API'ni ishlatadigan tipli SDK (`packages/sdk`).
*Bog'liq:* 2.3, 3.1.

**3.3 — Sinfxona bosh sahifasi (statik-ma'lumot versiyasi)**
Sinfxona tushish layouti (e'lon banneri, qadalganlar tasmasi, tezkor nazar, bo'sh holatlar) real sinf/a'zolik ma'lumotiga ulangan — chat hozircha placeholder.
*Bog'liq:* 3.2.

---

## 4-bosqich — Messaging (yadro)

**4.1 — Xabar saqlash & REST**
`messages` (+ partitsiyalash), har bir sinf uchun `seq` ajratish, yuborish/tahrirlash/o'chirish (yumshoq), cursor paginatsiya, `client_msg_id` orqali idempotentlik. A'zolik-qamrovli.
*Bog'liq:* 2.3.

**4.2 — Realtime gateway**
Alohida WebSocket servisi; xona = sinf (a'zolik-tekshiruvli); Redis pub/sub fan-out; qayta ulanish + bo'shliq sinxron (`after_seq`); presence & yozmoqda (Redis TTL).
*Bog'liq:* 4.1.

**4.3 — Chat UI**
Telegram darajasidagi chat: virtualizatsiyalangan ro'yxat, pufakchalar, guruhlash, sana ajratgichlari, kompozer, optimistik yuborish, qayta ulanish/backfill, pastga-scroll + o'qilmagan ajratgich.
*Bog'liq:* 4.2, 3.3.

**4.4 — Reaksiyalar, javoblar, o'qilganlik**
`message_reactions`, javoblar (`reply_to_id`), `last_read_seq` o'qilmaganlar soni + o'qilganlik ko'rsatkichlari. UI: reaksiya paneli, iqtibosli javoblar, o'qilmagan nishonlar.
*Bog'liq:* 4.3.

---

## 5-bosqich — Media

**5.1 — Yuklash quvuri**
`media` jadvali, oldindan imzolangan to'g'ridan-to'g'ri S3 yuklash, finalize, asinxron ishchilar (skan → validatsiya → eskiz/transkod/sahifa-preview), a'zolikка moslangan imzolangan kirish URL'lari.
*Bog'liq:* 4.1.

**5.2 — Chatда boy media**
Rasmlar (lightbox/galereya), fayllar (kartalar), PDF ko'ruvchi, **ovozli xabarlar** (yozib olish + to'lqin ijro), server tomonidagi havola previewlari (SSRF-xavfsiz).
*Bog'liq:* 5.1, 4.3.

---

## 6-bosqich — Sinfxona tuzilmasi

**6.1 — Qadalgan xabarlar & e'lonlar**
`pinned_messages`; e'lon xabar turi + banner; qadash/yechish moderatsiyasi; qadalganlar tasmasi jonli.
*Bog'liq:* 4.4.

**6.2 — Moderatsiya asboblari**
A'zoni ovozsiz qilish/chiqarish, har-qanday-xabarni-o'chirish, slow-mode, sinf bo'yicha DM siyosati; o'qituvchi moderatsiya yuzalari. Jurnaliga yoziladi.
*Bog'liq:* 6.1.

**6.3 — Xabar qidiruvi**
Sinf xabarlari ustida Postgres FTS; ajratish + xabarga o'tish bilan qidiruv UI.
*Bog'liq:* 4.4.

---

## 7-bosqich — Akademik

**7.1 — Vazifalar**
`assignments` + ilovalar + `submissions` + topshiriq ilovalari; o'qituvchi yaratish/nashr, o'quvchi topshirish (matn+fayl, qoralama avtosaqlash), o'qituvchi baholash + fikr-mulohaza, muddat mantig'i.
*Bog'liq:* 5.1, 6.1.

**7.2 — Testlar/Sinovlar**
`tests`/`questions`/`question_options`/`test_attempts`/`attempt_answers`; runner (fokus rejimi, taymer, avtosaqlash), obyektiv turlar uchun avto-baholash, oshkor qilish siyosatli natija ekrani.
*Bog'liq:* 7.1.

**7.3 — Gradebook**
Topshiriq + urinishlardan materializatsiyalangan gradebook ko'rinishi; o'qituvchi gradebook UI; o'quvchi baholar ko'rinishi.
*Bog'liq:* 7.2.

---

## 8-bosqich — Bildirishnomalar

**8.1 — Ilova ichi + push**
`notifications`, `devices`, `notification_prefs`; hodisa asosidagi bildirishnoma ishchilari; ilova ichi pochta qutisi; Expo orqali APNs/FCM push; jim soatlar + digestlar.
*Bog'liq:* 4.4 (va funksiyalar hodisalari paydo bo'lgani sari).

---

## 9-bosqich — AI modullari (bosqichma-bosqich, provayder abstraksiyasi ortida)

**9.1 — AI infratuzilmasi**
`ai` moduli + provayder-abstraksiya qatlami (standart boshqariladigan Claude), chaqiruv loglash (`ai_messages` narx/kechikish), har bir tashkilot uchun byudjet/cheklov, feature flaglar.
*Bog'liq:* 1.3.

**9.2 — Moderatsiya & xavfsizlik (ko'rinmas)**
`moderation_events`; xabarlar/yuklamalarni asinxron tasniflash → o'qituvchi xavfsizlik navbati; siyosat harakatlari (flag/blok).
*Bog'liq:* 9.1, 5.1, 4.4.

**9.3 — O'qituvchiga yordam**
Dars/test generatsiyasi, baholashda yordam, qisqartirish — ixtiyoriy, o'quvchilar ko'rishidan oldin har doim o'qituvchi tomonidan ko'rib chiqiladi.
*Bog'liq:* 9.1, 7.2.

**9.4 — O'quvchi AI-Repetitori (RAG)**
pgvector bilan `ai_documents`/`ai_chunks`; sinf materiallarini olish → embeddinglar; iqtiboslar, oqim va himoyalar bilan sinf-qamrovli asoslangan repetitor (masalan, faol baholanadigan test paytida o'chirilган).
*Bog'liq:* 9.1, 7.2, 5.1.

---

## 10-bosqich — Mobil ilovalar

**10.1 — Mobil qobiq**
`packages/contracts` + `packages/sdk` ni qayta ishlatadigan Expo/React Native ilova: auth, navigatsiya (pastki tablar), mavzulash.
*Bog'liq:* yetuk, barqaror API'lar (4–7-bosqichlardan keyin).

**10.2 — Mobil chat & sinfxona**
Native-his chat (surib-javob, ovozli xabarlar, push), sinfxona bosh sahifasi, vazifalar/testlar.
*Bog'liq:* 10.1.

---

## 11-bosqich — Mustahkamlash va masshtab

**11.1 — Kuzatuvchanlik**
Strukturlangan loglar, OpenTelemetry tracing, Prometheus/Grafana metrikalari, Sentry, SLO ogohlantirishlari.
*Bog'liq:* servislar joyida.

**11.2 — Unumdorlik & masshtab**
Read replicalar, keshlash qatlamlari, messages-jadval partitsiyalashни joriy etish, 1 mln-foydalanuvchi proeksiyalariga yuk testlash, so'rov/indeks sozlash.
*Bog'liq:* 11.1.

**11.3 — Xavfsizlik & muvofiqlik**
Pen-test, rate-limit/suiiste'mol ko'rib chiqish, GDPR/COPPA/FERPA oqimlari (eksport, o'chirish, rezidentlik), zaxira **tiklash mashqlari**, falokat runbook.
*Bog'liq:* 11.1.

**11.4 — Mikroservisga ajratish (zarurat bo'yicha)**
Ichki event bus'ni haqiqiy brokerga ko'tarish; o'lchangan yuk ostида realtime → media → AI → messaging → notifications ni ajratish. Faqat metrikalar oqlaganda.
*Bog'liq:* 11.2.

---

## Ishlab chiqish yo'l xaritasi (bosqichlar ko'rinishi)

| Bosqich | Qadamlar | Natija |
|---|---|---|
| **M0 — Yuradigan skelet** | 0 | Monorepo, CI, infra, contracts |
| **M1 — Hisoblar ishlaydi** | 1–2 | Admin→O'qituvchi→O'quvchi taqdim etish; maxfiy sinfxonalar; izolyatsiya isbotlangan |
| **M2 — Premium ko'rinadi** | 3 | Dizayn tizimi + ilova qobig'i + sinfxona bosh sahifasi |
| **M3 — Sinfxonalar jonli** | 4–6 | Realtime chat, media, qadash/e'lonlar, moderatsiya, qidiruv |
| **M4 — Haqiqiy o'qitish** | 7–8 | Vazifalar, testlar, gradebook, bildirishnomalar |
| **M5 — Aqlli** | 9 | Moderatsiya AI, o'qituvchiga yordam, o'quvchi repetitori |
| **M6 — Hamma joyda** | 10 | iOS/Android ilovalar |
| **M7 — Masshtabda production darajasi** | 11 | Kuzatuvchanlik, masshtab, xavfsizlik/muvofiqlik, servis ajratish |

Har bir bosqich mustaqil ravishda ko'rsatiladi va keyingisi boshlanishidan oldin pilotga jo'natilishi mumkin.
