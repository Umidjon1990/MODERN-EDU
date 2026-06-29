# 02 — Tizim arxitekturasi

Ushbu hujjat Modern Edu uchun **1 mln+ foydalanuvchiga** qayta platformaga o'tmasdan masshtablanadigan ishlab chiqarish (production) arxitekturasini belgilaydi. Yetakchi tamoyil: **yaxshi bo'lingan modulli monolit sifatida boshlash, lekin har bir ichki chegarani xuddi u allaqachon mikroservis bo'lganidek chizish** — shunda yuk ortganda servislarni qayta yozmasdan ajratib olishimiz mumkin.

---

## 1. Arxitekturaga umumiy nazar

```
                         ┌───────────────────────────────────────────┐
                         │              Mijozlar (Clients)            │
                         │  Veb (Next.js)   iOS/Android (React Native)│
                         └───────────────┬─────────────┬─────────────┘
                                         │ HTTPS/REST  │ WSS (realtime)
                                         ▼             ▼
                              ┌──────────────────────────────────┐
                              │        Edge / CDN / WAF           │
                              │  TLS, DDoS, statik + media kesh   │
                              └───────────────┬──────────────────┘
                                              ▼
                                   ┌────────────────────┐
                                   │   API Gateway /     │  rate-limit, authN,
                                   │   Load Balancer     │  routing, tracing
                                   └─────┬─────────┬─────┘
                       ┌─────────────────┘         └──────────────────┐
                       ▼                                              ▼
            ┌────────────────────┐                       ┌─────────────────────────┐
            │   API servisi       │                      │  Realtime Gateway        │
            │   (NestJS)          │◄──── Redis pub/sub ──►│  (WebSocket klaster)     │
            │  modulli monolit    │                      │  presence, fan-out       │
            └───┬───────┬─────────┘                      └───────────┬─────────────┘
                │       │                                            │
        ┌───────┘       └────────┐                                  │
        ▼                        ▼                                  ▼
┌───────────────┐      ┌──────────────────┐               ┌──────────────────┐
│ PostgreSQL 16 │      │   Redis           │              │  Asinxron ishchi  │
│ primary +     │      │ kesh / sessiyalar │              │  (BullMQ navbat)  │
│ read replica  │      │ presence / pubsub │              │ media, AI, email, │
└───────────────┘      └──────────────────┘               │ bildirishnomalar  │
        │                                                  └────────┬─────────┘
        ▼                                                           ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────┐  ┌────────────────────┐
│ Obyekt xotira │   │ Qidiruv (FTS → │   │ AI Provayder   │  │ Kuzatuv (logs/      │
│ (S3) + CDN    │   │ OpenSearch)    │   │ Abstraksiyasi  │  │ metrics/traces)     │
└───────────────┘   └────────────────┘   │ (Claude va h.k)│  └────────────────────┘
                                          └───────────────┘
```

---

## 2. Frontend

### 2.1 Veb — Next.js (App Router)

- **Nega:** tez birinchi ko'rinish uchun SSR/streaming, kichik bundle uchun React Server Components, yetuk ekotizim, birinchi darajali TypeScript.
- **Render:** ilova qobig'i + autentifikatsiyalangan panellar asosan mijoz tomonida interaktiv; statik marketing sahifalari statik generatsiya qilinadi. Sinfxona ma'lumotlari REST orqali, jonli yangilanishlar realtime soket orqali olinadi.
- **Holat (state):**
  - **Server holati:** TanStack Query (keshlash, optimistik yangilanishlar, qayta urinishlar).
  - **Realtime holat:** maxsus soket-mijoz qatlami Query keshini to'ldiradi (yagona haqiqat manbai — parallel store farqlanishi yo'q).
  - **Lokal UI holati:** Zustand (kompozer, modallar, mavzu).
- **Uslublash:** Tailwind CSS + token asosidagi dizayn tizimi (`04-ui-ux-dizayn.md`). Kirish imkoniyatli primitivlar uchun Radix; animatsiya uchun Framer Motion.
- **Formalar/validatsiya:** React Hook Form + Zod (Zod sxemalari `packages/contracts` orqali backend bilan ulashiladi).

