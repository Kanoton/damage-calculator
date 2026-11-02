// Cut-in species and initial battle HP. Numbered identities come from the map ledger.
(()=>{
 'use strict';
 function analyzePixels(p){
  const ref=window.ScreenReaderCutReferences;if(!ref)return null;
  let purple=0,n=0;for(let y=70;y<170;y+=5)for(let x=110;x<200;x+=5){const k=(y*768+x)*4;n++;if(p[k]>90&&p[k+2]>130&&p[k+1]<100)purple++;}
  if(purple/n<.25)return null;
  let best=Infinity;
  for(let dy=-6;dy<=6;dy+=2)for(let dx=-8;dx<=8;dx+=2){
   const errors=ref.patches.map(({box:[x,y,w,h],rgb})=>{let sum=0,i=0;for(let yy=0;yy<12;yy++)for(let xx=0;xx<12;xx++){const k=((y+Math.floor((yy+.5)*h/12)+dy)*768+x+Math.floor((xx+.5)*w/12)+dx)*4;for(let c=0;c<3;c++)sum+=Math.abs(p[k+c]-rgb[i++]);}return sum/rgb.length;}).sort((a,b)=>a-b);
   if(errors[1]<20)best=Math.min(best,(errors[0]+errors[1])/2);
  }
  return best<15?{monsterId:ref.monsterId,score:best,source:'start-cut'}:null;
 }
 // Black battle HP glyph 1: reviewed battle.png [292,164,5,11], normalized 18x28.
 const hpOne={digit:'1',ratio:5/11,data:'AAAAAAAAAAAAAAABAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAABAQEBAQEBAQEBAQEBAAAAAAEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAQEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAQEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAA'};
 // Reviewed battle-hp2.png [293,164,5,11], same 18x28 black-glyph normalization.
 const hpTwo={digit:'2',ratio:5/11,data:'AQEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAAAAAAAAQEBAQEBAQEBAQEBAAAAAAAAAAEBAQEBAQEBAQEBAAAAAAAAAAEBAQEBAQEBAQEBAAAAAAAAAAEBAQEBAQEBAQEBAAAAAAAAAAEBAQEBAQEBAQEBAAAAAAAAAAEBAQEBAQEBAQAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEBAAAAAAAAAAAAAAEBAQEBAQEAAAAAAAAAAAABAQEBAQEBAQAAAAAAAAAAAQEBAQEBAQEAAAAAAAAAAAAAAQEBAQEBAQAAAAAAAAAAAAAAAQEBAQEAAAAAAAAAAAAAAAAAAQEBAQEAAAAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB'};
 // Magenta defender READY! text from the same reviewed battle fixture [190,186,74,24].
 const readyMask=atob('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBAQEBAAAAAAAAAQEBAQAAAAABAQEBAQAAAAABAQEBAQEBAAAAAAABAQEAAAABAQEAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAEBAQEBAQEBAAAAAQEBAQEBAAAAAQEBAQEBAQAAAAEBAQEBAQEBAQAAAAEBAQEAAQEBAAAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAAABAQEBAQEAAAABAQEBAQEBAAAAAQEBAQEBAQEBAQAAAAEBAQEBAQEAAAABAQEAAAAAAAAAAAAAAAAAAAAAAAABAQEBAAEBAQEAAAEBAQEAAAAAAQEBAQABAQEBAAABAQEBAAEBAQEBAQAAAQEBAQEBAAAAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAEBAQAAAAEBAQAAAQEBAAAAAAABAQEBAAEBAQEAAAEBAQAAAAABAQEBAAAAAQEBAQEAAAAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAQEBAAEBAQEBAAABAQEBAQEAAAEBAQEAAQEBAQAAAQEBAAAAAAABAQEAAAAAAQEBAAAAAAABAQEAAAAAAAAAAAAAAAAAAAAAAAABAQEAAQEBAQAAAAEBAQEBAQAAAQEBAQEBAQEBAAABAQEAAAAAAAEBAQAAAAABAQEAAAAAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAEBAQABAQEBAAAAAQEBAAAAAAABAQEBAQEBAQEAAAEBAQAAAAABAQEBAAAAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAAEBAQEAAAABAQEAAAAAAAEBAQEBAQEBAQAAAQEBAAAAAQEBAQEAAAAAAQEBAAAAAAABAQEAAAAAAAAAAAAAAAAAAAAAAAABAQEAAAEBAQAAAAEBAQEBAQAAAQEBAQABAQEBAAABAQEAAQEBAQEBAAAAAAABAQEAAAAAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAEBAQAAAQEBAQAAAQEBAQEBAAABAQEBAAEBAQEAAAEBAQABAQEBAQAAAAAAAAEBAQAAAAAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAQEBAAAAAQEBAAAAAQEBAQEAAAEBAQEAAQEBAQAAAQEBAAEBAQEAAAAAAAAAAQEBAAAAAAABAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
 function readyPixels(p){
  for(let dy=-4;dy<=4;dy+=2)for(let dx=-40;dx<=40;dx+=2){let diff=0,total=0;for(let y=0;y<24;y+=2)for(let x=0;x<74;x+=2){const k=((246+y+dy)*768+340+x+dx)*4,a=readyMask.charCodeAt(y*74+x),b=Number(p[k]>130&&p[k+2]>120&&p[k+1]<100&&p[k]>p[k+1]*1.8&&p[k+2]>p[k+1]*1.8);diff+=a!==b;total+=a+b;}if(total>25&&diff/total<.18)return true;}
  return false;
 }
 function readHpPixels(p){
  const W=768,H=355,seen=new Uint8Array(W*H),result=[];
  const white=i=>Math.min(p[i*4],p[i*4+1],p[i*4+2])>215&&Math.max(p[i*4],p[i*4+1],p[i*4+2])-Math.min(p[i*4],p[i*4+1],p[i*4+2])<35;
  const refs=[...(window.ScreenReaderReferences?.digits||[]),...(window.ScreenReaderWorldReferences?.digits||[]),hpOne,hpTwo];
  for(let y=190;y<270;y++)for(let x=20;x<740;x++){
   const start=y*W+x;if(seen[start]||!white(start))continue;
   const q=[start];seen[start]=1;let x0=x,x1=x,y0=y,y1=y;
   for(let a=0;a<q.length;a++){const i=q[a],xx=i%W,yy=Math.floor(i/W);x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<W*H&&!seen[j]&&Math.abs(j%W-xx)<=1&&white(j)){seen[j]=1;q.push(j);}}
   const w=x1-x0+1,h=y1-y0+1;if(q.length<80||h<10||h>20||w<24||w>65)continue;
   let pink=0,right=-1;for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const k=(yy*W+xx)*4;if(p[k]>150&&p[k+1]<110&&p[k+2]>60&&p[k]>p[k+1]*1.5&&p[k+2]>p[k+1]*1.3){pink++;right=Math.max(right,xx);}}
   if(pink<10||right>x0+w*.55)continue;
   const left=right+2,top=y0+1,rw=x1-left,rh=h-2;if(rw<6)continue;
   const ink=new Uint8Array(rw*rh),used=new Uint8Array(rw*rh),parts=[];
   for(let yy=0;yy<rh;yy++)for(let xx=0;xx<rw;xx++){const k=((top+yy)*W+left+xx)*4;ink[yy*rw+xx]=Number(Math.max(p[k],p[k+1],p[k+2])<100);}
   let bad=false;for(let i=0;i<ink.length;i++){if(!ink[i]||used[i])continue;const a=[i];used[i]=1;let lx=i%rw,rx=lx,ty=Math.floor(i/rw),by=ty;for(let z=0;z<a.length;z++){const k=a[z],xx=k%rw,yy=Math.floor(k/rw);lx=Math.min(lx,xx);rx=Math.max(rx,xx);ty=Math.min(ty,yy);by=Math.max(by,yy);for(const j of [k-1,k+1,k-rw,k+rw])if(j>=0&&j<ink.length&&Math.abs(j%rw-xx)<=1&&ink[j]&&!used[j]){used[j]=1;a.push(j);}}
    if(a.length<6)continue;if(by-ty+1<7||lx===0||rx===rw-1||ty===0||by===rh-1){bad=true;break;}
    const c=document.createElement('canvas');c.width=rx-lx+1;c.height=by-ty+1;const cx=c.getContext('2d'),d=cx.createImageData(c.width,c.height);for(const k of a){const j=((Math.floor(k/rw)-ty)*c.width+k%rw-lx)*4;d.data[j]=d.data[j+1]=d.data[j+2]=255;d.data[j+3]=255;}cx.putImageData(d,0,0);const n=document.createElement('canvas');n.width=18;n.height=28;n.getContext('2d').fillRect(0,0,18,28);n.getContext('2d').drawImage(c,0,0,18,28);const v=n.getContext('2d').getImageData(0,0,18,28).data,scores=new Map();for(const ref of refs){const b=atob(ref.data);if(b.length!==504)continue;let e=0;for(let k=0;k<504;k++)e+=Number(v[k*4]>110)!==b.charCodeAt(k);const score=e/504+Math.min(.2,Math.abs(c.width/c.height-ref.ratio)*.15);scores.set(ref.digit,Math.min(score,scores.get(ref.digit)??Infinity));}const ranks=[...scores].sort((a,b)=>a[1]-b[1]);if(!ranks[0]||ranks[0][1]>.19||ranks[1]&&ranks[1][1]-ranks[0][1]<.018){bad=true;break;}parts.push({x:lx,digit:ranks[0][0]});
   }
   parts.sort((a,b)=>a.x-b.x);if(!bad&&parts.length>0&&parts.length<=3){const hp=Number(parts.map(p=>p.digit).join(''));if(hp>0&&hp<=999)result.push({hp,box:[x0,y0,w,h]});}
  }
  return result.sort((a,b)=>a.box[0]-b.box[0]);
 }
 window.ScreenReaderCombatVision={analyzePixels,readHpPixels,readyPixels,analyze:source=>analyzePixels(window.ScreenReaderDefeatVision.pixels(source))};
})();

