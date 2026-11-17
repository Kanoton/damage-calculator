const {test,expect}=require('@playwright/test');
const {pathToFileURL}=require('url');
const path=require('path');

for(const protocol of ['http','file'])test('08: guarded building vision application keeps manual data and rejects ambiguity '+protocol,async({page})=>{
 await page.goto(protocol==='file'?pathToFileURL(path.resolve('08_screen_reader/index.html')).href:'/08_screen_reader/');
 await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.waitForFunction(()=>window.ScreenReaderBuildingBridge?.context().mapId==='MAP0105');
 const result=await page.evaluate(()=>{
  const api=window.ScreenReaderBuildingBridge;
  const base={mapId:'MAP0105',difficulty:api.context().difficulty,confidence:.98,frameCount:2,viewVerified:true,viewAmbiguous:false,landmarkClasses:['damage','move','monster'],geometryResidualPx:3,observationIds:['frame-a','frame-b']};
  const p=(slotId,name)=>({slotId,name,locationVerified:true,typeVerified:true,confidence:.99});
  const initial=JSON.stringify(api.snapshot());
  const premature=api.apply({...base,frameCount:1,placements:[p('O04','芳香ピーチ')]});
  const duplicateFrame=api.apply({...base,observationIds:['frame-a','frame-a'],placements:[p('O04','芳香ピーチ')]});
  const absentFrame=api.apply({...base,observationIds:undefined,placements:[p('O04','芳香ピーチ')]});
  const twoLandmarks=api.apply({...base,landmarkClasses:['damage','move'],placements:[p('O04','芳香ピーチ')]});
  const ambiguousView=api.apply({...base,viewAmbiguous:true,placements:[p('O04','芳香ピーチ')]});
  const badGeometry=api.apply({...base,geometryResidualPx:40,placements:[p('O04','芳香ピーチ')]});
  const wrongMap=api.apply({...base,mapId:'MAP0001',placements:[p('O04','芳香ピーチ')]});
  const ambiguous=api.apply({...base,placements:[p('O04','芳香ピーチ'),p('O04','電流タンポポ')]});
  const notVisible=api.apply({...base,placements:[{...p('O04','芳香ピーチ'),locationVerified:false}]});
  const afterRejects=JSON.stringify(api.snapshot());
  const success=api.apply({...base,placements:[p('O04','芳香ピーチ'),p('I12','金運の木')]});
  const state=JSON.stringify(api.snapshot());
  const repeated=api.apply({...base,placements:[p('O04','芳香ピーチ'),p('I12','金運の木')]});
  const conflict=api.apply({...base,placements:[p('O04','花咲くサボテン')]});
  const current=JSON.stringify(api.snapshot());
  const labels=[...document.querySelectorAll('#mp-building-layer .mp-building-slot[data-card]')].filter(e=>e.dataset.card).map(e=>e.dataset.slot+':'+e.dataset.card);
  return {premature,duplicateFrame,absentFrame,twoLandmarks,ambiguousView,badGeometry,wrongMap,ambiguous,notVisible,initial,afterRejects,success,state,repeated,conflict,current,labels};
 });
 expect(result.afterRejects).toBe(result.initial);
 expect(result.premature.added).toBe(0);
 expect(result.duplicateFrame.added).toBe(0);
 expect(result.absentFrame.added).toBe(0);
 expect(result.twoLandmarks.added).toBe(0);
 expect(result.ambiguousView.added).toBe(0);
 expect(result.badGeometry.added).toBe(0);
 expect(result.wrongMap.added).toBe(0);
 expect(result.ambiguous.reason).toBe('ambiguous-placement');
 expect(result.notVisible.added).toBe(0);
 expect(result.success.added).toBe(2);
 expect(result.repeated.added).toBe(0);
 expect(result.conflict.reason).toBe('manual-conflict');
 expect(result.current).toBe(result.state);
 expect(result.labels).toContain('O04:芳香ピーチ');
 expect(result.labels).toContain('I12:金運の木');
});

for(const protocol of ['http','file'])test('08: building capture review needs explicit human selection and preserves prior building '+protocol,async({page})=>{
 await page.goto(protocol==='file'?pathToFileURL(path.resolve('08_screen_reader/index.html')).href:'/08_screen_reader/');
 await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.waitForFunction(()=>window.ScreenReaderBuildingBridge?.manualReviewOptions().slots.length>0);
 await page.locator('#reader-toggle').click();
 const capture=()=>page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=288;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#222f30';ctx.fillRect(0,0,512,288);
  ctx.fillStyle='#d5c395';ctx.fillRect(180,120,45,25);
  window.ScreenReaderBuildingCapture.capture(canvas);
 });
 await expect(page.locator('#reader-building-capture')).toBeDisabled();
 await capture();
 await expect(page.locator('#reader-building-review')).toBeVisible();
 await expect(page.locator('#reader-building-status')).toContainText('1枚を取得');
 await expect(page.locator('#reader-building-apply')).toBeVisible();
 await page.locator('#reader-building-frame').click({position:{x:210,y:140}});
 await page.locator('#reader-building-slot').selectOption('O04');
 await page.locator('#reader-building-plant').selectOption('芳香ピーチ');
 const before=await page.evaluate(()=>JSON.stringify(window.ScreenReaderBuildingBridge.snapshot()));
 await page.locator('#reader-building-apply').click();
 expect(await page.evaluate(()=>JSON.stringify(window.ScreenReaderBuildingBridge.snapshot()))).toBe(before);
 await expect(page.locator('#reader-building-status')).toContainText('チェックしてください');
 await page.locator('#reader-building-confirm').check();
 await page.locator('#reader-building-apply').click();
 await expect(page.locator('#reader-building-status')).toContainText('1マスを更新');
 await expect(page.locator('#mp-building-layer [data-slot="O04"]')).toHaveAttribute('data-card','芳香ピーチ');
 await capture();
 await page.locator('#reader-building-frame').click({position:{x:210,y:140}});
 await page.locator('#reader-building-slot').selectOption('O04');
 await page.locator('#reader-building-plant').selectOption('電流タンポポ');
 await page.locator('#reader-building-confirm').check();
 await page.locator('#reader-building-apply').click();
 await expect(page.locator('#reader-building-status')).toContainText('上書き');
 await expect(page.locator('#mp-building-layer [data-slot="O04"]')).toHaveAttribute('data-card','芳香ピーチ');
 await page.locator('#reader-building-clear').click();
 await expect(page.locator('#reader-building-review')).toBeHidden();
});