### 2.2 Mobil — React Native + Expo

- **Nega native Kotlin/Swift o'rniga:** monorepo orqali biznes mantiq, tiplar, validatsiya va API/soket mijozlarining ~80%ini veb bilan ulashadi; bitta jamoa; paritetga eng tez yo'l. Expo OTA yangilanishlar, push bildirishnomalar va boshqariladigan buildlar beradi. Keyinroq Expo qila olmaydigan narsalar uchun native modullar qo'shilishi mumkin.
- `packages/contracts`, `packages/sdk` (tipli API + soket mijoz) va domen mantig'ini veb bilan ulashadi. Faqat ko'rinish qatlami farq qiladi.

### 2.3 Umumiy monorepo

```
/apps
  /web         (Next.js)
  /mobile      (Expo / React Native)
  /api         (NestJS)
  /realtime    (WebSocket gateway)
  /workers     (fon vazifalari)
/packages
  /contracts   (Zod sxemalari + DTO tiplari — yagona haqiqat manbai)
  /sdk         (veb & mobil ishlatadigan tipli REST + soket mijoz)
  /ui          (umumiy dizayn tokenlari, ba'zi platformalararo primitivlar)
  /config      (eslint, tsconfig, tailwind preset)
  /db          (Prisma/Drizzle sxema, migratsiyalar, seederlar)
```

Asboblar: tez, keshlangan buildlar uchun **pnpm workspaces + Turborepo**.

---

## 3. Backend (API)

### 3.1 NestJS modulli monolit

