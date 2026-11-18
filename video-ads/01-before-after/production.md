# إعلان رافل ١: قبل وبعد

| البند | القيمة |
|---|---|
| المدة | 7.0 ثوانٍ، 9:16، بمقاس 1080×1920 و30 إطاراً في الثانية، ويعيد نفسه بدون قطع ظاهر |
| اللغة | عربي (نص على الشاشة فقط، بدون تعليق صوتي) |
| الفكرة في جملة | أغراضك الزايدة تطلع من بيتك، فترجع لك المساحة والراحة |
| النص | «رد الراحة لبيتك.» |
| المكان | شقة سكنية في أبوظبي (مشهد تمثيلي). المستودع لا يظهر في هذا الإعلان |
| الأسعار | لا تُذكر |

---

## ١. لماذا غيّرت طريقة التنفيذ (والفكرة باقية كما هي)

الفكرة والتوقيت وحركة الكاميرا من اليسار لليمين والنص والنهاية التي تعيد نفسها كلها كما كتبتها. الذي تغيّر هو **طريقة الإنتاج**، لثلاثة أسباب:

1. **لو طلبنا من نموذج الفيديو أن يُخفي الأغراض أثناء حركة الكاميرا في لقطة واحدة**، سيغيّر الجدران والنوافذ والأثاث الباقي غالباً. هذا بالضبط ما يمنعه البرومبت السلبي في طلبك. لذلك نصنع صورتين ثابتتين متطابقتين للغرفة (قبل وبعد)، والصورة الثانية **تعديل على الأولى** وليست توليداً جديداً. بهذا تبقى الغرفة نفسها بكل تفاصيلها.
2. **حركة الكاميرا الجانبية تُعمل في المونتاج** على صورة عريضة بدقة 4K، فتكون متطابقة 100٪ بين «قبل» و«بعد». النموذج لا يقدر يكرر نفس الحركة مرتين بالضبط.
3. **اختفاء الأغراض يتم واحداً واحداً على صوت النقرات.** نحسب قناع كل غرض بالكود من الفرق بين الصورتين، فيختفي بمسح سريع (3 إطارات) لحظة مرور الكاميرا عليه. هذا ينفّذ «المسح المخفي» ويطابق النقرات المطلوبة في الصوت.

**تعديل صغير على مط كلمة «الراحة»:** المط الأفقي بتكبير عرض الكلمة يشوّه الحروف العربية. الأصح طباعياً هو **المط بالكشيدة**: «الراحة» ← «الراحـــــة»، مع تكبير أفقي خفيف لا يزيد عن 6٪. التأثير نفسه، لكن الخط يبقى سليماً.

---

## ٢. الأصول المطلوبة

| # | الأصل | المصدر | الحالة |
|---|---|---|---|
| A1 | الصورة «قبل»: الغرفة مزدحمة والشخص واقف | Higgsfield صورة، 16:9، ثم رفع لـ 4K | يُولَّد |
| A2 | الصورة «بعد»: نفس A1 بعد حذف الزوائد فقط، والشخص بنفس الوقفة | Higgsfield **تعديل** على A1 | يُولَّد |
| V1 | فيديو «قبل»: 3 ث، إطار البداية A1 وإطار النهاية A1 | Higgsfield فيديو | يُولَّد |
| V2 | فيديو «بعد»: 5 ث، يبدأ من A2، الشخص يرتاح ويجلس | Higgsfield فيديو | يُولَّد |
| L | الشعار الرسمي | منك | ⚠️ الملف الذي وصلني دقته منخفضة (الشعار نفسه 200×137 بكسل). أحتاج نسخة SVG أو PNG بعرض 1500 بكسل أو أكثر |
| F | الخط العربي | Tajawal (نفس خط الموقع) أو خط الهوية إن وُجد | للتأكيد |
| S | المؤثرات والموسيقى | مكتبة مرخّصة أو Higgsfield صوت | يُجهَّز |

**ألوان الهوية:**

