const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/index.html');await p.evaluate(()=>Promise.all([400,600,700,800,900].map(w=>document.fonts.load(w+' 40px Cairo','اب AB 12'))));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
const ts=process.argv.slice(2).map(Number);
for(const t of ts){await p.evaluate(t=>render(t),t);await p.screenshot({path:`prev_${t}.jpg`,type:'jpeg',quality:70});}
await b.close();})();