test('08: building capture refuses non-autumn maps and camera-snapshot stale context',async({page})=>{
 await page.goto('/08_screen_reader/');
 await page.locator('#reader-toggle').click();
 const capture=()=>page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=512;c.height=288;
  c.getContext('2d').fillRect(0,0,512,288);
  window.ScreenReaderBuildingCapture.capture(c);
 });
 await capture();
 await expect(page.locator('#reader-building-review')).toBeHidden();
 await expect(page.locator('#reader-building-status')).toContainText('秋幻の森');
 await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.waitForFunction(()=>window.ScreenReaderBuildingBridge?.manualReviewOptions().slots.length>0);
 await capture();
 await page.locator('#reader-building-frame').click({position:{x:210,y:140}});
 await page.locator('#reader-building-slot').selectOption('O04');
 await page.locator('#reader-building-plant').selectOption('芳香ピーチ');
 await page.locator('#reader-building-confirm').check();
 await page.locator('#mp-map-select').selectOption({index:0});
 await page.locator('#reader-building-apply').click();
 await expect(page.locator('#reader-building-status')).toContainText('破棄');
 expect(await page.evaluate(()=>window.ScreenReaderBuildingBridge.snapshot())).toEqual({});
});


for(const protocol of ['http','file'])test('08: separate pale and cyan screenshot clues and invalidate on image change '+protocol,async({page})=>{
 await page.goto(protocol==='file'?pathToFileURL(path.resolve('08_screen_reader/index.html')).href:'/08_screen_reader/');
 await page.locator('#mp-map-select').selectOption('MAP0105');
 await page.waitForFunction(()=>window.ScreenReaderBuildingBridge?.manualReviewOptions().slots.length>0);
 await page.waitForFunction(()=>document.getElementById('mp-map-image')?.naturalWidth>0);
 await page.locator('#reader-toggle').click();
 const clues=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=512;c.height=288;
  const g=c.getContext('2d');
  g.fillStyle='rgb(30,30,30)';g.fillRect(0,0,512,288);
  g.fillStyle='rgb(220,184,139)';g.fillRect(185,113,40,32);
  g.fillStyle='rgb(45,176,196)';g.fillRect(225,113,40,32);
  const candidates=window.ScreenReaderBuildingCapture.analyzeImage(
   g.getImageData(0,0,512,288));
  window.ScreenReaderBuildingCapture.capture(c);
  return candidates.map(v=>({id:v.id,kind:v.kind}));
 });
 expect(clues.some(v=>v.kind==='pale'&&v.id==='T1')).toBeTruthy();
 expect(clues.some(v=>v.kind==='cyan'&&v.id==='S1')).toBeTruthy();
 await expect(page.locator('#reader-building-status')).toContainText('淡色T候補');
 await expect(page.locator('#reader-building-status')).toContainText('青緑S候補');
 await page.locator('#reader-building-frame').click({position:{x:210,y:125}});
 await page.locator('#reader-building-slot').selectOption('O04');
 await expect(page.locator('#reader-building-map-check')).toBeVisible();
 await expect(page.locator('#reader-building-map-label')).toContainText('O04');
 const marker=await page.locator('#reader-building-map-pin').evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));
 expect(marker.left).toBeGreaterThan(0);expect(marker.left).toBeLessThan(100);
 expect(marker.top).toBeGreaterThan(0);expect(marker.top).toBeLessThan(100);
 await page.locator('#reader-building-plant').selectOption('芳香ピーチ');
 await page.locator('#reader-building-confirm').check();
 const before=await page.evaluate(()=>JSON.stringify(window.ScreenReaderBuildingBridge.snapshot()));
 // The old screenshot cannot be applied after a different independent image.
 const png=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=32;c.height=32;
  return c.toDataURL('image/png');
 });
 await page.locator('#reader-file').setInputFiles({
  name:'new-source.png',mimeType:'image/png',
  buffer:Buffer.from(png.split(',')[1],'base64')
 });
 await expect(page.locator('#reader-building-review')).toBeHidden();
 await expect(page.locator('#reader-building-status')).toContainText('画像を切り替えた');
 expect(await page.evaluate(()=>JSON.stringify(window.ScreenReaderBuildingBridge.snapshot()))).toBe(before);
});