| اللون | الكود |
|---|---|
| الكحلي، مأخوذ من ملف الشعار | `#152249` |
| الأبيض | `#FFFFFF` |
| الرمادي الفاتح | `#E9ECEF` (تقريبي، يُعتمد من دليل الهوية إن وُجد) |

---

## ٣. تصميم الغرفة (ثابت في كل الأصول)

- **الشقة:** حديثة في أبوظبي. جدران بلون أبيض دافئ، وأرضية بورسلين فاتحة كبيرة.
- **النافذة:** كبيرة على **يسار الكادر** عليها ستارة شيفون بيضاء، والضوء يدخل منها من اليسار طوال الفيديو.
- **الجدار الأيسر والأيمن:** على حافتي الصورة العريضة جدار أبيض قريب من الكاميرا. يغطي الكادر بالكامل في أول ربع ثانية وآخر ثانية، وهذا ما يخفي نقطة الإعادة.
- **الأثاث الذي يبقى:** كنبة ثلاثية رمادية فاتحة عليها مخدتان كحليتان (لمسة الهوية)، طاولة قهوة خشب فاتح، سجادة بيج، نبتة واحدة، وتلفزيون على الجدار.
- **الزوائد التي تختفي (7 فقط، ومرتبة من اليسار لليمين):**
  1. كرسي إضافي مكدّس.
  2. 3 كراتين فوق بعض.
  3. دراجة رياضية ثابتة.
  4. كرتونان مفتوحان.
  5. رف ملابس عليه أكياس.
  6. حقيبتا سفر كبيرتان.
  7. مكيف متنقل.
- **الشخص:** رجل خليجي في أوائل الثلاثينات، لحية مشذبة، كندورة بيضاء بدون غترة (لباس البيت الطبيعي). واقف عند حوالي **62٪ من عرض الكادر النهائي** في بداية الفيديو، ويداه فاضيتان طوال الوقت.

---

## ٤. الجدول الزمني ثانية بثانية

«الكادر» = نافذة القص 9:16 داخل الصورة العريضة (4K: 3840×2160). عرض النافذة 1215 بكسل.

| الوقت | الصورة | الكاميرا (المونتاج) | المؤثرات | الصوت |
|---|---|---|---|---|
| **0.00–0.20** | الجدار الأبيض الأيسر يخرج من الكادر جهة اليسار ويكشف الغرفة المزدحمة | استمرار حركة الإعادة: النافذة تنتقل من x=0 إلى x=180 مع تباطؤ في آخرها | تمويه حركة خفيف على الجدار فقط | ذيل صوت «الووش» من نهاية الفيديو (لربط الإعادة) |
| **0.20–1.00** | **الجذب الأول:** غرفة مزدحمة. الرجل ينظر حوله، يزفر، ويده على مؤخرة رقبته ثم ينزلها | شبه ثابتة: انجراف بطيء لليمين (+40 بكسل) | V1 داخل قناع الشخص فوق A1 | نغمة موسيقية خافتة، وتنهيدة خفيفة |
| **1.00–3.00** | الكاميرا تمر من اليسار لليمين، وكل غرض زائد يختفي عند وصوله لـ 40٪ من عرض الكادر | تتبع جانبي سريع وناعم: x من 220 إلى 2100، بتسارع وتباطؤ (ease-in-out)، وبدون اهتزاز | 7 أقنعة، كل غرض يُمسح بـ 3 إطارات بحافة ناعمة 24 بكسل باتجاه الحركة. الظلال تختفي مع الغرض | 7 نقرات منتظمة (كل ~0.27 ث)، وووش يتصاعد تحتها |
| (تفصيل) | ترتيب الاختفاء تقريباً: 1.10، 1.37، 1.64، 1.91، 2.18، 2.45، 2.72 ث | | الشخص يبقى من V1 (ثابت) إلى 2.80 | |
| **2.80–3.00** | الغرفة كلها «بعد»، والرجل بنفس الوقفة | الكاميرا تتباطأ وتستقر | مزج 4 إطارات من V1 إلى V2 داخل قناع الشخص فقط | الووش يصل لقمته ويسكن |
| **3.00–5.00** | الغرفة فسيحة. الرجل يلتفت حوله، تظهر ابتسامة ارتياح، ثم يجلس على الكنبة ويسند ظهره | ثابتة تقريباً مع دفع بطيء جداً للأمام (تكبير 100٪ إلى 104٪) | V2 كاملة | الموسيقى تنفتح بخفة، وصوت جلوس ناعم على الكنبة عند 4.0 ث |
| **5.00–6.00** | النص «رد الراحة لبيتك.» يظهر في الثلث العلوي من المنطقة الآمنة | يستمر الدفع البطيء | ظهور النص: شفافية وحركة لأعلى 20 بكسل خلال 8 إطارات. عند 5.40 ث: «الراحة» تمتد بالكشيدة خلال 10 إطارات ثم ترتد قليلاً | **نغمة ناعمة** (جرس خفيف) عند 5.40 مع بداية المط |
| **5.30–6.60** | الشعار الرسمي يظهر تحت النص | | ظهور بالشفافية خلال 8 إطارات، وبدون أي تعديل على الشعار | |
| **6.00–7.00** | النص والشعار يختفيان (6.60–6.80). الكاميرا تكمل لليمين حتى يملأ الجدار الأبيض الأيمن الكادر بالكامل عند 7.00 | x من 2100 إلى 2625 (نهاية الصورة) بتسارع، وتمويه حركة | آخر إطار = جدار أبيض بالكامل، ويطابق لون الجدار في الإطار 0 | ووش يتصاعد قصير، وذيله يكمل في بداية الإعادة |

