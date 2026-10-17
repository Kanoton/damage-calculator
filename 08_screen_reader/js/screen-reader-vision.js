// Local image matching. No screenshots leave the browser.
(()=>{
 'use strict';
 const WIDTH=1536,HEIGHT=709,SIDE=16,Y=[0,93,187,279];
 const regions={avatar:Y.map(y=>[137,66+y,73,42]),self:[181,445,139,116],header:[431,84,43,42]};
 const layouts=[
  {id:'original',regions,hp:[116,103,49,42],maxHp:[173,121,27,22],coin:[235,98,27,24],stars:[280,302,324]},
  {id:'left',regions:{...regions,avatar:Y.map(y=>[55,66+y,73,42]),self:[116,445,139,116]},hp:[23,103,60,42],maxHp:[96,119,27,24],coin:[167,98,27,24],stars:[225,246,265]}
 ];
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
 function numberAt(source,box,kind,refs,rejectClipped=false,minHeightRatio=.38){
  const c=crop(source,box,box[2],box[3]),ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height),w=c.width,h=c.height;
  const mask=Array.from({length:h},()=>new Uint8Array(w)),columns=new Uint16Array(w);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(isInk(d.data[i],d.data[i+1],d.data[i+2],kind)){mask[y][x]=1;columns[x]++;}}
  const glyphs=[];let start=null;
  for(let x=0;x<=w;x++){
   if(x<w&&columns[x]>=2){if(start===null)start=x;continue;}
   if(start===null)continue;let top=h,bottom=0,count=0;
   for(let y=0;y<h;y++)for(let xx=start;xx<x;xx++)if(mask[y][xx]){top=Math.min(top,y);bottom=Math.max(bottom,y+1);count++;}
   if(bottom-top>=h*minHeightRatio&&count>=12){
    const glyph=document.createElement('canvas');glyph.width=x-start;glyph.height=bottom-top;const gc=glyph.getContext('2d'),pixels=gc.createImageData(glyph.width,glyph.height);
    for(let y=top;y<bottom;y++)for(let xx=start;xx<x;xx++){const i=((y-top)*glyph.width+xx-start)*4,value=mask[y][xx]*255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}gc.putImageData(pixels,0,0);
    const normalized=crop(glyph,[0,0,glyph.width,glyph.height],18,28).getContext('2d').getImageData(0,0,18,28).data,a=new Uint8Array(504);for(let i=0;i<a.length;i++)a[i]=Number(normalized[i*4]>110);
    const ranks=new Map();for(const ref of refs){const b=bytes(ref);let error=0;for(let i=0;i<a.length;i++)error+=a[i]!==b[i];const score=error/a.length+Math.min(.2,Math.abs(glyph.width/glyph.height-ref.ratio)*.15);ranks.set(ref.digit,Math.min(ranks.get(ref.digit)??Infinity,score));}
    // Resampling can move a clipped HUD fragment one pixel inside the crop.
    const sorted=[...ranks].sort((a,b)=>a[1]-b[1]),clipped=start===0||x===w||top===0||bottom===h;
    const clippedFragment=clipped||start<=1||x>=w-1||top<=1||bottom>=h-1;
    if(!sorted.length||sorted[0][1]>.19||(sorted[1]&&sorted[1][1]-sorted[0][1]<.018)){
     // Ignore unrecognizable background fragments cut by the left HUD crop.
     if(rejectClipped&&clippedFragment){start=null;continue;}return null;
    }
    // A recognizable but clipped digit is not safe to drop from a number.
    if(rejectClipped&&clipped)return null;glyphs.push(sorted[0][0]);
   }
   start=null;
  }
  if(!glyphs.length||glyphs.length>3)return null;return Number(glyphs.join(''));
 }
 function levelAt(source,index,stars){
  const values=[];for(const x of stars){const c=crop(source,[x-3,106+Y[index]-3,6,6],6,6),p=c.getContext('2d').getImageData(0,0,6,6).data;let colored=0,gray=0;for(let i=0;i<p.length;i+=4){const v=[p[i],p[i+1],p[i+2]];if(Math.max(...v)-Math.min(...v)>65&&Math.max(...v)>150)colored++;if(Math.max(...v)-Math.min(...v)<40&&Math.max(...v)>70&&Math.max(...v)<200)gray++;}if(colored>8)values.push(1);else if(gray>8)values.push(0);else return null;}
  // Filled stars must form a prefix. Reject transient/glowing unreadable stars.
  if(values.some((v,i)=>v&&values.slice(0,i).includes(0)))return null;return values.reduce((a,b)=>a+b,0);
 }
 function chipMatches(source,centers,refs){
  const out=[];for(const [x,y] of centers){
   const result=match(feature(source,[x-18,y-18,36,36]),refs,.225,.03);
   if(result?.id&&!out.includes(result.id))out.push(result.id);
  }return out;
 }
 const smallCenters=[[239,527],[312,527],[386,527],[199,591],[273,591],[347,591],[421,591],[239,655],[312,655],[386,655]];
 const largeCenters=[[535,352],[609,352],[682,352],[495,416],[570,416],[644,416],[719,416],[535,481],[609,481],[682,481]];
 const lowerCenters=[[142,527],[216,527],[289,527],[103,591],[177,591],[251,591],[325,591],[142,655],[216,655],[289,655]];
 function chipPanelScore(source,kind,centers){
  const samples=window.ScreenReaderViewReferences?.panels?.[kind]||[];
  const rims=centers.map(([x,y])=>[feature(source,[x-9,y-30,18,8]),feature(source,[x-9,y+22,18,8])]);
  // Require the grid's rims, independently of icon contents and the gold tab.
  return Math.max(0,...samples.map(panel=>rims.filter((pair,i)=>pair.every((pixels,j)=>distance(pixels,decode(panel[i][j]))<.10)).length));
 }
 function lowerTab(source){const scores=[64,130,196,264].map(x=>{const p=crop(source,[x-20,434,40,6],40,6).getContext('2d').getImageData(0,0,40,6).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>180&&p[i+1]>105&&p[i+1]<220&&p[i+2]<85)n++;return n;});return scores.filter(n=>n>100).length===1?scores.findIndex(n=>n>100):null;}
 function activeTab(source){
  const scores=[179,285,392,495].map(x=>{const p=crop(source,[x-30,438,60,6],60,6).getContext('2d').getImageData(0,0,60,6).data;let gold=0;for(let i=0;i<p.length;i+=4)if(p[i]>180&&p[i+1]>105&&p[i+1]<220&&p[i+2]<85)gold++;return gold;});const max=Math.max(...scores);return max>180&&scores.filter(v=>v>180).length===1?scores.indexOf(max):null;
 }
 function readMembers(source,layout,charRefs,digits,partyIds=null){
  return layout.regions.avatar.map((box,index)=>{
   const data=partyIds?null:feature(source,box),found=partyIds?{id:partyIds[index],confidence:100}:hasFaceTexture(data)?match(data,charRefs.filter(r=>r.kind==='avatar'))||profileMatch(data):null;if(!found)return {slot:index,unreadable:true};
   const member={slot:index,id:found.id,confidence:found.confidence},kind=['red','green','blue','gold'][index];
   const shifted=box=>[box[0],box[1]+Y[index],box[2],box[3]];
   const hp=numberAt(source,shifted(layout.hp),kind,digits,layout.id==='left'),maxHp=numberAt(source,shifted(layout.maxHp),kind,digits),coin=numberAt(source,shifted(layout.coin),'white',digits),level=levelAt(source,index,layout.stars);
   if(maxHp!==null&&maxHp>=1&&maxHp<=999)member.maxHp=maxHp;
   if(hp!==null&&(member.maxHp===undefined||hp<=member.maxHp))member.currentHp=hp;
   if(coin!==null)member.coin=coin;if(level!==null)member.level=level;return member;
  });
 }
 function selectLayout(source,charRefs,digits){
  // Test both the legacy stretch and a height-scaled, left-anchored HUD.
  // Keep the legacy geometry unless multiple identities and numeric anchors
  // independently support the alternative; a single face is insufficient.
  const candidates=layouts.map(layout=>({source,layout,members:readMembers(source,layout,charRefs,digits)}));
  if(source.statusFrame&&source.popupFrame)for(const layout of layouts)candidates.push({source:source.popupFrame,layout,members:readMembers(source.popupFrame,layout,charRefs,digits)});
  const count=c=>new Set(c.members.filter(m=>m.id).map(m=>m.id)).size;
  const anchors=c=>c.members.filter(m=>m.id&&m.coin!==undefined&&m.level!==undefined).length;
  const fields=c=>c.members.reduce((n,m)=>n+(m.id?['currentHp','maxHp','coin','level'].filter(k=>m[k]!==undefined).length:0),0);
  let best=candidates[0];
  for(const candidate of candidates.slice(1)){
   if(count(candidate)<2||anchors(candidate)<2)continue;
   if(count(candidate)>count(best)||count(candidate)===count(best)&&fields(candidate)>fields(best))best=candidate;
  }
  return best;
 }
 // Sword/shield anchors from anonymized self-hud-frame24; numbers use the existing digit matcher.
 const selfHudReferences=[{"id":"atk","icon":[8,625,30,30],"box":[45,623,29,34],"data":"PDw5Ojo3ODg1ODg1Ozs4Ozs4Ojo3Nzc0OTg2MzQxFxcXFhYWFBISCwsJAwQCBAQDODg1Ojo3Ozs4Ozs4Nzc0Nzc0OTk2OTk2Njg0GRgaHAACYwAJcAAIhQAHkAELFAABNzc0Ojo3PDw5PDw5ODg1Nzc0ODk2Ozs6KSonEAACsgAX6gAb7AAY6AAa1AQdGwAEOjo3OTk2Ozs4Ojo3Nzc0Nzc0NTg1MTEyBgMDbwIK6QAb6wAb6AAX6AAX0QUcGQEDPDw5Ojo3Nzc0OTk2Ojo3Ojw5ODg1FBIUOAEG4AMe7AAY6wAa6gAY6QAczgMbGAADOzs4Ojo3ODg1Nzc0OTk5Ojw8IyIjFAECtQEZ6AAZ6QAZ6wAZ6AAZ5wEbggYRCAEBOjo4Ojo3Ozs4Ojo4ODo6MS8xBwMEewQT6gAd7AAa6QAZ6wAY2AIYVAQICQEBCwwLNzY4Ojo6PDw8PDw8NTg0DAsLOwQK3AEa7AAZ6gAZ6AAYtAMVLAIFAwEBHBsZNDQyOjk7ODg5KSkpKSkpGBobDQEBugIX6wAX5wEZ3gIZhgQQEQAADAoMKiooNzczNzc0PDw8IiIiCwIBCwEBAgMCfgYW5gAa6gAaygIXVwIHBwIDGRcWODczODg1ODc1ODY0PDw8HBwcHwIGlwEOCQAAkgYT5QAZrQIUJQECCQoKLi0rOjUxOTcyNTc0NzY1ODY3OTk5MzMzBQUFKAIDogAMCgAARQAHCwIBGBkWNjYzNzc0Nzc0Nzc0Nzc0Nzc0Nzc0NDQ0Hh4eBQMBngoe4AAVmwEPBwAAIiIfPTo1ODg1Nzc0Nzc0ODg1OTk2Nzc0Nzc0BAMEDAQElAcW1QAXJwACLQMHewEPCAYGNjc0Nzc0Nzc0Nzc0Nzc0Nzc0Nzc0Nzc0AgICaQcRzAAXIQABGBUTDg0NDQEBFxUUOTc0Nzc0OTk2Nzc0Nzc0Nzc0Nzc0Nzc0IiMiCAICGgICDQwKODo0Ojg2JyYlNTUyNzczODg1OTk2Nzc0Nzc0Nzc0Nzc0Nzc0"},{"id":"def","icon":[8,670,29,31],"box":[45,668,29,35],"data":"Ojo6Ojo5OTk3MjIyKikoHx0cFRUWDAsODQ0PDAsNEA8RGhoaIiIiLy8vMTExNzc0PDw8IyMjDQwMAwYPBiAtCzA9EEtlE2mLG2mEAAEDAAABAAAAAAAAAAAABAQEFhYVPDw8HBwcBAYHKqHKIbbsI8H6Hr/6G8D4E422AQEFAAABAAACAAACAAAAAAAADAwMNzc2HBwbAwUHHrbrG7/6Hb/4HMD7HMH3FY23AQEFAAABAAACAAACAAAAAAABCwsLOTk4HR0bBQUIH7XrHr75HsD3HcD5GsL2FI67AQIFAAAAAAAAAAAAAAACAAABDAwLOzs7HR0dBAYHG7LpHMH7HcH7HcL7GsH5FI2+AQEGAAABAAAAAAAAAAACAAABDAwLPDw8HBwcBQUIH6zbHrbtHrXqHrfpH7nqEIOuAQMJAAIEAQEDAQEDAQIDAAACDAwLOzs7HR0cAgAAAAEGAQIKAgILAQMIAAIHE0RSJ7LeKbTgKLPhKbPiLLLiEE9qDAwMOTk5GxsbAAAAAAAAAAABAAAAAAABAQABF0VZHsD0HcD4HcD5HcH4HMP6ClZuCwwLOTk5GxsbAAAAAAAAAAABAAAAAAAAAQAAF0VYHr/0HcD4HcD5Hb/3Hr74CU1nDAwLOjo6KioqAAAAAAAAAAAAAAAAAAABAAAAF0VZHr/0HcD4HcD5HL/4J7TlBxwmEhEQOzs7OTk5CwsLAAAAAAAAAAAAAAABAAAAF0ZYH7/zHsH3HcD6IL30D0BSAwUFLi4sOzs4Ozs4NDQxCgoHAQEDAAADAQEBAAAAFkdTHL7yHcD1JqbPFDpIAgECKSMjNzc2OTk4Ojo3Ojo3ODg1ExIUAAABAAAAAAEBF0RRJKrXHmB7BxIYCAkIKykqODg4Nzc2Ojg5Ozk6PDo7PDs8OTc4IB0eBwYGAgICBAYICQ8TAgIGFhUXMzMuOTgxOjkxOjkxspUospUospUospUos5UotJUosJIonIEnnX4on3wrpIcqr5MpsJMsr5Ipr5Ipr5Ip"}];
 function readSelfStats(source){
  const out={},digits=window.ScreenReaderReferences.digits;
  for(const ref of selfHudReferences){
   if(distance(feature(source,ref.icon),bytes(ref))>.08)continue;
   const value=numberAt(source,ref.box,'white',digits,true);if(value!==null)out[ref.id]=value;
  }
  return out;
 }
 function analyze(source,custom={characters:[],chips:[]},party=null){
  const refs=window.ScreenReaderReferences,extra=window.ScreenReaderLayoutReferences||{},statusRefs=window.ScreenReaderStatusReferences||{},charRefs=[...refs.characters,...(extra.characters||[]),...(statusRefs.characters||[]),...(window.ScreenReaderViewReferences?.characters||[]),...(custom.characters||[])],chipRefs=[...refs.chips,...(window.ScreenReaderPopupReferences?.chips||[]),...(statusRefs.chips||[]),...(custom.chips||[])],digits=[...refs.digits,...(extra.digits||[])];
  const locked=party&&Array.isArray(party.ids)&&party.ids.length===4&&new Set(party.ids).size===4&&layouts.some(l=>l.id===party.hud?.layout);
  let selected;
  if(locked){
   const layout=layouts.find(l=>l.id===party.hud.layout),hudSource=party.hud.source==='popup'?(source.popupFrame||source):source;
   let members=readMembers(hudSource,layout,charRefs,digits,party.ids);
   // A confirmed order does not prove that a game HUD is currently visible.
   if(members.filter(m=>m.coin!==undefined&&m.level!==undefined).length<2)members=members.map(m=>({slot:m.slot,unreadable:true}));
   selected={layout,source:hudSource,members};
  }else selected=selectLayout(source,charRefs,digits);
  const {layout,members,source:hudSource}=selected;
  // Repeated IDs signal a bad match; do not use either conflicting slot.
  const repeated=new Set(members.filter(m=>m.id&&members.filter(other=>other.id===m.id).length>1).map(m=>m.id));
  for(const m of members)if(repeated.has(m.id)){delete m.id;m.unreadable=true;}
  const statusSource=source.statusFrame||source;
  const header=match(feature(statusSource,regions.header),charRefs.filter(r=>r.kind==='header'));
  const lowerCandidate=source.popupFrame&&source.statusFrame?lowerTab(source.popupFrame):null;
  const lowerScore=lowerCandidate!==null?chipPanelScore(source.popupFrame,'lower',lowerCenters):0;
  const lower=lowerCandidate!==null&&lowerScore>=7?lowerCandidate:null;
  const smallCandidate=lower===null?activeTab(hudSource):null;
  const smallScore=smallCandidate!==null?chipPanelScore(hudSource,'small',smallCenters):0;
  const tab=lower??(smallCandidate!==null&&smallScore>=7?smallCandidate:null);
  // The small popup covers the self portrait. Never identify self from its
  // chip contents or selected tab; keep the previous self or explicit choice.
  const selfRefs=charRefs.filter(r=>r.kind==='self');
  const own=(!locked||!party.selfId)&&(header||tab===null)?match(feature(hudSource,layout.regions.self),selfRefs)||(source.statusFrame&&hudSource!==source.popupFrame?match(feature(source.popupFrame,layouts[1].regions.self),selfRefs):null):null;
  const selfId=locked?(party.selfId||(party.ids.includes(own?.id)?own.id:null)):own?.id??null;
  const observation={members,selfId,hud:{layout:layout.id,source:hudSource===source?'primary':'popup'},view:'通常画面',chipOwnerId:null,chipIds:[],chipRead:{stage:'screen',matchedRims:Math.max(lowerScore,smallScore)}};
  if(header){
   observation.view='ステータス画面';observation.chipRead.matchedRims=chipPanelScore(statusSource,'large',largeCenters);observation.chipRead.stage='panel';if(observation.chipRead.matchedRims>=7){observation.chipOwnerId=header.id;observation.chipIds=chipMatches(statusSource,largeCenters,chipRefs);}
   let target=members.find(m=>m.id===header.id);if(!target){target={id:header.id};members.push(target);}
   for(const [stat,box] of [['atk',[542,239,26,37]],['def',[619,239,26,37]]]){const v=numberAt(statusSource,box,'white',refs.digits);if(v!==null)target[stat]=v;}
  }else if(tab!==null){observation.view='チップ画面';observation.chipOwnerId=members[tab]?.id??null;observation.chipIds=chipMatches(lower!==null?source.popupFrame:hudSource,lower!==null?lowerCenters:smallCenters,chipRefs);}
  if(observation.chipOwnerId)observation.chipRead.stage=observation.chipIds.length?'read':'icons';
  else if(tab!==null)observation.chipRead.stage='owner';
  else if(!header&&(lowerCandidate!==null||smallCandidate!==null))observation.chipRead.stage='panel';
  if(locked&&!header&&tab===null){const self=members.find(m=>m.id===selfId);if(self)Object.assign(self,readSelfStats(source.popupFrame||source));}
  return observation;
 }
 function normalize(source,area){const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;const a=area||{x:0,y:0,w:1,h:1};c.getContext('2d').drawImage(source,a.x*w,a.y*h,a.w*w,a.h*h,0,0,WIDTH,HEIGHT);
  // Centered status panels scale with height; party HUD keeps its existing mapping.
  const statusWidth=a.w*w*HEIGHT/(a.h*h);
  if(Math.abs(statusWidth-WIDTH)>1){const status=document.createElement('canvas');status.width=WIDTH;status.height=HEIGHT;status.getContext('2d').drawImage(source,a.x*w,a.y*h,a.w*w,a.h*h,(WIDTH-statusWidth)/2,0,statusWidth,HEIGHT);c.statusFrame=status;}
  const popup=document.createElement('canvas');popup.width=WIDTH;popup.height=HEIGHT;popup.getContext('2d').drawImage(source,a.x*w,a.y*h,a.w*w,a.h*h,0,0,statusWidth,HEIGHT);c.popupFrame=popup;
  return c;}
 function learn(source,kind,id,index=0){const refs=window.ScreenReaderReferences,extra=window.ScreenReaderLayoutReferences||{},selected=selectLayout(source,[...refs.characters,...(extra.characters||[]),...(window.ScreenReaderStatusReferences?.characters||[])],[...refs.digits,...(extra.digits||[])]),layout=selected.layout;const lower=source.popupFrame&&source.statusFrame&&lowerTab(source.popupFrame)!==null;const box=kind==='chip-small'?(lower?lowerCenters:smallCenters)[index]:kind==='chip-large'?largeCenters[index]:kind==='avatar'?layout.regions.avatar[index]:layout.regions[kind];if(!box)throw Error('見本の位置が不正です。');const region=kind.startsWith('chip-')?[box[0]-18,box[1]-18,36,36]:box;return {id:String(id),kind:kind.startsWith('chip-')?'chip':kind,data:encode(feature(kind==='chip-small'&&lower?source.popupFrame:(kind==='header'||kind==='chip-large')?(source.statusFrame||source):selected.source,region))};}
 window.ScreenReaderVision={analyze,normalize,learn,numberAt,feature,profileMatch,readSelfStats,regions,WIDTH,HEIGHT};
})();
