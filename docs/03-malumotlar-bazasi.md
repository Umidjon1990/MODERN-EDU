# 03 — Ma'lumotlar bazasi dizayni (PostgreSQL 16)

Tajribali PostgreSQL arxitektori sifatida **millionlab foydalanuvchi** uchun loyihalashtirilgan: to'g'ri normalizatsiya (3NF, takrorlangan haqiqat-manbasi yo'q), referensial yaxlitlik va aniq masshtablash yo'li (replicalar → partitsiyalash → tashkilot shardlash).

## 0. Konvensiyalar

- **Birlamchi kalitlar (PK):** `UUID v7` (`id`) — global noyob (shard- va birlashtirish-xavfsiz), shu bilan birga **vaqt bo'yicha tartiblangan**, shu sababli yaxshi indekslanadi va tasodifiy-UUID yozish-kuchayishi muammosidan qochadi. Ilova tomonida yoki `uuidv7()` orqali generatsiya qilinadi.
- **Vaqt belgilari:** `timestamptz` (UTC). Har bir jadvalda `created_at`; o'zgaruvchan jadvallarda `updated_at`; yumshoq-o'chiriladigan jadvallarda `deleted_at` (NULL = tirik).
- **Tenant:** har bir domen jadval tenant izolyatsiyasi va kelajakda shardlash uchun `org_id` ga ega.
- **Enumlar:** yopiq to'plamlar (rollar, holatlar) uchun native Postgres `ENUM` turlari, kichik va migratsiyaga moslangan.
- **Takrorlangan haqiqat yo'q:** denormallashtirilgan hisoblagichlar (o'qilmaganlar, a'zolar soni) — *hosila keshlar*, aniq belgilangan va qayta tiklanadigan — hech qachon manba emas.
- **Pul/baholar:** numeric/`decimal`, hech qachon float emas.
- **Yozuv qiymati:** barcha akademik yozuvlar yumshoq-o'chiriladi (arxivlash), standart bo'yicha butunlay o'chirilmaydi.

---

## 1. Identifikatsiya va tenant

### `organizations`
Ko'p tenantli ildiz (maktab / o'quv markazi).
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `slug` | citext UNIQUE | url-xavfsiz handle |
| `status` | enum(`active`,`suspended`) | |
| `settings` | jsonb | feature flaglar, AI siyosati, brending |
| `created_at` / `updated_at` | timestamptz | |

