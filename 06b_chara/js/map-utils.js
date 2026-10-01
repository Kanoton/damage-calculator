// CSV files are read from ../csv/ relative to 06b_chara/.
// Bundled snapshots keep the app usable when index.html is opened directly.
function parseMapCSV(text){
 const delimiter=text.split(/\r?\n/,1)[0].includes('\t')?'\t':',';
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===delimiter&&!quoted){row.push(value);value='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v!==''))rows.push(row);row=[];value='';}
  else value+=c;
 }
 if(quoted)throw Error('CSVの引用符が閉じていません');
 row.push(value);if(row.some(v=>v!==''))rows.push(row);
 const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
}
function eventImageFiles(group){return [...new Set(group.rows.flatMap(row=>String(row['出現位置画像']||'').split('|').map(name=>name.trim()).filter(Boolean)))];}
function createEventMapPreview(base,layer,loadImage){
 let version=0;const cache=new Map();
 function reset(){version++;layer.replaceChildren();layer.hidden=true;base.style.visibility='';}
 function load(file){if(!cache.has(file)){const request=loadImage(file).catch(()=>null);cache.set(file,request);}return cache.get(file);}
 async function show(files,label){reset();if(!files.length)return;const request=version;const loaded=await Promise.all(files.map(load));if(request!==version)return;const valid=loaded.filter(Boolean);if(!valid.length)return;
 layer.style.gridTemplateColumns=valid.length>1?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)';layer.replaceChildren(...valid.map((source,index)=>{const img=document.createElement('img');img.src=source;img.alt=label+(valid.length>1?' '+(index+1):'');return img;}));base.style.visibility='hidden';layer.hidden=false;
 }
 return {show,reset};
}
function applyDefeatGimmicks(rows,totals,counts,mapId,level,monsterId,onTrigger=()=>{}){
 const totalKey=id=>JSON.stringify([mapId,level,id]);
 const unique=new Map();rows.filter(r=>r.map_id===mapId&&(!r['難易度']||r['難易度']===level)).forEach(r=>{if(!unique.has(r.gimmick_id))unique.set(r.gimmick_id,r);});
 unique.forEach(row=>{
 const targets=[...new Set(String(row['撃破対象ID']||'').split('|').map(x=>x.trim()).filter(Boolean))];const threshold=Number(row['撃破数']);
 if(!targets.includes(monsterId)||!Number.isSafeInteger(threshold)||threshold<1)return;
 const before=targets.reduce((sum,id)=>sum+(totals.get(totalKey(id))||0),0),after=before+1;
 if(threshold!==1&&!(before<threshold&&after>=threshold))return;
 const key=row.map_id+':'+row.gimmick_id,rawMax=String(row['最大回数']??'').trim(),maximum=rawMax===''?Infinity:Math.max(0,Number(rawMax));if(Number.isNaN(maximum))return;const beforeCount=counts.get(key)||0;const nextCount=Math.min(maximum,beforeCount+1);counts.set(key,nextCount);if(nextCount>beforeCount)onTrigger(row);
 });
 const key=totalKey(monsterId);totals.set(key,(totals.get(key)||0)+1);
}
function eventBuff(row){
 const explicit=['攻撃加算','防御加算'].some(k=>String(row[k]??'').trim()!=='');
 if(explicit){const values=['攻撃加算','防御加算'].map(k=>Number(String(row[k]??'').trim()||0));if(values.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('攻撃加算・防御加算は0以上の整数で指定してください。');return {attack:values[0],defense:values[1]};}
 const result={attack:0,defense:0},text=String(row['内容']||'').normalize('NFKC');
 for(const clause of text.matchAll(/全モンスターに\s*((?:[AD]\s*\+\s*\d+\s*(?:[/、]\s*)?)+)/g)){for(const token of clause[1].matchAll(/([AD])\s*\+\s*(\d+)/g))result[token[1]==='A'?'attack':'defense']+=Number(token[2]);}
 return result;
}
function groupMapEvents(events){
 const groups=new Map();for(const row of events){const progress=String(row['進捗']??'').trim(),route=String(row.route_id||'').trim(),key=JSON.stringify([route,progress]);if(!groups.has(key))groups.set(key,{進捗:progress,route_id:route,rows:[],内容:[]});const group=groups.get(key);group.rows.push(row);group['内容'].push(row['内容']);}
 return [...groups.values()].sort((a,b)=>{const ag=a['内容'].some(text=>String(text||'').trim()==='ゲームオーバー'),bg=b['内容'].some(text=>String(text||'').trim()==='ゲームオーバー');if(ag!==bg)return ag?1:-1;const an=a['進捗']!==''&&Number.isFinite(Number(a['進捗'])),bn=b['進捗']!==''&&Number.isFinite(Number(b['進捗']));return an&&bn?Number(a['進捗'])-Number(b['進捗']):an?-1:bn?1:0;}).map(g=>({...g,内容:g['内容'].join('\n')}));
}
function routeLevelMatches(row,level){return !String(row['難易度']||'').trim()||String(row['難易度']).split('|').map(v=>v.trim()).includes(level);}
function missionCounterKey(row,level){return JSON.stringify([row.map_id,level,String(row.route_id||'').trim(),String(row.monster_id||'').trim(),Number(row['カウンタ']),String(row['内容']||''),String(row['報酬']||'')]);}

function decrementMonsterMissions(missions,counters,mapId,monsterId,level){
 missions.filter(row=>row.map_id===mapId&&String(row.monster_id||'').split('|').map(id=>id.trim()).filter(Boolean).includes(monsterId)).forEach(row=>{
 const key=missionCounterKey(row,level),maximum=Number(row['カウンタ']);if(!Number.isFinite(maximum)||maximum<0)return;
 const current=counters.has(key)?counters.get(key):maximum;counters.set(key,Math.max(0,current-1));
 });
}
function visibleMonsterRows(data,mapId,level){return (data.maps[mapId]?.ids||[]).map(id=>data.stats.find(s=>s.monster_id===id&&s['難易度']===level)).filter(Boolean);}
function normalizeMapData(raw){
 const maps={},grouped=new Map();raw.maps.forEach(row=>{if(!grouped.has(row.map_id))grouped.set(row.map_id,[]);grouped.get(row.map_id).push(row);});grouped.forEach((rows,id)=>{
  const base=rows.find(row=>!String(row.route_id||'').trim())||rows[0];if(String(base['表示']??'').trim()!=='1')return;
  maps[id]={name:base['マップ名'],image:'../images/Map/'+base.image,ids:[...new Set(raw.relations.filter(r=>r.map_id===id).map(r=>r.monster_id))],routes:[]};
  for(const row of rows){const route=String(row.route_id||'').trim();if(route)maps[id].routes.push({id:route,name:row['ルート名']||route,image:row.image?'../images/Map/'+row.image:maps[id].image,movedImage:row['移動先image']?'../images/Map/'+row['移動先image']:'',levels:String(row['ルート難易度']||'').split('|').map(v=>v.trim()).filter(Boolean)});}
 });
 const nativeMapByMonster={};
 raw.relations.forEach(row=>{if(!Object.hasOwn(nativeMapByMonster,row.monster_id))nativeMapByMonster[row.monster_id]=row.map_id;});
 return {maps,nativeMapByMonster,gimmicks:raw.gimmicks||[],stats:raw.stats,missions:raw.missions,events:raw.events,images:Object.fromEntries(raw.stats.map(s=>[s.image,'../images/Monster/'+s.image])),icons:{'攻撃':'../images/icon/Attack.png','防御':'../images/icon/Defense.png','HP':'../images/icon/Hp.png','コイン':'../images/icon/Coin.png',reflect:'../images/icon/Reflect.png'}};
}
function assignMapImage(image,url){
 const variants=[...new Set([url,url.replace('../images/','../Image/'),url.replace('../images/','../Images/'),url.replace('/Icon/','/icon/'),url.replace('/Monster/','/MonsterImg/'),url.replace('/Map/','/MapImg/')])];
 let index=0;image.onerror=()=>{index++;if(index<variants.length)image.src=variants[index];else {image.onerror=null;image.hidden=true;}};image.hidden=false;image.src=variants[0];
}

function safeAssetUrl(basePath,file){
 const raw=String(file||'').trim();if(!raw||raw.includes(':'))return null;
 const segments=raw.replaceAll('\\','/').split('/');if(segments.some(part=>!part||part==='.'||part==='..'))return null;
 return basePath+segments.map(encodeURIComponent).join('/');
}
function gimmickKey(row){return row.map_id+':'+row.gimmick_id;}
function gimmickMaximum(row){const raw=row['最大回数'];if(raw===undefined||String(raw).trim()==='')return Infinity;const value=Number(raw);return Number.isFinite(value)?Math.max(0,Math.floor(value)):Infinity;}
function absorbSoulSpirits(monsters,mapId,level){
 let removed=0;
 for(let i=monsters.length-1;i>=0;i--){const enemy=monsters[i];if(enemy.mapId===mapId&&enemy.difficulty===level&&!enemy.defeated&&['M0009','M0010'].includes(enemy.monsterId)){monsters.splice(i,1);removed++;}}
 for(const enemy of monsters){if(enemy.mapId===mapId&&enemy.difficulty===level&&!enemy.defeated&&enemy.monsterId==='M0006'){enemy.eventAttack=(enemy.eventAttack||0)+removed;enemy.eventDefense=(enemy.eventDefense||0)+removed;}}
 return removed;
}
