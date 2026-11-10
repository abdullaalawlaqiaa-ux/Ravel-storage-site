// Builds the PDF from index.html:  node build.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((s, i) => [i + 1, s.scrollHeight]).filter(x => x[1] > 1350));
  if (over.length) console.warn('Pages overflowing:', over);
  await p.pdf({ path: path.resolve(__dirname, 'Ravel-Storage-Profile-AR.pdf'), width: '1080px', height: '1350px', printBackground: true });
  await b.close();
})();
