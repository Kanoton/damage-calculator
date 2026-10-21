// A cut-in supplies species evidence only. Numbers must come from map records.
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
 window.ScreenReaderCombatVision={analyzePixels,analyze:source=>analyzePixels(window.ScreenReaderDefeatVision.pixels(source))};
})();
