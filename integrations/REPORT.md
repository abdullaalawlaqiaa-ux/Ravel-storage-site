# تقرير ربط أدوات الإنتاج — Claude Code (19 نوفمبر 2026)

## الملخص

| الأداة | الحالة | طريقة الربط | الاختبار الفعلي |
|---|---|---|---|
| **Blender** | ✅ متصل ويعمل | Blender 4.0.2 مثبّت محلياً (apt) + سكربت Python بدون واجهة | رسم مشهد Cycles → `test-output/blender_still.png`، و48 إطاراً → `blender_orbit.mp4` (ثانيتان، عبر FFmpeg) خلال ~43 ثانية |
| **Krea AI** | ⛔ يحتاج تدخلك | API رسمي (`api.krea.ai`) | طُلب المفتاح ورُفض النموذج؛ المضيف محجوب بدون مفتاح |
| **Figma MCP** | ⛔ يحتاج تدخلك | موصل Figma الرسمي في claude.ai (OAuth) | خادم Figma في إضافة design فشل: `mcp.figma.com` محجوب + يتطلب تسجيل دخول |
| **Runway** | ⛔ يحتاج تدخلك | API رسمي (`api.dev.runwayml.com`) | طُلب المفتاح ورُفض النموذج |
| **Topaz Video AI** | ⛔ يحتاج تدخلك | Topaz Labs API (`api.topazlabs.com`) أو التطبيق على جهازك | طُلب المفتاح ورُفض النموذج؛ التطبيق المكتبي لا يعمل على Linux السحابي |

## الاتصالات الحالية (لم تُعدَّل — اختُبرت قراءةً فقط)

| الأداة | الحالة | الاختبار |
|---|---|---|
| Higgsfield (MCP) | ✅ | الرصيد 154.27، خطة Plus |
| Canva (MCP) | ✅ | قراءة آخر تصميم: "Mussafah Storage" |
| Remotion (Plugin + Skills) | ✅ | المهارات محمّلة؛ أحدث إصدار npm 4.0.545 |
| FFmpeg | ✅ | 6.1.1، رمّز فيديو اختبار Blender |
| ElevenLabs (مفتاح الشبكة) | ✅ لم يُمس | — |

## ما تم تنفيذه

1. فحص الموصلات والإضافات وإعدادات الشبكة لتجنب التكرار.
2. تثبيت Blender 4.0.2 (مجاني) واختبار رسم صورة وفيديو فعلياً.
3. إضافة سكربت إعداد للبيئة `ravel-storage-site` (بموافقتك) لتثبيت Blender تلقائياً في كل جلسة جديدة.
4. سكربت قابل لإعادة الاستخدام: `integrations/blender/render_test.py`
   - التشغيل: `blender -b -P integrations/blender/render_test.py -- <مجلد_الإخراج>`
   - ملاحظة: نسخة Ubuntu بدون OpenImageDenoise، لذا يُعطَّل `use_denoising`.

## ما يحتاج تدخلك

1. **Figma**: من claude.ai ← Settings ← Connectors ← أضف **Figma** وسجّل الدخول. بعدها يعمل في جلساتك مباشرة (كما يعمل Canva).
2. **Krea / Runway / Topaz**: أنشئ مفتاح API من لوحة كل خدمة (قد تتطلب رصيداً أو اشتراكاً مدفوعاً — لم يُشترَ شيء)، ثم قل لي "أضف المفتاح" وسأفتح لك النموذج الآمن مرة أخرى. لا تلصق المفتاح في المحادثة.
   - Runway: dev.runwayml.com (رصيد API منفصل عن اشتراك التطبيق)
   - Krea: krea.ai ← API
   - Topaz: لوحة مطوري Topaz Labs
3. **Topaz Video AI المكتبي** (بديل): إن كان مثبّتاً على جهازك، يمكن تشغيله من جلسة Claude Code على جهازك نفسه أو عبر Remote Control.
4. **بدائل جاهزة الآن بدون مفاتيح**: Higgsfield يوفّر `upscale_video` و`upscale_image` (بديل لـ Topaz)، و`generate_video` (بديل لـ Runway/Krea)، و`scene_builder_3d` مع تصدير ملفات `.blend` تُفتح في Blender.
