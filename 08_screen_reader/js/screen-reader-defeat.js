// Partial autumn defeat cues; numbered identity needs a recent stable map leader.
(()=>{
 'use strict';
 const W=768,H=355,S=20;
 function pixels(source){const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(source.popupFrame||source,0,0,W,H);return c.getContext('2d').getImageData(0,0,W,H).data;}
 function blobs(p){
  const mask=new Uint8Array(W*H),seen=new Uint8Array(W*H),out=[];
  for(let y=60;y<280;y++)for(let x=150;x<650;x++){const k=(y*W+x)*4,r=p[k],g=p[k+1],b=p[k+2];mask[y*W+x]=Number(Math.max(r,g,b)<100&&Math.min(r,g,b)>12&&Math.max(r,g,b)-Math.min(r,g,b)<22);}
  const queue=new Int32Array(W*H);
  for(let y=60;y<280;y++)for(let x=150;x<650;x++){
   const i=y*W+x;if(!mask[i]||seen[i])continue;let head=0,tail=1,x0=x,x1=x,y0=y,y1=y;queue[0]=i;seen[i]=1;
   while(head<tail){const k=queue[head++],xx=k%W,yy=Math.floor(k/W);x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);for(const j of [k-1,k+1,k-W,k+W])if(j>=0&&j<mask.length&&mask[j]&&!seen[j]&&Math.abs(j%W-xx)<=1){seen[j]=1;queue[tail++]=j;}}
   const w=x1-x0+1,h=y1-y0+1;if(tail<100||w<12||h<12||w>120||h>100||x0===150||x1===649||y0===60||y1===279)continue;
   const shape=new Array(S*S).fill(0),counts=new Array(S*S).fill(0);
   for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)counts[Math.min(S-1,Math.floor((yy-y0)*S/h))*S+Math.min(S-1,Math.floor((xx-x0)*S/w))]++;
   for(let j=0;j<tail;j++){const k=queue[j];shape[Math.min(S-1,Math.floor((Math.floor(k/W)-y0)*S/h))*S+Math.min(S-1,Math.floor((k%W-x0)*S/w))]++;}
   out.push({box:[x0,y0,w,h],shape:shape.map((v,i)=>counts[i]?v/counts[i]:0),area:tail});
  }return out;
 }
 function classify(blob){
  const scores=new Map();for(const r of window.ScreenReaderDefeatReferences?.patches||[]){let sum=0;for(let i=0;i<S*S;i++)sum+=Math.abs(blob.shape[i]-r.shape[i]);const score=sum/(S*S)+Math.abs(blob.box[2]/blob.box[3]-r.ratio)*.12;scores.set(r.monsterId,Math.min(score,scores.get(r.monsterId)??1));}
  const ranked=[...scores].sort((a,b)=>a[1]-b[1]);return ranked[0]?.[1]<.14&&(!ranked[1]||ranked[1][1]-ranked[0][1]>.025)?{monsterId:ranked[0][0],score:ranked[0][1]}:null;
 }
 function beamAt(p,box){const [x,y,w,h]=box;let count=0;for(let yy=Math.max(60,y-30);yy<Math.min(280,y+h+8);yy++)for(let xx=Math.max(150,x-10);xx<Math.min(650,x+w+10);xx++){const k=(yy*W+xx)*4,r=p[k],g=p[k+1],b=p[k+2];if(g>190&&b>210&&g-r>15&&b-r>25)count++;}return count;}
 function sceneStable(previous,p,excluded){
  if(!previous)return true;
  let total=0,same=0;
  for(let y=65;y<265;y+=8)for(let x=160;x<640;x+=8){
   if(excluded.some(([bx,by,bw,bh])=>x*2>bx-35&&x*2<bx+bw+35&&y*2>by-35&&y*2<by+bh+35))continue;
   const k=(y*W+x)*4,j=((y+3)*W+x+3)*4;
   // Flat ground and the stationary HUD cannot prove camera continuity.
   if(Math.max(...[0,1,2].map(c=>Math.abs(previous[k+c]-previous[j+c])))<45)continue;
   total++;if([0,1,2].every(c=>Math.abs(previous[k+c]-p[k+c])<32&&Math.abs(previous[j+c]-p[j+c])<32))same++;
  }
  return total>=20&&same/total>=.8;
 }
 function createTracker(){
  let pending=[],lastTime=null,previous=null,identities=new Map(),unlocated=new Map(),tick=0,completed=new Set();
  const reset=()=>{pending=[];lastTime=null;previous=null;identities.clear();unlocated.clear();completed.clear();tick=0;};
  return {reset,step(source,time,observations=[]){
   if(!Number.isFinite(time)||lastTime!==null&&(time<=lastTime||time-lastTime>1800)){reset();if(!Number.isFinite(time))return [];}
   lastTime=time;tick++;const p=pixels(source),found=blobs(p).map(blob=>({...blob,match:classify(blob)})).filter(b=>b.match),emitted=[];
   const key=o=>o.monsterId+':'+o.serial;
   const visible=observations.filter(o=>Number.isInteger(o.serial)&&o.serial>0&&o.currentHp>0&&o.currentHp<=o.maxHp&&o.marker?.length===2&&o.marker.every(Number.isFinite)&&observations.filter(b=>key(o)===key(b)).length===1);
   // Ignore the search-sized foreground footprint (up to 240px wide), including
   // overlapping actors/attack cards, not just the small visible gray patch.
   const excluded=[...identities.values(),...visible].flatMap(o=>o.marker?[[o.marker[0]-120,o.marker[1]-60,240,260],...(o.labelBox?[o.labelBox]:[])]:[]).concat(found.map(b=>b.box.map(v=>v*2)));
   if(!sceneStable(previous,p,excluded)){identities.clear();for(const item of pending)item.identity=null;}
   previous=p;
   for(const [id,o] of identities)if(time-o.time>1200)identities.delete(id);
   for(const [id,o] of unlocated)if(time-o.time>1200)unlocated.delete(id);
   for(const o of observations)if(Number.isInteger(o.serial)&&o.serial>0&&o.currentHp>0){
    if(!visible.includes(o)){identities.delete(key(o));unlocated.set(key(o),{monsterId:o.monsterId,time});}else unlocated.delete(key(o));
   }
   for(const o of visible){const old=identities.get(key(o)),close=old&&old.maxHp===o.maxHp&&(old.instanceId===undefined||old.instanceId===o.instanceId)&&Math.hypot(old.marker[0]-o.marker[0],old.marker[1]-o.marker[1])<24;
    identities.set(key(o),{...o,time,tick,count:close&&old.tick===tick-1?old.count+1:1});
   }
   for(const item of pending){if(time-item.time>1800)continue;const [x,y,w,h]=item.box;
    if(item.identity&&(observations.some(o=>key(o)===key(item.identity)&&o.currentHp>0)||[...unlocated.values()].some(o=>o.monsterId===item.monsterId)||[...identities.values()].some(o=>o.monsterId===item.monsterId&&key(o)!==key(item.identity)&&o.marker[0]>=x*2-40&&o.marker[0]<=(x+w)*2+40&&o.marker[1]>=y*2-40&&o.marker[1]<=(y+h)*2+40)))item.identity=null;
    const remains=found.some(b=>b.match.monsterId===item.monsterId&&Math.hypot(b.box[0]+b.box[2]/2-x-w/2,b.box[1]+b.box[3]/2-y-h/2)<18);
    if(beamAt(p,item.box)>item.beam+100&&(!remains||beamAt(p,item.box)>item.beam+220)){
     const identity=item.identity&&!observations.some(o=>key(o)===key(item.identity)&&o.currentHp>0)?item.identity:null;
     emitted.push({monsterId:item.monsterId,serial:identity?.serial??null,reason:'gray_then_beam',box:item.box.map(v=>v*2),...(identity?{maxHp:identity.maxHp,instanceId:identity.instanceId}:{} )});
    }
   }
   pending=pending.filter(item=>time-item.time<=1800&&!emitted.some(e=>e.monsterId===item.monsterId));
   for(const blob of found)if(!pending.some(item=>item.monsterId===blob.match.monsterId&&Math.hypot(item.box[0]-blob.box[0],item.box[1]-blob.box[1])<18)){
    const [x,y,w,h]=blob.box.map(v=>v*2),candidates=[...identities.values()].filter(o=>o.monsterId===blob.match.monsterId&&o.marker[0]>=x-40&&o.marker[0]<=x+w+40&&o.marker[1]>=y-40&&o.marker[1]<=y+h+40);
    const identity=candidates.length===1&&candidates[0].count>=2&&![...unlocated.values()].some(o=>o.monsterId===blob.match.monsterId)&&!completed.has(key(candidates[0])+':'+candidates[0].instanceId)?candidates[0]:null;
    pending.push({monsterId:blob.match.monsterId,box:blob.box,time,beam:beamAt(p,blob.box),identity});
   }
   for(const cue of emitted)if(cue.serial!==null)completed.add(key(cue)+':'+cue.instanceId);
   return emitted.filter((v,i,a)=>a.findIndex(b=>b.monsterId===v.monsterId)===i);
  }};
 }
 window.ScreenReaderDefeatVision={createTracker,blobs,pixels};
})();
