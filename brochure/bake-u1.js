// Re-labels the 1 m² unit photo with correct dimensions (source labels were wrong).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 692, height: 1020 }, deviceScaleFactor: 1.5 });
  const L = (x, y, ar, en) => `<div class="l" style="left:${x - 58}px;top:${y - 36}px"><b>${ar}</b><span>${en}</span></div>`;
  require('fs').writeFileSync('_bake.html',`<meta charset=utf-8><style>
    @font-face{font-family:K;src:url(file://${path.resolve('fonts/NotoKufiArabic-Variable.ttf')})}
    body{margin:0}img{display:block}
    .l{position:absolute;width:116px;height:72px;background:#152249;border:2px solid #fff;border-radius:9px;color:#fff;
       display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:K,sans-serif;line-height:1.25}
    .l b{font-size:19px;direction:rtl}.l span{font-size:17px;font-family:sans-serif}
  </style><img src="file://${path.resolve('img/u1src.jpg')}">
  ${L(243, 460, '3 متر', '3 Meter')}${L(574, 797, '1 متر', '1 Meter')}${L(383, 921, '1 متر', '1 Meter')}`);
  await p.goto('file://' + path.resolve('_bake.html'));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'img/u1.jpg', type: 'jpeg', quality: 90 });
  await b.close();
  require('fs').unlinkSync('_bake.html');
})();
