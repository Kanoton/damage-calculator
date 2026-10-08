// Local image matching. No screenshots leave the browser.
(()=>{
 'use strict';
 const WIDTH=1536,HEIGHT=709,SIDE=16,Y=[0,93,187,279];
 const regions={avatar:Y.map(y=>[137,66+y,73,42]),self:[181,445,139,116],header:[431,84,43,42]};
 const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 const encode=data=>btoa(String.fromCharCode(...data));
 const cache=new WeakMap();
 const bytes=ref=>{if(!cache.has(ref))cache.set(ref,decode(ref.data));return cache.get(ref);};
 function crop(source,box,width=SIDE,height=SIDE){
  const [x,y,w,h]=box,c=document.createElement('canvas');c.width=width;c.height=height;
  c.getContext('2d',{willReadFrequently:true}).drawImage(source,x,y,w,h,0,0,width,height);return c;
 }
 function feature(source,box){const a=crop(source,box).getContext('2d').getImageData(0,0,SIDE,SIDE).data,out=new Uint8Array(SIDE*SIDE*3);for(let i=0,j=0;i<a.length;i+=4){out[j++]=a[i];out[j++]=a[i+1];out[j++]=a[i+2];}return out;}
 function distance(a,b){let total=0;for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);return total/a.length/255;}
 function match(data,refs,limit=.13,margin=.014){
  const scores=new Map();for(const r of refs){const d=distance(data,bytes(r));scores.set(r.id,Math.min(scores.get(r.id)??Infinity,d));}
  const ranks=[...scores].sort((a,b)=>a[1]-b[1]);
  if(!ranks.length||ranks[0][1]>limit||(ranks[1]&&ranks[1][1]-ranks[0][1]<margin))return null;
  return {id:ranks[0][0],confidence:Math.round((1-ranks[0][1])*100)};
 }
 const profileCache=new WeakMap();
 function hasFaceTexture(data){
  const low=[255,255,255],high=[0,0,0];for(let i=0;i<data.length;i++) {const channel=i%3;low[channel]=Math.min(low[channel],data[i]);high[channel]=Math.max(high[channel],data[i]);}
  return high.reduce((total,value,i)=>total+value-low[i],0)>=75;
 }
 function smoothProfile(data){
  const out=new Uint8Array(data.length);
  for(let y=0;y<SIDE;y++)for(let x=0;x<SIDE;x++)for(let channel=0;channel<3;channel++){
   let total=0,count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<SIDE&&yy>=0&&yy<SIDE){total+=data[(yy*SIDE+xx)*3+channel];count++;}}
   out[(y*SIDE+x)*3+channel]=Math.round(total/count);
  }
  return out;
 }
 function profileMatch(data){
  if(!hasFaceTexture(data))return null;
  data=smoothProfile(data);
  const refs=window.ScreenReaderProfileReferences?.characters||[],scores=new Map();
  for(const ref of refs){
   let sample=profileCache.get(ref);
   if(!sample){
    const mask=decode(ref.mask),positions=[],opaque=(x,y)=>x<0||x>=SIDE||y<0||y>=SIDE||Boolean(mask[(y*SIDE+x)>>3]&(1<<((y*SIDE+x)&7)));
    // Compare only pixels whose smoothing neighbourhood has no transparent edge.
    for(let y=0;y<SIDE;y++)for(let x=0;x<SIDE;x++){let covered=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!opaque(x+dx,y+dy))covered=false;if(covered)positions.push((y*SIDE+x)*3);}
    sample={data:smoothProfile(decode(ref.data)),positions};profileCache.set(ref,sample);
   }
   if(sample.positions.length<SIDE*SIDE*.35)continue;
   const denominator=sample.positions.length*3*255,ceiling=.155*denominator;
   let total=0;for(const i of sample.positions){total+=Math.abs(data[i]-sample.data[i])+Math.abs(data[i+1]-sample.data[i+1])+Math.abs(data[i+2]-sample.data[i+2]);if(total>ceiling)break;}
   if(total>ceiling)continue;
   const score=total/denominator;scores.set(ref.id,Math.min(scores.get(ref.id)??Infinity,score));
  }
  const ranks=[...scores].sort((a,b)=>a[1]-b[1]);
  // Empty identity represents monster art: never return it as a party member.
  if(!ranks[0]?.[0]||ranks[0][1]>.13||(ranks[1]&&ranks[1][1]-ranks[0][1]<.025))return null;
  return {id:ranks[0][0],confidence:Math.round((1-ranks[0][1])*100)};
 }
 function isInk(r,g,b,kind){
  if(kind==='red')return r>165&&r>g*1.45&&r>b*1.35;
  if(kind==='green')return g>170&&g>r*1.3&&g>b*1.25;
  if(kind==='blue')return b>145&&b>r*1.4&&b>g*1.15;
  if(kind==='gold')return r>180&&g>110&&b<125&&r>g*1.1;
  return Math.min(r,g,b)>215&&Math.max(r,g,b)-Math.min(r,g,b)<35;
 }
 function numberAt(source,box,kind,refs){
  const c=crop(source,box,box[2],box[3]),ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height),w=c.width,h=c.height;
  const mask=Array.from({length:h},()=>new Uint8Array(w)),columns=new Uint16Array(w);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(isInk(d.data[i],d.data[i+1],d.data[i+2],kind)){mask[y][x]=1;columns[x]++;}}
  const glyphs=[];let start=null;
  for(let x=0;x<=w;x++){
   if(x<w&&columns[x]>=2){if(start===null)start=x;continue;}
   if(start===null)continue;let top=h,bottom=0,count=0;
   for(let y=0;y<h;y++)for(let xx=start;xx<x;xx++)if(mask[y][xx]){top=Math.min(top,y);bottom=Math.max(bottom,y+1);count++;}
   if(bottom-top>=h*.38&&count>=12){
    const glyph=document.createElement('canvas');glyph.width=x-start;glyph.height=bottom-top;const gc=glyph.getContext('2d'),pixels=gc.createImageData(glyph.width,glyph.height);
    for(let y=top;y<bottom;y++)for(let xx=start;xx<x;xx++){const i=((y-top)*glyph.width+xx-start)*4,value=mask[y][xx]*255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}gc.putImageData(pixels,0,0);
    const normalized=crop(glyph,[0,0,glyph.width,glyph.height],18,28).getContext('2d').getImageData(0,0,18,28).data,a=new Uint8Array(504);for(let i=0;i<a.length;i++)a[i]=Number(normalized[i*4]>110);
    const ranks=new Map();for(const ref of refs){const b=bytes(ref);let error=0;for(let i=0;i<a.length;i++)error+=a[i]!==b[i];const score=error/a.length+Math.min(.2,Math.abs(glyph.width/glyph.height-ref.ratio)*.15);ranks.set(ref.digit,Math.min(ranks.get(ref.digit)??Infinity,score));}
    const sorted=[...ranks].sort((a,b)=>a[1]-b[1]);if(!sorted.length||sorted[0][1]>.19||(sorted[1]&&sorted[1][1]-sorted[0][1]<.018))return null;glyphs.push(sorted[0][0]);
   }
   start=null;
  }
  if(!glyphs.length||glyphs.length>3)return null;return Number(glyphs.join(''));
 }
 function levelAt(source,index){
  const values=[];for(const x of [280,302,324]){const c=crop(source,[x-3,106+Y[index]-3,6,6],6,6),p=c.getContext('2d').getImageData(0,0,6,6).data;let colored=0,gray=0;for(let i=0;i<p.length;i+=4){const v=[p[i],p[i+1],p[i+2]];if(Math.max(...v)-Math.min(...v)>65&&Math.max(...v)>150)colored++;if(Math.max(...v)-Math.min(...v)<40&&Math.max(...v)>70&&Math.max(...v)<200)gray++;}if(colored>8)values.push(1);else if(gray>8)values.push(0);else return null;}
  // Filled stars must form a prefix. Reject transient/glowing unreadable stars.
  if(values.some((v,i)=>v&&values.slice(0,i).includes(0)))return null;return values.reduce((a,b)=>a+b,0);
 }
 function chipMatches(source,centers,refs){
  const out=[];for(const [x,y] of centers){
   const result=match(feature(source,[x-18,y-18,36,36]),refs,.225,.03);
   if(result&&!out.includes(result.id))out.push(result.id);
  }return out;
 }
 const smallCenters=[[239,527],[312,527],[386,527],[199,591],[273,591],[347,591],[421,591],[239,655],[312,655],[386,655]];
 const largeCenters=[[535,352],[609,352],[682,352],[495,416],[570,416],[644,416],[719,416],[535,481],[609,481],[682,481]];
 function activeTab(source){
  const scores=[179,285,392,495].map(x=>{const p=crop(source,[x-30,438,60,6],60,6).getContext('2d').getImageData(0,0,60,6).data;let gold=0;for(let i=0;i<p.length;i+=4)if(p[i]>180&&p[i+1]>105&&p[i+1]<220&&p[i+2]<85)gold++;return gold;});const max=Math.max(...scores);return max>180&&scores.filter(v=>v>180).length===1?scores.indexOf(max):null;
 }
 function analyze(source,custom={characters:[],chips:[]}){
  const refs=window.ScreenReaderReferences,charRefs=[...refs.characters,...(custom.characters||[])],chipRefs=[...refs.chips,...(custom.chips||[])];
  const members=regions.avatar.map((box,index)=>{
   const data=feature(source,box),found=hasFaceTexture(data)?match(data,charRefs.filter(r=>r.kind==='avatar'))||profileMatch(data):null;if(!found)return {slot:index,unreadable:true};
   const member={slot:index,id:found.id,confidence:found.confidence},kind=['red','green','blue','gold'][index];
   const hp=numberAt(source,[116,103+Y[index],49,42],kind,refs.digits),maxHp=numberAt(source,[173,121+Y[index],27,22],kind,refs.digits),coin=numberAt(source,[235,98+Y[index],27,24],'white',refs.digits),level=levelAt(source,index);
   if(maxHp!==null&&maxHp>=1&&maxHp<=999)member.maxHp=maxHp;
   if(hp!==null&&(member.maxHp===undefined||hp<=member.maxHp))member.currentHp=hp;
   if(coin!==null)member.coin=coin;if(level!==null)member.level=level;return member;
  });
  // Repeated IDs signal a bad match; do not use either conflicting slot.
  for(const m of members)if(m.id&&members.filter(other=>other.id===m.id).length>1){delete m.id;m.unreadable=true;}
  const header=match(feature(source,regions.header),charRefs.filter(r=>r.kind==='header'));
  const tab=activeTab(source);
  // The small popup covers the self portrait. Never identify self from its
  // chip contents or selected tab; keep the previous self or explicit choice.
  const own=header||tab===null?match(feature(source,regions.self),charRefs.filter(r=>r.kind==='self')):null;
  const observation={members,selfId:own?.id??null,view:'通常画面',chipOwnerId:null,chipIds:[]};
  if(header){
   observation.view='ステータス画面';observation.chipOwnerId=header.id;observation.chipIds=chipMatches(source,largeCenters,chipRefs);
   let target=members.find(m=>m.id===header.id);if(!target){target={id:header.id};members.push(target);}
   for(const [stat,box] of [['atk',[542,239,26,37]],['def',[619,239,26,37]],['move',[705,239,27,37]]]){const v=numberAt(source,box,'white',refs.digits);if(v!==null)target[stat]=v;}
  }else if(tab!==null){observation.view='チップ画面';observation.chipOwnerId=members[tab]?.id??null;observation.chipIds=chipMatches(source,smallCenters,chipRefs);}
  return observation;
 }
 function normalize(source,area){const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;const a=area||{x:0,y:0,w:1,h:1};c.getContext('2d').drawImage(source,a.x*w,a.y*h,a.w*w,a.h*h,0,0,WIDTH,HEIGHT);return c;}
 function learn(source,kind,id,index=0){const box=kind==='chip-small'?smallCenters[index]:kind==='chip-large'?largeCenters[index]:kind==='avatar'?regions.avatar[index]:regions[kind];if(!box)throw Error('見本の位置が不正です。');const region=kind.startsWith('chip-')?[box[0]-18,box[1]-18,36,36]:box;return {id:String(id),kind:kind.startsWith('chip-')?'chip':kind,data:encode(feature(source,region))};}
 window.ScreenReaderVision={analyze,normalize,learn,numberAt,feature,profileMatch,regions,WIDTH,HEIGHT};
})();
