const fs=require('fs');
const path=require('path');
const vm=require('vm');

const folder=process.argv[2]||'07_skill';
if(!['07_skill','08_screen_reader'].includes(folder))throw Error('Unknown application folder');
const root=path.join(__dirname,'..',folder);
const jsDir=path.join(root,'js');
const files=fs.readdirSync(jsDir).filter(name=>name.endsWith('.js')).sort().map(name=>path.join(jsDir,name));
files.push(path.join(root,'streamdeck.js'));
for(const file of files){
 const source=fs.readFileSync(file,'utf8');
 new vm.Script(source,{filename:path.relative(path.join(__dirname,'..'),file)});
 console.log('ok',path.relative(path.join(__dirname,'..'),file));
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ordered=[...html.matchAll(/<script\s+src=["']([^"']+\.js)["'][^>]*><\/script>/g)]
 .map(match=>match[1]).filter(src=>!/^https?:/.test(src))
 .map(src=>path.resolve(root,src));
const combined=ordered.map(file=>fs.readFileSync(file,'utf8')).join('\n;\n');
new vm.Script(combined,{filename:folder+'/index-script-order.js'});
console.log('ok concatenated script order');