### `users`
Shaxs. **Bitta sinfga bog'lanmagan** (a'zolik buni hal qiladi).
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations(id) | tenant qamrovi |
| `role` | enum(`super_admin`,`admin`,`teacher`,`co_teacher`,`student`) | asosiy rol |
| `username` | citext NOT NULL | login id; **tashkilot bo'yicha UNIQUE** |
| `email` | citext NULL | ixtiyoriy (o'qituvchi/admin); mavjud bo'lsa tashkilot bo'yicha UNIQUE |
| `full_name` | text | |
| `password_hash` | text NOT NULL | Argon2id |
| `must_change_password` | boolean DEFAULT true | birinchi kirishda majburiy almashtirish |
| `status` | enum(`active`,`invited`,`suspended`,`archived`) | |
| `avatar_media_id` | uuid FK → media(id) NULL | |
| `created_by` | uuid FK → users(id) NULL | kim yaratgan (audit) |
| `last_login_at` | timestamptz NULL | |
| `created_at`/`updated_at`/`deleted_at` | timestamptz | |

**Cheklovlar/indekslar**
- `UNIQUE (org_id, lower(username))`
- `UNIQUE (org_id, lower(email)) WHERE email IS NOT NULL`
- `INDEX (org_id, role)`
- `INDEX (created_by)`

### `auth_sessions`
Har bir qurilma uchun refresh-token/sessiya oilasi.
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | = JWT'dagi `session_id` |
| `user_id` | uuid FK → users(id) ON DELETE CASCADE | |
| `refresh_token_hash` | text NOT NULL | hashlangan, aylanuvchi |
| `device_info` | jsonb | UA, platforma |
| `ip_last` | inet | |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz NULL | qayta ishlatishni aniqlash / chiqish |
| `created_at` | timestamptz | |

`INDEX (user_id) WHERE revoked_at IS NULL`.

### `user_2fa` (bosqichma-bosqich)
Imtiyozli hisoblar uchun TOTP sirlari/zaxira kodlari. users bilan 1:1.

---

## 2. Ruxsatlar (RBAC + qamrovli)

### `permissions` (statik seed)
`id`, `key` (masalan, `class.create`, `message.delete_any`), `description`. Yopiq katalog.

### `role_permissions`
Har bir asosiy rol uchun standart ruxsat to'plami. Kompozit PK `(role, permission_id)`.

### `class_member_overrides` (ixtiyoriy, bosqichma-bosqich)
Chekka holatlar uchun har bir a'zolik bo'yicha grant/bekor qilish (masalan, o'quvchini sinf yordamchisiga ko'tarish) — asosiy rolni o'zgartirmasdan.

> Ish vaqtida avtorizatsiya = asosiy rol ruxsatlari **±** overrides, a'zolik bilan qamrovlangan. Deklarativ saqlanadi, shu sababli siyosat o'zgarishlari kod deploy talab qilmaydi.

---

## 3. Sinflar va a'zolik

### `classes`
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations(id) | |
| `name` | text NOT NULL | "9-B sinf Matematika" |
| `subject` | text NULL | |
| `description` | text NULL | |
| `owner_teacher_id` | uuid FK → users(id) | asosiy o'qituvchi |
| `cover_media_id` | uuid FK → media(id) NULL | |
| `settings` | jsonb | DM siyosati, AI repetitor yoq/o'chir, slow-mode va h.k. |
| `status` | enum(`active`,`archived`) | yil oxiri arxivlash |
| `last_message_seq` | bigint DEFAULT 0 | max seq denormallashtirilgan kesh (o'qilmaganlar uchun) |
| `created_at`/`updated_at`/`archived_at` | timestamptz | |

`INDEX (org_id, status)`, `INDEX (owner_teacher_id)`.

### `class_members`
Foydalanuvchi va sinf o'rtasidagi bog'lanish — **maxfiylik/xavfsizlik chegarasi**.
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid FK → classes(id) ON DELETE CASCADE | |
| `user_id` | uuid FK → users(id) ON DELETE CASCADE | |
| `role_in_class` | enum(`teacher`,`co_teacher`,`student`) | |
| `last_read_seq` | bigint DEFAULT 0 | o'qilmaganlar hisoblagichi uchun |
| `muted` | boolean DEFAULT false | moderatsiya |
| `notifications` | jsonb | sinf bo'yicha bildirishnoma sozlamalari |
| `joined_at` | timestamptz | |
| `removed_at` | timestamptz NULL | yumshoq chiqarish (tarixni saqlaydi) |

**Cheklovlar/indekslar**
- `UNIQUE (class_id, user_id)`
- `INDEX (user_id) WHERE removed_at IS NULL` — "mening sinfxonalarim" izlash
- `INDEX (class_id) WHERE removed_at IS NULL` — ro'yxat

### `class_invites` (ixtiyoriy kirish)
**Oldindan yaratilgan** o'rinlar uchun bir martalik, muddati o'tadigan faollashtirish havolasi/QR. `id`, `class_id`, `target_user_id` NULL, `token_hash`, `expires_at`, `used_at`. Hech qachon ixtiyoriy o'zini ro'yxatdan o'tkazishga yo'l qo'ymaydi.

---

## 4. Messaging (yuqori hajmli yadro)

### `messages` — **partitsiyalangan**
Eng issiq jadval; milliardlab qatorlar uchun loyihalashtirilgan.
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK (v7) | |
| `class_id` | uuid FK → classes(id) | partitsiya/qamrov kaliti |
| `org_id` | uuid | shardlash/RLS uchun olib yuriladi |
| `seq` | bigint NOT NULL | **har bir sinf uchun monoton** (bo'shliq aniqlash, tartib, o'qilmaganlar) |
| `sender_id` | uuid FK → users(id) | tizim/AI xabarlari uchun NULL bo'lishi mumkin |
| `type` | enum(`text`,`image`,`file`,`pdf`,`voice`,`link`,`system`,`announcement`,`ai`) | |
| `body` | text NULL | matn/markdown kontenti |
| `reply_to_id` | uuid FK → messages(id) NULL | thread/javoblar |
| `client_msg_id` | uuid | idempotentlik / optimistik UI dedup |
| `edited_at` | timestamptz NULL | |
| `deleted_at` | timestamptz NULL | yumshoq o'chirish ("o'chirilgan" tombstone) |
| `metadata` | jsonb | havola previewi, eslatmalar, formatlash |
| `created_at` | timestamptz | |

**Partitsiyalash:** `PARTITION BY LIST (class_id)` hash sub-partitsiyalash orqali, **yoki** vaqt bo'yicha (`created_at` oylik). Tavsiya: **`class_id` bo'yicha hash partitsiyalash** — shunda sinf tarixi birga joylashadi va so'rovlar bitta partitsiyaga tushadi; juda katta sinflar va arzon sovuq-ma'lumot arxivlash uchun vaqt asosidagi sub-partitsiyalash qo'shing.

**Ketma-ketlik ajratish:** `seq` har bir sinf uchun atomar ajratiladi (masalan, insert tranzaksiyasi ichida `UPDATE classes SET last_message_seq = last_message_seq + 1 RETURNING`, yoki maxsus sinf hisoblagichi). Sinxron uchun bo'shliqsiz tartibni kafolatlaydi.

**Indekslar**
- `UNIQUE (class_id, seq)` — tartib + bo'shliq sinxron (`WHERE seq > :last`)
- `UNIQUE (class_id, client_msg_id)` — idempotentlik
- `INDEX (class_id, created_at DESC)` — tarix paginatsiyasi
- `INDEX (reply_to_id) WHERE reply_to_id IS NOT NULL`
- Qisman: `INDEX (class_id) WHERE deleted_at IS NULL`

### `message_attachments`
Bir xabar bir nechta media elementiga ega bo'lishi mumkin (normallashtirilgan, jsonb'ga tiqilmagan).
`id`, `message_id` FK ON DELETE CASCADE, `media_id` FK → media(id), `position` int. `INDEX (message_id)`.

### `message_reactions`
| Ustun | Tur | Izoh |
|---|---|---|
| `message_id` | uuid FK → messages(id) ON DELETE CASCADE | |
| `user_id` | uuid FK → users(id) | |
| `emoji` | text | unicode/shortcode |
| `created_at` | timestamptz | |

PK `(message_id, user_id, emoji)` — har bir foydalanuvchi har bir xabarga har bir emojidan bittadan. Agregatsiya uchun `INDEX (message_id)`. Sonlar o'qishda agregatlanadi / Redis'da keshlanadi, **ustun sifatida takrorlanmaydi**.

### `pinned_messages`
`id`, `class_id` FK, `message_id` FK, `pinned_by` FK → users(id), `pinned_at`. `UNIQUE (class_id, message_id)`, `INDEX (class_id)`.

### `message_reads` (ixtiyoriy, batafsil o'qilganlik)
`last_read_seq`'dan tashqari har bir xabar uchun o'qilganlik tafsiloti. Yuqori hajmli — faqat mahsulot har bir xabar ✓✓ ni talab qilsa yoqing. Aks holda `class_members.last_read_seq` o'qilmaganlar sonini arzon qoplaydi.

> **Presence va yozmoqda — jadval EMAS.** Ular TTL bilan Redis'da yashaydi (vaqtinchalik, yuqori almashinuv). Ularni saqlash yozish-kuchayishi xatosi bo'lardi.

---

## 5. Media

### `media`
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK | |
| `owner_id` | uuid FK → users(id) | yuklovchi |
| `kind` | enum(`image`,`video`,`audio`,`file`,`pdf`) | |
| `storage_key` | text NOT NULL | S3 obyekt kaliti (maxfiy) |
| `mime_type` | text | aniqlangan, mijozdan ishonilmaydi |
| `size_bytes` | bigint | |
| `status` | enum(`pending`,`scanning`,`ready`,`failed`) | quvur holati |
| `variants` | jsonb | eskizlar, transkodlar, to'lqin shakli, sahifa-previewi |
| `checksum` | text | dedup / yaxlitlik |
| `created_at`/`deleted_at` | timestamptz | |

`INDEX (org_id, owner_id)`, `INDEX (status) WHERE status <> 'ready'`.

---

## 6. Vazifalar va topshiriqlar

### `assignments`
`id`, `class_id` FK, `org_id`, `created_by` FK→users, `title`, `instructions` text, `due_at` timestamptz NULL, `points_possible` numeric, `status` enum(`draft`,`published`,`closed`), `settings` jsonb, vaqt belgilari. `INDEX (class_id, status)`, `INDEX (class_id, due_at)`.

### `assignment_attachments`
`assignment_id` FK, `media_id` FK, `position`. (O'qituvchi bergan materiallar.)

### `submissions`
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `assignment_id` | uuid FK → assignments(id) | |
| `student_id` | uuid FK → users(id) | |
| `body` | text NULL | matnli javob |
| `status` | enum(`draft`,`submitted`,`returned`,`resubmitted`) | |
| `submitted_at` | timestamptz NULL | kechikkan = assignment.due_at bilan solishtiring |
| `grade` | numeric NULL | |
| `feedback` | text NULL | |
| `graded_by` | uuid FK → users(id) NULL | |
| `graded_at` | timestamptz NULL | |
| vaqt belgilari | | |

`UNIQUE (assignment_id, student_id)` — har bir o'quvchi uchun bitta topshiriq yozuvi. `INDEX (assignment_id, status)`, `INDEX (student_id)`.

### `submission_attachments`
`submission_id` FK, `media_id` FK, `position`.

---

## 7. Testlar / baholashlar

Normallashtirilgan savol modeli — qayta ishlatiladigan, ko'p turli, avto-baholanadigan.

### `tests`
`id`, `class_id` FK, `org_id`, `created_by` FK, `title`, `instructions`, `time_limit_sec` int NULL, `available_from`/`available_to` timestamptz, `shuffle` bool, `status` enum(`draft`,`published`,`closed`), `points_possible` numeric, vaqt belgilari.

### `questions`
`id`, `test_id` FK ON DELETE CASCADE, `type` enum(`mcq`,`multi`,`true_false`,`short_answer`,`file_upload`), `prompt` text, `points` numeric, `position` int, `metadata` jsonb. `INDEX (test_id, position)`.

### `question_options` (tanlov turlari uchun)
`id`, `question_id` FK ON DELETE CASCADE, `label` text, `is_correct` boolean, `position` int. `INDEX (question_id)`. *(To'g'rilik bu yerda, faqat server tomonida — test paytida o'quvchiga hech qachon yuborilmaydi.)*

### `test_attempts`
`id`, `test_id` FK, `student_id` FK, `started_at`, `submitted_at` NULL, `status` enum(`in_progress`,`submitted`,`graded`,`expired`), `score` numeric NULL, `graded_by` NULL, vaqt belgilari. `UNIQUE (test_id, student_id)` (yoki `attempt_no` orqali N urinish). `INDEX (test_id, status)`.

### `attempt_answers`
`id`, `attempt_id` FK ON DELETE CASCADE, `question_id` FK, `selected_option_ids` uuid[] NULL, `answer_text` text NULL, `answer_media_id` FK NULL, `awarded_points` numeric NULL, `auto_graded` boolean. `UNIQUE (attempt_id, question_id)`.

---

## 8. Baholar jadvali (gradebook)

Alohida haqiqat-manbasi jadvali yo'q — baholar `submissions` va `test_attempts`'da yashaydi. Gradebook — har bir sinf uchun **materializatsiyalangan ko'rinish** (yoki keshlangan agregat), ularni birlashtirib, baholash hodisalarida yangilanadi. Bu baho ma'lumotini takrorlamasdan o'qishni tez saqlaydi.

`gradebook_class_view` (materializatsiyalangan): `class_id, student_id, item_type, item_id, points, points_possible, graded_at`. Domen hodisalari orqali yangilanadi; `INDEX (class_id, student_id)`.

---

## 9. Bildirishnomalar

### `notifications`
`id`, `user_id` FK, `org_id`, `type` enum(`message`,`announcement`,`assignment_due`,`graded`,`mention`,`system`), `payload` jsonb, `read_at` timestamptz NULL, `created_at`. `INDEX (user_id, created_at DESC) WHERE read_at IS NULL`. Yuqori hajmli → vaqt bo'yicha partitsiyalash yoki eski o'qilgan qatorlarni tozalash.

### `notification_prefs`
users bilan ~1:1 (yoki `class_members.notifications` orqali sinf bo'yicha): kanallar (push/email/in-app), jim soatlar, digest chastotasi.

### `devices`
Push tokenlar: `id`, `user_id` FK, `platform` enum(`ios`,`android`,`web`), `push_token`, `last_seen_at`. `UNIQUE (push_token)`.

---

## 10. AI

### `ai_conversations`
`id`, `org_id`, `class_id` FK NULL, `user_id` FK, `kind` enum(`tutor`,`assist`), `created_at`.

### `ai_messages`
`id`, `conversation_id` FK ON DELETE CASCADE, `role` enum(`user`,`assistant`,`system`), `content` text, `tokens_in`/`tokens_out` int, `model` text, `cost_usd` numeric, `created_at`. `INDEX (conversation_id, created_at)`.

### `ai_documents` / `ai_chunks` (RAG, bosqichma-bosqich)
Sinf materiallari → bo'laklar → asoslangan repetitorlik uchun embeddinglar. `ai_chunks(id, class_id, source_media_id, content, embedding vector(N))` — **pgvector** bilan `ivfflat`/`hnsw` indeksi. Qat'iy ravishda `class_id` bilan qamrovlangan.

### `moderation_events`
`id`, `org_id`, `class_id`, `subject_type` enum(`message`,`media`,`submission`), `subject_id`, `verdict` jsonb (toifalar, ballar), `action` enum(`none`,`flagged`,`blocked`), `reviewed_by` FK NULL, `created_at`. O'qituvchi xavfsizlik navbatini quvvatlaydi.

---

## 11. Audit

### `audit_log` (faqat-qo'shiladigan, o'zgartirilmas)
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK (v7) | |
| `org_id` | uuid | |
| `actor_id` | uuid FK → users(id) NULL | |
| `action` | text | masalan, `student.create`, `credential.reset`, `message.delete`, `role.change` |
| `target_type` / `target_id` | text / uuid | |
| `context` | jsonb | oldin/keyin, ip, ua |
| `created_at` | timestamptz | |

`UPDATE`/`DELETE` ruxsat etilmaydi (DB grantlari bilan ta'minlanadi). Oylik vaqt bo'yicha partitsiyalanadi, sovuq xotiraga arxivlanadi. `INDEX (org_id, created_at DESC)`, `INDEX (actor_id)`, `INDEX (target_type, target_id)`.

---

## 12. Obyektlar bog'lanishi (ER) qisqacha

```
organizations 1──* users
organizations 1──* classes
users 1──* auth_sessions
users *──* classes        (class_members orqali)             [maxfiylik chegarasi]
classes 1──* messages
messages 1──* message_attachments *──1 media
messages 1──* message_reactions *──1 users
messages 1──* pinned_messages (qism)
messages 0..1 reply_to ─ messages (o'ziga-havola)
classes 1──* assignments 1──* submissions *──1 users(student)
classes 1──* tests 1──* questions 1──* question_options
tests 1──* test_attempts 1──* attempt_answers *──1 questions
users 1──* notifications / devices
classes 1──* ai_conversations 1──* ai_messages
classes 1──* ai_chunks            (RAG, pgvector)
* ──* audit_log                   (har bir imtiyozli harakat)
```

---

## 13. Indekslash va unumdorlik tamoyillari

1. **Ustun uchun emas, kirish yo'li uchun indekslang.** Kompozit indekslar har bir so'rov filtrlaydigan qamrov kaliti (`class_id`, `org_id`) bilan boshlanadi.
2. Issiq filtrlangan so'rovlar uchun **qisman indekslar** (`WHERE deleted_at IS NULL`, `WHERE read_at IS NULL`, `WHERE status <> 'ready'`) — kichikroq, tezroq, arzonroq.
3. `(class_id, seq)` yoki `(class_id, created_at, id)` orqali **cursor paginatsiya** — masshtabda hech qachon `OFFSET` emas.
4. **UUID v7** PK B-tree'larini qo'shimchaga moslab saqlaydi (UUID v4'ning tasodifiy-insert sahifa bo'linishidan qochadi).
5. **JSONB faqat ochiq/o'zgaruvchan atributlar uchun** (settings, metadata, preview) — hech qachon join, cheklov yoki qator-indekslash kerak bo'lgan relyatsion ma'lumot uchun emas.
6. Yaxlitlik uchun hamma joyda **foreign key'lar + `ON DELETE` qoidalari**; bola ota-onasiz mavjud bo'lmasa kaskad (attachmentlar, optionlar, javoblar); akademik yozuvlar uchun `RESTRICT`/yumshoq-o'chirish.
7. Har bir issiq so'rovga ko'rib chiqishda **`EXPLAIN ANALYZE` byudjeti**; `messages`/`audit_log`'da to'liq-jadval skanlash yo'q.
8. PgBouncer (transaction rejimi) orqali **ulanish pooling** — 1 mln-foydalanuvchi konkurensiyasida muhim.

## 14. Masshtablash yo'l xaritasi (DB)

| Bosqich | Sabab | Harakat |
|---|---|---|
| 1 | ishga tushirish | bitta primary + 1 standby, PgBouncer |
| 2 | o'qishga og'ir yuk | **read replicalar**; tarix/qidiruv o'qishlarini replicalarga yo'naltirish |
| 3 | messages jadvali ulkan | **`messages` partitsiyalash** (`class_id` bo'yicha hash + vaqt sub-partitsiyalari); sovuq partitsiyalarni arxivlash |
| 4 | audit/bildirishnomalar ulkan | vaqt bo'yicha partitsiyalash + sovuq-xotira darajalash |
| 5 | bitta primary yozishda to'lgan | **`org_id` bo'yicha mantiqiy shardlash** (har bir jadval allaqachon tashkilot-qamrovida) → tenant marshrutlash qatlami |
| 6 | qidiruv yuki | FTS → **OpenSearch**'ga ko'chirish; embeddinglar pgvector yoki maxsus vektor DB'da qoladi |

**Har bir jadval `org_id` ga ega** va messaging yadrosi **birinchi kundan partitsiyaga tayyor** bo'lgani uchun bu bosqichlarning hech biri buzg'unchi migratsiya talab qilmaydi — ular operatsion qadamlar, qayta yozish emas.

## 15. Normalizatsiya pozitsiyasi

- Barcha tranzaksion ma'lumot uchun qat'iy **3NF**; join orqali olinadigan ma'lumotni saqlaydigan maydon yo'q.
- Yagona denormallashtirilgan qiymatlar — **aniq belgilangan unumdorlik keshlari** (`classes.last_message_seq`, `class_members.last_read_seq`, Redis reaksiya/o'qilmaganlar sonlari, materializatsiyalangan gradebook). Har biri manbadan qayta tiklanadi va hech qachon manba sifatida qabul qilinmaydi.
- Bu o'qish yo'lini tez saqlagan holda **ma'lumot takrorlanishi yo'qligini** kafolatlaydi.
