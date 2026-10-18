// Read explicit text independently of round/progress and party recognition.
(()=>{
 'use strict';
 let cached=null;
 function legacy(source){
  const refs=window.ScreenReaderStartReferences;if(!refs)return null;
  if(!cached)cached=refs.fields.map(r=>({...r,mask:Uint8Array.from(atob(r.data),c=>c.charCodeAt(0))}));
  const ctx=source.getContext('2d');
  for(const ref of cached){const [x,y,w,h]=ref.box;let best=1;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p=ctx.getImageData(x+dx,y+dy,w,h).data;let errors=0,total=0;
    for(let i=0;i<ref.mask.length;i++){const k=i*4,r=p[k],g=p[k+1],b=p[k+2],v=ref.kind==='white'?Number(Math.min(r,g,b)>220&&Math.max(r,g,b)-Math.min(r,g,b)<30):Number(r>180&&g<140&&b>80);errors+=v!==ref.mask[i];total+=v+ref.mask[i];}
    best=Math.min(best,total?errors/total:1);
   }if(best>.16)return null;
  }
  return {map:refs.map,difficulty:refs.difficulty};
 }
 // Whole printed words are recognized independently against the canonical CSV.
 // The position/labels establish the field; thinking time is never a difficulty.
 const textCache=new WeakMap();
 function word(source,box,kind,refs){
  const [x,y,w,h]=box,ctx=source.getContext('2d'),p=ctx.getImageData(x,y,w,h),mask=new Uint8Array(w*h);
  let left=w,right=0,top=h,bottom=0,count=0;
  for(let i=0;i<mask.length;i++){const k=i*4,r=p.data[k],g=p.data[k+1],b=p.data[k+2],v=kind==='pink'?Number(r>180&&g<140&&b>80):Number(Math.min(r,g,b)>215&&Math.max(r,g,b)-Math.min(r,g,b)<35);mask[i]=v;if(v){const xx=i%w,yy=Math.floor(i/w);left=Math.min(left,xx);right=Math.max(right,xx+1);top=Math.min(top,yy);bottom=Math.max(bottom,yy+1);count++;}}
  if(count<35||bottom-top<12||left===0||right===w||top===0||bottom===h)return null;
  for(let i=0;i<mask.length;i++){p.data[i*4]=p.data[i*4+1]=p.data[i*4+2]=mask[i]*255;p.data[i*4+3]=255;}
  const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(p,0,0);
  const n=document.createElement('canvas');n.width=128;n.height=32;n.getContext('2d').drawImage(c,left,top,right-left,bottom-top,0,0,128,32);
  const a=n.getContext('2d').getImageData(0,0,128,32).data,ratio=(right-left)/(bottom-top),scores=new Map();
  for(const ref of refs){let b=textCache.get(ref);if(!b){b=Uint8Array.from(atob(ref.data),x=>x.charCodeAt(0));textCache.set(ref,b);}let error=0;for(let i=0;i<4096;i++)error+=Number(a[i*4]>110)!==((b[i>>3]>>(i&7))&1);const score=error/4096+Math.min(.3,Math.abs(ratio-ref.ratio)*.045);scores.set(ref.id,Math.min(scores.get(ref.id)??Infinity,score));}
  const ranked=[...scores].sort((a,b)=>a[1]-b[1]);
  return ranked[0]&&ranked[0][1]<.205&&(!ranked[1]||ranked[1][1]-ranked[0][1]>.035)?ranked[0][0]:null;
 }
 function analyze(source){
  const text=window.ScreenReaderStartReferences?.text;if(!text)return legacy(source);
  const layouts=[
   {map:[340,242,280,41],difficulty:[350,330,270,40],kind:'white',labels:[[205,242,96,41],[205,330,96,40]]},
   {map:[352,644,550,51],difficulty:[1040,650,90,48],kind:'pink'}
  ];
  for(const layout of layouts){
   if(layout.labels&&(!layout.labels.every((box,i)=>word(source,box,'white',text.labels)===(i?'難易度':'マップ'))))continue;
   const map=word(source,layout.map,'white',text.maps),difficulty=word(source,layout.difficulty,layout.kind,text.difficulties);
   if(map&&difficulty)return {map,difficulty};
  }
  return legacy(source);
 }
 function readRound(source){
  const ref=window.ScreenReaderStartReferences?.roundOne;if(!ref)return null;
  const mask=Uint8Array.from(atob(ref.data),c=>c.charCodeAt(0)),[x,y,w,h]=ref.box,ctx=source.getContext('2d');
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p=ctx.getImageData(x+dx,y+dy,w,h).data;let errors=0,total=0;
   for(let i=0;i<mask.length;i++){const k=i*4,v=Number(Math.max(p[k],p[k+1],p[k+2])<110);errors+=v!==mask[i];total+=v+mask[i];}
   if(total&&errors/total<.18)return 1;
  }return null;
 }
 window.ScreenReaderStartVision={analyze,readRound};
})();
