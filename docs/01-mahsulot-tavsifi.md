# 01 — Mahsulot tavsifi

## 1. Modern Edu nima

Modern Edu — bu **maxfiy, sun'iy intellekt asosidagi sinfxona platformasi**. Asosiy tasavvur — *zamonaviy ta'lim uchun mo'ljallangan Telegram guruhi*, lekin mahsulot messenjer yoki ijtimoiy tarmoqqa qaraganda ataylab torroq va xavfsizroq:

- **Tabiatan maxfiy.** Ommaviy ro'yxatdan o'tish yo'q, kashf qilish (discovery) yo'q, do'stlar grafi yo'q, sinfxonalar o'rtasida ko'rinish yo'q.
- **Yuqoridan pastga taqdim etish.** Hisoblar faqat vakolatga ega kishi ularni yaratgani uchun mavjud bo'ladi.
- **Sinfxona markaziy obyekt.** Foydalanuvchining "lentasi" emas, balki sinfxona — uy obyekti. O'quvchi ilovani ochadi va *allaqachon o'z sinfxonasida* bo'ladi.

## 2. Rollar

| Rol | Kim yaratadi | Qamrovi | Asosiy vakolatlar |
|-----|--------------|---------|-------------------|
| **Admin** | Tizim / boshqa Admin (dastlabki o'rnatish) | Butun tashkilot (tenant) | O'qituvchilarni yaratish va boshqarish, tashkilot sozlamalari, billing, audit, global moderatsiya, AI siyosati |
| **O'qituvchi** | Admin | O'zi yaratgan/dars beradigan bir yoki bir nechta Sinf | Sinflar yaratish, O'quvchi hisoblari yaratish, parollarni belgilash, post yozish, moderatsiya, vazifa/test yaratish, qadash (pin), e'lon qilish |
| **O'quvchi** | O'qituvchi | Faqat o'zi a'zo bo'lgan Sinf(lar) | O'z sinfxonasida o'qish/yozish, sinfdoshlar bilan yozishish (siyosatga qarab), vazifa/test topshirish, reaksiya qo'yish, AI-repetitordan foydalanish |

### Dastlabki shartga yaxshilanish — to'rtinchi ixtiyoriy rol
Dastlabki shartda Admin / O'qituvchi / O'quvchi rollari ko'rsatilgan. 1 mln foydalanuvchiga yo'l olgan mahsulot uchun men ma'lumotlar modelida boshidanoq ikkita qo'shimcha rolni zaxiraga olib qo'yishni tavsiya qilaman (v1 interfeysida yashirin bo'lsa ham):

