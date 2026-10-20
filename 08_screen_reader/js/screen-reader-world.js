// Bounded local text matching. Unknown labels and ambiguous numbers abstain.
(()=>{
 'use strict';
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),cache=new WeakMap();
 const data=r=>{if(!cache.has(r))cache.set(r,decode(r.data));return cache.get(r);};
 function canvas(source){return source.popupFrame||source;}
 function masks(source){const ctx=source.getContext('2d'),{width:w,height:h}=source,p=ctx.getImageData(0,0,w,h).data,red=new Uint8Array(w*h),white=new Uint8Array(w*h);for(let i=0;i<red.length;i++){const k=i*4,r=p[k],g=p[k+1],b=p[k+2];red[i]=Number(r>165&&r>g*1.6&&r>b*1.5);white[i]=Number(Math.min(r,g,b)>215&&Math.max(r,g,b)-Math.min(r,g,b)<35);}return {w,h,red,white};}
 function glyph(mask,w,b,refs){
  const [x,y,bw,bh]=b,c=document.createElement('canvas');c.width=bw;c.height=bh;const ctx=c.getContext('2d'),p=ctx.createImageData(bw,bh);for(let yy=0;yy<bh;yy++)for(let xx=0;xx<bw;xx++){const i=(yy*bw+xx)*4,v=mask[(y+yy)*w+x+xx]*255;p.data[i]=p.data[i+1]=p.data[i+2]=v;p.data[i+3]=255;}ctx.putImageData(p,0,0);const n=document.createElement('canvas');n.width=18;n.height=28;n.getContext('2d').drawImage(c,0,0,18,28);const px=n.getContext('2d').getImageData(0,0,18,28).data,scores=new Map();
  for(const r of refs){const a=data(r);let errors=0;for(let i=0;i<504;i++)errors+=Number(px[i*4]>110)!==a[i];const score=errors/504+Math.min(.2,Math.abs(bw/bh-r.ratio)*.15);scores.set(r.digit,Math.min(scores.get(r.digit)??Infinity,score));}
  const ranked=[...scores].sort((a,b)=>a[1]-b[1]);return ranked[0]&&ranked[0][1]<.17&&(!ranked[1]||ranked[1][1]-ranked[0][1]>.018)?ranked[0][0]:null;
 }
 function components(mask,w,h){
  const seen=new Uint8Array(mask.length),out=[],queue=new Int32Array(mask.length);
  for(let y=60;y<h;y++)for(let x=0;x<w;x++){const start=y*w+x;if(!mask[start]||seen[start])continue;let head=0,tail=1,count=0,x0=x,x1=x,y0=y,y1=y;queue[0]=start;seen[start]=1;
   while(head<tail){const i=queue[head++],xx=i%w,yy=Math.floor(i/w);count++;x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);for(const j of [i-1,i+1,i-w,i+w])if(j>=0&&j<mask.length&&!seen[j]&&mask[j]&&Math.abs(j%w-xx)<=1){seen[j]=1;queue[tail++]=j;}}
   const bw=x1-x0+1,bh=y1-y0+1;if(bh>=8&&bh<=32&&bw<=24&&count>=10)out.push({x:x0,y:y0,w:bw,h:bh});
  }return out;
 }
 function nameAt(mask,w,h,hp,refs){
  const candidates=[];
  for(const ref of refs){if(hp.maxHp<(ref.minMaxHp||1)||hp.maxHp>(ref.maxMaxHp||999))continue;const a=data(ref),rw=ref.width,rh=ref.height;let best={score:1};
   const scoreAt=(x,y,step=1)=>{let diff=0,total=0;for(let yy=0;yy<rh;yy+=step)for(let xx=0;xx<rw;xx+=step){const av=a[yy*rw+xx],bv=mask[(y+yy)*w+x+xx];diff+=av!==bv;total+=av+bv;}return total?diff/total:1;};
   for(let y=Math.max(0,hp.y-46);y<=hp.y-12;y+=2)for(let x=Math.max(200,Math.floor(hp.x+hp.w/2-Math.max(125,rw/2+35)));x<=Math.min(w-rw,hp.x+25);x+=2){const score=scoreAt(x,y,3);if(score<best.score)best={score,x,y};}
   if(best.x===undefined)continue;let fine={score:1};for(let y=Math.max(0,best.y-3);y<=Math.min(h-rh,best.y+3);y++)for(let x=Math.max(0,best.x-3);x<=Math.min(w-rw,best.x+3);x++){const score=scoreAt(x,y);if(score<fine.score)fine={score,x,y};}if(fine.score<.25)candidates.push({...fine,ref});
  }
  candidates.sort((a,b)=>a.score-b.score);const best=candidates[0];if(!best||candidates.some(c=>c.ref.id!==best.ref.id&&c.score-best.score<.06))return null;return best;
 }
 function readMonsters(source,refs,{positions=false}={}){
  const {w,h,red,white}=masks(source),parts=components(red,w,h),rows=[];
  for(const p of parts){let row=rows.find(r=>Math.abs(r.cy-(p.y+p.h/2))<4);if(!row){row={cy:p.y+p.h/2,parts:[]};rows.push(row);}row.parts.push(p);}
  const observations=[];
  for(const row of rows){const sorted=row.parts.sort((a,b)=>a.x-b.x),groups=[];for(const p of sorted){let group=groups.at(-1);if(!group||p.x-(group.at(-1).x+group.at(-1).w)>8){group=[];groups.push(group);}group.push(p);}
   for(const group of groups){if(group.length<3||group.length>7||group.some(p=>p.x===0||p.x+p.w>=w||p.y===0||p.y+p.h>=h))continue;const chars=group.map(p=>glyph(red,w,[p.x,p.y,p.w,p.h],refs.digits));if(chars.some(c=>c===null))continue;const text=chars.join('');if(!/^\d{1,3}\/\d{1,3}$/.test(text))continue;const [currentHp,maxHp]=text.split('/').map(Number);if(maxHp<1||currentHp>maxHp)continue;
    const hp={x:group[0].x,y:Math.min(...group.map(p=>p.y)),w:group.at(-1).x+group.at(-1).w-group[0].x,maxHp};const name=nameAt(white,w,h,hp,refs.names);if(!name)continue;
    let serial=null;if(!(name.ref.boss||name.ref.noSerial||name.ref.id==='M0014')){serial=ScreenReaderVision.numberAt(source,[name.x+name.ref.width+3,name.y-2,30,name.ref.height+6],'white',refs.digits,true,name.ref.serialMinHeightRatio??.38);if(!Number.isInteger(serial)||serial<1||serial>999)continue;}
    const observation={monsterId:name.ref.id,serial,currentHp,maxHp};
    // Optional map-local geometry, in the same 1536px popup plane as defeat cues.
    if(positions){observation.labelBox=[name.x,name.y,name.ref.width+33,hp.y+Math.max(...group.map(p=>p.h))-name.y];observation.marker=leaderEndpoint(source,name);}
    observations.push(observation);
   }
  }
  // Conflicting labels for one individual must not overwrite each other.
  return observations.filter(o=>observations.filter(p=>p.monsterId===o.monsterId&&p.serial===o.serial).length===1);
 }
 // Follow the thin black leader below a name, not the text's screen position:
 // labels are displaced sideways and can sit above a different overlapping enemy.
 function leaderEndpoint(source,name){
  const {width:w,height:h}=source,p=source.getContext('2d').getImageData(0,0,w,h).data;
  const dark=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&Math.max(p[(y*w+x)*4],p[(y*w+x)*4+1],p[(y*w+x)*4+2])<100;
  const lines=[];
  for(let y=name.y+name.ref.height;y<Math.min(h,name.y+name.ref.height+14);y++){
   let left=null;for(let x=Math.max(0,name.x-50);x<=Math.min(w-1,name.x+name.ref.width+100);x++){
    if(dark(x,y)&&left===null)left=x;
    if((!dark(x,y)||x===w-1)&&left!==null){if(x-left>name.ref.width*.8&&left<=name.x+10&&x>=name.x+name.ref.width)lines.push({left,right:x-1,y});left=null;}
   }
  }
  if(!lines.length)return null;
  const line=lines.at(-1),ends=[];
  for(const start of [line.left,line.right]){
   let x=start,last=[x,line.y],length=0;
   for(let y=line.y+1;y<Math.min(h,line.y+140);y++){
    const points=[];for(let xx=Math.max(0,Math.round(x)-5);xx<=Math.min(w-1,Math.round(x)+5);xx++)if(dark(xx,y))points.push(xx);
    if(!points.length||points.length>8)break;
    x=points.reduce((a,b)=>a+b,0)/points.length;last=[x,y];length++;
   }
   // A leader can touch a thick character/monster outline after only a few
   // rows. Keep following its measured straight ray through that junction,
   // rather than demanding the entire leader remain a separate thin blob.
   if(length>=3&&length<12){
    const slope=(last[0]-start)/length;
    if(Math.abs(slope)>=.5&&Math.abs(slope)<=4)for(let y=last[1]+1;y<Math.min(h,line.y+140);y++){
     const predicted=start+slope*(y-line.y),xx=Math.round(predicted);
     if(![xx-1,xx,xx+1].some(px=>dark(px,y)))break;
     last=[predicted,y];length++;
    }
   }
   if(length>=12&&Math.abs(last[0]-start)>=10)ends.push(last);
  }
  return ends.length===1?ends[0]:null;
 }
 function clockAt(source,refs,shift){
  const left=canvas(source),center=source.statusFrame||source,vision=ScreenReaderVision,round=window.ScreenReaderStartVision?.readRound(left)??vision.numberAt(left,[54,7,43,30],'white',refs.digits),ctx=center.getContext('2d'),digits=refs.digits.filter(r=>r.digit!=='/'),cells=[];
  for(let i=0;i<9;i++){const x=593+shift+i*48,p=ctx.getImageData(x-20,2,40,24).data;let blue=0;for(let k=0;k<p.length;k+=4)if(p[k]<70&&p[k+1]>110&&p[k+2]>180)blue++;const value=vision.numberAt(center,[x-15,1,30,25],'white',digits);cells.push({index:i,blue:blue>180,value});}
  const active=cells.filter(c=>c.blue);if(active.length!==1)return null;const anchors=cells.filter(c=>Number.isInteger(c.value)&&c.value>=1&&c.value<=99),offsets=new Map();for(const c of anchors){const offset=c.value-c.index;offsets.set(offset,(offsets.get(offset)||0)+1);}const ranks=[...offsets].sort((a,b)=>b[1]-a[1]);if(!ranks[0]||ranks[0][1]<3||(ranks[1]&&ranks[1][1]>1))return null;
  const progress=ranks[0][0]+active[0].index;if(progress<1||progress>99||!Number.isInteger(round)||round<1||round>99)return null;if(active[0].value!==null&&active[0].value!==progress)return null;return {round,progress};
 }
 function readClock(source,refs){
  const candidates=[0,-18].map(shift=>clockAt(source,refs,shift)).filter(Boolean);
  return candidates.length&&candidates.every(c=>c.round===candidates[0].round&&c.progress===candidates[0].progress)?candidates[0]:null;
 }
 function analyze(source,options){const base=window.ScreenReaderWorldReferences;if(!base)return {clock:null,monsters:[]};const refs={...base,digits:[...base.digits,...ScreenReaderReferences.digits,...(window.ScreenReaderStartReferences?.digits||[])]};return {clock:readClock(source,refs),monsters:readMonsters(canvas(source),refs,options)};}
 window.ScreenReaderWorldVision={analyze,readClock,readMonsters};
})();
