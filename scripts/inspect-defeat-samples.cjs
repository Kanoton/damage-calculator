// Offline baseline only: run the current text reader on the reviewed source pixels.
// Optional dependency: npm install --no-save --package-lock=false @napi-rs/canvas
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
let canvas;try{canvas=require('@napi-rs/canvas');}catch(error){
 if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw new Error('Install optional @napi-rs/canvas to run this inspection.');
 canvas=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
}
const root=path.resolve(__dirname,'..'),folder=path.join(root,'tests/fixtures/screen-reader/defeat/autumn-reviewed-20261019');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const context=vm.createContext({window:{},document:{createElement:()=>canvas.createCanvas(1,1)},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),console});
const js=path.join(root,'08_screen_reader/js');
const sources=[...fs.readdirSync(js).filter(f=>/references\.js$/.test(f)).sort(),'screen-reader-vision.js','screen-reader-start.js','screen-reader-world.js'];
const hashes={};for(const name of sources){const source=fs.readFileSync(path.join(js,name),'utf8');hashes[name]=crypto.createHash('sha256').update(source).digest('hex');vm.runInContext(source,context);}Object.assign(context,context.window);
(async()=>{
 const rows=[];
 for(const sample of manifest.samples)for(const snapshot of sample.snapshots){
  const image=await canvas.loadImage(path.join(folder,snapshot.image)),restored=canvas.createCanvas(2560,1440),ctx=restored.getContext('2d');
  ctx.fillStyle='#141414';ctx.fillRect(0,0,2560,1440);ctx.drawImage(image,...manifest.crop_xywh.slice(0,2));context.source=restored;
  const observation=vm.runInContext('ScreenReaderWorldVision.analyze(ScreenReaderVision.normalize(source))',context);
  rows.push({sample_id:sample.id,phase:snapshot.phase,source_pts_s:snapshot.source_pts_s,human_event:sample.expected_event,human_monster_id:sample.monster_id,human_serial:sample.serial,observation});
 }
 const result={engine:'Current ScreenReaderWorldVision using native Canvas; not browser accuracy or a defeat detector',source_files_sha256:hashes,
  input:'Cropped source pixels restored at their original coordinates on a masked 2560x1440 canvas; hidden HUD/clock intentionally absent',
  runtime_auto_defeat_disabled:/allowDefeat:false/.test(fs.readFileSync(path.join(js,'screen-reader.js'),'utf8')),samples:rows};
 const output=process.argv[2]||path.join(folder,'text-reader-baseline.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log('Inspected '+rows.length+' reviewed snapshots; automatic defeat remains disabled; wrote '+output);
})().catch(error=>{console.error(error);process.exitCode=1;});