**شرط الإعادة:** آخر إطار (جدار أيمن أبيض) وأول إطار (جدار أيسر أبيض) يُطابقان لوناً بالكود. الفرق المسموح ΔE < 2.

---

## ٥. برومبتات Higgsfield

> البرومبتات بالإنجليزية لأن النماذج تفهمها أدق. النماذج المقترحة تُؤكَّد عند عرض السعر.

### A1: الصورة «قبل» (Nano Banana Pro أو GPT Image 2.6، بنسبة 16:9 وأعلى دقة متاحة)

```
Photorealistic interior photograph, wide 16:9 plate, shot at eye level (150 cm) with a 24mm lens, straight-on, verticals perfectly vertical, deep focus.
A modern apartment living room in Abu Dhabi. Warm-white painted walls, large light-beige porcelain floor tiles, a beige area rug.
On the LEFT of the room: a large floor-to-ceiling window with sheer white chiffon curtains; soft natural daylight enters from the left, late morning, gentle soft shadows falling to the right.
At the far LEFT edge and far RIGHT edge of the image: a plain warm-white wall section very close to the camera, slightly out of focus, each filling about 15% of the image width.
Permanent furniture: a light-gray three-seat sofa against the back wall with two dark navy (#152249) cushions, a light oak coffee table, one tall indoor plant, a wall-mounted TV.
Clutter crowding the room, arranged left to right: an extra stacked dining chair, three stacked cardboard boxes, a stationary exercise bike, two open cardboard boxes, a clothing rack with garment bags, two large suitcases, a portable air conditioner unit.
A Gulf Arab man in his early 30s, neatly trimmed beard, plain white kandura, no headwear, barefoot, standing between the sofa and the coffee table at about 62% of the image width, facing slightly toward camera, mildly overwhelmed expression, arms relaxed at his sides, hands empty.
Natural realistic skin, real fabric texture, accurate contact shadows under every object. Clean, calm, premium real-estate photography look. No text, no logos, no signs.
```

### A2: الصورة «بعد» (تعديل على A1 بنفس النموذج، والمدخل A1)

```
Edit this exact photograph. Remove ONLY these items and their shadows: the extra stacked dining chair, the three stacked cardboard boxes, the stationary exercise bike, the two open cardboard boxes, the clothing rack with garment bags, the two large suitcases, the portable air conditioner.
Fill the revealed areas with the same floor tiles, rug and wall that continue naturally behind them.
Keep everything else pixel-identical: camera position, lens, framing, walls, window, curtains, light direction and color, sofa, navy cushions, coffee table, plant, TV, rug, and the man's exact pose, face, kandura and expression.
The room now looks spacious, clean and tidy.
```

