# 06 — Ishlab chiqish qoidalari (doimiy)

Ushbu qoidalar Modern Edu'ning **har bir** kelajakdagi o'zgarishini boshqaradi. Ular barcha ishtirokchilar (inson va AI) uchun majburiy. Qaysidir qoida tezlik yoki qulaylik bilan ziddiyatga kelsa, **qoida g'olib chiqadi**. Ishonchsizlikda **shoshilinch yo'l o'rniga saqlanuvchanlik va xavfsizlikni tanlang**.

---

## A. Jarayon va qamrov intizomi

1. **Bir vaqtning o'zida bitta modul quring.** Hech qachon butun loyihani birdaniga generatsiya qilmang. Keyingisini boshlashdan oldin modulni yakunlang, ko'rib chiqing va barqarorlashtiring.
2. **Bosqich tartibini hurmat qiling.** Bog'liqliklari (`05-amalga-oshirish-rejasi.md` bo'yicha) tugallanmasdan va ko'rib chiqilmasdan bosqichni boshlamang. Qadamlarni o'tkazib yubormang.
3. **Tugallangan, ishlaydigan modullarni hech qachon qayta yozmang** yangi funksiya uchun. Buning o'rniga toza interfeyslar, hodisalar yoki kompozitsiya orqali kengaytiring.
4. **Mavjud funksiyalarni hech qachon buzmang.** Har bir o'zgarish oldingi funksionallikni yashil saqlaydi. Agar o'zgarish buzg'unchi tahrirni majburlasa — bu ataylab, ko'rib chiqilgan migratsiya, jim yon ta'sir emas.
5. **Keyingisiga o'tishdan oldin har bir modulni o'zingiz ko'rib chiqing** quyidagilarga qarshi: to'g'rilik, xavfsizlik, unumdorlik, masshtablanish, kirish imkoniyatlari. Birortasi muvaffaqiyatsiz bo'lsa — refaktor qiling. Faqat shundan keyin davom eting.
6. **Shoshilmang.** Yozishdan oldin o'ylang. Sekinroq, to'g'ri, saqlanuvchan yechim har doim tez, mo'rt yechimdan ustun.

## B. Arxitektura yaxlitligi

7. `02-tizim-arxitekturasi.md`'dagi **arxitekturani saqlang.** Aniq, hujjatlangan qarorsiz unga zid keladigan naqsh, servis yoki ma'lumot xotirasini kiritmang.
8. **Bounded-context chegaralarini hurmat qiling.** Modullar belgilangan servis interfeyslari va domen hodisalari orqali gaplashadi — hech qachon boshqa modulning ichki qismi yoki jadvallariga to'g'ridan-to'g'ri kirmaydi.
9. **Servislarni holatsiz saqlang.** Barcha umumiy holat Postgres/Redis/obyekt xotirada yashaydi, shunda har qanday instance gorizontal masshtablanadi.
10. **Har bir chegarani u mikroservisga aylanadigandek loyihalang.** Ajratishni bloklaydigan yashirin bog'lanish yo'q.
11. **Tiplar uchun yagona haqiqat manbai.** API/mijoz shartnomalari `packages/contracts` (Zod/DTO)'dan keladi. Veb, mobil va API bo'ylab tiplarni hech qachon qo'lda takrorlamang.

## C. Kod sifati

12. **Har doim ishlab chiqarish-sifatli kod yozing.** Tashlanadigan kod yo'q, main'ga jo'natilgan "vaqtinchalik" hакlar yo'q. TODO'lar kuzatiladi, kodда tashlab ketilmaydi.
13. **UI'ni biznes mantiqdan ajrating.** Komponentlar render qiladi; mantiq hooklar/servislar/domen qatlamlarида yashaydi. JSX yoki controllerда ko'milgan biznes qoidalari yo'q.
14. **Qayta ishlatiladigan komponentlar va utilitalar.** Qayta amalga oshirish o'rniga umumiy dizayn tizimi va umumiy paketlarni kompozitsiya qilishni afzal ko'ring. Erta haddan tashqari abstraksiyasiz DRY.
15. **Uchdan-uchgacha kuchli tiplash.** Asoslangan, izohlangan istisnosiz committed kodda `any` yo'q. Noqonuniy holatlarni ifodalab bo'lmaydigan qilish uchun tip tizimidan foydalaning.
16. CI'da lint/format orqali ta'minlangan **izchil uslub**; ko'rib chiqishlar bo'sh joy emas, mohiyatga jamlanadi.
17. **Atrofdagi kodga moslang.** Yangi kod atrofidagi kod kabi o'qiladi — nomlash, tuzilma, idiomalar, izoh zichligi.

## D. Ma'lumot va to'g'rilik