- **Tashkilot egasi / Super Admin** — bitta tashkilotga (maktab yoki o'quv markaziga) egalik qiladi, bir nechta Adminlarni va billingni boshqaradi. Bu Modern Edu'ni bir tenantli o'rniga **ko'p tenantli (multi-tenant)** qiladi — ko'plab maktablarga qayta deploy qilmasdan sotish uchun zarur.
- **Yordamchi / Ko-o'qituvchi** — O'qituvchi qamrovidagi yordamchi: moderatsiya huquqlariga ega, lekin hisob yaratish huquqiga ega emas. Real sinflarda keng tarqalgan (assistentlar).

Bular qattiq `if` tekshiruvlari emas, balki **rol + aniq ruxsatlar (permissions)** sifatida modellashtiriladi. Shu sababli v1'da Admin/O'qituvchi/O'quvchini chiqarib, qolganlarini keyinroq hech qanday sxema migratsiyasisiz yoqishimiz mumkin. Qarang: `02-tizim-arxitekturasi.md` §Ruxsatlar.

## 3. Hisob va sinfxona hayotiy sikli

```
Admin (taqdim etilgan)
  └── O'qituvchi hisobini yaratadi  ──► O'qituvchi login + vaqtinchalik parol oladi
        └── Sinf yaratadi (masalan, "9-B sinf Matematika")
              └── O'quvchi hisoblarini yaratadi ──► o'quvchiga login + parol beradi
                    └── O'quvchi tizimga kiradi
                          └── TO'G'RIDAN-TO'G'RI o'z sinfxonasiga tushadi
                                └── boshqa hech qanday sinfxonani ko'rmaydi
```

### Ish jarayoniga yaxshilanishlar
1. **Majburiy parol almashtirish.** O'qituvchi bergan parollar *vaqtinchalik*. Birinchi kirishda o'quvchi yangi parol o'rnatishi shart. O'qituvchi yakuniy parolni bilishi shart emas. (Xavfsizlik + maxfiylik.)
2. **Login-parol hujjati.** O'qituvchi o'quvchilar yaratganda, tizim chop etiladigan/eksport qilinadigan login varaqasini (login + bir martalik vaqtinchalik parol + ixtiyoriy QR havola) yaratadi — real sinfda tarqatish amaliy bo'lishi uchun.
3. **Egalik emas, a'zolik.** O'quvchi hisobi — bu *shaxs*; *a'zolik* (membership) esa uni sinf bilan bog'laydi. Bu o'quvchiga bir nechta sinfga (masalan, turli o'qituvchilar bilan Matematika va Fizika) takroriy hisobsiz a'zo bo'lish imkonini beradi — agar a'zolik foydalanuvchi qatoriga "qotirib" qo'yilsa, bu imkonsiz bo'lardi.
4. **Taklif/QR orqali kirish (ixtiyoriy, baribir maxfiy).** O'qituvchi muayyan sinf uchun bir martalik, muddati o'tadigan havola/QR yaratishi mumkin. Bu ixtiyoriy sinflarga o'zini o'zi ro'yxatdan o'tkazishga ruxsat bermaydi — faqat oldindan yaratilgan "o'rin"ni faollashtiradi. Maxfiylikni saqlagan holda telefonда parol terish ovorachiligini olib tashlaydi.
5. **Yumshoq arxivlash, hech qachon butunlay o'chirmaslik.** Sinfni bitirish, o'quvchini chiqarish yoki o'quv yilini yakunlash — ma'lumotni yo'q qilmaydi, balki *arxivlaydi*, akademik yozuv va auditni saqlaydi. Butunlay o'chirish — bu aniq, ruxsatga ega, jurnaliga yoziladigan harakat (GDPR/o'chirilish huquqi yo'li).

## 4. Sinfxona ichida (funksiyalar to'plami)

**Realtime muloqot**
- Guruh chat (Telegram darajasida): guruhlash, reaksiyalar, javoblar, tahrirlash, o'chirish, yozmoqda indikatori, presence, o'qilganlik holati, o'qilmaganlar hisoblagichi, sana ajratgichlari, qidiruv.
- Ovozli xabarlar, rasmlar (ko'rib chiqish bilan), fayllar, PDF (ilova ichida ko'ruvchi), havola previewlari.
- Qadalgan (pin) xabarlar va e'lonlar (e'lon — bu alohida, faqat-o'qituvchi, yuqori muhimlikdagi xabar turi).
- Vazifa/e'lonlarga thread (mavzu) bo'yicha muhokama (asosiy chatni sokin saqlaydi).

**Akademik**
- Vazifalar: topshiriq + ilovalar + muddat → o'quvchi topshiriqlari (fayl/matn) → o'qituvchi baholashi + fikr-mulohaza.
- Testlar/Sinovlar: savollar bazasi, bir nechta tur (MCQ, to'g'ri/noto'g'ri, qisqa javob, fayl yuklash), vaqt cheklovi, imkon qadar avto-baholash, erkin matn uchun AI-yordamli baholash.
- Har bir sinf uchun baholar jadvali (gradebook).

**Moderatsiya va xavfsizlik**
- O'qituvchilar o'chirishi/ovozsiz qilishi/qadashi mumkin, o'quvchilar o'rtasidagi shaxsiy yozishmalarni sinf siyosatiga ko'ra cheklashi, AI-yordamli xavfsizlik navbatini ko'rib chiqishi mumkin.

