# 04 — UI/UX dizayn

> Dizayn mezoni: _Ushbu ekran 2026-yilda Telegram, Discord, Notion, Slack va Linear bilan raqobatlasha oladimi?_ Agar yo'q bo'lsa — qurishdan oldin qayta loyihalang. Portfolio darajasidagi sifat, ishlab chiqarishga tayyor.

Modern Edu **haqiqiy raqamli sinfxonaga** kirish hissini berishi kerak — sokin, premium, jonli — korporativ LMS paneli emas. Estetika **Telegram'ning chat qulayligi**, **Notion'ning tartibli osoyishtaligi**, **Linear'ning aniqligi**, **Discord'ning jonliligi** va **Apple'ning sayqalini** o'z iliq, ta'limga yo'naltirilgan o'ziga xosligi bilan birlashtiradi.

---

## 1. Dizayn falsafasi

- **Sokin diqqat.** Saxiy bo'sh joy, aniq ierarxiya, har bir ko'rinishda bitta asosiy harakat. Mahsulot kognitiv yukni kamaytirib, o'quvchini o'qishga jamlashi kerak.
- **Kontent birinchi.** Bezaklar orqaga chekinadi; xabarlar, materiallar va odamlar qahramon.
- **Yumshoq va seziladigan.** Yumaloq burchaklar, yumshoq qatlamli soyalar, nozik gradientlar, ozgina chuqurlik — hech qachon yassi-va-sovuq emas, hech qachon og'ir-skeuomorfik emas.
- **Jonli, lekin shovqinli emas.** Mikro-ta'sirlar mukofotlaydi va yo'naltiradi; animatsiya holat o'zgarishlarini aniqlaydi; hech narsa shunchaki ko'rsatish uchun harakatlanmaydi.
- **Do'stona, lekin bolalarcha emas.** Iliq va insoniy, lekin o'qituvchilar uchun ishonchli va kattaroq o'quvchilar uchun jiddiy.

---

## 2. Dizayn tokenlari (poydevor)

### Rang