- **Nega:** fikrli, dependency-injection asosidagi, tabiatan modulli — har bir domen o'z controller/service/repository'ga ega mustaqil modul. Bu **aynan** mikroservis chegarasi; hozir bitta jarayon sifatida deploy qilamiz, keyin ajratamiz.
- **Modullar (bounded context'lar):**
  `auth`, `identity` (foydalanuvchilar/rollar), `org` (tenantlar), `class` (sinflar & a'zoliklar), `messaging` (chat/xabarlar/pinlar), `media` (yuklamalar), `assignments`, `assessments` (testlar), `gradebook`, `notifications`, `moderation`, `ai`, `audit`, `search`, `admin`.
- **Ichki aloqa:** bugun jarayon ichidagi metod chaqiruvlari, lekin har bir modul toza servis interfeysini ochib beradi va **domen hodisalarini** (masalan, `MessagePosted`, `StudentCreated`, `SubmissionGraded`) ichki hodisa shinasiga (event bus) chiqaradi. Modulni alohida servisga ajratganimizda, event bus haqiqiy brokerga (NATS/Kafka) aylanadi — chaqiruvchi kodga o'zgartirishsiz.

### 3.2 API uslubi

- **Asosiy:** versiyalangan **REST** (`/api/v1/...`), resurs-yo'naltirilgan, oldindan aytib bo'ladigan, mobil va uchinchi tomonlar uchun oson. Hamma joyda cursor asosidagi paginatsiya (masshtabda OFFSET yo'q).
- **Shartnomalar:** koddan generatsiya qilingan OpenAPI; Zod/DTO tiplari `packages/contracts` orqali mijozlar bilan ulashiladi. Mijozlar tiplarni qo'lda yozmaydi.
- **Realtime delta kanali:** jonli hodisalar uchun WebSocket (§5). REST haqiqat manbai bo'lib qoladi; soketlar deltalar + presence olib yuradi.
- **GraphQL:** ataylab keyinga qoldirildi. REST + tipli SDK kamroq operatsion murakkablik bilan ehtiyojlarimizni qoplaydi; agar so'rov shakllash bilan og'riq paydo bo'lsa, keyinroq GraphQL/BFF gateway qo'shamiz.

### 3.3 Namunaviy API yuzasi (v1)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password/first-set      # birinchi kirishda majburiy almashtirish

# Admin
POST   /api/v1/teachers                      # admin o'qituvchi yaratadi
GET    /api/v1/teachers

# O'qituvchi
POST   /api/v1/classes
POST   /api/v1/classes/:id/students          # o'quvchi hisoblarini ommaviy yaratish
POST   /api/v1/classes/:id/students/:sid/reset-credentials
GET    /api/v1/classes/:id/credentials/export

# Sinfxona
GET    /api/v1/classes/:id                   # sinfxona bosh sahifa ma'lumoti
GET    /api/v1/classes/:id/messages?cursor=  # paginatsiyalangan tarix
POST   /api/v1/classes/:id/messages
PATCH  /api/v1/messages/:id                  # tahrirlash
DELETE /api/v1/messages/:id
POST   /api/v1/messages/:id/reactions
POST   /api/v1/classes/:id/messages/:mid/pin
GET    /api/v1/classes/:id/search?q=

# Media
POST   /api/v1/media/upload-url              # to'g'ridan-to'g'ri S3 ga oldindan imzolangan
POST   /api/v1/media/:id/finalize

# Akademik
POST   /api/v1/classes/:id/assignments
POST   /api/v1/assignments/:id/submissions
POST   /api/v1/submissions/:id/grade
POST   /api/v1/classes/:id/tests
POST   /api/v1/tests/:id/attempts

# AI
POST   /api/v1/classes/:id/ai/tutor          # o'quvchi repetitor so'rovi (siyosat bilan)
POST   /api/v1/ai/assist/*                   # o'qituvchiga yordam endpointlari
```

---

## 4. Autentifikatsiya va sessiya boshqaruvi

### 4.1 Model

- **O'zini ro'yxatdan o'tkazish yo'q.** Yagona login-yaratuvchi endpointlar — admin→o'qituvchi va o'qituvchi→o'quvchi, ikkalasi ham ruxsatga ega va jurnaliga yoziladi.
- **Kirish:** login + parol (o'quvchilarda ko'pincha email yo'q). Email o'qituvchi/admin uchun ixtiyoriy (tiklash + 2FA imkonini beradi).
- **Parol saqlash:** **Argon2id** (xotira-og'ir) har bir foydalanuvchi uchun alohida tuz (salt) bilan; secrets manager'dan pepper.
- **Birinchi kirishda majburiy almashtirish:** o'qituvchi bergan parollar `must_change` deb belgilanadi; o'quvchi yangi parol o'rnatmaguncha sessiya cheklangan.

### 4.2 Tokenlar

- **Kirish tokeni (access):** qisqa umrli (~15 daq) JWT (imzolangan, `user_id`, `role`, `org_id` va `session_id` ni o'z ichiga oladi). Har bir so'rovda holatsiz tekshirish.
- **Yangilash tokeni (refresh):** uzoq umrli, **shaffof bo'lmagan, aylanuvchi (rotating)**, server tomonida (hashlangan) saqlanadi va sessiya/qurilma qatoriga bog'langan. Aylanish + qayta ishlatishni aniqlash (qayta ishlatilgan refresh token butun sessiya oilasini bekor qiladi).
- **Veb:** tokenlar `httpOnly`, `Secure`, `SameSite=Lax` cookie'larda (XSS'ga chidamli). **Mobil:** tokenlar xavfsiz xotirada (Keychain/Keystore).
- **Realtime:** soket qo'l berishi qisqa umrli kirish tokeni (yoki API tomonidan chiqarilgan bir martalik soket bileti) bilan autentifikatsiya qilinadi, qayta ulanishda qayta tekshiriladi.

### 4.3 Loyihalashtirilgan qo'shimchalar (bosqichma-bosqich)

- Imtiyozli hisoblar (Admin/O'qituvchi) uchun **2FA/TOTP**.
- **Qurilma/sessiya boshqaruvi** interfeysi (sessiyalarni ko'rish & bekor qilish).
- Brute force'ga **hisob qulflash + eksponensial kechikish**; CAPTCHA eskalatsiyasi.
- O'qituvchi/adminlar uchun keyinroq **SSO/OAuth (Google/Microsoft Education)** — o'quvchilar boshqariladigan loginlarda qoladi.

---

## 5. Realtime arxitekturasi

### 5.1 Gateway

- **Maxsus, gorizontal masshtablanadigan WebSocket servisi** (API'dan alohida deploy), `ws`/Socket.IO asosida. Alohida bo'lishi chat yuki so'rovlarni qayta ishlashni hech qachon "ochlikka" qoldirmasligini va har biri mustaqil masshtablanishini ta'minlaydi.
- **Xonalar = sinfxonalar.** Ulanishda mijoz faqat o'z a'zoliklari ruxsat bergan xonalarga qo'shiladi (DB/kesh bilan tekshiriladi — a'zolik xavfsizlik chegarasi, hech qachon mijoz bergan xona id'si emas).
- **Instancelar bo'ylab fan-out** — **Redis pub/sub** (yoki boshqariladigan ekvivalent) orqali. Har qanday API/ishchi tugun `MessagePosted` hodisasini chiqaradi; o'sha xona obunachilarini saqlovchi har bir gateway instance uni yetkazadi.

### 5.2 Yetkazish kafolatlari va tartib

- Xabarlar **avval saqlanadi** (Postgres), keyin tarqatiladi — DB haqiqat manbai, soket esa yetkazish tezlatkichi.
- Har bir xabar **har bir sinf uchun monoton ketma-ketlik** (`seq`) raqamini olib yuradi, shu sababli mijozlar bo'shliqlarni aniqlab, REST orqali (`?after_seq=`) to'ldirishi mumkin. Bu Telegram darajasidagi ishonchlilikni beradi: soket uzilsa — qayta ulan, bo'shliqni sinxronla, hech qachon xabarni yo'qotma.
- **Idempotentlik:** mijoz tomonidan generatsiya qilingan `client_msg_id` qayta urinishlarni takrorlanishdan saqlaydi va optimistik UI'ni quvvatlaydi (server qaytargan xabar optimistik xabar bilan mosланади).

### 5.3 Presence, yozmoqda, o'qilganlik

- **Presence va yozmoqda:** vaqtinchalik, TTL bilan Redis'da, hech qachon Postgres'ga yozilmaydi (yuqori almashinuv, saqlash uchun kam qiymat).
- **O'qilganlik / o'qilmaganlar hisoblagichi:** har bir a'zo uchun Postgres'da `last_read_seq` (+ Redis kesh). O'qilmagan = `class.max_seq − member.last_read_seq`. Arzon, aniq, masshtablanadi.

### 5.4 Push bildirishnomalar

- Qabul qiluvchi oflayn bo'lsa, ishchi hodisani push'ga (Expo orqali APNs/FCM) yoki email/digest'ga aylantiradi — har bir foydalanuvchi bildirishnoma sozlamalari va jim soatlarini hisobga olib.

---

## 6. Saqlash va media

- **Obyekt xotira:** CDN ortidagi S3-mos bucket(lar). **To'g'ridan-to'g'ri xotiraga yuklash** oldindan imzolangan URL'lar orqali — katta fayllar (PDF, audio, rasm) hech qachon API orqali o'tmaydi.
- **Quvur (asinxron ishchilar):** virus/zararli dastur skani → tur/o'lcham validatsiyasi → rasm eskizlari & moslashuvchan variantlar → audio transkod/normalizatsiya (ovozli xabarlar → veb-mos Opus/AAC + to'lqin shakli) → PDF birinchi sahifa previewi. Holat `media` qatorida kuzatiladi (`pending → ready/failed`).
- **Kirish nazorati:** media odatda maxfiy; so'rovchining sinfxona a'zoligiga moslangan qisqa umrli imzolangan CDN URL'lar orqali beriladi. Ommaviy bucket yo'q.
- **Havola previewlari:** sandbox ishchi server tomonida OpenGraph metama'lumotlarini oladi (SSRF himoyasi: sxemalar oq ro'yxati, ichki IP diapazonlarini bloklash, taymautlar).

---

## 7. Ruxsatlar modeli (avtorizatsiya)

Avtorizatsiya — **RBAC + qamrovli siyosat**, hech qachon tarqoq `if (role === 'teacher')` tekshiruvlari emas.

- **Rollar** standart ruxsatlar to'plamini olib yuradi; **a'zoliklar** rolni tashkilot/sinfga moslaydi.
- Markaziy **siyosat/guard qatlami** `can(actor, action, resource)` ga javob beradi: aktyorning roli, uning resurs sinf/tashkilotidagi a'zoligi va resurs-darajasidagi qoidalar (masalan, o'quvchi _o'z_ xabarini tahrirlash oynasi ichida tahrirlay oladi).
- **Ma'lumotlar qatlamida ta'minlash:** har bir sinfxona so'rovi repository darajasida a'zolik bo'yicha cheklanadi (ixtiyoriy ravishda mudofaa chuqurligi uchun Postgres Row-Level Security). Tugmani yashirgan UI _hech qachon_ xavfsizlik chegarasi emas.

Ruxsat misollari:

| Harakat                          | Admin           | O'qituvchi (egasi) | Ko-o'qituvchi | O'quvchi      |
| -------------------------------- | --------------- | ------------------ | ------------- | ------------- |
| O'qituvchi yaratish              | ✓               | —                  | —             | —             |
| Sinf yaratish                    | ✓               | ✓                  | —             | —             |
| O'quvchi yaratish                | ✓               | ✓                  | —             | —             |
| Xabar yozish                     | ✓ (har)         | ✓ (o'z sinfi)      | ✓             | ✓ (o'z sinfi) |
| O'z xabarini tahrirlash (≤ oyna) | ✓               | ✓                  | ✓             | ✓             |
| Boshqalar xabarini o'chirish     | ✓               | ✓                  | ✓             | —             |
| Qadash / E'lon                   | ✓               | ✓                  | ✓             | —             |
| Vazifa/test yaratish             | ✓               | ✓                  | ✓             | —             |
| Baholash                         | ✓               | ✓                  | ✓             | —             |
| Boshqa sinfxonani ko'rish        | ✓ (auditланган) | —                  | —             | —             |

---

## 8. Xavfsizlik

- **Transport:** hamma joyda TLS 1.3; HSTS; faqat zamonaviy shifrlar.
- **Tenant izolyatsiyasi:** har bir qator `org_id` ga ega; sinfxona ma'lumoti qo'shimcha ravishda `class_id` + a'zolik bilan cheklangan. Tenantlararo kirish so'rov tuzilishi orqali imkonsiz va testlar bilan tasdiqlanadi.
- **Kirish (input):** chetda Zod validatsiyasi; parametrli so'rovlar / ORM (string SQL yo'q); XSS oldini olish uchun chiqishni kodlash; qat'iy CSP.
- **Sirlar:** boshqariladigan secrets manager'da (repo'dagi env fayllarda emas); aylantiriladi; har bir servis uchun eng kam imtiyozli IAM.
- **Rate limiting & suiiste'mol:** gateway'da IP va foydalanuvchi bo'yicha cheklovlar; auth va AI endpointlarida qat'iyroq; bot/brute-force himoyasi.
- **Fayl xavfsizligi:** zararli dastur skani, tur aniqlash (kengaytmaga ishonmaslik), o'lcham chegaralari, imzolangan kirish.
- **AI xavfsizligi:** prompt-injeksiya yumshatish (foydalanuvchi/sinf kontentini ishonchsiz deb hisoblash, tizim siyosatini bekor qilishga yo'l qo'ymaslik), jurnallarda PII redaksiyasi, chiqishni moderatsiyalash.
- **Maxfiylik/muvofiqlik:** o'quvchi ma'lumotini minimallashtirish, har bir tashkilot uchun sozlanadigan ma'lumot rezidentligi, GDPR/COPPA/FERPA'ga moslik (rozilik, o'chirish, eksport, voyaga yetmaganlar uchun ota-ona masalalari). Standart bo'yicha yumshoq o'chirish; butunlay o'chirish — aniq, jurnalga yoziladigan, ruxsatli oqim.
- **Audit jurnali:** har bir imtiyozli/sezgir harakatning o'zgartirilmas, faqat-qo'shiladigan yozuvi.

---

## 9. Masshtablanish va mikroservisga tayyorlik

- **Holatsiz servislar** (API, realtime, ishchilar) load balancer ortida gorizontal masshtablanadi; barcha umumiy holat Postgres/Redis/obyekt xotirada yashaydi.
- **DB masshtablash yo'li:** avval vertikal → o'qishga og'ir endpointlar uchun **read replicalar** → messages jadvalini **partitsiyalash** (sinf yoki vaqt bo'yicha) → bitta primary to'lib qolganda **`org_id` bo'yicha mantiqiy shardlash**. Sxema buni boshidan hisobga oladi (har bir issiq jadval tashkilot/sinf qamrovida). Qarang: `03-malumotlar-bazasi.md`.
- **Yuk ostida ajratish tartibi** (modullar → servislar): (1) **Realtime gateway** (allaqachon alohida), (2) **Media quvuri** (allaqachon ishchilar fleti), (3) **AI servisi**, (4) **Messaging**, (5) **Bildirishnomalar**. Event bus + toza modul interfeyslari har birini ko'chirib qo'yishga aylantiradi, qayta yozishga emas.
- **Keshlash** (§10), media/statik uchun **CDN** va interaktiv bo'lmagan hamma narsani **asinxron yuklash** so'rov yo'lini nozik saqlaydi.

## 10. Keshlash

| Qatlam | Texnologiya    | Keshlanadi                                                                                                                                             |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Edge   | CDN            | statik aktivlar, media (imzolangan), ommaviy marketing                                                                                                 |
| Ilova  | Redis          | sessiya/refresh izlash, ruxsat tekshiruvlari, sinfxona bosh sahifasi, issiq xabar sahifalari, presence, o'qilmaganlar soni, rate-limit hisoblagichlari |
| Mijoz  | TanStack Query | aqlli invalidatsiya bilan server holati; realtime hodisalar keshni yangilaydi                                                                          |
| DB     | Postgres       | gradebook/analitika uchun materializatsiyalangan ko'rinishlar; issiq yo'llar uchun qisman indekslar                                                    |

Kesh invalidatsiyasi **hodisa asosida** — domen hodisalari (`MessagePosted`, `MemberJoined` va h.k.) ko'r-ko'rona TTL taxminlari emas, balki maqsadli invalidatsiyalarni ishga tushiradi.

## 11. Asinxron qayta ishlash

- **Navbat:** hozir BullMQ (Redis); servislarni ajratganda SQS/NATS/Kafka'ga almashtiriladi.
- **Vazifa turlari:** media qayta ishlash, AI inferens, push/email bildirishnomalar, qidiruv indekslash, digest generatsiyasi, eksportlar, rejalashtirilgan vazifalar (muddat eslatmalari, yil arxivlash).
- Vazifalar **idempotent**, **kechikish bilan qayta urinadi** va takroriy muvaffaqiyatsizlikda dead-letter'ga o'tib, ogohlantirish beradi.

## 12. Loglar, monitoring, kuzatuvchanlik

- API → realtime → ishchilar bo'ylab tarqatiladigan korrelyatsiya/trace ID'lari bilan **strukturlangan loglar** (JSON).
- **Metrikalar:** Prometheus uslubidagi (so'rov kechikishi/xatolik darajasi, soket ulanishlari, navbat chuqurligi, AI narx/kechikishi, DB pool to'yinganligi) → Grafana panellari.
- **Tracing:** servislar bo'ylab OpenTelemetry taqsimlangan tracing.
- **Xato kuzatuvi:** Sentry (frontend + backend) reliz salomatligi bilan.
- **Ogohlantirish:** SLO asosidagi ogohlantirishlar (mavjudlik, p95 kechikish, navbat to'planishi, xatolik byudjeti) navbatchiga.
- **Mahsulot analitikasi:** maxfiylikni hurmat qiluvchi, faqat agregat (voyaga yetmaganlarni kuzatish yo'q); UX'ni yaxshilash uchun ishlatiladi, profillash uchun emas.

## 13. Zaxira nusxalar va falokatdan tiklanish

- **Postgres:** avtomatlashtirilgan kunlik snapshotlar + uzluksiz WAL arxivlash → **vaqt nuqtasiga tiklash (PITR)**. Falokatdan tiklanish uchun mintaqalararo replica.
- **Obyekt xotira:** versiyalash + mintaqalararo replikatsiya; xarajat uchun hayot sikli siyosatlari.
- **Redis:** kesh/vaqtinchalik deb hisoblanadi — flushdan keyin saqlanishi shart bo'lgan hamma narsa Postgres'da ham bor (presence/yozmoqda ataylab "yo'qoladigan").
- **Maqsadlar:** **RPO ≤ 5 daq**, **RTO ≤ 1 soat** belgilash va sinash. Zaxiralar **jadval bo'yicha tiklash sinovidan o'tkaziladi** (sinalmagan zaxira — zaxira emas).
- **Migratsiyalar:** versiyalangan, faqat-oldinga, ko'rib chiqilgan; nol-to'xtashli sxema o'zgarishlari uchun expand-then-contract namunasi.

## 14. AI quyi tizimi arxitekturasi

```
Funksiya (repetitor / yordam / moderatsiya)
        │
        ▼
  AI Orkestratsiya (NestJS `ai` moduli)
   - prompt yig'ish + himoyalar
   - retrieval (sinf materiallari → embedding/vektor xotira)
   - siyosat tekshiruvlari (masalan, faol baholanadigan test paytida repetitorni bloklash)
   - har bir tashkilot uchun narx/rate byudjeti
        │
        ▼
  Provayder Abstraksiya Qatlami   ◄── almashtiriladigan
   ├── Boshqariladigan: Claude (standart)
   └── (kelajakda) o'z serveringdagi / ochiq modellar
        │
        ▼
  Loglash & Baholash (prompt, model, tokenlar, narx, kechikish, xavfsizlik hukmlari)
```

- **Provayder abstraksiyasi** har bir AI chaqiruvini bitta interfeys ortiga izolyatsiya qiladi → funksiyalarga tegmasdan modellarni/provayderlarni o'zgartirishimiz, A/B sinash yoki masshtabda narx uchun o'z serverimizda joylashtirishimiz mumkin.
- **Asoslangan repetitorlik:** sinf materiallari bo'laklarga bo'linib, vektor xotiraga embedding qilinadi; repetitor javoblari retrieval-augmented va manba-ko'rsatuvchi, qat'iy ravishda o'sha sinf qamrovida.
- **Himoyalar:** ishonchsiz sinf kontenti hech qachon tizim ko'rsatmalarini bekor qila olmaydi; chiqishlar moderatsiyadan o'tadi; o'qituvchi sozlaydigan qat'iylik; to'liq auditga tayyorlik va har bir tashkilot uchun narx byudjeti/cheklovlari.

## 15. Infratuzilma va deploy

- **Kubernetes**'da (yoki boshqariladigan ekvivalentda) orkestratsiya qilingan **konteynerlar**. Har bir servis uchun bitta deploy (api, realtime, workers, web).
- Takrorlanadigan muhitlar uchun **IaC** (Terraform): `dev → staging → prod`.
- **CI/CD:** PR → typecheck/lint/test → build → preview muhiti → staging → **blue/green yoki canary** deploy bilan prod va SLO regressiyasida avtomatik rollback.
- Xavfsiz bosqichma-bosqich chiqarish uchun **feature flag**lar (ayniqsa AI funksiyalari).
- **Muhitlar izolyatsiyalangan**; production ma'lumotlari hech qachon quyi muhitlarga oqmaydi.