**فحص بالكود بعد A2:** نطرح A1 من A2. كل ما خارج الأغراض السبعة يجب أن يكون فرقه شبه صفر. إذا تغيّر شيء آخر (الشخص، الجدار، الإضاءة)، نلصق المناطق المعدّلة فقط فوق A1 بالكود. وهكذا تخرج الأقنعة السبعة جاهزة.

### V1: فيديو «قبل» (3 ث، إطار البداية A1 وإطار النهاية A1، 16:9)

```
[Art style] Photorealistic interior footage, identical in style, color and lighting to the first and last frames throughout.
[Camera] The whole clip is 3 seconds, wide shot, eye level, 24mm, locked-off tripod: no push, no pull, no pan, no cuts.
[Composition and color] Exactly as the first frame: warm-white walls, daylight from the window on the left, the man standing at 62% of frame width between the sofa and the coffee table, clutter unchanged.
[Character] Gulf Arab man, early 30s, trimmed beard, plain white kandura, no headwear, hands empty.
[Second by second]
0–0.2s: The picture is completely still, identical to the first frame.
0.2–1.2s: He slowly looks from left to right across the cluttered room and exhales; his shoulders drop slightly.
1.2–2.0s: He raises his right hand to the back of his neck, then lowers it back to his side.
2.0–2.7s: He settles back into his original standing pose, facing slightly toward camera.
Last 0.3s: He is completely still; the picture matches the last frame exactly.
[Sound] Only a soft exhale. The man does not speak.
[Constraints] Only the man moves. Every piece of furniture, box and object stays exactly in place. One continuous take, clean picture, no text, subtitles or watermarks.
```

### V2: فيديو «بعد» (5 ث، إطار البداية A2، 16:9)

```
[Art style] Photorealistic interior footage, identical in style, color and lighting to the first frame throughout.
[Camera] The whole clip is 5 seconds, wide shot, eye level, 24mm, locked-off tripod: no push, no pull, no pan, no cuts.
[Composition and color] Exactly as the first frame: spacious tidy living room, daylight from the window on the left, light-gray sofa with two navy cushions, the man standing at 62% of frame width.
[Character] Gulf Arab man, early 30s, trimmed beard, plain white kandura, no headwear, hands empty.
[Second by second]
0–0.6s: The picture is completely still, identical to the first frame.
0.6–1.6s: He looks around the open space, his face softens into a calm, relieved smile.
1.6–3.0s: He takes one step back and sits down naturally on the middle of the sofa.
3.0–4.7s: He leans back into the sofa and rests his arm along the backrest, relaxed, breathing calmly.
Last 0.3s: Completely still.
[Sound] Only the soft sound of sitting on fabric cushions. The man does not speak.
[Constraints] Only the man moves. The room, furniture and light stay identical; nothing appears or disappears. Face and body proportions never change. One continuous take, clean picture, no text, subtitles or watermarks.
```

### البرومبت السلبي (لكل الأصول)

```
changing room architecture, moving or disappearing walls, inconsistent windows, changing light direction, flickering light, furniture deformation, warped straight lines, extra or random objects, objects appearing from nowhere, duplicated people, extra fingers, distorted hands, unnatural body movement, exaggerated acting, mouth talking, camera shake, handheld wobble, cuts, text, letters, subtitles, logos, watermarks, signage, unrealistic or missing shadows, floating objects, plastic skin, oversaturated colors, fisheye distortion
```

---

## ٦. المونتاج (ffmpeg + Python، أنا أنفّذه)

1. **التجهيز:** نرفع A1 وA2 لـ 3840×2160، ونرفع V1 وV2 لـ 4K بدقة متطابقة، ونطابق ألوان V1 وV2 مع A1 وA2.
2. **الطبقات:**
   - **الخلفية:** A1 ثابتة، وتحل محلها A2 عبر الأقنعة السبعة بالتوقيت أعلاه.
   - **الشخص:** قناع الشخص من V1 (0–2.8 ث) ثم V2 (2.8–7 ث). الثبات تحت القناع أنظف من فيديو كامل يرتجف.
   - **من 3.0 ث:** إذا كانت خلفية V2 مستقرة نستخدمها كاملة، وإلا نُبقي A2 مع قناع الشخص.
