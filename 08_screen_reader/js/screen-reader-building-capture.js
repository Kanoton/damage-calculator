(()=>{
 'use strict';
 // Optional, user-triggered research review. Never assigns map slots or
 // plant types from pixels. No images leave this browser.
 const $=id=>document.getElementById(id);
 const canvas=$('reader-building-frame'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const status=$('reader-building-status'),slot=$('reader-building-slot'),plant=$('reader-building-plant');
 const review=$('reader-building-review'),confirm=$('reader-building-confirm'),clear=$('reader-building-clear');
 const selection=$('reader-building-selection');
 let captured=null;

 function hsv(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;
  if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*30+180)%180;}
  return [h,mx===0?0:d/mx*255,mx*255];
 }
 function candidates(image){
  // The known research thresholds have poor field precision and recall.
  // Expose ALL matches only as clues, never as automatic placement votes.
  const {data,width,height}=image,mask=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=y*width+x,p=i*4,h=hsv(data[p],data[p+1],data[p+2]);
   if((h[0]>=3&&h[0]<=29&&h[1]>=30&&h[1]<=155&&h[2]>=130)||
      (h[0]>=75&&h[0]<=105&&h[1]>=75&&h[2]>=85))mask[i]=1;
  }
  const seen=new Uint8Array(mask.length),q=new Int32Array(mask.length),out=[];
  for(let y=40;y<height-20;y++)for(let x=80;x<width-30;x++){
   const start=y*width+x;if(!mask[start]||seen[start])continue;
   let head=0,tail=1;q[0]=start;seen[start]=1;
   let area=0,sx=0,sy=0,minx=width,maxx=0,miny=height,maxy=0;
   while(head<tail){
    const p=q[head++],px=p%width,py=(p/width)|0;
    area++;sx+=px;sy+=py;
    minx=Math.min(minx,px);maxx=Math.max(maxx,px);
    miny=Math.min(miny,py);maxy=Math.max(maxy,py);
    for(const n of [px>0?p-1:-1,px<width-1?p+1:-1,py>0?p-width:-1,py<height-1?p+width:-1]){
     if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;q[tail++]=n;}
    }
   }
   const w=maxx-minx+1,h=maxy-miny+1,cx=sx/area,cy=sy/area;
   if(area>=140&&area<=2800&&w>=25&&w<=105&&h>=14&&h<=85&&
      cx>80&&cx<470&&cy>50&&cy<240)out.push({x:cx,y:cy,area});
  }
  return out.sort((a,b)=>a.y-b.y).slice(0,80);
 }
 function render(){
  if(!captured)return;
  ctx.putImageData(captured.image,0,0);
  ctx.lineWidth=2;
  captured.points.forEach((p,i)=>{
   ctx.beginPath();ctx.strokeStyle='#ffcc33';ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#1c1c1c';ctx.font='12px sans-serif';ctx.fillText('C'+(i+1),p.x+7,p.y-6);
  });
  if(captured.click){
   const {x,y}=captured.click;ctx.strokeStyle='#1aff5b';ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x+11,y);ctx.moveTo(x,y-11);ctx.lineTo(x,y+11);ctx.stroke();
  }
 }
 function reset(message){
  captured=null;review.hidden=true;confirm.checked=false;
  slot.replaceChildren(new Option('マスを選択',''));plant.replaceChildren(new Option('植物を選択',''));
  status.textContent=message||'取得した画像はありません。';selection.textContent='';
 }
 function capture(source){
  if(!source||!(source.videoWidth||source.naturalWidth||source.width)){
   reset('画面共有または画像の読み込みが必要です。');return;
  }
  const bridge=window.ScreenReaderBuildingBridge;
  const options=bridge?.manualReviewOptions?.();
  if(options?.mapId!=='MAP0105'||!options.slots.length){
   reset('秋幻の森（MAP0105）を選択してから取得してください。');return;
  }
  // Take the snapshot only on the explicit button press, not during auto-read.
  ctx.clearRect(0,0,512,288);
  ctx.drawImage(source,0,0,512,288);
  const image=ctx.getImageData(0,0,512,288);
  captured={image,options,points:candidates(image),click:null};
  slot.replaceChildren(new Option('マスを選択',''),
   ...options.slots.map(v=>new Option(v.label,v.slotId)));
  plant.replaceChildren(new Option('植物を選択',''),
   ...options.cards.map(v=>new Option(v.name,v.name)));
  confirm.checked=false;review.hidden=false;review.open=true;render();
  selection.textContent='画像上の台座をクリックして位置を確認してください。';
  status.textContent='1枚を取得。色・輪郭の参考候補'+captured.points.length+
   '件（未確認）。黄色Cは切り株の証拠ではありません。';
 }
 canvas.addEventListener('click',event=>{
  if(!captured)return;
  const r=canvas.getBoundingClientRect();
  const x=(event.clientX-r.left)*512/r.width,y=(event.clientY-r.top)*288/r.height;
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  captured.click={x,y};confirm.checked=false;render();
  const near=captured.points.map((p,i)=>({i,d:Math.hypot(p.x-x,p.y-y)}))
   .sort((a,b)=>a.d-b.d)[0];
  selection.textContent=(near&&near.d<16?'参考候補C'+(near.i+1)+'付近。':'任意の位置。')+
   ' 画面上の位置だけではO/IマスIDを確定できません。';
 });
 slot.addEventListener('change',()=>{confirm.checked=false;});
 plant.addEventListener('change',()=>{confirm.checked=false;});
 clear.addEventListener('click',()=>reset('取得画像を破棄しました。'));
 $('reader-building-apply').addEventListener('click',()=>{
  if(!captured||!captured.click||!slot.value||!plant.value||!confirm.checked){
   status.textContent='画像上の台座位置・マス番号・植物種類を確認し、チェックしてください。';return;
  }
  const bridge=window.ScreenReaderBuildingBridge,context=bridge?.context();
  if(context?.mapId!==captured.options.mapId||
     context?.difficulty!==captured.options.difficulty){
   reset('マップまたは難易度が変わったので取得結果を破棄しました。');return;
  }
  const result=bridge.applyManuallyReviewed({
   mode:'single-capture-human-review',humanConfirmed:true,
   mapId:context.mapId,difficulty:context.difficulty,
   slotId:slot.value,name:plant.value
  });
  status.textContent=result.added===1?'確認した1マスを更新しました。':
   result.reason==='manual-conflict'?'既存の建築情報と異なるため変更しませんでした。':
   result.reason==='unchanged'?'すでに同じ建築が登録されています。':
   '更新を保留しました：'+result.reason;
  confirm.checked=false;
  // Each individual application needs a fresh explicit capture + review.
  if(result.added===1){captured=null;review.hidden=true;}
 });
 window.addEventListener('new-game-reset',()=>reset('新しいゲームのため取得画像を破棄しました。'));
 window.ScreenReaderBuildingCapture={capture,reset,analyzeImage:candidates};
})();
