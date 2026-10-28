// Partial autumn defeat cues; numbered identity needs a recent stable map leader.
(()=>{
 'use strict';
 const W=768,H=355,S=20;
 function createHistory({limit=10000,byteLimit=8*1024*1024}={}){
  if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(byteLimit)||byteLimit<1)throw new TypeError('Invalid diagnostic history limits');
  let records=[],sizes=[],estimatedBytes=0,droppedRecords=0;
  const metadata=()=>({limit,byteLimit,estimatedBytes,droppedRecords});
  return {
   append(row){const json=JSON.stringify(row);records.push(JSON.parse(json));sizes.push(json.length*2);estimatedBytes+=sizes.at(-1);while(records.length>limit||estimatedBytes>byteLimit){records.shift();estimatedBytes-=sizes.shift();droppedRecords++;}},
   recent(count=20){return JSON.parse(JSON.stringify(records.slice(-count)));},
   snapshot(){return {...metadata(),records:JSON.parse(JSON.stringify(records))};},
   clear(){records=[];sizes=[];estimatedBytes=0;droppedRecords=0;}
  };
 }
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
  let memory=new Map(),battle=null,wasBattle=false,focus=null,unresolved=[],cut=null,events=[],diagnostic={code:'reset',events:[]};
  const report=(code,detail={})=>events.push({code,...detail});
  const describe=o=>({monsterId:o.monsterId,serial:o.serial,instanceId:o.instanceId,currentHp:o.currentHp,maxHp:o.maxHp,...(o.lastSeenHp===undefined?{}:{lastSeenHp:o.lastSeenHp})});
  const reset=()=>{pending=[];lastTime=null;previous=null;identities.clear();unlocated.clear();completed.clear();memory.clear();battle=null;wasBattle=false;focus=null;unresolved=[];cut=null;events=[];diagnostic={code:'reset',events:[]};tick=0;};
  // Register textured map background, not labels or moving actors. A position
  // survives a missing name only while independently registered map pixels do.
  function mapMotion(a,b,excluded){
   if(!a)return null;
   const points=[];
   for(let y=80;y<260;y+=12)for(let x=170;x<630;x+=12){
    if(excluded.some(([bx,by,bw,bh])=>x*2>bx-12&&x*2<bx+bw+12&&y*2>by-12&&y*2<by+bh+12))continue;
    const k=(y*W+x)*4,j=((y+3)*W+x+3)*4;
    if(Math.max(...[0,1,2].map(c=>Math.abs(a[k+c]-a[j+c])))>=50)points.push([x,y]);
   }
   if(points.length<24)return null;
   const score=(dx,dy)=>{let hits=0;for(const [x,y] of points){if(x+dx<150||x+dx>=650||y+dy<60||y+dy>=280)continue;const k=(y*W+x)*4,j=((y+dy)*W+x+dx)*4,k2=((y+3)*W+x+3)*4,j2=((y+dy+3)*W+x+dx+3)*4;if([0,1,2].every(c=>Math.abs(a[k+c]-b[j+c])<35&&Math.abs(a[k2+c]-b[j2+c])<35))hits++;}return hits/points.length;};
   if(score(0,0)>.78)return [0,0];
   let best={score:0,dx:0,dy:0};const ranks=[];
   for(let dy=-48;dy<=48;dy+=6)for(let dx=-72;dx<=72;dx+=6){const s=score(dx,dy);ranks.push({score:s,dx,dy});if(s>best.score)best={score:s,dx,dy};}
   const coarse=best;for(let dy=coarse.dy-5;dy<=coarse.dy+5;dy++)for(let dx=coarse.dx-5;dx<=coarse.dx+5;dx++){const s=score(dx,dy);if(s>best.score)best={score:s,dx,dy};}
   const other=Math.max(0,...ranks.filter(r=>Math.hypot(r.dx-best.dx,r.dy-best.dy)>12).map(r=>r.score));
   return best.score>.62&&best.score-other>.12?[best.dx*2,best.dy*2]:null;
  }
  function battleView(p){
   let dark=0,orange=0,n=0,m=0;
   for(let y=70;y<150;y+=8)for(let x=190;x<640;x+=8){const k=(y*W+x)*4;n++;if(Math.max(p[k],p[k+1],p[k+2])<125&&Math.max(p[k],p[k+1],p[k+2])-Math.min(p[k],p[k+1],p[k+2])<45)dark++;}
   for(let y=190;y<240;y+=5)for(let x=190;x<640;x+=8){const k=(y*W+x)*4;m++;if(p[k]>170&&p[k+1]>65&&p[k+1]<215&&p[k+2]<100)orange++;}
   return dark/n>.65&&orange/m>.3;
  }
  return {reset,diagnostics:()=>JSON.parse(JSON.stringify(diagnostic)),step(source,time,observations=[],context=null){
   events=[];
   if(!Number.isFinite(time)||lastTime!==null&&time<=lastTime){reset();if(!Number.isFinite(time))return [];}
   if(lastTime!==null&&time-lastTime>1800){report('capture_gap',{gapMs:time-lastTime});pending=[];unresolved=[];previous=null;identities.clear();unlocated.clear();battle=null;focus=null;cut=null;wasBattle=false;for(const o of memory.values())o.tracked=false;}
   lastTime=time;tick++;const p=pixels(source),found=blobs(p).map(blob=>({...blob,match:classify(blob)})).filter(b=>b.match),emitted=[];
   const key=o=>o.monsterId+':'+o.serial;
   const lastSeenHp=o=>{const latest=memory.get(key(o));return latest&&latest.instanceId===o.instanceId&&latest.maxHp===o.maxHp?latest.currentHp:o.currentHp;};
   const roster=context?.monsters||[],valid=o=>Number.isSafeInteger(o.instanceId)&&o.instanceId>0&&roster.some(e=>!e.defeated&&e.seen&&key(e)===key(o)&&e.instanceId===o.instanceId&&e.maxHp===o.maxHp);
   const complete=id=>{const all=roster.filter(e=>e.monsterId===id);return Number.isSafeInteger(context?.counts?.[id])&&all.length===context.counts[id]&&all.every(e=>e.seen&&Number.isSafeInteger(e.serial)&&e.serial>=1&&e.serial<=context.counts[id])&&new Set(all.map(key)).size===all.length;};
   for(const [id,o] of memory)if(!valid(o)||time-o.time>60000){report(valid(o)?'memory_expired':'roster_changed',{candidates:[describe(o)]});memory.delete(id);}
   const detectedCut=window.ScreenReaderCombatVision?.analyzePixels(p);
   if(detectedCut){if(!cut||cut.monsterId!==detectedCut.monsterId||time-cut.time>1500)report('start_cut',{monsterId:detectedCut.monsterId});cut={...detectedCut,time};}
   if(cut&&time-cut.time>3000)cut=null;
   const masks=[...memory.values()].flatMap(o=>[...(o.marker?[[o.marker[0]-90,o.marker[1]-90,180,200]]:[]),...(o.labelBox?[o.labelBox]:[])]).concat(found.map(b=>b.box.map(v=>v*2)));
   const inBattle=battleView(p);
   const motion=context&&!inBattle&&(!battle||battle.exit!==null)?mapMotion(previous,p,masks):null;
   for(const o of memory.values()){
    if(!motion){if(o.tracked)report('position_lost',{candidates:[describe(o)]});o.tracked=false;continue;}
    if(!o.tracked)continue;
    if(o.marker)o.marker=[o.marker[0]+motion[0],o.marker[1]+motion[1]];
    if(o.labelBox)o.labelBox=[o.labelBox[0]+motion[0],o.labelBox[1]+motion[1],...o.labelBox.slice(2)];
    o.positionTime=time;
   }
   for(const o of observations)if(o.currentHp>0&&o.currentHp<=o.maxHp&&Number.isSafeInteger(o.serial)&&o.serial>0&&valid(o)&&observations.filter(b=>key(b)===key(o)).length===1){
    const old=memory.get(key(o)),run=old?.tick===tick-1?old.run+1:1;
    if(!old||old.currentHp!==o.currentHp||old.maxHp!==o.maxHp||old.instanceId!==o.instanceId)report('memory_updated',{candidates:[describe(o)],previousHp:old?.instanceId===o.instanceId?old.currentHp:null});
    // Automatic reads have already passed the bridge's consecutive validation.
    memory.set(key(o),{...o,time,tick,run,confirmed:true,tracked:!!o.labelBox,positionTime:time});
   }
   const current=observations.filter(o=>valid(o)&&o.currentHp>0&&o.currentHp<=o.maxHp&&memory.has(key(o)));
   if(current.length===1)focus={...memory.get(key(current[0])),time};else if(current.length>1)focus=null;
   if(inBattle&&!wasBattle&&!battle&&!context?.mapVisible){
    const choices=[...memory.values()].filter(o=>o.confirmed&&complete(o.monsterId)&&valid(o)&&time-o.time<=2000&&(!cut||cut.monsterId===o.monsterId)&&!completed.has(key(o)+':'+o.instanceId));
    const focused=focus&&time-focus.time<=2000&&valid(focus)&&complete(focus.monsterId)&&(!cut||cut.monsterId===focus.monsterId)&&!completed.has(key(focus)+':'+focus.instanceId)?focus:null;
    const target=focused||(cut&&choices.length===1?choices[0]:null);
    battle={identity:target,monsterId:cut?.monsterId||target?.monsterId||null,start:time,exit:null};
    report(target?'battle_target':'battle_unknown',{monsterId:battle.monsterId,candidates:target?[describe(target)]:choices.map(describe)});
   }
   if(battle&&time-battle.start>45000){report('battle_expired');battle=null;}
   // Attacks cover the stage and can hide its colors. Only the independently
   // read map clock establishes a return to the map, not a missing stage.
   if(context?.mapVisible&&battle&&battle.exit===null){battle.exit=time;report('map_return');}
   if(battle?.exit!==null&&battle?.exit!==undefined&&time-battle.exit>2500){report('return_expired');battle=null;}
   wasBattle=inBattle;
   function rememberedIdentity(blob){
    if(inBattle)return null;
    const id=blob.match.monsterId,choices=[...memory.values()].filter(o=>o.monsterId===id&&o.confirmed&&complete(id)&&!completed.has(key(o)+':'+o.instanceId));
    if(battle?.exit!==null&&battle?.exit!==undefined&&battle.identity?.monsterId===id&&complete(id)&&valid(battle.identity)&&!completed.has(key(battle.identity)+':'+battle.identity.instanceId))return {...battle.identity,remembered:true,association:'battle'};
    const [x,y,w,h]=blob.box.map(v=>v*2);
    const near=o=>{if(!o.labelBox)return false;const [lx,ly,lw]=o.labelBox;return x+w>=lx-220&&x<=lx+lw+350&&y+h>=ly+10&&y<=ly+300;};
    const tracked=choices.filter(o=>o.tracked&&time-o.positionTime<=750&&near(o));
    if(tracked.length===1)return {...tracked[0],remembered:true,association:'tracked'};
    if(tracked.length>1)return false;
    const recent=choices.filter(o=>time-o.time<=1200);
    // The printed target must be unique and near the partial animation. Its
    // label can be displaced; this path requires the complete confirmed spawn.
    if(recent.length===1&&near(recent[0]))return {...recent[0],remembered:true,association:'recent'};
    // An initial spawn singleton remains unique even after its label vanished.
    if(context?.counts?.[id]===1&&choices.length===1)return {...choices[0],remembered:true,association:'singleton'};
    return null;
   }
   const visible=observations.filter(o=>Number.isInteger(o.serial)&&o.serial>0&&o.currentHp>0&&o.currentHp<=o.maxHp&&o.marker?.length===2&&o.marker.every(Number.isFinite)&&observations.filter(b=>key(o)===key(b)).length===1);
   // Ignore the search-sized foreground footprint (up to 240px wide), including
   // overlapping actors/attack cards, not just the small visible gray patch.
   const excluded=[...identities.values(),...visible].flatMap(o=>o.marker?[[o.marker[0]-120,o.marker[1]-60,240,260],...(o.labelBox?[o.labelBox]:[])]:[]).concat(found.map(b=>b.box.map(v=>v*2)));
   if(!sceneStable(previous,p,excluded)){identities.clear();for(const item of pending)if(!item.identity?.remembered)item.identity=null;}
   previous=p;
   for(const [id,o] of identities)if(time-o.time>1200)identities.delete(id);
   for(const [id,o] of unlocated)if(time-o.time>1200)unlocated.delete(id);
   for(const o of observations)if(Number.isInteger(o.serial)&&o.serial>0&&o.currentHp>0){
    if(!visible.includes(o)){identities.delete(key(o));unlocated.set(key(o),{monsterId:o.monsterId,time});}else unlocated.delete(key(o));
   }
   for(const o of visible){const old=identities.get(key(o)),close=old&&old.maxHp===o.maxHp&&(old.instanceId===undefined||old.instanceId===o.instanceId)&&Math.hypot(old.marker[0]-o.marker[0],old.marker[1]-o.marker[1])<24;
    identities.set(key(o),{...o,time,tick,count:close&&old.tick===tick-1?old.count+1:1});
   }
   for(const item of pending){if(time-item.time>1800){report('beam_timeout',{monsterId:item.monsterId,candidates:item.identity?[describe(item.identity)]:[]});continue;}const [x,y,w,h]=item.box;
    if(!item.identity&&context)item.identity=rememberedIdentity({box:item.box,match:{monsterId:item.monsterId}});
    if(item.identity?.remembered&&(!valid(item.identity)||!complete(item.monsterId)))item.identity=null;
    if(item.identity&&(observations.some(o=>key(o)===key(item.identity)&&o.currentHp>0)||!item.identity.remembered&&([...unlocated.values()].some(o=>o.monsterId===item.monsterId)||[...identities.values()].some(o=>o.monsterId===item.monsterId&&key(o)!==key(item.identity)&&o.marker[0]>=x*2-40&&o.marker[0]<=(x+w)*2+40&&o.marker[1]>=y*2-40&&o.marker[1]<=(y+h)*2+40))))item.identity=null;
    const remains=found.some(b=>b.match.monsterId===item.monsterId&&Math.hypot(b.box[0]+b.box[2]/2-x-w/2,b.box[1]+b.box[3]/2-y-h/2)<18);
    if(beamAt(p,item.box)>item.beam+100&&(!remains||beamAt(p,item.box)>item.beam+220)){
     const identity=item.identity&&!observations.some(o=>key(o)===key(item.identity)&&o.currentHp>0)?item.identity:null;
     const cue={monsterId:item.monsterId,serial:identity?.serial??null,reason:'gray_then_beam',box:item.box.map(v=>v*2),...(identity?{maxHp:identity.maxHp,lastSeenHp:lastSeenHp(identity),instanceId:identity.instanceId,association:identity.association||'leader'}:{} )};
     emitted.push(cue);
     if(!identity&&complete(item.monsterId)){
      const choices=[...memory.values()].filter(o=>o.monsterId===item.monsterId&&valid(o)&&!completed.has(key(o)+':'+o.instanceId));
      const remaining=roster.filter(o=>o.monsterId===item.monsterId&&!o.defeated&&!completed.has(key(o)+':'+o.instanceId));
      // Two unresolved kills of the same kind cannot consume each other's IDs.
      if(unresolved.some(u=>u.cue.monsterId===item.monsterId)){for(const u of unresolved)if(u.cue.monsterId===item.monsterId){u.blocked=true;u.time=time;}}
      else if(choices.length>1&&choices.length===remaining.length)unresolved.push({cue,time,choices,excluded:new Set()});
     }
    }
   }
   for(const u of unresolved)if(time-u.time>5000)report('candidate_timeout',{monsterId:u.cue.monsterId,candidates:u.choices.map(describe)});
   unresolved=unresolved.filter(u=>time-u.time<=5000&&complete(u.cue.monsterId)&&u.choices.every(valid));
   for(const u of unresolved){
    if(u.blocked)continue;
    for(const o of observations){const m=memory.get(key(o));if(u.choices.some(c=>key(c)===key(o))&&o.currentHp>0&&m?.run>=2&&m.tick===tick)u.excluded.add(key(o));}
    const candidates=u.choices.filter(o=>valid(o)&&!u.excluded.has(key(o))&&!completed.has(key(o)+':'+o.instanceId));
    if(candidates.length===1&&u.excluded.size&&!observations.some(o=>key(o)===key(candidates[0])&&o.currentHp>0)&&!emitted.some(c=>c.monsterId===u.cue.monsterId)){
     const o=candidates[0];emitted.push({...u.cue,serial:o.serial,instanceId:o.instanceId,maxHp:o.maxHp,lastSeenHp:lastSeenHp(o),association:'later-survivors'});u.done=true;
    }
   }
   unresolved=unresolved.filter(u=>!u.done);
   pending=pending.filter(item=>time-item.time<=1800&&!emitted.some(e=>e.monsterId===item.monsterId));
   for(const blob of found)if(!emitted.some(e=>e.monsterId===blob.match.monsterId)&&!pending.some(item=>item.monsterId===blob.match.monsterId&&Math.hypot(item.box[0]-blob.box[0],item.box[1]-blob.box[1])<18)){
    const [x,y,w,h]=blob.box.map(v=>v*2),candidates=[...identities.values()].filter(o=>o.monsterId===blob.match.monsterId&&o.marker[0]>=x-40&&o.marker[0]<=x+w+40&&o.marker[1]>=y-40&&o.marker[1]<=y+h+40);
    const remembered=context?rememberedIdentity(blob):null;
    const identity=remembered===false?null:remembered||(candidates.length===1&&candidates[0].count>=2&&![...unlocated.values()].some(o=>o.monsterId===blob.match.monsterId)&&!completed.has(key(candidates[0])+':'+candidates[0].instanceId)?candidates[0]:null);
    pending.push({monsterId:blob.match.monsterId,box:blob.box,time,beam:beamAt(p,blob.box),identity});
    report('gray_detected',{monsterId:blob.match.monsterId,candidates:identity?[describe(identity)]:[...memory.values()].filter(o=>o.monsterId===blob.match.monsterId&&valid(o)).map(describe)});
   }
   for(const cue of emitted)if(cue.serial!==null)completed.add(key(cue)+':'+cue.instanceId);
   for(const cue of emitted)report(cue.serial===null?'identity_pending':'identity_confirmed',{monsterId:cue.monsterId,association:cue.association,candidates:cue.serial===null?[...memory.values()].filter(o=>o.monsterId===cue.monsterId&&valid(o)).map(describe):[describe(cue)]});
   diagnostic={time,code:emitted.length?(emitted.some(c=>c.serial!==null)?'identity_confirmed':'identity_pending'):pending.length?'beam_pending':unresolved.length?'identity_pending':detectedCut?'start_cut':inBattle?'battle_view':'no_gray',events,cut:detectedCut||null,battle:battle?{monsterId:battle.monsterId,candidates:battle.identity?[describe(battle.identity)]:[]}:null,memory:[...memory.values()].map(o=>({...describe(o),ageMs:time-o.time,tracked:o.tracked})),pending:pending.map(o=>({monsterId:o.monsterId,ageMs:time-o.time,candidates:o.identity?[describe(o.identity)]:[]})),unresolved:unresolved.map(o=>({monsterId:o.cue.monsterId,ageMs:time-o.time,blocked:!!o.blocked,candidates:o.choices.filter(c=>!o.excluded.has(key(c))).map(describe)})),grayCount:found.length};
   return emitted.filter((v,i,a)=>a.findIndex(b=>b.monsterId===v.monsterId)===i);
  }};
 }
 window.ScreenReaderDefeatVision={createTracker,createHistory,blobs,pixels};
})();
