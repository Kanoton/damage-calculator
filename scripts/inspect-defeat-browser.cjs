// Reproducible renderer diagnostics, no app/network state and no roster mutations.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'tests/fixtures/screen-reader/defeat/autumn-reviewed-20261019');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
(async()=>{fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
 for(const name of ['chromium','webkit']){const browser=await require('@playwright/test')[name].launch();try{
  const page=await browser.newPage();for(const file of ['screen-reader-vision.js','screen-reader-defeat-references.js','screen-reader-defeat.js'])await page.addScriptTag({path:path.join(root,'08_screen_reader/js',file)});
  const rows=[];for(const sample of manifest.samples){await page.evaluate(()=>window.tracker=ScreenReaderDefeatVision.createTracker());for(const snap of sample.snapshots){const bytes=fs.readFileSync(path.join(base,snap.image));const row=await page.evaluate(async({data,time})=>{const im=new Image();im.src=data;await im.decode();const c=document.createElement('canvas');c.width=2560;c.height=1440;const ctx=c.getContext('2d');ctx.fillStyle='#141414';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,640,360);const f=ScreenReaderVision.normalize(c),blobs=ScreenReaderDefeatVision.blobs(ScreenReaderDefeatVision.pixels(f));return {blobs,cues:tracker.step(f,time)};},{data:'data:image/webp;base64,'+bytes.toString('base64'),time:snap.source_pts_s*1000});rows.push({sample:sample.id,phase:snap.phase,monsterId:sample.monster_id,image:snap.image,image_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...row});}}
  fs.writeFileSync(path.join(root,'artifacts/defeat-renderer-'+name+'.json'),JSON.stringify({renderer:name,version:browser.version(),rows},null,2));console.log(name,rows.filter(r=>r.cues.length).map(r=>[r.sample,r.cues.map(c=>c.monsterId)]));
 }finally{await browser.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
