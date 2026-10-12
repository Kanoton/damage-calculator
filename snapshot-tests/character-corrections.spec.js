const {test,expect}=require('@playwright/test');
const {selectCharacter}=require('../test-helpers/07-ui');
const {pathToFileURL}=require('url');
const path=require('path');
for(const folder of ['07_skill','v1p3'])for(const protocol of ['http','file']){
 test(`${folder} ${protocol}: Padman movement removal and Sherry turn-end Undo`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(protocol==='file'?pathToFileURL(path.resolve(folder,'index.html')).href:`/${folder}/`);
  await selectCharacter(page,'6');
  await expect(page.getByLabel('自己主張なし移動補正の数')).toHaveCount(0);
  const move=page.locator('#selected-character-move'),baseMove=await move.textContent();
  const atk=page.getByLabel('自己主張なし攻撃補正の数');await atk.fill('-1');await atk.dispatchEvent('change');
  await page.locator('#selected-character-skill').click();await expect(atk).toHaveValue('2');await expect(move).toHaveText(baseMove);
  await page.locator('#turn-end').click();await expect(atk).toHaveValue('-1');await expect(move).toHaveText(baseMove);
  await selectCharacter(page,'106');await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator('.character-select[data-id="105"]').click();await page.locator('#selected-self-tab').click();
  const blessing=page.getByRole('button',{name:'PTハンナ推理タイム＋1',exact:true}),doll=page.getByRole('button',{name:/^PTハンナ次の移動：/});
  await blessing.click();await doll.click();await expect(move).toHaveText('2');
  await page.locator('.role-tab[data-role="map"]').click();await page.locator('#turn-end').click();await expect(move).toHaveText('0');await expect(blessing).toHaveAttribute('aria-pressed','false');await expect(doll).toHaveAttribute('aria-pressed','false');
  await page.locator('#roster-undo').click();await expect(move).toHaveText('2');await expect(blessing).toHaveAttribute('aria-pressed','true');await expect(doll).toHaveAttribute('aria-pressed','true');
  await page.locator('#turn-end').click();await expect(move).toHaveText('0');
  expect(errors).toEqual([]);
 });
}
