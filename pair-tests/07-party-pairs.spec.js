const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const rows=fs.readFileSync(path.join(__dirname,'../csv/character_stats.csv'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const characters=rows.slice(1).map(line=>{const fields=line.split(',');return {id:fields[0],name:fields[1],fields};});
const selected=(process.env.PAIR_SELF_IDS||'').split(',').filter(Boolean);
if(selected.some(id=>!characters.some(c=>c.id===id)))throw new Error('PAIR_SELF_IDS contains unknown character IDs');
const donors={8:['PTジュジュシールド','反撃'],10:['PTパンダマン回復＋2'],11:['ヒール'],20:['PTユメ攻撃補正'],23:['PTテル憑依','PTテル狐光'],27:['PT潜伏'],103:['PTカクテル攻撃','PTカクテル防御','PTカクテル回復＋1'],104:['PTドロシー攻撃','PTドロシー通過回復＋1'],105:['PTハンナ次の移動']};
const allSupport=Object.values(donors).flat().concat('PTハンナ推理タイム＋1');
async function self(page,id){
 await page.locator('.role-tab.character-tab').click();await page.locator('#selected-self-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();
}
async function prepare(page,id){
 await page.goto('/07_skill/');await self(page,id);
 await page.locator('#selected-character-ct').click({button:'right'});
 await page.locator('#selected-character-atk-button').click();await page.locator('#selected-character-hp-fill').click();
 const counter=page.locator('#selected-character-conditions input.condition-number:enabled').first();if(await counter.count()){await counter.fill('1');await counter.dispatchEvent('change');}
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();await page.locator('#mp-map-select').selectOption('MAP0104');
 await page.locator('#roster-clear').click();await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 await page.locator('.role-tab.character-tab').click();await page.locator('#selected-party-tab').click();
}
for(const actor of characters.filter(c=>!selected.length||selected.includes(c.id))){
 test(`07 pairs self=${actor.id} ${actor.name}`,async({page},info)=>{
  test.setTimeout(45000);page.setDefaultTimeout(4000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const completed=[],failed=[];const targets=characters.filter(c=>c.id!==actor.id);
  const checkpoint=info.outputPath('pairs.jsonl'),coveragePath=info.outputPath('coverage.json');fs.mkdirSync(path.dirname(checkpoint),{recursive:true});
  let current=null;
  const coverage=()=>({self:actor.id,name:actor.name,expected:targets.length,passed:completed,failed,current,remaining:targets.filter(c=>!completed.includes(c.id)&&!failed.some(f=>f.id===c.id)).map(c=>c.id)});
  const saveCoverage=()=>fs.writeFileSync(coveragePath,JSON.stringify(coverage(),null,2));saveCoverage();
  try{
   await prepare(page,actor.id);
   for(const donor of targets){
    current=donor.id;saveCoverage();
    try{
     await test.step(`${actor.name} × ${donor.name} (${actor.id}/${donor.id})`,async()=>{
      const result=await page.evaluate(({actor,donor,allSupport})=>{
       const $=s=>document.querySelector(s),click=s=>{const e=$(s);if(!e)throw new Error('Missing control '+s);e.click();};
       const slot=()=>$(`.party-member-slot[data-character-id="${donor.id}"]`);
       const own=()=>({ability:window.captureCharacterAbilityState(),atk:$('#selected-character-atk').value,def:$('#selected-character-def').value,hp:$('#selected-character-current-hp').value,max:$('#selected-character-hp').textContent,move:$('#selected-character-move').textContent,ct:$('#selected-character-ct').textContent,chips:[...document.querySelectorAll('.selected-character-chips img')].map(e=>e.src),attack:$('#attackPower1').value,defense:$('#defensePower2').value,round:$('#current-round').textContent,progress:$('#current-progress').textContent,flags:[...document.querySelectorAll('.mode-content[data-role="attack"],.mode-content[data-role="defense"]')].map(e=>({...e.dataset}))});
       const support=()=>allSupport.filter(key=>[...document.querySelectorAll('#selected-character-conditions [aria-label]')].some(e=>e.getAttribute('aria-label').startsWith(key+':')||e.getAttribute('aria-label').startsWith(key+'：')||e.getAttribute('aria-label')===key+'の数'||e.getAttribute('aria-label')===key));
       const initial=own(),baselineSupport=support();
       click(`.character-select[data-id="${donor.id}"]`);
       const added=own(),ids=window.getPartyCharacterIds(),addedSupport=support();
       const statuses=[...document.querySelectorAll('#map-roster-list .roster-character-status')].map(e=>e.className.match(/roster-status-(\w+)/)?.[1]).sort();
       click(`.character-select[data-id="${donor.id}"]`);const duplicateIds=window.getPartyCharacterIds();
       click(`.party-member-slot[data-character-id="${donor.id}"] .party-slot-level`);
       click(`.party-member-slot[data-character-id="${donor.id}"] [data-stat="atk"] button`);
       click(`.party-member-slot[data-character-id="${donor.id}"] [data-stat="hp"] button`);
       const level=slot().querySelector('.party-slot-level').textContent,donorAtk=slot().querySelector('[data-stat="atk"] b').textContent;
       slot().click();click('#character-chip-tab');
       const chip=$('#chip-image-list .chip-select');if(!chip)throw new Error('No chip to check ownership');chip.click();
       const donorChips=slot().querySelectorAll('.party-slot-chip').length,edited=own();
       slot().dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
       const removed=own(),removedIds=window.getPartyCharacterIds(),removedSupport=support();
       click('#character-list-tab');click(`.character-select[data-id="${donor.id}"]`);
       const resetLevel=slot().querySelector('.party-slot-level').textContent,resetChips=slot().querySelectorAll('.party-slot-chip').length;
       slot().dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
       return {initial,added,edited,removed,ids,duplicateIds,removedIds,baselineSupport,addedSupport,removedSupport,statuses,level,donorAtk,donorChips,resetLevel,resetChips};
      },{actor,donor,allSupport});
      expect(result.added).toEqual(result.initial);expect(result.edited).toEqual(result.initial);expect(result.removed).toEqual(result.initial);
      expect(result.ids).toEqual([actor.id,donor.id]);expect(result.duplicateIds).toEqual(result.ids);expect(result.removedIds).toEqual([actor.id]);
      const expectedSupport=[...(donors[donor.id]||[]),...(actor.id==='106'&&donor.id==='105'?['PTハンナ推理タイム＋1']:[])].sort();
      expect(result.addedSupport.sort()).toEqual(expectedSupport);expect(result.removedSupport).toEqual(result.baselineSupport);
      const statusIds={24:'weakness',27:'investigationTarget',29:'erosionStacks',101:'fan'};
      const expectedStatuses=Object.entries(statusIds).filter(([id])=>id===actor.id||id===donor.id).map(([,key])=>key);if(donor.id==='13')expectedStatuses.push('fateEchoStacks');
      expect(result.statuses).toEqual(expectedStatuses.sort());
      expect(result.level).toBe('Lv.1');expect(Number(result.donorAtk)).toBe(Number(donor.fields[11])+1);expect(result.donorChips).toBe(1);expect(result.resetLevel).toBe('Lv.0');expect(result.resetChips).toBe(0);expect(errors).toEqual([]);
     });
     completed.push(donor.id);current=null;saveCoverage();fs.appendFileSync(checkpoint,JSON.stringify({self:actor.id,pt:donor.id,status:'passed'})+'\n');
    }catch(error){failed.push({id:donor.id,message:error.message});current=null;saveCoverage();fs.appendFileSync(checkpoint,JSON.stringify({self:actor.id,pt:donor.id,status:'failed',message:error.message})+'\n');throw error;}
   }
  }finally{
   saveCoverage();console.log('PAIR_COVERAGE '+JSON.stringify({self:actor.id,passed:completed.length,failed:failed.length,remaining:coverage().remaining.length}));
   await info.attach('pair-coverage',{body:JSON.stringify(coverage(),null,2),contentType:'application/json'});
  }
 });
}

test('07 interactions: Teru with Sykes, Hanna with Sherry, and combined PT buffs keep independent lifetimes',async({page})=>{
 await page.goto('/07_skill/');await self(page,'29');
 async function add(id){await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator(`.character-select[data-id="${id}"]`).click();await page.locator('#selected-self-tab').click();}
 async function number(key,value){const field=page.getByLabel(key+'の数',{exact:true});await field.fill(String(value));await field.dispatchEvent('change');}
 await add('23');await setTeruPartyAttack(page,8);await number('PTテル狐光',3);await page.getByRole('button',{name:/^PTテル憑依：/}).click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:{erosionStacks:4,markStacks:0,fateEchoStacks:0}})));
 const f=await page.evaluate(()=>getTeruFollowUp());expect(f.damageAdd).toBe(6);expect(await page.evaluate(()=>getTeruCombinedDamage(1,4,99,getTeruFollowUp()))).toBe(14);
 await self(page,'106');await add('105');await page.getByRole('button',{name:'PTハンナ推理タイム＋1'}).click();await page.getByRole('button',{name:/^PTハンナ次の移動：/}).click();await page.locator('#turn-end').click();const state=await page.evaluate(()=>captureCharacterAbilityState());expect(state.numbers['推理タイム']).toBe(0);expect(state.numbers['PTハンナ次の移動']).toBe(1);
 await page.goto('/07_skill/');await self(page,'1');await add('103');await add('104');await add('8');
 const before=Number(await page.locator('#selected-character-atk').inputValue());await number('PTカクテル攻撃',2);await page.getByRole('button',{name:/^PTドロシー攻撃：/}).click();await page.getByRole('button',{name:/^PTジュジュシールド：/}).click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(before+3);await expect(page.locator('#damageReduce2')).toHaveValue('99');await page.locator('#turn-end').click();await expect(page.locator('#attackPower1')).toHaveValue(String(before));await expect(page.locator('#damageReduce2')).toHaveValue('99');
});


