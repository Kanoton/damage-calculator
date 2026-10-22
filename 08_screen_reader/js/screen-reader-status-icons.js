// Read icons in regions, then read the white count at the icon's own corner.
(()=>{
 'use strict';
 function countAt(source,box){
  const c=document.createElement('canvas');c.width=box[2]*3;c.height=box[3]*3;c.getContext('2d').drawImage(source,...box,0,0,c.width,c.height);
  const ctx=c.getContext('2d'),p=ctx.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height,seen=new Uint8Array(w*h),parts=[];
  const white=i=>Math.min(p[i*4],p[i*4+1],p[i*4+2])>215&&Math.max(p[i*4],p[i*4+1],p[i*4+2])-Math.min(p[i*4],p[i*4+1],p[i*4+2])<35;
  for(let i=0;i<w*h;i++){if(seen[i]||!white(i))continue;const q=[i];seen[i]=1;let x0=w,y0=h,x1=0,y1=0;
   for(let j=0;j<q.length;j++){const k=q[j],x=k%w,y=Math.floor(k/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const n of [k-1,k+1,k-w,k+w])if(n>=0&&n<w*h&&Math.abs(n%w-x)<=1&&!seen[n]&&white(n)){seen[n]=1;q.push(n);}}
   if(x0===0||y0===0||x1===w-1||y1===h-1||y1-y0<14||q.length<20)continue;
   const glyph=document.createElement('canvas');glyph.width=x1-x0+5;glyph.height=y1-y0+5;const gc=glyph.getContext('2d');gc.fillStyle='black';gc.fillRect(0,0,glyph.width,glyph.height);gc.fillStyle='white';for(const k of q)gc.fillRect(k%w-x0+2,Math.floor(k/w)-y0+2,1,1);
   const value=ScreenReaderVision.numberAt(glyph,[0,0,glyph.width,glyph.height],'white',[...ScreenReaderReferences.digits,...ScreenReaderStatusIconDigits],false,.3);
   parts.push({x:x0,height:y1-y0+1,value});
  }
  // Nearby artwork can leave a short isolated white fragment after scaling.
  // Digits in one counter share a font height; unreadable full-height ink still rejects it.
  const height=Math.max(0,...parts.map(p=>p.height)),digits=parts.filter(p=>p.height>=height*.75);
  if(digits.some(p=>!Number.isInteger(p.value)||p.value<0||p.value>9))return null;
  digits.sort((a,b)=>a.x-b.x);return digits.length&&digits.length<=2?Number(digits.map(p=>p.value).join('')):null;
 }
 function find(source,region,scope){
  const w=source.width,h=source.height,p=source.getContext('2d').getImageData(0,0,w,h).data,out=[];
  for(const ref of ScreenReaderStatusIconReferences.filter(r=>r.scope===scope)){
   const stride=scope==='self'?3:2,hits=[],score=(x,y,size)=>{
    let sum=0,n=0;for(let j=0;j<ref.points.length;j++){const [xx,yy]=ref.points[j],k=((y+Math.floor((yy+.5)*size/8))*w+x+Math.floor((xx+.5)*size/8))*4;for(let c=0;c<3;c++){sum+=Math.abs(p[k+c]-ref.rgb[j*3+c]);n++;}if(j===7&&sum/n>35)return Infinity;}return sum/n;
   };
   for(const size of [32,33,34,35,36])for(let y=Math.max(0,Math.floor(region[1]));y<Math.min(h-size,region[1]+region[3]);y+=stride)for(let x=Math.max(0,Math.floor(region[0]));x<Math.min(w-size,region[0]+region[2]);x+=stride){const error=score(x,y,size);if(error<35)hits.push({x,y,size,score:error});}
   const fine=[];for(const hit of hits){for(let dy=1-stride;dy<stride;dy++)for(let dx=1-stride;dx<stride;dx++){const x=hit.x+dx,y=hit.y+dy;if(x<0||y<0||x+hit.size>=w||y+hit.size>=h)continue;const error=score(x,y,hit.size);if(error<19)fine.push({x,y,size:hit.size,score:error});}}
   fine.sort((a,b)=>a.score-b.score);const best=fine[0];if(!best||fine.some(b=>Math.hypot(b.x-best.x,b.y-best.y)>best.size*.65))continue;
   const {x,y,size:s}=best;if(ref.corner===null){
    // A flag has no count as a second cue: also require the visible icon frame.
    let sides=0,exactSides=0;for(let side=0;side<4;side++){let white=0,exact=0;for(let i=2;i<=6;i++){const xx=Math.round(x+(side<2?(side?s-1:0):i*s/8)),yy=Math.round(y+(side>=2?(side===3?s-1:0):i*s/8));const center=(yy*w+xx)*4;if(Math.min(p[center],p[center+1],p[center+2])>210&&Math.max(p[center],p[center+1],p[center+2])-Math.min(p[center],p[center+1],p[center+2])<40)exact++;let found=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=((yy+dy)*w+xx+dx)*4;if(Math.min(p[k],p[k+1],p[k+2])>210&&Math.max(p[k],p[k+1],p[k+2])-Math.min(p[k],p[k+1],p[k+2])<40)found=true;}if(found)white++;}if(white>=3)sides++;if(exact>=3)exactSides++;}if(sides<3||ref.strictFrame&&exactSides<2)continue;
    out.push({key:ref.key,value:1,box:[x,y,s,s]});continue;}const box=ref.corner==='top'?[Math.round(x+s*.72),y-9,17,23]:[Math.max(0,x-9),Math.round(y+s*.65),20,23];
   const value=countAt(source,box);if(Number.isInteger(value)&&value>0&&value<=99)out.push({key:ref.key,value,box:[x,y,s,s]});
  }return out.filter((icon,index)=>out.findIndex(i=>i.key===icon.key)===index&&!out.some(i=>i.key===icon.key&&(i.value!==icon.value||Math.hypot(i.box[0]-icon.box[0],i.box[1]-icon.box[1])>Math.max(i.box[2],icon.box[2])*.65)));
 }
 function analyze(source,monsters=[]){
  const c=source.popupFrame||source;
  const own=find(c,[0,300,160,340],'self'),targets=[];
  for(const m of monsters){if(!m.labelBox)continue;const [x,y,w,h]=m.labelBox,region=[x-42,y+h+1,Math.min(140,w),65],icons=find(c,region,'monster');
   const unique=icons.filter(i=>!monsters.some(o=>o!==m&&o.labelBox&&i.box[0]>=o.labelBox[0]-42&&i.box[0]<=o.labelBox[0]+Math.min(140,o.labelBox[2])&&i.box[1]>=o.labelBox[1]+o.labelBox[3]+1&&i.box[1]<=o.labelBox[1]+o.labelBox[3]+66));
   if(unique.length)targets.push({...m,icons:unique});
  }return {self:own,monsters:targets};
 }
 window.ScreenReaderStatusIcons={analyze,find,countAt};
})();