**AI (bosqichma-bosqich — §5'ga qarang)**
- Sinf qamrovidagi AI-Repetitor (sinf materiallariga asoslangan javoblar).
- O'qituvchiga yordam (dars/test generatsiyasi, baholashda yordam, qisqartirish).
- Fon rejimida moderatsiya/xavfsizlik (toksiklik, shaxsiy ma'lumot, spam, o'z-o'ziga zarar signallari → inson navbati).

## 5. AI strategiyasi (bosqichma-bosqich)

AI — birinchi darajali quyi tizim, lekin xavfsiz bosqichlarda joriy etiladi. U **provayder-abstraksiya qatlami** ortida joylashadi, shu sababli funksiya kodiga tegmasdan boshqariladigan Claude modellari va o'z serveringdagi/ochiq modellar o'rtasida almashishimiz mumkin.

- **A bosqich — Moderatsiya va xavfsizlik (ko'rinmas).** Eng kam xavf, eng yuqori ishonch foydasi. Xabarlar/yuklamalar ustida server tomonida ishlaydi.
- **B bosqich — O'qituvchiga yordam.** O'qituvchilar ixtiyoriy yoqadi; natija o'quvchilar ko'rishidan oldin har doim o'qituvchi tomonidan ko'rib chiqiladi.
- **C bosqich — O'quvchi AI-Repetitori.** Sinf qamrovidagi, o'sha sinf materiallariga asoslangan (retrieval-grounded), himoyalangan (faol baholanadigan test paytida javob bermaslik, yoshga mos ohang, o'qituvchi sozlaydigan qat'iylik).

Har bir AI chaqiruvi jurnalga yoziladi (so'rov, model, kechikish, narx, siyosat qarorlari) — narxni nazorat qilish, audit va xavfsizlikni ko'rib chiqish uchun.

## 6. Murosa qilinmaydigan mahsulot tamoyillari

1. **Maxfiylik izolyatsiyasi muqaddas.** O'quvchi *hech qachon* boshqa sinfxonani o'qiy olmasligi, sanab chiqa olmasligi yoki uning mavjudligini taxmin qila olmasligi kerak. Bu faqat interfeysda emas, balki ma'lumotlar qatlamida (a'zolik bo'yicha qator-cheklash orqali) ta'minlanadi.
2. **Shovqin emas, osoyishtalik.** Bu — o'quv maydoni. Cheksiz lenta yo'q, bo'sh metrikalar yo'q, qaram qiladigan qora naqshlar yo'q. Bildirishnomalar maqsadli.
3. **Moslashuvchan va mobilga tayyor.** Har bir ekran avval desktop uchun loyihalanadi, lekin planshet va telefonga muammosiz moslashishi, API/realtime shartnomalari esa birinchi kundan mobil ilovalar uchun ishlatilishi mumkin bo'lishi shart.
4. **Premium his.** Apple darajasidagi sayqal, Telegram darajasidagi chat ravonligi, Notion/Linear darajasidagi tuzilma. (Qarang: `04-ui-ux-dizayn.md`.)
5. **Auditga tayyor.** Har bir imtiyozli harakat (hisob yaratish, parolni tiklash, o'chirish, moderatsiya, rol o'zgartirish) o'zgartirilmas audit jurnaliga yoziladi.

## 7. v1 uchun aniq qamrovdan tashqarida

- Ommaviy/anonim kirish, ochiq jamoalar, do'stlar grafi.
- Video-konferensiya/jonli darslar (kelajak moduli sifatida zaxiralangan; arxitektura media-server integratsiyasi nuqtasi orqali joy qoldiradi).
- To'lovlar/marketplace (tashkilot billingi modellashtirilgan, lekin o'quvchiga yo'naltirilgan tijorat yo'q).
- Tashkilotlar o'rtasida federatsiya.
