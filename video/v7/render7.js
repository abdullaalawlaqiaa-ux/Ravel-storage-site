const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const FPS=30,DUR=25.5;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/v7.html');await p.evaluate(()=>window.ready);
for(const t of [1,6,10,14,22,26,28])await p.evaluate(t=>setTime(t),t);
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',''+FPS,'-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','silent7.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<FPS*DUR;i++){await p.evaluate(t=>setTime(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:94});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%150==0)console.log('frame',i);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();})();
