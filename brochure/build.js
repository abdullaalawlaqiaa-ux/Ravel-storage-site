// Builds both PDFs (Arabic from index.html, English from index-en.html):  node build.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [src, out] of [['index.html', 'Ravel-Storage-Profile-AR.pdf'], ['index-en.html', 'Ravel-Storage-Profile-EN.pdf']]) {
  await p.goto('file://' + path.resolve(__dirname, src));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((s, i) => [i + 1, s.scrollHeight]).filter(x => x[1] > 1350));
  if (over.length) console.warn(src, 'pages overflowing:', over);
  await p.pdf({ path: path.resolve(__dirname, out), width: '1080px', height: '1350px', printBackground: true });
  }
  await b.close();
})();
