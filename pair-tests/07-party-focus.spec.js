const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
async function start(page,id='1'){
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();
}
async function add(page,id){await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();}
async function number(page,key,value){const f=page.getByLabel(key+'の数',{exact:true});await f.fill(String(value));await f.dispatchEvent('change');}
async function undo(page){await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();}
async function remove(page,id){await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click({button:'right'});await page.locator('#selected-self-tab').click();}

test('07 full party: skill, stacked supports, turn end and Undo retain independent effects',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,'6');for(const id of ['103','104','8'])await add(page,id);
 expect(await page.evaluate(()=>getPartyCharacterIds())).toEqual(['6','103','104','8']);
 const base=Number(await page.locator('#attackPower1').inputValue());
 await page.locator('#selected-character-skill').click();
 await number(page,'PTカクテル攻撃',2);await number(page,'PTカクテル防御',3);
 await page.getByRole('button',{name:/^PTドロシー攻撃：/}).click();await page.getByRole('button',{name:/^PTジュジュシールド：/}).click();
 await expect(page.locator('#attackPower1')).toHaveValue(String(base+5));
 const before=await page.evaluate(()=>captureCharacterAbilityState());
 await page.locator('#turn-end').click();await expect(page.locator('#attackPower1')).toHaveValue(String(base));await expect(page.locator('#damageReduce2')).toHaveValue('99');
 await undo(page);expect(await page.evaluate(()=>captureCharacterAbilityState())).toEqual(before);
 await expect(page.locator('#attackPower1')).toHaveValue(String(base+5));
 await remove(page,'103');await expect(page.getByLabel('PTカクテル攻撃の数')).toHaveValue('2');await expect(page.locator('#attackPower1')).toHaveValue(String(base+5));
 await add(page,'103');await expect(page.getByLabel('PTカクテル攻撃の数')).toHaveValue('2');
 await page.locator('#turn-end').click();await remove(page,'103');await expect(page.getByLabel('PTカクテル攻撃の数')).toHaveCount(0);
 await add(page,'103');await expect(page.getByLabel('PTカクテル攻撃の数')).toHaveValue('0');
 expect(errors).toEqual([]);
});

test('07 full party: Teru, Hanna and shield survive turn end and consume independently with Undo',async({page})=>{
 await start(page,'106');for(const id of ['23','105','8'])await add(page,id);
 await number(page,'PTテル攻撃力',8);await number(page,'PTテル狐光',3);
 await page.getByRole('button',{name:/^PTテル憑依：/}).click();await page.getByRole('button',{name:/^PTハンナ次の移動：/}).click();await page.getByRole('button',{name:/^PTジュジュシールド：/}).click();await page.getByRole('button',{name:'PTハンナ推理タイム＋1',exact:true}).click();
 await page.locator('#turn-end').click();
 let s=await page.evaluate(()=>captureCharacterAbilityState());expect(s.numbers['推理タイム']).toBe(0);for(const k of ['PTテル憑依','PTハンナ次の移動','PTジュジュシールド'])expect(s.numbers[k]).toBe(1);expect(s.numbers['PTテル狐光']).toBe(3);
 const before=await page.evaluate(()=>getTeruFollowUp());await page.evaluate(()=>consumeTeruFollowUp());await expect(page.getByLabel('PTテル狐光の数')).toHaveValue('2');await undo(page);expect(await page.evaluate(()=>getTeruFollowUp())).toEqual(before);
 await page.getByRole('button',{name:/^PTハンナ次の移動：/}).click();s=await page.evaluate(()=>captureCharacterAbilityState());expect(s.numbers['PTハンナ次の移動']).toBe(0);expect(s.numbers['PTテル憑依']).toBe(1);expect(s.numbers['PTジュジュシールド']).toBe(1);
});

const readRows=(file,sep=',')=>{const lines=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);const headers=lines.shift().split(sep);return lines.map(line=>Object.fromEntries(line.split(sep).map((v,i)=>[headers[i],v])));};
test('07 assets: canonical icons, chips, hero cards and monster artwork decode in browser',async({page},info)=>{
 const assets=[
  ...readRows('csv/status_icon_map_all.csv').filter(r=>r.icon_file).map(r=>'../images/'+r.icon_file),
  ...readRows('csv/chip_list.csv','\t').map(r=>'../images/chip_icon/'+r.images),
  ...readRows('07_skill/csv/character_hero_card_mapping.csv').map(r=>'../images/UT_Hero_Card2/'+r.hero_card_img),
  ...readRows('csv/monster_stats.csv').flatMap(r=>['../images/Monster/'+r.image,...(r.info?['../images/MonsterInfo/'+r.info]:[])])
 ];
 await start(page);const unique=[...new Set(assets)],failures=[];
 for(let offset=0;offset<unique.length;offset+=20){
  failures.push(...await page.evaluate(async urls=>(await Promise.all(urls.map(url=>new Promise(resolve=>{const image=new Image();const timer=setTimeout(()=>resolve({url,error:'timeout'}),4000);image.onload=()=>{clearTimeout(timer);resolve(image.naturalWidth&&image.naturalHeight?null:{url,error:'empty image'});};image.onerror=()=>{clearTimeout(timer);resolve({url,error:'load error'});};image.src=url.split('/').map(encodeURIComponent).join('/');})))).filter(Boolean),unique.slice(offset,offset+20)));
 }
 await info.attach('image-decode-audit',{body:JSON.stringify({checked:unique.length,failures},null,2),contentType:'application/json'});expect(failures).toEqual([]);
});

test('07 rendered icons: all characters and registered supports load their assigned images',async({page})=>{
 await start(page);const ids=readRows('csv/character_stats.csv').map(r=>r.id);
 // Four controls intentionally have text substitutes until the user supplies their icons.
 const allowed=new Set(['相手より多い手札','狐光追加攻撃']);
 for(const id of ids){
  await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator('#selected-self-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();
  const bad=await page.locator('#selected-character-conditions').evaluate(async root=>{
   await Promise.all([...root.querySelectorAll('img')].map(i=>i.complete?Promise.resolve():new Promise(resolve=>{i.addEventListener('load',resolve,{once:true});i.addEventListener('error',resolve,{once:true});setTimeout(resolve,2000);})));
   return {fallback:[...root.querySelectorAll('.condition-fallback')].map(e=>e.textContent),broken:[...root.querySelectorAll('img')].filter(i=>!i.naturalWidth).map(i=>i.src)};
  });
  expect(bad.broken,`character ${id}`).toEqual([]);expect(bad.fallback.filter(k=>!allowed.has(k)),`character ${id} unmapped controls`).toEqual([]);
 }
 await start(page);for(const group of [['103','104','8'],['23','105','20'],['10','27','13']]){
  for(const id of group)await add(page,id);
  await expect.poll(()=>page.locator('#selected-character-conditions img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src))).toEqual([]);
  for(const id of group)await remove(page,id);
 }
});
