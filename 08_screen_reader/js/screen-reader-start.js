// Read explicit text independently of round/progress and party recognition.
(()=>{
 'use strict';
 let cached=null;
 function analyze(source){
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
