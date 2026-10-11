const {expect}=require('@playwright/test');

async function selectCharacter(page,id){
 await page.locator('.role-tab.character-tab').click();
 await page.locator('#selected-self-tab').click();
 await page.locator('#character-list-tab').click();
 await page.locator(`.character-select[data-id="${id}"]`).click();
 await page.locator('#selected-self-tab').click();
}

async function expectSkillKeypadLayout(page){
 const layout=await page.locator('#character-number-pad').evaluate(p=>{
  const r=p.getBoundingClientRect(),d=p.closest('dialog').getBoundingClientRect(),i=p.closest('dialog').querySelector('input').getBoundingClientRect();
  return{inside:r.left>=d.left&&r.right<=d.right&&r.bottom<=d.bottom,right:r.left>=i.right||r.top>=i.bottom};
 });
 expect(layout).toEqual({inside:true,right:true});
 const actions=await page.locator('#character-number-pad').evaluate(p=>{
  const r=p.getBoundingClientRect(),d=p.closest('dialog'),c=d.querySelector('[data-cancel]').getBoundingClientRect();
  return{right:c.left>=r.right,bottom:Math.abs(c.bottom-r.bottom),extraSubmit:d.querySelectorAll('button[type="submit"]').length};
 });
 expect(actions.right).toBe(true);
 expect(actions.bottom).toBeLessThanOrEqual(1);
 expect(actions.extraSubmit).toBe(0);
}

async function expectSkillDialogNearButton(page){
 const boxes=await page.evaluate(()=>{const r=document.querySelector('#skill-source-dialog').getBoundingClientRect(),a=document.querySelector('#selected-character-skill').getBoundingClientRect();
  return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,gap:a.top-r.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 expect(boxes.overflow).toBe(false);
 expect(boxes.x).toBeGreaterThanOrEqual(0);
 expect(boxes.y).toBeGreaterThanOrEqual(0);
 expect(boxes.right).toBeLessThanOrEqual(boxes.width);
 expect(boxes.bottom).toBeLessThanOrEqual(boxes.height);
 expect(boxes.gap).toBeLessThanOrEqual(10);
}

async function expectDialogInViewport(page,dialog){
 const box=await dialog.boundingBox(),viewport=page.viewportSize();
 expect(box.x).toBeGreaterThanOrEqual(0);
 expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
 expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
}

module.exports={selectCharacter,expectSkillKeypadLayout,expectSkillDialogNearButton,expectDialogInViewport};
