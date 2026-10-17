// Compare foreground artwork and rarity; animated token backgrounds are excluded.
(()=>{
 'use strict';
 const side=32,cache=new WeakMap();
 function prepare(mask){
  const positions=[],dilated=new Uint8Array(1024);
  for(let i=0;i<1024;i++)if(mask[i]){positions.push(i);const x=i%side,y=i>>5;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<side&&y+dy>=0&&y+dy<side)dilated[(y+dy)*side+x+dx]=1;}
  return {mask,positions,dilated};
 }
 function match(source,x,y){
  const c=document.createElement('canvas');c.width=c.height=side;c.getContext('2d').drawImage(source,x-26,y-26,52,52,0,0,side,side);
  const p=c.getContext('2d').getImageData(0,0,side,side).data,mask=new Uint8Array(1024),votes=[0,0,0];
  for(let i=0;i<1024;i++){
   const r=p[i*4],g=p[i*4+1],b=p[i*4+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b),xx=i%side,yy=i>>5;
   mask[i]=Number(lo>110&&hi>180&&hi-lo<135&&(xx-15.5)**2+(yy-15.5)**2<14.5**2);
   votes[0]+=Number(b>150&&g>90&&r<110);votes[1]+=Number(r>135&&b>150&&g<105);votes[2]+=Number(r>165&&g>120&&b<120);
  }
  const a=prepare(mask),sorted=[...votes].sort((a,b)=>b-a);
  if(a.positions.length<35||sorted[0]<35||sorted[0]<sorted[1]*1.2)return null;
  const rarity=votes.indexOf(sorted[0]),scores=new Map();
  for(const ref of window.ScreenReaderChipShapeReferences?.shapes||[]){
   if(ref.rarity!==rarity)continue;let b=cache.get(ref);
   if(!b){const raw=Uint8Array.from(atob(ref.data),c=>c.charCodeAt(0)),m=new Uint8Array(1024);for(let i=0;i<1024;i++)m[i]=(raw[i>>3]>>(i&7))&1;b=prepare(m);cache.set(ref,b);}
   const total=a.positions.length+b.positions.length;if(!b.positions.length||a.positions.length>b.positions.length*1.8||b.positions.length>a.positions.length*1.8)continue;let best=1;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    let overlap=0,miss=0;
    for(const i of b.positions){const xx=(i%side)+dx,yy=(i>>5)+dy,k=yy*side+xx,inside=xx>=0&&xx<side&&yy>=0&&yy<side;overlap+=Number(inside&&a.mask[k]);miss+=Number(!inside||!a.dilated[k]);}
    for(const i of a.positions){const xx=(i%side)-dx,yy=(i>>5)-dy;miss+=Number(xx<0||xx>=side||yy<0||yy>=side||!b.dilated[yy*side+xx]);}
    best=Math.min(best,.6*miss/total+.4*(total-2*overlap)/total);
   }
   scores.set(ref.id,Math.min(scores.get(ref.id)??1,best));
  }
  const ranked=[...scores].sort((a,b)=>a[1]-b[1]);
  if(!ranked.length||ranked[0][1]>.32||(ranked[1]&&ranked[1][1]-ranked[0][1]<.045))return null;
  return {id:ranked[0][0],confidence:Math.round((1-ranked[0][1])*100)};
 }
 window.ScreenReaderChipShape={match};
})();