3. **الكاميرا:** نافذة قص 1215×2160 تتحرك أفقياً حسب منحنى الجدول، ثم تكبير لـ 1080×1920 (lanczos). نضيف تمويه حركة اتجاهي في 1.0–3.0 و6.0–7.0 فقط.
4. **المسح:** حافة ناعمة 24 بكسل، 3 إطارات لكل غرض، باتجاه الحركة.
5. **النص:**
   - الخط Tajawal ExtraBold، اللون أبيض `#FFFFFF` مع ظل ناعم كحلي `#152249` بشفافية 35٪.
   - الحجم حوالي 92 بكسل، في وسط الكادر أفقياً وعلى ارتفاع y≈560–700.
   - الكتابة RTL مشكّلة بشكل صحيح (عبر libraqm أو HarfBuzz)، ونتحقق بصرياً أن الحروف متصلة.
   - **مط الكلمة:** «الراحة» ← «الراحـــــة» (من 0 إلى 5 كشيدات خلال 10 إطارات) مع scaleX من 1.00 إلى 1.06، ثم ارتداد إلى 1.03.
6. **الشعار:** الملف الرسمي كما هو، بدون أي تغيير في الشكل أو اللون. نضعه على لوح أبيض نصف شفاف (85٪) بزوايا دائرية، بعرض حوالي 380 بكسل، عند y≈1180. والسبب أن الشعار كحلي ويحتاج خلفية فاتحة ليُقرأ.
7. **المناطق الآمنة لتيك توك وريلز:** لا نص ولا شعار في أعلى 250 بكسل، ولا في أسفل 420 بكسل، ولا في أيمن 140 بكسل.
8. **الصوت:**
   - الموسيقى عند -20 LUFS تحت المؤثرات.
   - 7 نقرات مطابقة لإطارات المسح بالضبط.
   - الووش من 1.0 إلى 3.0.
   - صوت الجلوس عند 4.0.
   - الجرس عند 5.40.
   - الووش النهائي من 6.2 إلى 7.0، ويُقص ذيله ويوضع في 0.0–0.2 للإعادة.
   - الصوت النهائي -14 LUFS، والذروة ≤ -1 dBTP.
9. **الإعادة:** نطابق لون الإطار الأخير والأول بالكود. وإذا ظهر أي فرق في الصوت عند الإعادة، نعمل مزجاً صوتياً قصيراً (crossfade).
10. **التصدير:** H.264، 1080×1920، 30 إطاراً في الثانية، 16–20 Mbps، صوت AAC 320k. نصدّر نسختين: واحدة بالنص والشعار، وواحدة نظيفة.
11. **الفحص النهائي:**
    - نستخرج 3 إطارات قبل وبعد كل نقطة مسح ونقطة الإعادة ونفحصها.
    - وكيل منفصل يراجع الفيديو النهائي.
    - **الحركة والصوت يحتاجان مشاهدتك أنت.** أنا أقدر أفحص الإطارات فقط.

---

## ٧. الكابشن المقترح (اختياري، بدون أسعار)

> بيتك يستاهل يتنفس 🤍
> خزّن الزايد عند رافل للتخزين، وخذ وقتك.
> واتساب: 050 325 0551

---

## ٨. ترتيب التنفيذ والموافقات

1. اعتمادك لهذا الملف (والتغييرين المذكورين في القسم ١).
2. توليد A1، وأفحصه وأرسله لك للاعتماد.
3. توليد A2، والفحص بالكود، واعتمادك.
4. مراجعة برومبتات V1 وV2 بوكيل منفصل، ثم **عرض سعر بالنقاط**، ولا توليد إلا بموافقتك.
5. توليد V1 وV2، ثم المونتاج، ثم المراجعة النهائية والتسليم.
