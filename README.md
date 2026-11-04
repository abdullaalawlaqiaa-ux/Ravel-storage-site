# Ravel Storage – موقع رافيل للتخزين

موقع تعريفي (صفحة واحدة) باللغة العربية لشركة **Ravel Storage** لخدمات التخزين.

## المحتوى
- `index.html` – الصفحة الرئيسية (الخدمات، الأحجام والأسعار، طريقة العمل، الأسئلة الشائعة، نموذج الحجز)
- `assets/styles.css` – التنسيقات (متجاوب مع الجوال، اتجاه RTL)
- `assets/script.js` – القائمة، نموذج الحجز عبر واتساب، وحركات الظهور

## التشغيل محلياً
افتح `index.html` مباشرة في المتصفح، أو:
```bash
python3 -m http.server 8000
```

## التخصيص
- رقم واتساب: عدّل `WHATSAPP_NUMBER` في `assets/script.js` والرابط في `index.html`.
- الهاتف والبريد والموقع: قسم `#contact` في `index.html`.
- الأسعار والأحجام: قسم `#sizes`.
- الألوان: متغيرات `:root` في أعلى `styles.css`.

## النشر
يمكن نشره مجاناً عبر GitHub Pages: Settings → Pages → Branch: `main` / root.
