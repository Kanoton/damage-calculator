const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/releases/v1p3.json'),'utf8'));
const app=path.join(root,manifest.directory);
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
const actual=files(app).map(file=>path.relative(app,file)).sort(),expected=Object.keys(manifest.files).sort();
if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Snapshot file list changed');
for(const file of expected){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(app,file))).digest('hex');if(hash!==manifest.files[file])throw Error('Snapshot content changed: '+file);}
const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src=["']([^"']+\.js)["'][^>]*><\/script>/g)].map(match=>match[1]).filter(src=>!/^https?:/.test(src));
const sources=scripts.map(file=>{const source=fs.readFileSync(path.resolve(app,file),'utf8');new vm.Script(source,{filename:file});return source;});
new vm.Script(sources.join('\n;\n'),{filename:'v1p3/index-script-order.js'});
console.log(`ok v1p3: ${expected.length} exact files, ${scripts.length} individual scripts and combined order`);