test('07 interactions: Dorothy manual Warmth and party healing retain stat correction and cap HP',async({page})=>{
 await page.goto('/07_skill/');await self(page,'104');await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="103"]').click();await page.locator('#selected-self-tab').click();
 const warmth=page.getByLabel('温もりの数');await warmth.fill('3');await warmth.dispatchEvent('change');const defense=await page.locator('#selected-character-def').inputValue();
 const hp=page.locator('#selected-character-current-hp'),max=Number(await page.locator('#selected-character-hp').textContent());await hp.fill(String(max-1));await hp.dispatchEvent('change');
 await page.getByRole('button',{name:'PTカクテル回復＋1',exact:true}).click();await expect(hp).toHaveValue(String(max));await page.getByRole('button',{name:'PTカクテル回復＋1',exact:true}).click();await expect(hp).toHaveValue(String(max));await expect(page.locator('#selected-character-def')).toHaveValue(defense);
});

async function setTeruPartyAttack(page,value){
 await page.locator('#selected-party-tab').click();
 const stat=page.locator('.party-member-slot[data-character-id="23"] [data-stat="atk"]');
 let current=Number(await stat.locator('b').textContent());
 while(current!==value){await stat.locator('button').click({button:current<value?'left':'right'});current+=current<value?1:-1;}
 await page.locator('#selected-self-tab').click();
}