18. **Haqiqat-manbasi ma'lumotini takrorlamang.** Normallashtiring (3NF). Denormallashtirilgan qiymatlar — aniq belgilangan, qayta tiklanadigan keshlar.
19. **Referensial yaxlitlik ma'lumotlar bazasида ta'minlanadi** (FK'lar, cheklovlar, oqilona `ON DELETE`), faqat ilova kodida emas.
20. **Akademik va hisob yozuvlarini standart bo'yicha yumshoq-o'chiring.** Butunlay o'chirish — aniq, ruxsatli, jurnalga yoziladigan oqim.
21. **Migratsiyalar faqat-oldinga, versiyalangan, ko'rib chiqilgan** va nol-to'xtashli sxema o'zgarishlari uchun expand-then-contract ishlatadi. Jo'natilgan migratsiyani hech qachon tahrirlamang.
22. **Har bir imtiyozli/sezgir harakat o'zgartirilmas audit jurnaliga yoziladi.**

## E. Xavfsizlik va maxfiylik (murosa qilinmaydigan)

23. **Maxfiylik izolyatsiyasi muqaddas.** Foydalanuvchi hech qachon boshqa sinfxonani o'qiy, sanab chiqa yoki taxmin qila olmaydi. **Ma'lumotlar qatlamida** ta'minlang (a'zolik qamrovi / RLS), hech qachon UI'ga tayanmang.
24. **Har doim serverда avtorizatsiya qiling.** Har bir endpoint va soket hodisasi `can(actor, action, resource)`ни tekshiradi. Mijoz tomonidagi tekshiruvlar faqat UX uchun.
25. **Barcha inputни chetда validatsiya qiling** (Zod) va barcha mijoz/sinf/AI kontentini ishonchsiz deb hisoblang (XSS, SSRF, prompt-injeksiya himoyasi).
26. **Repo'da sirlar yo'q.** Secrets manager'dan foydalaning; har bir servis uchun eng kam imtiyozli credential.
27. **O'quvchi ma'lumotini minimallashtiring**; ma'lumot rezidentligi, rozilik, eksport va o'chirish majburiyatlarini hurmat qiling (GDPR/COPPA/FERPA). PII'ni loglamang; AI loglarida redaksiya qiling.
28. **Xavfsizlik ko'rib chiqish darvozasi:** auth, ruxsatlar, fayl ishlash va AI yuzalari merge'dan oldin aniq xavfsizlik ko'rib chiqishidan o'tadi.

## F. Unumdorlik va masshtablanish

29. **Har doim masshtablanishni saqlang.** Har bir dizayn qarorida 1 mln+ foydalanuvchini taxmin qiling: cursor paginatsiya (masshtabда hech qachon OFFSET emas), kirish yo'li uchun to'g'ri indekslar, N+1 so'rovlar yo'q, interaktiv bo'lmagan ishni asinxron yuklash.
30. **Hodisa asosida invalidatsiya bilan ataylab keshlang**; yomon so'rovga plastir sifatida hech qachon keshlamang.
31. **So'rov yo'lini nozik saqlang.** Og'ir/sekin ish idempotent, qayta urinadigan fon vazifalariga boradi.
32. **Faqat `transform`/`opacity` animatsiya qiling; uzun ro'yxatlarni virtualizatsiya qiling; o'rta/past mobilда 60fps'ga intiling.** Unumdorlik — funksiya.

## G. UX va kirish imkoniyatlari

33. **Dizayn mezonini saqlang:** har bir ekran 2026-da Telegram/Notion/Linear bilan ishonchli raqobatlashishi kerak. Aks holда — qurishdan oldin qayta loyihalang.
34. **Har doim bo'sh, yuklash (skelet) va xato holatlarini taqdim eting.** Bo'sh ekran yo'q, asosiy kontentда xom spinner yo'q.
35. **Kirish imkoniyatlari boshidan quriladi:** WCAG 2.2 AA, to'liq klaviatura navigatsiyasi, skрин o'quvchi qo'llab-quvvatlash, kamaytirilgan animatsiya, ≥44px teginish nishonlari, rang hech qachon yagona signal emas.
36. **Yorug' va qorong'i — teng.** Ikkalasini loyihalang va sinang.
37. **Standart bo'yicha moslashuvchan:** har bir yuza desktop → planshet → telefon ishlaydi va mobil ilovalarga toza aks etadi.

## H. Ishonchlilik va operatsiyalar

38. **Kuzatuvchanlik "tugadi"ning bir qismi:** trace ID'lar bilan strukturlangan loglar, metrikalar va xato kuzatuvi har bir funksiya bilan jo'naydi.
39. **Zaxiralar tiklash-sinaladi.** Sinalmagan zaxira hisobga olinmaydi. Falokat runbook'ini saqlang va RPO/RTO maqsadlariga erishing.
40. **Fon vazifalari idempotent, kechikish bilan qayta urinadi va ogohlantirish bilan dead-letter qilinadi.**
41. **Xavfli chiqarishlarni feature-flag qiling** (ayniqsa AI) — bosqichma-bosqich, qaytariladigan yetkazish uchun.

## I. Test va tekshirish

42. **Har bir modul testlar bilan jo'naydi**, xavfiga mos: mantiq uchun unit, API + DB uchun integratsiya, sinfxonalararo maxfiylik uchun izolyatsiya testlari, muhim oqimlar uchun e2e (kirish, xabar yuborish, vazifa topshirish).
43. **Merge uchun CI yashil bo'lishi shart:** typecheck, lint, testlar. Qizilда merge yo'q.
44. **Faqat kompilyatsiyani emas, xatti-harakatni tekshiring.** "Tugadi" deyishdan oldin funksiya haqiqatan ishlashini (va oldingilar hali ishlashini) tasdiqlang.

## J. Hujjatlashtirish va qarorlar

45. **Har doim muhim qarorlarni hujjatlang.** Muhim arxitektura yoki mahsulot tanlovlari qisqa ADR (Architecture Decision Record) oladi: kontekst, qaror va oqibatlar.
46. **Ushbu blueprint hujjatlarini dolzarb saqlang.** Haqiqat dizayndan chetga chiqsa — hujjatlarni xuddi shu o'zgarishда yangilang; hujjatlar — yetkazib berishning qismi, keyingi o'y emas.
47. **Kod bazasini topganingizdan ravshanroq qoldiring.** Nomlash, tuzilma va izohlar keyingi kishining mehnatини kamaytirishi kerak.

---

### Hal qiluvchi mezon
> Ikki yo'l mavjud bo'lsa va ishonchsiz bo'lsangiz — bir yildan keyin ham tajribali muhandis mamnuniyat bilan saqlaydigan yo'lni tanlang. **Saqlanuvchanlik, xavfsizlik va ravshanlik — shoshilinch yo'l o'rniga, har doim.**
