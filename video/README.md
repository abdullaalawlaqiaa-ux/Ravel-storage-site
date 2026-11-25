# فيديو موشن قرافيك – Ravel Storage

- `ravel-motion.mp4` — 1080×1920 (ريلز/ستوري/تيك توك)، 38 ثانية، 30fps، مع موسيقى ومؤثرات.

## إعادة التصدير
```bash
cd video/source
mkdir node && (cd node && npm init -y && npm i @fontsource/cairo)
npm i playwright   # أو استخدم المثبت مسبقاً
python3 music.py          # الموسيقى -> music.wav
node render.js            # الفيديو بدون صوت -> silent.mp4
ffmpeg -i silent.mp4 -i music.wav -c:v copy -c:a aac -shortest ravel-motion.mp4
```
النصوص والتوقيتات في `index.html` (دالة `render(t)`).