- **Tizim:** komponentlarda xom hex emas, semantik tokenlar. `--bg`, `--surface`, `--surface-elevated`, `--text`, `--text-muted`, `--border`, `--primary`, `--primary-fg`, `--accent`, `--success`, `--warning`, `--danger`, `--info`.
- **Brend asosiy:** ishonchli indigo/binafsha (ta'lim + ishonch + premium), masalan, 50–950 darajalar. **Aksent:** ajratish va bayram uchun iliq ikkilamchi (amber/teal).
- **Yorug' va Qorong'i — teng huquqli** — qorong'i rejim avto-invert emas, loyihalashtiriladi. Qorong'i qatlamli neytral fonlar (`#0B0B0F`-ga yaqin) ishlatadi, ko'tarilgan yuzalar yorug'lashadi, sof oq matn sof qora ustida emas (yaltirashni kamaytiradi).
- **Kontrast:** barcha matn **WCAG AA (4.5:1)** ga javob beradi; interaktiv/katta matn imkon qadar AAA ga intiladi.

### Tipografiya

- **UI/asosiy:** har o'lchamda aniqlik uchun zamonaviy geometrik-gumanistik sans (masalan, Inter / Geist).
- **Sarlavhalar:** iliqlik uchun ozgina xarakterli hamroh; ixcham, ishonchli tracking.
- **Tip shkalasi:** modulli (masalan, 12 / 14 / 16 / 20 / 24 / 32 / 40), saxiy qator balandligi (1.5 asosiy), o'qish qulayligi uchun ~65 belgi maksimal qator uzunligi.
- **Raqamlar:** gradebook/hisoblagichlar uchun tabular raqamlar.

### Bo'sh joy, radius, balandlik

- **4px asosiy panjara**; bo'sh joy shkalasi 4→8→12→16→24→32→48→64.
- **Radius:** `sm 8` (inputlar/chiplar), `md 12` (kartalar/pufakchalar), `lg 16` (modal/panellar), `xl 24` (hero yuzalar), `full` (avatarlar/FAB).
- **Soyalar:** yumshoq, ko'p qatlamli, past shaffoflik — tinch kartalar uchun `shadow-sm`, hover/aktivda `shadow-md`, overlay uchun `shadow-lg`. Qorong'i rejim og'ir soyalar o'rniga chegaralar + nozik porlashga tayanadi.

### Shisha va gradient (kam ishlatiladi)

- **Glassmorphism** faqat suzuvchi/overlay bezaklarda (yuqori panellar, buyruq paletkasi, scroll'da suzuvchi kompozer) — orqa fon blur + shaffoflik, hech qachon zich o'qish kontentida emas.
- **Gradientlar** bo'sh holat illyustratsiyalari, onboarding, bayram lahzalari va brend belgisi uchun — nozik, baland emas.

### Ikonografiya va illyustratsiya

- **Ikonkalar:** bitta izchil to'plam (Lucide/Phosphor), 1.5–2px chiziq, optik tekislangan, panjarada o'lchamlangan.
- **Illyustratsiyalar:** bo'sh holatlar, onboarding va yutuqlar uchun kichik maxsus to'plam — do'stona, brendga mos, yengil (SVG/Lottie).

---

## 3. Layout tizimi

**Avval desktop, keyin planshet, keyin telefon** — bitta moslashuvchan komponentlar to'plami bilan.

- **Desktop (≥1024px):** uch zonali qobiq —
  1. **Chap panel** — ixcham navigatsiya (Sinfxona, Vazifalar, Testlar, A'zolar, AI-Repetitor) + sinf almashtirgich (faqat foydalanuvchi a'zo bo'lgan sinfxonalar; o'quvchilar odatda bittasini ko'radi).
  2. **Markaz** — faol yuza (chat — standart).
  3. **O'ng kontekst panel** — yig'iladigan: qadalgan xabarlar, kelgusi, sinf ma'lumoti, thread ko'rinishi.
- **Planshet (640–1024px):** panel ikonkalarga yig'iladi; o'ng panel overlay/sheet bo'ladi.
- **Telefon (<640px):** bitta ustun; pastki tab bar (Chat · Ish · Repetitor · Profil); o'ng panel va threadlar to'liq ekran sheet bo'ladi; asosiy harakatlar uchun **FAB**. **Bosh barmoq yetishi** va bir qo'lda foydalanish uchun loyihalashtirilgan.

Brekpointlar mobil ilova pariteti bilan tekislanadi, shu sababli React Native ekranlari veb axborot arxitekturasini aks ettiradi.

---

## 4. Asosiy ekranlar

### 4.1 Onboarding va kirish

- **Kirish:** yumshoq gradient maydonida bitta sokin, markazlashgan karta; login + parol; aniq xato holatlari; "birinchi kirish" oqimi o'quvchini do'stona, dalda beruvchi ohangda yangi parol o'rnatishga yo'naltiradi (kuch ko'rsatkichi bilan).
- **Birinchi ishga tushirish (o'quvchi):** qisqa, chiroyli 2–3 qadamli kutib olish — uning o'qituvchisi kim, bu sinfxona nima, chat/vazifalar qanday ishlaydi — brendga mos illyustratsiyalar bilan. O'tkazib yuborilsa bo'ladi, hech qachon bezovta qilmaydi.
- **O'qituvchi onboarding:** yo'naltirilgan "Birinchi sinfingizni yarating → o'quvchilar qo'shing → mana login varaqangiz" oqimi, qiymatga vaqtni kamaytiradi.

### 4.2 Sinfxona bosh sahifasi (yurak)

O'quvchi uchun standart tushish joyi. **Hech qachon bo'sh ko'rinmaydi.** Chat ustida quyidagilarni ko'rsatadigan sokin, skanlanadigan layout:

- **E'lon banneri** (agar faol o'qituvchi e'loni bo'lsa) — alohida, mayin, yopiladigan.
- **Qadalganlar tasmasi** — gorizontal scrollanadigan qadalgan xabar kartalari.
- **Tezkor nazar qatori** — _Kelgusi_ (keyingi dars/muddat), _Topshiriladigan vazifalar_, _So'nggi muhokamalar_, _Tezkor harakatlar_ (AI-repetitordan so'rash, ish topshirish, o'qituvchiga yozish).
- **Jonli chat** pastda/markazda asosiy uzluksiz yuza sifatida.

Bo'sh holatlar loyihalashtirilgan va iliq ("Hali vazifa yo'q — hammasi bajarilgan ✨"), hech qachon bo'sh emas.

### 4.3 Chat tajribasi (ajoyib bo'lishi shart)

Telegram darajasidagi qulaylik — mezon. Tafsilotlar:

- **Xabar pufakchalari:** yumaloq (`md`), o'z-va-boshqalar tekislash + rang bilan farqlanadi (qattiq emas), qulay padding, boshqalar uchun aniq jo'natuvchi nomi/avatari, bir jo'natuvchining ketma-ket xabarlari guruhlanadi (bitta avatar, zич joylashuv).
- **Sana ajratgichlari** yumshoq markazlashgan tabletkalar sifatida; **o'qilmagan ajratgich** ("Yangi xabarlar") chizig'i.
- **Ravon virtualizatsiyalangan scroll** (oynali ro'yxat) minglab xabarlar uchun jankisiz; o'qilmaganlar soni bilan **pastga scroll** FAB; tarix yuklanganda pozitsiyani saqlaydi.
- **Reaksiyalar:** bosish/hover → emoji panel; pufakcha ostida sonlar bilan reaksiya chiplari; qo'shishda yoqimli prujina animatsiyasi.
- **Javob:** surib-javob (mobil) / hover harakat (desktop); pufakcha ustida iqtibos previewi; iqtibosga bosish asliyatga scrolllaydi (yorug'lik puls bilan).
- **Tahrirlash/O'chirish:** "tahrirlandi" tegi bilan inline tahrirlash; o'chirish thread izchilligini saqlash uchun nozik tombstone ("xabar o'chirildi") qoldiradi.
- **Kompozer:** avtomatik o'sadigan input, biriktirish (rasm/fayl/PDF), emoji tanlagich, **ovozli xabar** (jonli to'lqin + surib-bekor qilish bilan bosib-ushlab turish, Telegram uslubida), Enter'da yuborish (Shift+Enter yangi qator). Yopishqoq; kontent ustida suzganda shishali bo'ladi.
- **Media:** lightbox preview + surib galereya bilan inline rasm eskizlari; **PDF** ilova ichidagi ko'ruvchini ochadi; **fayllar** ozoda kartalar (ikonka, nom, o'lcham, yuklab olish); **havola previewlari** server tomonida generatsiya qilingan boy kartalar (sarlavha, tavsif, rasm).
- **Ovozli xabarlar:** scrollanadigan ijro, tezlik nazorati va ijro-etilgan/etilmagan ko'rsatkichi bilan to'lqin shakli.
- **Holat:** yozmoqda indikatori (animatsiyalangan nuqtalar), onlayn/oxirgi-ko'rilgan presence nuqtalari, o'qilganlik ko'rsatkichlari (✓ / ✓✓), panelda sinf bo'yicha o'qilmaganlar soni.
- **Qidiruv:** ajratilgan natijalar va xabarga o'tish bilan sinf ichidagi xabar qidiruvi.
- **Slow-mode / ovozsiz** — o'qituvchi moderatsiyani yoqsa, mayin ko'rsatiladi.

### 4.4 Vazifalar va testlar

- **Vazifa kartasi/tafsiloti:** aniq sarlavha, muddat sanog'i, ilovalar, ko'rsatmalar; o'quvchi topshirish paneli (matn + fayl tashlash), avtosaqlash-qoralama va ishonchli "Topshirildi ✓" holati bilan; o'qituvchi baholash ko'rinishi inline fikr-mulohaza va ravon baho kiritish bilan.
- **Testlar:** chalg'ituvchidan xoli "fokus rejimi" — bitta yoki sahifalangan savollar, sokin taymer, avtosaqlash, aniq jarayon; ball va har bir savol fikr-mulohazasi bilan natija ekrani (oshkor qilish siyosatini hisobga olib).
- **Gradebook (o'qituvchi):** toza jadval, yopishqoq o'quvchi ustuni, rang-kodli holat, tez filtrlash; hech qachon og'ir korporativ panjara emas.

### 4.5 A'zolar va profillar

- Avatarlar, rollar, onlayn holat bilan ro'yxat; yengil profil tortmalari; aniq tasdiq dialoglari ortida o'qituvchi moderatsiya harakatlari (ovozsiz, chiqarish).

### 4.6 AI-Repetitor

- Alohida (lekin uyg'un) vizual o'ziga xoslikka ega chat-ko'rinishidagi maxsus panel — shunda o'quvchilar har doim repetitor bilan gaplashayotganini biladi, inson bilan emas. **Sinf materiallariga asoslanganini** ko'rsatadi (manbalar/iqtiboslar), javoblarni token-token oqimi bilan beradi va cheklangan paytda (masalan, faol baholanadigan test paytida) aniq ko'rsatadi.

### 4.7 Admin va o'qituvchi boshqaruvi

- Sokin boshqaruv yuzalari (o'qituvchi/sinf/o'quvchi yaratish, login eksporti) — og'ir panel emas, mahsuldorlik ilovasi aniqligi (Linear kabi). O'quvchilarni ommaviy yaratish yoqimli, kam-ishqalanishli oqimga ega bo'lib, oxirida chop etiladigan/QR login hujjati bilan.

---

## 5. Animatsiya va mikro-ta'sirlar

- **Tamoyillar:** animatsiya _holat va fazoviy munosabatlarni_ aniqlaydi; UI fikr-mulohazasi uchun tez (150–250ms), fazoviy o'tishlar uchun biroz uzunroq (300–400ms); tabiiy his uchun **prujina** fizikasi; hammasi `prefers-reduced-motion`ni hurmat qiladi.
- **Qayerda:** sahifa/marshrut o'tishlari, xabar yuborish/qabul qilish (nozik ko'tarilish + so'nish), reaksiya popi, optimistik holatlar joylashishi, tugma bosish chuqurligi, sheet/modal prujina-kirishi, ro'yxat qayta tartiblanishi, toast sirpanishlari, tab indikatori sirg'alishi.
- **Yuklash:** yakuniy layoutga mos **skelet ekranlar** (asosiy kontentda hech qachon bo'sh-spinnerlar emas); shimmer nozik saqlanadi; harakatlar darhol his etilishi uchun optimistik UI (xabarlar darhol paydo bo'ladi, tasdiqда moslashadi).
- **Yoqimli lahzalar:** birinchi topshiriq, testni tugatish yoki streakда mayin konfetti/nishon animatsiyasi — kam ishlatiladi, shunda maxsus bo'lib qoladi.
- **Unumdorlik chegarasi:** faqat `transform`/`opacity` animatsiya qiling (GPU-do'st); uzun ro'yxatlarni virtualizatsiya qiling; o'rta/past Android'da 60fps saqlang; zaif qurilmalarda mayin pasayting (kamroq blur, oddiy soyalar).

---

## 6. Qorong'i rejim

Bu invert emas, loyihalashtirilgan mavzu: qatlamli qorong'i neytrallar, balandlik bilan yorug'lashadigan ko'tarilgan yuzalar, yaltirashni kamaytirish uchun kamaytirilgan sof-oq matn (oqsimon), kontrast va jozibani saqlash uchun qorong'i fon uchun moslangan brend ranglari, soyalar nozik chegaralar va porlash bilan almashtiriladi. O'tkazgich ravon kross-fade bilan darhol; standart bo'yicha OS sozlamasini hurmat qiladi.

---

## 7. Kirish imkoniyatlari (boshidan, keyin emas)

- Butun ilova bo'ylab **WCAG 2.2 AA** maqsadi.
- To'liq **klaviatura navigatsiyasi**, ko'rinadigan fokus halqalari, mantiqiy tab tartibi, o'tkazib yuborish havolalari.
- **Skrин o'quvchi** qo'llab-quvvatlash: semantik HTML/ARIA, belgilangan boshqaruvlar, yangi xabarlar/toastlar uchun jonli mintaqalar, media uchun alt matn.
- **Kamaytirilgan animatsiya** va **yuqori kontrast** rejimlari hurmat qilinadi.
- **Teginish nishonlari** ≥ 44px; yetarli bo'sh joy; teginishda faqat-hover affordanslari yo'q.
- **Disleksiyaga do'st** opsiya (shrift/oraliq) va sozlanadigan matn o'lchami — ta'limda qimmatli.
- Rang hech qachon ma'noning yagona tashuvchisi emas (ikonka/yorliqlar holatga hamroh).

---

## 8. Komponentlar kutubxonasi (umumiy dizayn tizimi)

Veb (va mobilda aks ettirilgan) tomonidan ishlatiladigan token asosidagi, hujjatlangan komponentlar to'plami (`packages/ui`): Tugmalar, Inputlar, Select, Avatar, Badge, Chip, Card, Modal/Sheet, Tabs, Tooltip, Toast, Skeleton, MessageBubble, Composer, Reaksiya paneli, MediaPreview, FileCard, LinkPreviewCard, EmptyState, Banner, Dialog/Confirm, AvatarStack, Progress/Timer, DataTable (gradebook). Kirish imkoniyatli headless primitivlar asosida qurilgan, tokenlar orqali mavzulashtirilgan, vizual testlar bilan qoplangan. **Yagona haqiqat manbai → hamma joyda izchil, premium his va oson mavzulashtiriladigan.**

## 9. Sifat mezoni ro'yxati (har bir ekranga qo'llaniladi)

- [ ] Aniq yagona vizual ierarxiya va asosiy harakat
- [ ] Saxiy bo'sh joy; hech narsa siqilgan emas
- [ ] Mazmunli bo'sh, yuklash (skelet) va xato holatlari
- [ ] Ravon, maqsadli animatsiya; kamaytirilgan-animatsiya zaxirasi
- [ ] Yorug' va qorong'i rejimda chiroyli
- [ ] Klaviatura + skrин o'quvchiga kirish imkoniyatli; AA kontrast
- [ ] O'rta/past mobilда 60fps
- [ ] Planshet va telefon layoutlariga toza aks etadi
- [ ] 2026-da Telegram / Notion / Linear yonida turadimi
