const { test, expect } = require('@playwright/test');

async function prepareSherryTargets(page){
 await page.goto('/07_skill/');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 const choices=page.locator('#mp-monster-list .mp-monster:visible');let found=false;
 for(let i=0;i<await choices.count();i++){
  await page.locator('#roster-clear').click();await choices.nth(i).click();
  if(Number(await page.locator('#map-roster-list input[aria-label$="の残りHP"]').first().inputValue())<5)continue;
  await choices.nth(i).click();await choices.nth(i).click();found=true;break;
 }
 expect(found).toBe(true);
 await selectCharacter(page,'106');
 const cards=page.locator('#map-roster-list .roster-card');
 for(let i=0;i<3;i++){const hp=cards.nth(i).locator('input[aria-label$="の残りHP"]');await hp.fill('5');await hp.dispatchEvent('change');}
 return cards;
}

test('07 skill: Sherry toggles multiple targets and applies damage once only after OK',async({page})=>{
 const cards=await prepareSherryTargets(page),skill=page.getByRole('button',{name:'怪力魔法を発動'}),ok=page.locator('#character-skill-target-ok'),ct=page.locator('#selected-character-ct');
 await skill.click();await expect(ok).toBeVisible();await expect(ok).toBeDisabled();
 await page.locator('.role-tab[data-role="map"]').click();
 const target=i=>cards.nth(i).locator('.roster-select'),hp=i=>cards.nth(i).locator('input[aria-label$="の残りHP"]');
 await target(0).click();await target(1).click();
 await expect(target(0)).toHaveAttribute('aria-pressed','true');await expect(cards.nth(0)).toHaveClass(/is-skill-target-selected/);
 await target(0).click();await expect(target(0)).toHaveAttribute('aria-pressed','false');
 await target(2).click();
 for(let i=0;i<3;i++)await expect(hp(i)).toHaveValue('5');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await expect(page.locator('#character-skill-target-message')).toContainText('2体選択中');
 await target(2).press('Enter');await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await expect(hp(0)).toHaveValue('5');await expect(hp(1)).toHaveValue('3');await expect(hp(2)).toHaveValue('3');
 await expect(ct).toHaveText(/^CT 2 \/ \d+$/);await expect(page.locator('.is-skill-target-selected')).toHaveCount(0);
 await ok.evaluate(button=>button.click());await expect(hp(1)).toHaveValue('3');
 await page.locator('#roster-undo').click();for(let i=0;i<3;i++)await expect(hp(i)).toHaveValue('5');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
});

test('07 skill: Sherry cancellation and removed targets consume no HP or CT',async({page})=>{
 const cards=await prepareSherryTargets(page),skill=page.getByRole('button',{name:'怪力魔法を発動'}),ok=page.locator('#character-skill-target-ok');
 await skill.click();await page.locator('.role-tab[data-role="map"]').click();await cards.first().locator('.roster-select').click();
 await page.locator('#character-skill-target-cancel').click();await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await expect(cards.first().locator('input[aria-label$="の残りHP"]')).toHaveValue('5');await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();await expect(ok).toBeDisabled();await cards.first().locator('.roster-select').click();
 await cards.first().locator('.roster-delete').click();await expect(ok).toBeDisabled();await expect(page.locator('#character-skill-target-message')).toContainText('0体選択中');
 await page.locator('#character-skill-target-cancel').click();await skill.click();
 await cards.first().locator('.roster-select').click();await cards.first().locator('.roster-remove').click();await expect(ok).toBeDisabled();
 await selectCharacter(page,'9');await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();await expect(ok).toBeHidden();
});

async function selectCharacter(page,id){
 await page.locator('.role-tab.character-tab').click();
 await page.locator('#selected-self-tab').click();
 await page.locator('#character-list-tab').click();
 await page.locator(`.character-select[data-id="${id}"]`).click();
 await page.locator('#selected-self-tab').click();
}

test('07 skill: Sherry batch can defeat one target and damage another',async({page})=>{
 const cards=await prepareSherryTargets(page);
 const ids=await Promise.all([0,1].map(i=>cards.nth(i).getAttribute('data-instance-id')));
 const target0=page.locator(`.roster-card[data-instance-id="${ids[0]}"]`),target1=page.locator(`.roster-card[data-instance-id="${ids[1]}"]`);
 const hp0=target0.locator('input[aria-label$="の残りHP"]'),hp1=target1.locator('input[aria-label$="の残りHP"]');
 await hp0.fill('1');await hp0.dispatchEvent('change');
 await page.getByRole('button',{name:'怪力魔法を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();await page.locator('#character-skill-target-ok').click();
 await expect(hp0).toHaveValue('0');await expect(target0).toHaveClass(/defeated/);await expect(hp1).toHaveValue('3');
 await page.locator('#roster-undo').click();await expect(hp0).toHaveValue('1');await expect(hp1).toHaveValue('5');await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
});


test('07 skill: Rinrin buffs herself once for multiple targets and expires only skill modifiers after two turn ends',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'28');
 const ids=await Promise.all([0,1,2].map(i=>cards.nth(i).getAttribute('data-instance-id')));
 const targets=ids.map(id=>page.locator(`.roster-card[data-instance-id="${id}"]`));
 const defense=i=>targets[i].locator('input[aria-label$="の防御力"]');
 for(let i=0;i<3;i++){await defense(i).fill(String(5-i));await defense(i).dispatchEvent('change');}
 const atk=page.locator('#selected-character-atk'),ct=page.locator('#selected-character-ct'),ok=page.locator('#character-skill-target-ok');
 await page.getByRole('button',{name:'インターセプトタックルを発動'}).click();await page.locator('#rinrin-area-dialog').getByRole('button',{name:'Yes',exact:true}).click();
 await expect(ok).toBeDisabled();await page.locator('.role-tab[data-role="map"]').click();
 for(const target of targets)await target.locator('.roster-select').click();
 await targets[2].locator('.roster-select').click();
 await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 for(let i=0;i<3;i++)await expect(defense(i)).toHaveValue(String(5-i));
 await ok.click();
 await expect(atk).toHaveValue('4');await expect(ct).toHaveText(/^CT 3 \/ \d+$/);
 await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');await expect(defense(2)).toHaveValue('3');
 await page.locator('#selected-character-atk-button').click();await expect(atk).toHaveValue('5');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('5');await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('3');for(let i=0;i<3;i++)await expect(defense(i)).toHaveValue(String(5-i));
 await expect(ct).toHaveText(/^CT 1 \/ \d+$/);
 await page.locator('#roster-undo').click();
 await expect(atk).toHaveValue('5');await expect(defense(0)).toHaveValue('3');await expect(defense(1)).toHaveValue('2');
 await page.locator('#turn-end').click();
 await expect(atk).toHaveValue('3');await expect(defense(0)).toHaveValue('5');await expect(defense(1)).toHaveValue('4');
});

test('07 skill: Rinrin cancellation and one undo preserve all targets and a single self bonus',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'28');
 const defense=cards.first().locator('input[aria-label$="の防御力"]');
 await defense.fill('5');await defense.dispatchEvent('change');
 const skill=page.getByRole('button',{name:'インターセプトタックルを発動'}),atk=page.locator('#selected-character-atk'),ct=page.locator('#selected-character-ct');
 await skill.click();await page.locator('#rinrin-area-dialog').getByRole('button',{name:'Yes',exact:true}).click();await page.locator('.role-tab[data-role="map"]').click();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();
 await page.locator('#character-skill-target-cancel').click();
 await expect(defense).toHaveValue('5');await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();await page.locator('#rinrin-area-dialog').getByRole('button',{name:'Yes',exact:true}).click();await expect(page.locator('#character-skill-target-ok')).toBeDisabled();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();
 await page.locator('#character-skill-target-ok').click();await expect(atk).toHaveValue('4');
 await page.locator('#roster-undo').click();
 await expect(defense).toHaveValue('5');await expect(atk).toHaveValue('2');await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await page.locator('#turn-end').click();await page.locator('#turn-end').click();await expect(atk).toHaveValue('2');await expect(defense).toHaveValue('5');
});


test('07 skill: Rinrin asks first, No consumes only CT and cancel or switching never casts',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'28');
 const dialog=page.locator('#rinrin-area-dialog'),skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct'),atk=page.locator('#selected-character-atk');
 const before=await cards.first().locator('input[aria-label$="の防御力"]').inputValue();
 await expect(page.getByRole('button',{name:/エリア拒止通過/})).toHaveCount(0);
 await skill.click();await expect(dialog).toBeVisible();await expect(page.locator('#character-skill-target-banner')).toBeHidden();
 await dialog.getByRole('button',{name:'キャンセル',exact:true}).click();await expect(ct).toHaveText('CT 0 / 3');
 await skill.click();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(ct).toHaveText('CT 0 / 3');
 await skill.click();await dialog.getByRole('button',{name:'No',exact:true}).click();
 await expect(ct).toHaveText('CT 3 / 3');await expect(atk).toHaveValue('2');await expect(cards.first().locator('input[aria-label$="の防御力"]')).toHaveValue(before);
 await page.locator('#roster-undo').click();await expect(ct).toHaveText('CT 0 / 3');
 await skill.click();await page.evaluate(()=>document.querySelector('.character-select[data-id="1"]').click());await expect(dialog).toBeHidden();
 await selectCharacter(page,'28');await expect(ct).toHaveText('CT 0 / 3');
});

test('07 skill: Sykes clears all erosion at turn end even when hidden, including defeated monsters, with Undo',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'29');await page.locator('.role-tab[data-role="map"]').click();
 const ids=await Promise.all([0,1,2].map(i=>cards.nth(i).getAttribute('data-instance-id'))),targets=ids.map(id=>page.locator(`.roster-card[data-instance-id="${id}"]`));
 for(const target of targets){await target.locator('.roster-status-erosionStacks button').click();await target.locator('.roster-status-erosionStacks button').click();}
 await targets[2].locator('.roster-remove').click();await targets[0].locator('.roster-select').click();await expect(page.locator('#damageAdd1')).toHaveValue('2');
 await selectCharacter(page,'1');await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="29"]').click();
 await expect(page.locator('.roster-status-erosionStacks')).toHaveCount(0);
 await page.locator('#turn-end').click();await expect(page.locator('#damageAdd1')).toHaveValue('0');
 await page.locator('#roster-undo').click();await expect(page.locator('#damageAdd1')).toHaveValue('2');
 await selectCharacter(page,'29');for(const target of targets)await expect(target.locator('.roster-status-erosionStacks strong')).toHaveText('2');
 await page.locator('#turn-end').click();for(const target of targets)await expect(target.locator('.roster-status-erosionStacks strong')).toHaveText('0');
});

test('07 skill: Padman signed adjustments clamp independently and use the confirmed icon',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'6');
 const configs=[['攻撃','atk'],['防御','def'],['移動','move']];
 for(const [name,stat] of configs){
  const key='自己主張なし'+name+'補正',input=page.getByLabel(key+'の数'),button=page.getByRole('button',{name:key+'を増やす',exact:true});
  await expect(input).toHaveValue('0');await expect(input).toHaveAttribute('min','-2');await expect(input).toHaveAttribute('max','2');
  const icon=button.locator('img');await expect(icon).toHaveAttribute('src','../images/UT_Buff/'+({atk:'Attack.png',def:'Defense.png',move:'run.png'})[stat]);
  await expect.poll(()=>icon.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const value=page.locator('#selected-character-'+stat),base=Number(stat==='move'?await value.textContent():await value.inputValue());
  const expectValue=expected=>stat==='move'?expect(value).toHaveText(String(expected)):expect(value).toHaveValue(String(expected));
  await button.click({button:'right'});await expect(input).toHaveValue('-1');await expectValue(Math.max(0,base-1));
  await button.click({button:'right'});await button.click({button:'right'});await expect(input).toHaveValue('-2');await expectValue(Math.max(0,base-2));
  await input.fill('99');await input.dispatchEvent('change');await expect(input).toHaveValue('2');await expectValue(base+2);
  await button.click();await expect(input).toHaveValue('2');
  await input.fill('-99');await input.dispatchEvent('change');await expect(input).toHaveValue('-2');
  await input.fill('0');await input.dispatchEvent('change');await expectValue(base);
 }
 const attack=page.getByLabel('自己主張なし攻撃補正の数'),defense=page.getByLabel('自己主張なし防御補正の数');
 await attack.fill('-1');await attack.dispatchEvent('change');await defense.fill('2');await defense.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');await expect(page.locator('#selected-character-def')).toHaveValue('4');
 await selectCharacter(page,'1');await selectCharacter(page,'6');
 await expect(attack).toHaveValue('-1');await expect(defense).toHaveValue('2');
});

test('07 skill: Padman icon fallback works when the status CSV cannot be fetched',async({page})=>{
 await page.route('**/csv/status_icon_map_all.csv',route=>route.abort());
 await page.goto('/07_skill/');await selectCharacter(page,'6');
 for(const stat of ['攻撃','防御','移動']){
  await expect(page.getByRole('button',{name:'自己主張なし'+stat+'補正を増やす',exact:true}).locator('img')).toHaveAttribute('src','../images/UT_Buff/'+({'攻撃':'Attack.png','防御':'Defense.png','移動':'run.png'})[stat]);
 }
});


test('07 skill: Padman attack die six ignores only base defense in table and probabilities',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'6');
 const attack=page.locator('.mode-content[data-role="attack"]'),defense=page.locator('.mode-content[data-role="defense"]');
 await page.locator('.role-tab[data-role="attack"]').click();
 for(const [id,value] of [['attackPower1','2'],['defensePower1','8'],['hp1','5'],['damageAdd1','0'],['damageReduce1','0']]){
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');
 }
 const rows=attack.locator('.damage-table tbody tr');
 for(let i=0;i<5;i++)for(const cell of await rows.nth(i).locator('td').all())await expect(cell).toHaveText('1');
 await expect(rows.nth(5).locator('td')).toHaveText(['7','6','5','4','3','2']);
 await expect(attack.locator('.expected-damage')).toHaveText('1.58');await expect(attack.locator('.result-rate')).toHaveText('8.33%');
 await expect(attack.locator('.future-expected-damage')).toHaveText('1.58');await expect(attack.locator('.future-result-rate')).toHaveText('8.33%');
 // Added damage/reduction still apply; defense dice 1 and 6 produce different results.
 expect(await page.evaluate(()=>[getDefenseDamage(2,8,3,1,6,1,true),getDefenseDamage(2,8,3,1,6,6,true),getDefenseDamage(2,8,3,1,5,1,true)])).toEqual([9,4,3]);
 await page.locator('.role-tab[data-role="defense"]').click();
 for(const [id,value] of [['attackPower2','2'],['defensePower2','8'],['hp2','5'],['damageAdd2','0'],['damageReduce2','0']]){
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');
 }
 await expect(defense.locator('.damage-table tbody tr').nth(5).locator('td')).toHaveText(['1','1','1','1','1','1']);
 await selectCharacter(page,'1');
 await page.locator('.role-tab[data-role="attack"]').click();await page.locator('#attackPower1').fill('2');await page.locator('#attackPower1').dispatchEvent('input');
 await expect(rows.nth(5).locator('td')).toHaveText(['1','1','1','1','1','1']);
 await expect(attack.locator('.expected-damage')).toHaveText('1.00');await expect(attack.locator('.future-expected-damage')).toHaveText('1.00');
});


test('07 skill: new character controls use confirmed icons and turn lifetimes',async({page})=>{
 await page.goto('/07_skill/');
 await selectCharacter(page,'8');const shield=page.getByRole('button',{name:/ジュジュシールド：オフ/});
 await expect(shield.locator('img')).toHaveAttribute('src',/UT_Buff_Shield\.png$/);await shield.click();await expect(page.locator('#damageReduce2')).toHaveValue('99');
 await selectCharacter(page,'22');const book=page.getByLabel('ライフ・ブックの数');await book.fill('3');await book.dispatchEvent('change');
 await expect(page.getByRole('button',{name:'ライフ・ブックを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_121_Passive\.png$/);await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 await selectCharacter(page,'27');const phase=()=>page.getByRole('button',{name:/潜入調査：/});
 const stageNames=['フェーズ・ワン','フェーズ・ツー','フェーズ・スリー','真相解明'];
 for(let i=0;i<4;i++){await expect(phase()).toHaveAttribute('title',new RegExp(stageNames[i]));await expect(phase().locator('img')).toHaveAttribute('src',new RegExp('UT_Event_1270'+(i+2)+'\\.png$'));await phase().click();}
 await expect(phase()).toHaveAttribute('title',/真相解明/);await phase().click({button:'right'});await expect(phase()).toHaveAttribute('title',/フェーズ・スリー/);
 await selectCharacter(page,'104');const warm=page.getByLabel('温もりの数');await warm.fill('5');await warm.dispatchEvent('change');
 const atk=page.locator('#selected-character-atk'),def=page.locator('#selected-character-def'),before=Number(await atk.inputValue()),snapshotDef=Number(await def.inputValue());
 await page.getByRole('button',{name:/本当の私：オフ/}).click();await expect(atk).toHaveValue(String(before+1));
 await page.getByRole('button',{name:'本当の私を発動'}).click();await expect(atk).toHaveValue(String(before+1+snapshotDef));
 await warm.fill('0');await warm.dispatchEvent('change');await expect(atk).toHaveValue(String(before+1+snapshotDef));
 await page.locator('#turn-end').click();await expect(atk).toHaveValue(String(before));await expect(page.getByRole('button',{name:/本当の私：オフ/})).toBeVisible();
 await selectCharacter(page,'105');const doll=page.getByLabel('人形制作の数');await doll.fill('7');await doll.dispatchEvent('change');
 await expect(page.getByRole('button',{name:'人形制作を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_305_Awake\.png$/);
 await page.getByRole('button',{name:/親友を守る：オフ/}).click();await expect(page.locator('#damageReduce2')).toHaveValue('1');
 await page.getByRole('button',{name:'浮遊魔法を発動'}).click();await expect(page.locator('#selected-character-move')).toHaveText('2');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-move')).toHaveText('0');await expect(doll).toHaveValue('7');
 await expect(page.locator('#damageReduce2')).toHaveValue('1');
});

test('07 skill: Luka resolves multiple monsters for current attack plus two without a self buff',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'17');
 const hp=i=>cards.nth(i).locator('input[aria-label$="の残りHP"]');
 await page.locator('#selected-character-atk').fill('2');await page.locator('#selected-character-atk').dispatchEvent('change');
 await page.getByRole('button',{name:'真夜の一閃を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();
 await cards.nth(0).locator('.roster-select').click();await cards.nth(1).locator('.roster-select').click();await expect(hp(0)).toHaveValue('5');
 await page.locator('#character-skill-target-ok').click();await expect(hp(0)).toHaveValue('1');await expect(hp(1)).toHaveValue('1');await expect(hp(2)).toHaveValue('5');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');await expect(page.locator('#selected-character-ct')).toHaveText('CT 3 / 3');
 await page.locator('#roster-undo').click();await expect(hp(0)).toHaveValue('5');await expect(hp(1)).toHaveValue('5');await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 3');
});

test('07 skill: Z3000 kill reduces CT two exactly once and undo restores the kill',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'9');
 const ids=await Promise.all([0,1].map(i=>cards.nth(i).getAttribute('data-instance-id')));
 const target=i=>page.locator('.roster-card[data-instance-id="'+ids[i]+'"]');
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await target(0).locator('.roster-select').click();
 await expect(target(0)).toHaveClass(/defeated/);await expect(page.getByLabel('モンスター撃破数の数')).toHaveValue('1');await expect(page.locator('#selected-character-ct')).toHaveText('CT 2 / 4');
 await target(1).locator('.roster-remove').click();await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 4');await expect(page.getByLabel('モンスター撃破数の数')).toHaveValue('2');
 await page.locator('#roster-undo').click();await expect(page.locator('#selected-character-ct')).toHaveText('CT 2 / 4');await expect(page.getByLabel('モンスター撃破数の数')).toHaveValue('1');
 await page.locator('#roster-undo').click();await expect(target(0)).not.toHaveClass(/defeated/);await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 4');await expect(page.getByLabel('モンスター撃破数の数')).toHaveValue('0');
});


test('07 skill: persistent monster statuses show only for their owner and weakness zeros opponent dice',async({page})=>{
 const cards=await prepareSherryTargets(page);const card=cards.first();await selectCharacter(page,'24');
 await page.getByRole('button',{name:'弱点反撃を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-select').click();
 await expect(card.locator('.roster-status-weakness button')).toHaveAttribute('aria-pressed','true');
 await selectCharacter(page,'27');await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-status-investigationTarget button').click();
 await selectCharacter(page,'29');await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-status-erosionStacks button').click();await card.locator('.roster-status-erosionStacks button').click();
 await selectCharacter(page,'24');await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-select').click();await expect(page.locator('#damageAdd1')).toHaveValue('2');
 const attack=page.locator('.mode-content[data-role="attack"]'),defense=page.locator('.mode-content[data-role="defense"]');
 await expect(attack.locator('.damage-table thead tr:last-child th')).toHaveText(['0','0','0','0','0','0']);
 const row=await attack.locator('.damage-table tbody tr').first().locator('td').allTextContents();expect(new Set(row).size).toBe(1);
 await page.locator('.role-tab[data-role="defense"]').click();await expect(defense.locator('.defense-choice-die')).toHaveText(['0','0','0','0','0','0']);
 const diceCells=await defense.locator('.damage-table tbody tr').evaluateAll(rows=>rows.map((row,index)=>row.querySelectorAll('th')[index===0?1:0].textContent));expect(diceCells).toEqual(['0','0','0','0','0','0']);
 await page.locator('#turn-end').click();await expect(card.locator('.roster-status-weakness button')).toHaveAttribute('aria-pressed','true');
 await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-status-weakness button').click();await expect(attack.locator('.damage-table thead tr:last-child th')).toHaveText(['1','2','3','4','5','6']);
 await selectCharacter(page,'27');await expect(card.locator('.roster-status-investigationTarget button')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'ミッション：インシークレットを発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-select').click();
 await selectCharacter(page,'14');await expect(card.locator('.roster-character-status')).toHaveCount(0);
 await page.getByRole('button',{name:'桜裂空斬を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await card.locator('.roster-select').click();await expect(card.locator('input[aria-label$="の残りHP"]')).toHaveValue('3');
 await page.locator('#roster-undo').click();await expect(card.locator('input[aria-label$="の残りHP"]')).toHaveValue('5');
 await selectCharacter(page,'29');await expect(card.locator('.roster-status-erosionStacks strong')).toHaveText('0');
});

test('07 skill: character-only monster controls share Mark placement and size and preserve hidden values',async({page})=>{
 const cards=await prepareSherryTargets(page),card=cards.first();
 for(const [id,key] of [['24','weakness'],['27','investigationTarget'],['29','erosionStacks'],['101','fan']]){
  await selectCharacter(page,id);await page.locator('.role-tab[data-role="map"]').click();
  await expect(card.locator('.roster-character-status')).toHaveCount(1);
  const field=card.locator('.roster-status-'+key),button=field.locator('button'),mark=card.locator('.roster-mark:not(.roster-character-status)');
  await expect(card.locator('.monster-name-text > .roster-status-'+key)).toHaveCount(1);
  const sizes=await Promise.all([button,mark.locator('button')].map(x=>x.evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))));expect(sizes[0]).toEqual(sizes[1]);
  const icons=await button.locator('img').count();if(icons)await expect(button.locator('img')).toHaveCSS('width','20px');
  await button.click();
  // A status click does not register the monster as a combat target or switch tabs.
  await expect(page.locator('.mode-content[data-role="map"]')).toBeVisible();
  await expect(card).not.toHaveClass(/(?:^|\s)selected(?:\s|$)/);
  await selectCharacter(page,'1');await expect(card.locator('.roster-character-status')).toHaveCount(0);
  await selectCharacter(page,id);
  if(key==='erosionStacks')await expect(field.locator('strong')).toHaveText('1');else await expect(button).toHaveAttribute('aria-pressed','true');
 }
 await selectCharacter(page,'102');await expect(card.locator('.roster-character-status')).toHaveCount(0);
});
test('07 skill: fans include defeated monsters and both attack penalties persist without repeated stacking',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'101');
 await page.locator('.role-tab[data-role="map"]').click();
 for(let i=0;i<3;i++)await cards.nth(i).locator('.roster-status-fan button').click();
 await expect(page.getByLabel('ファンの数')).toHaveValue('3');
 const enemyAttack=cards.first().locator('input[aria-label$="の攻撃力"]');await enemyAttack.fill('5');await enemyAttack.dispatchEvent('change');
 const secondAttack=cards.nth(1).locator('input[aria-label$="の攻撃力"]');await secondAttack.fill('0');await secondAttack.dispatchEvent('change');
 await page.getByLabel('ファンの数').fill('9');await page.getByLabel('ファンの数').dispatchEvent('change');
 await page.getByRole('button',{name:'インターネットエンジェルを発動'}).click();await expect(enemyAttack).toHaveValue('4');await expect(secondAttack).toHaveValue('0');
 await secondAttack.fill('5');await secondAttack.dispatchEvent('change');await expect(secondAttack).toHaveValue('5');
 await cards.first().locator('.roster-select').click();await expect(page.locator('#attackPower2')).toHaveValue('3');
 for(let i=0;i<3;i++)await page.locator('#turn-end').click();await expect(enemyAttack).toHaveValue('4');await expect(page.locator('#attackPower2')).toHaveValue('3');
 await page.getByRole('button',{name:'インターネットエンジェルを発動'}).click();await expect(enemyAttack).toHaveValue('4');
 await page.locator('.role-tab[data-role="map"]').click();await cards.nth(2).locator('.roster-remove').click();await expect(page.getByLabel('ファンの数')).toHaveValue('9');
 await selectCharacter(page,'1');await expect(page.locator('#attackPower2')).toHaveValue('4');await selectCharacter(page,'102');await expect(page.locator('#attackPower2')).toHaveValue('3');
});


test('07 skill: party registration automatically opens with self first and three unique optional members',async({page})=>{
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();
 const select=id=>page.locator('.character-select[data-id="'+id+'"]'),grid=page.locator('#selected-party-grid'),slots=grid.locator('.party-member-slot');
 await select('16').click();await expect(page.locator('#selected-party-tab')).toHaveAttribute('aria-selected','true');await expect(grid).toBeVisible();
 await expect(slots).toHaveCount(4);await expect(slots.nth(0)).toHaveAttribute('data-character-id','16');
 await expect(grid.locator('.party-slot-order')).toHaveText(['1st自分','2nd','3rd','4th']);
 const roundBefore=await page.locator('#current-round').textContent(),progressBefore=await page.locator('#current-progress').textContent();
 await select('16').click();await expect(slots.nth(1)).toHaveAttribute('data-character-id','');
 await select('1').click();await select('1').click();await select('2').focus();await select('2').press('Enter');await select('3').click();
await expect(slots.nth(1)).toHaveAttribute('data-character-id','1');await expect(slots.nth(2)).toHaveAttribute('data-character-id','2');await expect(slots.nth(3)).toHaveAttribute('data-character-id','3');
 await select('4').click();await expect(slots.nth(3)).toHaveAttribute('data-character-id','3');
 await expect(page.locator('#selected-character-name')).toHaveText('ジャスミン');await expect(page.locator('#current-round')).toHaveText(roundBefore);await expect(page.locator('#current-progress')).toHaveText(progressBefore);
 await slots.nth(2).click({button:'right'});await expect(slots.nth(2)).toHaveAttribute('data-character-id','');
 await select('4').click();await expect(slots.nth(2)).toHaveAttribute('data-character-id','4');await select('1').click({button:'right'});await expect(slots.nth(1)).toHaveAttribute('data-character-id','');
 await slots.nth(0).click({button:'right'});await expect(slots.nth(0)).toHaveAttribute('data-character-id','16');
 await page.locator('#selected-self-tab').click();await select('3').click();
 await expect(slots.nth(0)).toHaveAttribute('data-character-id','3');await expect(slots.nth(3)).toHaveAttribute('data-character-id','');await expect(slots.nth(2)).toHaveAttribute('data-character-id','4');
});

test('07 skill: party levels are independent and self stats stay linked after dragging',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'16');
 await page.locator('#selected-character-portrait').click();
 const atk=page.locator('#selected-character-atk');await atk.fill('7');await atk.dispatchEvent('change');
 const hp=page.locator('#selected-character-current-hp');await hp.fill('5');await hp.dispatchEvent('change');
 await page.locator('#selected-party-tab').click();
 const slot=id=>page.locator('.party-member-slot[data-character-id="'+id+'"]');
 await page.locator('.character-select[data-id="1"]').click();await page.locator('.character-select[data-id="2"]').click();
 await expect(slot('1').locator('.party-slot-level')).toHaveText('Lv.0');await expect(slot('1').locator('[data-stat="hp"] b')).toHaveText('9/9');
 await slot('1').locator('.party-slot-level').click();await expect(slot('1').locator('[data-stat="hp"] b')).toHaveText('11/11');
 await expect(slot('2').locator('.party-slot-level')).toHaveText('Lv.0');
 for(let i=0;i<4;i++)await slot('1').locator('.party-slot-level').click();await expect(slot('1').locator('.party-slot-level')).toHaveText('Lv.3');await expect(slot('1').locator('[data-stat="atk"] b')).toHaveText('2');
 for(let i=0;i<4;i++)await slot('1').locator('.party-slot-level').click({button:'right'});await expect(slot('1').locator('.party-slot-level')).toHaveText('Lv.0');
 await slot('1').locator('.party-slot-portrait').click();await slot('1').locator('.party-slot-portrait').click({button:'right'});await expect(slot('1').locator('.party-slot-level')).toHaveText('Lv.0');
 await expect(slot('16').locator('.party-slot-level')).toHaveText('Lv.1');await expect(slot('16').locator('[data-stat="atk"] b')).toHaveText('7');await expect(slot('16').locator('[data-stat="hp"] b')).toHaveText('5/11');
 const round=await page.locator('#current-round').textContent();
 await slot('16').dragTo(slot('2'));await expect(slot('16')).toHaveAttribute('data-slot','3');await expect(slot('2')).toHaveAttribute('data-slot','1');await expect(slot('16').locator('.party-slot-order')).toHaveText('3rd自分');
 await slot('16').locator('.party-slot-level').click();await expect(slot('16').locator('.party-slot-level')).toHaveText('Lv.2');await expect(slot('16').locator('[data-stat="atk"] b')).toHaveText('9');
 await slot('16').click({button:'right'});await expect(slot('16')).toHaveCount(1);
 await page.locator('#selected-self-tab').click();await expect(page.locator('#selected-character-level')).toHaveText('Lv.2');await expect(atk).toHaveValue('9');await expect(hp).toHaveValue('5');
 const def=page.locator('#selected-character-def');await def.fill('4');await def.dispatchEvent('change');
 await page.locator('#selected-party-tab').click();await expect(slot('16').locator('[data-stat="def"] b')).toHaveText('4');
 await slot('1').dragTo(page.locator('.party-member-slot[data-slot="4"]'));await expect(slot('1')).toHaveAttribute('data-slot','4');await expect(page.locator('.party-member-slot[data-slot="2"]')).toHaveAttribute('data-character-id','');
 await page.locator('.character-select[data-id="3"]').click();await expect(slot('3')).toHaveAttribute('data-slot','2');
 await slot('1').click({button:'right'});await expect(slot('1')).toHaveCount(0);await page.locator('.character-select[data-id="1"]').click();await expect(slot('1').locator('.party-slot-level')).toHaveText('Lv.0');
 await page.locator('.character-select[data-id="16"]').click();await expect(slot('16')).toHaveCount(1);
 await expect(page.locator('#current-round')).toHaveText(round);
 await page.locator('#selected-self-tab').click();await page.locator('.character-select[data-id="2"]').click();await expect(slot('2')).toHaveAttribute('data-slot','3');await expect(slot('2').locator('.party-slot-order')).toHaveText('3rd自分');await expect(page.locator('.party-member-slot[data-slot="1"]')).toHaveAttribute('data-character-id','');
});

test('07 skill: party identity, HP-first stats and compact self chips stay inside the fixed frame',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');
 const frame=page.locator('#selected-character'),before=await frame.boundingBox();
 await selectChipCategory(page,'共通');
 const choices=page.locator('#chip-image-list .chip-select'),ids=[];
 for(let i=0;i<12;i++){const choice=choices.nth(i);ids.push(await choice.getAttribute('data-id'));await choice.click();}
 await page.locator('#selected-party-tab').click();
 const self=page.locator('.party-member-slot[data-character-id="1"]');
 await expect(self.locator('.party-slot-identity .party-slot-level')).toHaveText('Lv.0');
 expect(await self.locator('.party-slot-stat').evaluateAll(nodes=>nodes.map(n=>n.dataset.stat))).toEqual(['hp','atk','def','move']);
 await expect(self.locator('[data-stat="move"] b')).toHaveText(await page.locator('#selected-character-move').textContent());
 expect(await self.locator('.party-slot-chip').evaluateAll(nodes=>nodes.map(n=>n.dataset.chipId))).toEqual(ids);
 await expect(self.locator('.party-slot-chips')).toHaveAttribute('data-rows','2');
 const chipRows=await self.locator('.party-slot-chip').evaluateAll(nodes=>nodes.slice(0,3).map(n=>n.getBoundingClientRect().y));expect(chipRows[1]).toBeGreaterThan(chipRows[0]);expect(chipRows[2]).toBe(chipRows[0]);
 await self.locator('.party-slot-chips').evaluate(list=>list.style.flex='0 0 80px');
 await expect(self.locator('.party-slot-chips')).toHaveAttribute('data-rows','3');
 const compact=await self.locator('.party-slot-chips').evaluate(list=>({rows:new Set([...list.children].map(n=>n.getBoundingClientRect().y)).size,size:list.firstElementChild.getBoundingClientRect().width,overflow:list.scrollWidth>list.clientWidth}));expect(compact.rows).toBe(3);expect(compact.size).toBeLessThan(19);expect(compact.overflow).toBe(false);
 await self.locator('.party-slot-chips').evaluate(list=>list.style.removeProperty('flex'));await expect(self.locator('.party-slot-chips')).toHaveAttribute('data-rows','2');
 const nameBounds=await self.locator('.party-slot-name').boundingBox(),lvBounds=await self.locator('.party-slot-level').boundingBox();expect(lvBounds.x).toBeGreaterThanOrEqual(nameBounds.x+nameBounds.width);expect(lvBounds.y).toBeLessThan(nameBounds.y+nameBounds.height);
 await page.locator('#character-list-tab').click();await page.locator('.character-select[data-id="2"]').click();
 const ally=page.locator('.party-member-slot[data-character-id="2"]');await expect(ally.locator('.party-slot-chips')).toHaveCount(0);
 for(let i=0;i<3;i++)await ally.locator('.party-slot-level').click();await expect(ally.locator('[data-stat="move"] b')).toHaveText('1');
 await self.dragTo(page.locator('.party-member-slot[data-slot="4"]'));await expect(self).toHaveAttribute('data-slot','4');await expect(self.locator('.party-slot-chip')).toHaveCount(12);
 for(const width of [1280,600,375]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(self.locator('.party-slot-chips')).toHaveAttribute('data-rows',/^[23]$/);
  const ptBounds=await frame.boundingBox();expect(ptBounds.height).toBe(118);
  const layout=await self.evaluate(slot=>{const s=slot.getBoundingClientRect(),details=slot.querySelector('.party-slot-details'),list=slot.querySelector('.party-slot-chips'),l=list.getBoundingClientRect(),d=details.getBoundingClientRect();return {fits:l.left>=d.right&&l.right<=s.right+1&&l.top<d.bottom&&l.bottom>d.top&&d.top>=s.top&&d.bottom<=s.bottom+1,sizes:[...list.querySelectorAll('img')].map(img=>{const r=img.getBoundingClientRect();return {width:r.width,height:r.height};})};});
  expect(layout.fits).toBe(true);for(const size of layout.sizes){expect(size.width).toBeLessThanOrEqual(20);expect(size.height).toBeLessThanOrEqual(20);}
  const packing=await self.locator('.party-slot-chips').evaluate(list=>{const style=getComputedStyle(list),details=list.parentElement.querySelector('.party-slot-details'),size=list.firstElementChild.getBoundingClientRect().width;return {gap:style.gap,leftGap:list.getBoundingClientRect().left-details.getBoundingClientRect().right,padding:style.paddingLeft,size,configuredRows:Number(list.dataset.rows),rows:new Set([...list.children].map(n=>n.getBoundingClientRect().y)).size};});expect(packing.gap).toBe('1px');expect(packing.leftGap).toBe(2);expect(packing.padding).toBe('2px');expect(packing.rows).toBe(packing.configuredRows);if(packing.rows===3)expect(packing.size).toBeLessThan(19);
  await page.locator('#selected-self-tab').click();const ownBounds=await frame.boundingBox();expect(ownBounds.width).toBe(ptBounds.width);expect(ownBounds.height).toBe(ptBounds.height);await page.locator('#selected-party-tab').click();
 }
 await page.setViewportSize({width:1280,height:720});expect((await frame.boundingBox()).width).toBe(before.width);await expect(self.locator('.party-slot-chips')).toHaveAttribute('data-rows','2');
 await selectChipCategory(page,'共通');await page.locator('.chip-select[data-id="'+ids[0]+'"]').click();await page.locator('#selected-party-tab').click();await expect(self.locator('.party-slot-chip')).toHaveCount(11);await expect(self.locator('.party-slot-chip[data-chip-id="'+ids[0]+'"]')).toHaveCount(0);
});

test('07 skill: PT editing isolates chips, modifiers and icon HP from self and other members',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'27');
 const ownAtk=await page.locator('#selected-character-atk').inputValue(),round=await page.locator('#current-round').textContent();
 await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="1"]').click();await page.locator('.character-select[data-id="2"]').click();
 const slot=id=>page.locator('.party-member-slot[data-character-id="'+id+'"]'),stat=(id,key)=>slot(id).locator('[data-stat="'+key+'"] b'),icon=(id,key)=>slot(id).locator('[data-stat="'+key+'"] button');
 await slot('1').locator('.party-slot-name').click();await expect(slot('1')).toHaveAttribute('aria-current','true');await selectChipCategory(page,'共通');
 for(const id of ['1','4','7','10','9','13'])await page.locator('.chip-select[data-id="'+id+'"]').click();
 await expect(stat('1','atk')).toHaveText('4');await expect(stat('1','def')).toHaveText('2');await expect(stat('1','move')).toHaveText('1');await expect(stat('1','hp')).toHaveText('9/14');await expect(slot('1').locator('.party-slot-chip')).toHaveCount(6);
 await expect(slot('2').locator('.party-slot-chip')).toHaveCount(0);await expect(slot('27').locator('.party-slot-chip')).toHaveCount(0);await expect(page.locator('#selected-character-atk')).toHaveValue(ownAtk);await expect(slot('1').locator('input')).toHaveCount(0);
 for(let i=0;i<3;i++)await icon('1','hp').click();await expect(stat('1','hp')).toHaveText('6/14');await expect(stat('1','atk')).toHaveText('8');await icon('1','hp').click({button:'right'});await expect(stat('1','atk')).toHaveText('4');
 await icon('1','atk').click();await icon('1','def').click();await icon('1','move').click();await expect(stat('1','atk')).toHaveText('5');await expect(stat('1','def')).toHaveText('3');await expect(stat('1','move')).toHaveText('2');
 await slot('1').dragTo(page.locator('.party-member-slot[data-slot="4"]'));await expect(slot('1')).toHaveAttribute('aria-current','true');await expect(page.locator('.chip-select[data-id="1"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.chip-select[data-id="1"]').click();await expect(stat('1','atk')).toHaveText('4');await expect(slot('1').locator('.party-slot-chip')).toHaveCount(5);
 for(let i=0;i<20;i++)await icon('1','hp').click({button:'right'});await expect(stat('1','hp')).toHaveText('14/14');await page.locator('.chip-select[data-id="7"]').click();await expect(stat('1','hp')).toHaveText('12/12');
 await slot('2').locator('.party-slot-name').click();await expect(page.locator('.chip-select[data-id="4"]')).toHaveAttribute('aria-pressed','false');await page.locator('.chip-select[data-id="4"]').click();await expect(stat('2','move')).toHaveText('1');await expect(stat('1','move')).toHaveText('2');
 await slot('27').locator('.party-slot-name').click();await page.locator('.chip-select[data-id="1"]').click();await expect(page.locator('#selected-character-atk')).toHaveValue(String(Number(ownAtk)+1));await expect(stat('1','atk')).toHaveText('3');
 await slot('1').locator('.party-slot-name').click();await slot('1').locator('.party-slot-name').click({button:'right'});await expect(slot('1')).toHaveCount(0);await expect(slot('27')).toHaveAttribute('aria-current','true');await expect(page.locator('.chip-select[data-id="1"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#current-round')).toHaveText(round);await page.locator('#selected-self-tab').click();await expect(page.locator('#selected-character-name')).toHaveText('ボニー');
});

test('07 skill: monster status buttons combine self and PT membership and preserve hidden values',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'27');await page.locator('#selected-party-tab').click();
 for(const id of ['29','24','101'])await page.locator('.character-select[data-id="'+id+'"]').click();
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const maps=page.locator('#mp-map-select');for(const option of await maps.locator('option').all()){await maps.selectOption(await option.getAttribute('value'));await maps.dispatchEvent('change');if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;}
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const card=page.locator('#map-roster-list .roster-card').first();await expect(card.locator('.roster-mark')).toHaveCount(4);
 expect(await card.locator('.roster-character-status').evaluateAll(nodes=>nodes.map(n=>[...n.classList].find(c=>c.startsWith('roster-status-'))))).toEqual(['roster-status-weakness','roster-status-investigationTarget','roster-status-fan']);
 await card.locator('.roster-status-investigationTarget button').click();await expect(card.locator('.roster-status-erosionStacks')).toHaveCount(0);
 const round=await page.locator('#current-round').textContent(),count=await page.locator('#roster-counts').textContent();
 await page.locator('.role-tab[data-role="character"]').click();await page.locator('.party-member-slot[data-character-id="29"] .party-slot-name').click();await expect(page.locator('#selected-character-name')).toHaveText('ボニー');
 await page.locator('.party-member-slot[data-character-id="29"] .party-slot-name').click({button:'right'});await expect(card.locator('.roster-status-erosionStacks')).toHaveCount(0);await expect(card.locator('.roster-status-investigationTarget button')).toHaveAttribute('aria-pressed','true');
 await page.locator('.character-select[data-id="29"]').click();await expect(card.locator('.roster-status-erosionStacks')).toHaveCount(0);await expect(page.locator('#roster-counts')).toHaveText(count);await expect(page.locator('#current-round')).toHaveText(round);
});

test('07 skill: self and 2x2 party preserve the exact outer frame and personal controls',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'16');
 const frame=page.locator('#selected-character');
 const frameBounds=()=>frame.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+window.scrollX,y:r.y+window.scrollY,width:r.width,height:r.height};});
 const before=await frameBounds();
 const atk=page.locator('#selected-character-atk');await atk.fill('7');await atk.dispatchEvent('change');
 await page.locator('#selected-party-tab').click();const partyBounds=await frameBounds();expect(partyBounds).toEqual(before);
 const slots=page.locator('#selected-party-grid .party-member-slot'),bounds=await slots.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 expect(bounds[0].y).toBe(bounds[1].y);expect(bounds[2].y).toBe(bounds[3].y);expect(bounds[0].x).toBe(bounds[2].x);expect(bounds[1].x).toBe(bounds[3].x);expect(bounds[1].x).toBeGreaterThan(bounds[0].x);expect(bounds[2].y).toBeGreaterThan(bounds[0].y);
 await page.locator('.character-select[data-id="1"]').click();await page.locator('#selected-self-tab').click();await expect(atk).toHaveValue('7');await expect(page.locator('#selected-character-portrait')).toBeVisible();
 await page.locator('#selected-self-tab').focus();await page.locator('#selected-self-tab').press('ArrowDown');await expect(page.locator('#selected-party-tab')).toBeFocused();await expect(page.locator('#selected-party-tab')).toHaveAttribute('aria-selected','true');
 for(const width of [600,375]){
  await page.setViewportSize({width,height:1000});const pt=await frame.boundingBox();await page.locator('#selected-self-tab').click();const self=await frame.boundingBox();expect(pt.width).toBe(self.width);expect(pt.height).toBe(self.height);expect(self.height).toBe(118);await page.locator('#selected-party-tab').click();
 }
});

async function selectChipCategory(page,category){
 await page.locator('#character-chip-tab').click();
 await page.locator(`.chip-category-tabs [data-category="${category}"]`).click();
}

test('07 skill: Extra Battery lowers only the owner CT cap and restores it on removal', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'1');
 const skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
 await skill.click();await expect(ct).toHaveText('CT 3 / 3');
 await selectChipCategory(page,'共通');
 const battery=page.locator('.chip-select[data-id="15"]');
 await battery.click();await expect(ct).toHaveText('CT 2 / 2');
 await ct.click({button:'right'});await expect(ct).toHaveText('CT 2 / 2');
 await ct.click();await ct.click();await skill.click();await expect(ct).toHaveText('CT 2 / 2');
 await page.locator('#character-list-tab').click();await selectCharacter(page,'2');
 await skill.click();await expect(ct).toHaveText('CT 2 / 2');
 await selectCharacter(page,'1');await expect(ct).toHaveText('CT 2 / 2');
 await selectChipCategory(page,'共通');await battery.click();
 await expect(ct).toHaveText('CT 2 / 3');
 await ct.click();await ct.click();await skill.click();await expect(ct).toHaveText('CT 3 / 3');
});

test('07 skill: Extra Battery cap also applies after monster target confirmation', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 await selectCharacter(page,'9');
 await selectChipCategory(page,'共通');await page.locator('.chip-select[data-id="15"]').click();
 await page.locator('#selected-character-skill').click();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#map-roster-list .roster-select').first().click();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
});

test('07 skill: charge consumption requires full cost and Lightning Core reduces remaining CT', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'1');
 const ct=page.locator('#selected-character-ct');
 await page.locator('#selected-character-skill').click();
 await selectChipCategory(page,'チャージ');
 for(const [id,cost,name] of [['55',6,'エアバッグ'],['56',5,'ライトニングコア'],['58',4,'レールガン']]){
  const chip=page.locator(`.chip-select[data-id="${id}"]`);await chip.click();
  const charge=page.getByLabel('チャージの数'),owned=page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText(name,{exact:true})});
  await charge.fill(String(cost-1));await charge.dispatchEvent('change');
  const before=await ct.textContent();
  await owned.click();await expect(charge).toHaveValue(String(cost-1));await expect(ct).toHaveText(before);
  await owned.focus();await owned.press('Enter');await expect(charge).toHaveValue(String(cost-1));await expect(ct).toHaveText(before);
  await charge.fill(String(cost));await charge.dispatchEvent('change');
  await owned.click();await expect(charge).toHaveValue('0');
  await expect(ct).toHaveText(id==='56'?'CT 2 / 3':before);
  await chip.click();
 }
 await page.locator('.chip-select[data-id="56"]').click();
 const charge=page.getByLabel('チャージの数'),core=page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText('ライトニングコア',{exact:true})});
 await ct.click();await ct.click();await expect(ct).toHaveText(/^CT 0 \/ \d+$/);
 await charge.fill('5');await charge.dispatchEvent('change');await core.focus();await core.press(' ');
 await expect(ct).toHaveText(/^CT 0 \/ \d+$/);await expect(charge).toHaveValue('0');
 await page.locator('.chip-select[data-id="51"]').click();
 await charge.fill('9');await charge.dispatchEvent('change');
 await page.locator('.selected-character-chips .selected-chip').filter({has:page.getByAltText('エネルギー回収',{exact:true})}).click();
 await expect(charge).toHaveValue('10');
});

test('07 skill: Sherry reasoning stacks modify attack and decay on turn end', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'106');
 const stack=page.getByLabel('推理タイムの数');
 await stack.fill('3');await stack.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('#turn-end').click();
 await expect(stack).toHaveValue('2');
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
});

test('07 skill: Nancy firewall toggles attack and defense bonuses', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'18');
 await page.getByRole('button',{name:/ファイアウォール：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});

test('07 skill: Hime Qigong Training heals and conditionally buffs attack for the turn', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'12');
 const hp=page.locator('#selected-character-current-hp'),energy=page.getByLabel('エネルギー保存の数'),skill=page.getByRole('button',{name:'気功修練を発動'});
 const maxHp=Number(await page.locator('#selected-character-hp').textContent());
 await hp.fill(String(Math.max(0,maxHp-3)));await hp.dispatchEvent('change');
 await skill.click();
 await expect(hp).toHaveValue(String(Math.min(maxHp,maxHp-1)));
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();
 await energy.fill('1');await energy.dispatchEvent('change');
 await hp.fill(String(Math.max(0,maxHp-2)));await hp.dispatchEvent('change');
 await skill.click();
 await expect(hp).toHaveValue(String(maxHp));
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await page.locator('#turn-end').click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
});

test('07 skill: Misaki manually targets a roster monster and applies Sakura Retsukuzan', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'14');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first(),hp=page.locator('#map-roster-list input[aria-label$="の残りHP"]').first();
 const before=Number(await hp.inputValue());
 await page.locator('.role-tab.character-tab').click();
 const aura=page.getByLabel('剣気の数'),skill=page.getByRole('button',{name:'桜裂空斬を発動'});
 await skill.click();
 const banner=page.locator('#character-skill-target-banner');
 await expect(banner).toBeVisible();
 await expect(banner).toContainText('桜裂空斬：対象のモンスターを選択してください');
 await expect(page.locator('.map-roster')).toHaveClass(/is-character-skill-targeting/);
 await expect(page.locator('.role-tab.character-tab')).toHaveClass(/active/);
 await page.locator('#character-skill-target-cancel').click();
 await expect(banner).toBeHidden();
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 0 \/ \d+$/);
 await skill.click();
 await expect(banner).toBeVisible();
 await page.locator('.role-tab[data-role="map"]').click();
 await target.click();
 await expect(banner).toBeHidden();
 if(before>2)await expect(hp).toHaveValue(String(before-2));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);
 await expect(aura).toHaveValue('1');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
 await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();await page.locator('#selected-character-ct').click();
 await aura.fill('3');await aura.dispatchEvent('change');
 await skill.click();await page.locator('.role-tab[data-role="map"]').click();
 const nextTarget=page.locator('#map-roster-list .roster-select:not(:disabled)').first();
 if(await nextTarget.count())await nextTarget.click();
 await expect(aura).toHaveValue('1');
});

test('07 skill: Kaisei Bonnie and Rinrin apply targeted monster effects', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first();

 await selectCharacter(page,'13');
 await page.getByRole('button',{name:'フェイト・エコーを発動'}).click();
 await target.click();
 await expect(page.locator('.roster-fate-echo').first()).toHaveText('2');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);
 await target.click();
 await expect(page.locator('#damageAdd1')).toHaveValue('1');
 await page.locator('#turn-end').click();
 await expect(page.locator('.roster-fate-echo').first()).toHaveText('1');
 await page.locator('#turn-end').click();
 await expect(page.locator('.roster-fate-echo')).toHaveCount(0);
 await expect(page.locator('#damageAdd1')).toHaveValue('0');

 await selectCharacter(page,'27');
 await page.getByRole('button',{name:'ミッション：インシークレットを発動'}).click();
 await target.click();
 await expect(page.locator('.roster-mark strong').first()).toHaveText('1');
 await expect(page.locator('#selected-character-ct')).toHaveText(/^CT 3 \/ \d+$/);

 await selectCharacter(page,'28');
 const defense=page.locator('#map-roster-list input[aria-label$="の防御力"]').first();
 const before=Number(await defense.inputValue());
 await page.getByRole('button',{name:'インターセプトタックルを発動'}).click();await page.locator('#rinrin-area-dialog').getByRole('button',{name:'Yes',exact:true}).click();
 await target.click();
 await page.locator('#character-skill-target-ok').click();
 await expect(defense).toHaveValue(String(Math.max(0,before-2)));
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
 await page.locator('#turn-end').click();
 await expect(defense).toHaveValue(String(Math.max(0,before-2)));
 await page.locator('#turn-end').click();
 await expect(defense).toHaveValue(String(before));
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});

test('07 skill: affected characters expose active skill CT management; full scan is opt-in', async ({ page }) => {
 await page.goto('/07_skill/');
 const expected={1:3,2:2,3:3,4:3,5:3,6:3,7:3,8:3,9:4,10:3,11:3,12:3,13:3,14:3,15:3,16:4,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:2,25:3,26:3,27:3,28:3,29:3,101:3,102:3,103:3,104:2,105:3,106:2};
 for(const [id,cooldown] of Object.entries(expected)){
  if(process.env.FULL_CHARACTER_CHECK!=='1'&&!['6','8','9','10','11','12','15','23'].includes(id))continue;
  await selectCharacter(page,id);
  const skill=page.locator('#selected-character-skill'),ct=page.locator('#selected-character-ct');
  await expect(skill).toBeVisible();
  await expect(ct).toHaveText('CT 0 / '+cooldown);
  await skill.click();
  if(id==='23')await page.getByRole('button',{name:'憑依を確定'}).click();
  if(['9','13','14','17','24','27','28','106'].includes(id)){
   await expect(ct).toHaveText('CT 0 / '+cooldown);
   continue;
  }
  await expect(ct).toHaveText('CT '+cooldown+' / '+cooldown);
  await ct.click();
  await expect(ct).toHaveText('CT '+(cooldown-1)+' / '+cooldown);
  await ct.click({button:'right'});
  await expect(ct).toHaveText('CT '+cooldown+' / '+cooldown);
 }
});


test('07 skill: Jasmine uses adjacent dice input and clears effects while CT counts down',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'16');
 const skill=page.getByRole('button',{name:'オーバードライブを発動'}),ct=page.locator('#selected-character-ct');
 await page.locator('#selected-character-def').fill('5');await page.locator('#selected-character-def').dispatchEvent('change');
 await page.getByLabel('オーバードライブのダイスの出目',{exact:true}).fill('9');await skill.click();
 await expect(page.locator('#selected-character-move')).toHaveText('3');await expect(page.locator('#selected-character-def')).toHaveValue('4');await expect(ct).toHaveText('CT 4 / 4');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-move')).toHaveText('0');await expect(page.locator('#selected-character-def')).toHaveValue('5');await expect(ct).toHaveText('CT 3 / 4');
 await page.locator('#roster-undo').click();await expect(ct).toHaveText('CT 4 / 4');await expect(page.locator('#selected-character-def')).toHaveValue('4');
 for(let i=0;i<4;i++)await page.locator('#turn-end').click();await expect(ct).toHaveText('CT 0 / 4');await expect(skill).toBeEnabled();
 await page.getByLabel('オーバードライブのダイスの出目',{exact:true}).fill('10');await skill.click();await expect(page.locator('#selected-character-atk')).toHaveValue('3');await expect(page.locator('#selected-character-def')).toHaveValue('2');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue('1');await expect(page.locator('#selected-character-def')).toHaveValue('5');
});

test('07 skill: Jasmine canceled and invalid dice consume no CT and cumulative movement remains',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'16');
 const movement=page.getByLabel('累計移動ポイントの数');await movement.fill('26');await movement.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');await expect(page.locator('#selected-character-def')).toHaveValue('1');
 const skill=page.getByRole('button',{name:'オーバードライブを発動'});
 for(const value of ['','-1','1.5']){
  await page.getByLabel('オーバードライブのダイスの出目',{exact:true}).fill(value);await skill.click();
  await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 4');await expect(page.locator('#selected-character-move')).toHaveText('0');
 }
 await expect(page.getByRole('button',{name:/オーバードライブ結果/})).toHaveCount(0);
});

test('07 skill: compatible character abilities use shared controls and modifiers', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'12');
 await expect(page.getByRole('button',{name:'エネルギー保存を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_113_Passive\.png$/);
 const energy=page.getByLabel('エネルギー保存の数');
 await energy.fill('2');await energy.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('2');

 await selectCharacter(page,'14');
 await expect(page.getByRole('button',{name:'剣気を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_115\.png$/);
 const sword=page.getByLabel('剣気の数');
 await sword.fill('9');await sword.dispatchEvent('change');
 await expect(sword).toHaveValue('3');

 await selectCharacter(page,'24');
 await expect(page.getByRole('button',{name:'精確無比を増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_125_Passive\.png$/);
 const precision=page.getByLabel('精確無比の数');
 await precision.fill('3');await precision.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await page.locator('#turn-end').click();
 await expect(precision).toHaveValue('2');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'25');
 const awakening=page.getByLabel('覚醒の数');
 const awakeningButton=page.getByRole('button',{name:'覚醒を増やす'});
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);
 await expect(page.getByRole('button',{name:/真龍/})).toHaveCount(0);
 await awakening.fill('7');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);
 await awakening.fill('8');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1261204\.png$/);
 await awakening.fill('7');await awakening.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(awakeningButton.locator('img')).toHaveAttribute('src',/UT_Buff_1026\.png$/);

 await selectCharacter(page,'104');
 await expect(page.getByRole('button',{name:'温もりを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_304_piano\.png$/);
 const warmth=page.getByLabel('温もりの数');
 await warmth.fill('5');await warmth.dispatchEvent('change');
 await expect(page.locator('#selected-character-def')).toHaveValue('5');
});


test('07 skill: Z3000 and Al apply bonuses per threshold', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'9');
 const defeats=page.getByLabel('モンスター撃破数の数');
 await defeats.fill('5');await defeats.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');

 await selectCharacter(page,'21');
 await expect(page.getByRole('button',{name:'スターライトを増やす'}).locator('img')).toHaveAttribute('src',/UT_Buff_StarLight\.png$/);
 const starlight=page.getByLabel('スターライトの数');
 await starlight.fill('13');await starlight.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('3');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');
});

test('07 skill: Papara gains attack at half HP or lower', async ({ page }) => {
 await page.goto('/07_skill/');
 await selectCharacter(page,'7');
 const hp=page.locator('#selected-character-current-hp');
 await hp.fill('5');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await hp.fill('6');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});


test('07 skill: character list hover shows ability tooltip', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab.character-tab').click();
 const mimi=page.locator('.character-select[data-id="1"]');
 await page.locator('#character-hover-skills').check();await mimi.hover();
 const tooltip=page.locator('#character-skill-tooltip');
 await expect(tooltip).toBeVisible();
 await expect(tooltip).toContainText('商品補充');
 await expect(tooltip).toContainText('リサイクル');
});

test('07 skill: character cards use Hero Card2 artwork and live stats while preserving selection', async ({ page }) => {
 await page.route('**/csv/character_stats.csv',async route=>{
  const response=await route.fetch();const csv=await response.text();
  await route.fulfill({response,body:csv.replace('12,10,9,1,1,0,11','12,10,19,7,6,0,11')});
 });
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select')).toHaveCount(35);
 const mimi=page.locator('.character-select[data-id="1"]');
 await expect(mimi.locator('.character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_108.png');
 await expect.poll(()=>mimi.locator('.character-list-image').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(mimi.locator('.character-list-name')).toHaveText('ミミ');
 for(const [key,value] of [['lv0_atk','7'],['lv0_def','6'],['lv0_hp','19']])await expect(mimi.locator(`[data-stat="${key}"]`)).toHaveText(value);
 await expect(mimi.locator('[data-stat="initial_coin"]')).toHaveText('12+10');
 await page.locator('#character-hover-skills').check();await mimi.hover();await expect(page.locator('#character-skill-tooltip')).toContainText('商品補充');
 const parunan=page.locator('.character-select[data-id="2"]');await parunan.click();
 await expect(page.locator('#selected-character-name')).toHaveText('パルナン');
 await expect(parunan).toHaveAttribute('aria-pressed','true');
 await page.locator('#selected-self-tab').click();await mimi.focus();await mimi.press('Enter');await expect(page.locator('#selected-character-name')).toHaveText('ミミ');
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
 await expect(page.locator('#selected-character-current-hp')).toHaveValue('19');
 await expect(page.locator('.character-select[data-id="4"] [data-stat="initial_coin"]')).toHaveText('6');
});

test('07 skill: character image mapping falls back when its CSV cannot be fetched', async ({ page }) => {
 await page.route('**/07_skill/csv/character_hero_card_mapping.csv',route=>route.abort());
 await page.goto('/07_skill/');await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select[data-id="106"] .character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_306.png');
 await selectCharacter(page,'106');await expect(page.locator('#selected-character-name')).toHaveText('橘シェリー');
});

test('07 skill: file protocol keeps character cards, tooltip and selection', async ({ page }) => {
 const path=require('path'),{pathToFileURL}=require('url');
 await page.goto(pathToFileURL(path.resolve(__dirname,'../07_skill/index.html')).href);
 await page.locator('.role-tab.character-tab').click();
 await expect(page.locator('.character-select')).toHaveCount(35);
 const mimi=page.locator('.character-select[data-id="1"]');
 await expect(mimi.locator('.character-list-image')).toHaveAttribute('src','../images/UT_Hero_Card2/UT_Hero_Card2_108.png');
 await expect(mimi.locator('[data-stat="lv0_hp"]')).toHaveText('9');
 await page.locator('#character-hover-skills').check();await mimi.hover();await expect(page.locator('#character-skill-tooltip')).toContainText('商品補充');
 await page.locator('.character-select[data-id="2"]').click();
 await expect(page.locator('#selected-character-name')).toHaveText('パルナン');
});


test('07 skill: additional character stat skills modify parameters', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'4');
 await page.getByRole('button',{name:/前ターン被ダメなし：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');

 await selectCharacter(page,'6');
 const padAttack=page.getByLabel('自己主張なし攻撃補正の数');
 await padAttack.fill('2');await padAttack.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');
 const padDefense=page.getByLabel('自己主張なし防御補正の数');
 await padDefense.fill('1');await padDefense.dispatchEvent('change');
 await expect(page.locator('#selected-character-def')).toHaveValue('3');

 await selectCharacter(page,'15');
 const handDiff=page.getByLabel('手札枚数の数');
 await handDiff.fill('5');await handDiff.dispatchEvent('change');
 await expect(handDiff).toHaveValue('5');
 await expect(page.locator('#selected-character-atk')).toHaveValue('4');

 await selectCharacter(page,'26');
 await page.getByLabel('吸収した影の数',{exact:true}).fill('4');
 await page.getByRole('button',{name:'暗影融合を発動'}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue('2');

 await selectCharacter(page,'28');
 await expect(page.getByRole('button',{name:/エリア拒止通過/})).toHaveCount(0);
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');

 await selectCharacter(page,'103');
 await expect(page.getByLabel('カクテル攻撃カードの数')).toHaveCount(0);
 await expect(page.getByLabel('カクテル防御カードの数')).toHaveCount(0);
 await page.getByRole('button',{name:/一生を変えるカクテル：オフ/}).click();
 await expect(page.locator('#selected-character-move')).toHaveText('3');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-move')).toHaveText('0');
});


test('07 skill: contextual character attacks only apply when enabled', async ({ page }) => {
 await page.goto('/07_skill/');

 await selectCharacter(page,'10');
 const damage=page.getByLabel('このターンに受けたダメージの数');
 await damage.fill('4');await damage.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 const counter=page.getByRole('button',{name:/^反撃：/});await counter.click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');await expect(counter).toHaveAttribute('aria-pressed','true');
 await expect(page.getByLabel('カウンター攻撃の数',{exact:true})).toHaveCount(0);await expect(counter.locator('img')).toHaveAttribute('src','../images/UT_Buff/UT_Buff_Counter.png');
 await expect(page.getByRole('button',{name:'このターンに受けたダメージを増やす',exact:true}).locator('img')).toHaveAttribute('src','../images/UT_Buff/UT_Buff_SangXinBingKuang.png');
 await counter.click();await expect(page.locator('#selected-character-atk')).toHaveValue('1');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(counter).toHaveAttribute('aria-pressed','true');await expect(page.locator('#selected-character-atk')).toHaveValue('5');

 await selectCharacter(page,'17');
 await expect(page.getByRole('button',{name:/真夜の一閃：オフ/})).toHaveCount(0);
 await expect(page.locator('#selected-character-atk')).toHaveValue('1');

 await selectCharacter(page,'23');
 const foxfire=page.getByLabel('狐光の数');
 await foxfire.fill('3');await foxfire.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await expect(page.getByRole('button',{name:/狐光追加攻撃/})).toHaveCount(0);
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');

 await selectCharacter(page,'27');
 await expect(page.getByLabel('対象のマークの数')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/マーク持ちを攻撃/})).toHaveCount(0);
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const mark=page.locator('#map-roster-list .roster-mark button').first();
 await mark.click();await mark.click();
 await page.locator('#map-roster-list .roster-select').first().click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('.role-tab[data-role="character"]').click();
 await page.getByRole('button',{name:/潜伏：オフ/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('7');
});


test('07 skill: edited monster HP stays stable when another monster is defeated', async ({ page }) => {
 await page.goto('/07_skill/');
 const mapTab=page.locator('.role-tab[data-role="map"]');
 await mapTab.click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));
  await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count()>=2)break;
 }
 const monsterTiles=page.locator('#mp-monster-list .mp-monster:visible');
 await expect(monsterTiles).toHaveCount(2,{timeout:5000}).catch(()=>{});
 expect(await monsterTiles.count()).toBeGreaterThanOrEqual(2);
 await monsterTiles.first().click();
 await monsterTiles.nth(1).click();
 const hpInputs=page.locator('#map-roster-list input[aria-label$="の残りHP"]');
 await expect(hpInputs).toHaveCount(2);
 const editedLabel=await hpInputs.first().getAttribute('aria-label');
 const editedInput=page.locator('input[aria-label="'+editedLabel+'"]');
 const firstHp=Number(await editedInput.inputValue());
 expect(firstHp).toBeGreaterThan(1);
 const editedHp=firstHp-1;
 await editedInput.fill(String(editedHp));
 await editedInput.dispatchEvent('change');
 await expect(editedInput).toHaveValue(String(editedHp));
 await page.locator('#map-roster-list .roster-remove').nth(1).click();
 await expect(page.locator('input[aria-label="'+editedLabel+'"]')).toHaveValue(String(editedHp));
});


test('07 skill: Z3000 Pull In manually targets a monster and deals 5 damage', async ({ page }) => {
 await page.goto('/07_skill/');
 await page.locator('.role-tab[data-role="map"]').click();
 await page.locator('#mp-tab-monsters').click();
 const mapSelect=page.locator('#mp-map-select');
 for(const option of await mapSelect.locator('option').all()){
  await mapSelect.selectOption(await option.getAttribute('value'));await mapSelect.dispatchEvent('change');
  if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;
 }
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const target=page.locator('#map-roster-list .roster-select').first(),hp=page.locator('#map-roster-list input[aria-label$="の残りHP"]').first();
 const before=Number(await hp.inputValue());
 await selectCharacter(page,'9');
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();
 await expect(page.locator('#character-skill-target-banner')).toContainText('引き寄せる：対象のモンスターを選択してください');
 await page.locator('.role-tab[data-role="map"]').click();
 await target.click();
 if(before>5)await expect(hp).toHaveValue(String(before-5));else await expect(page.locator('#map-roster-list .roster-card').first()).toHaveClass(/defeated/);
 await expect(page.locator('#selected-character-ct')).toHaveText(before>5?'CT 4 / 4':'CT 2 / 4');
});


test('07 skill: Papara active skill forces half-HP attack bonus until turn end', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'7');
 const hp=page.locator('#selected-character-current-hp');await hp.fill('10');await hp.dispatchEvent('change');
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');
 await page.getByRole('button',{name:'ひとくちだけを発動'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue('5');
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue('2');
});

test('07 skill: Teru dialog commits rounded halves atomically, resets at turn end and Undo restores',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'23');
 const atk=page.locator('#selected-character-atk'),def=page.locator('#selected-character-def');
 const beforeAtk=Number(await atk.inputValue()),beforeDef=Number(await def.inputValue());
 await page.getByRole('button',{name:'三神憑依を発動'}).click();
 for(const [label,value] of [['憑依する味方の攻撃力','5'],['憑依する味方の防御力','3']])await page.getByLabel(label,{exact:true}).fill(value);
 await expect(atk).toHaveValue(String(beforeAtk));await page.getByRole('button',{name:'憑依を確定'}).click();
 await expect(atk).toHaveValue(String(beforeAtk+3));await expect(def).toHaveValue(String(beforeDef+2));await expect(page.locator('#teru-stat-dialog')).not.toBeVisible();
 await page.locator('#turn-end').click();await expect(atk).toHaveValue(String(beforeAtk));await expect(def).toHaveValue(String(beforeDef));
 const values=await page.evaluate(()=>captureCharacterAbilityState().numbers);expect(values['三神憑依攻撃補正']).toBe(0);expect(values['三神憑依防御補正']).toBe(0);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(atk).toHaveValue(String(beforeAtk+3));await expect(def).toHaveValue(String(beforeDef+2));
});

test('07 skill: Chouten fan count and Ame love are manually managed and referenced', async ({ page }) => {
 await page.goto('/07_skill/');await selectCharacter(page,'101');
 const fan=page.getByLabel('ファンの数'),hp=page.locator('#selected-character-current-hp');await fan.fill('3');await fan.dispatchEvent('change');await hp.fill('1');await hp.dispatchEvent('change');
 await page.getByRole('button',{name:'インターネットエンジェルを発動'}).click();await expect(hp).toHaveValue('4');
 await selectCharacter(page,'102');const love=page.getByLabel('愛の数');await expect(love).toHaveValue('2');await love.fill('4');await love.dispatchEvent('change');
 const ameHp=page.locator('#selected-character-current-hp');await ameHp.fill('1');await ameHp.dispatchEvent('change');const baseMove=Number(await page.locator('#selected-character-move').textContent()),baseMaxHp=Number(await page.locator('#selected-character-hp').textContent());
 await page.getByRole('button',{name:'愛情の過剰摂取を発動'}).click();await expect(page.locator('#selected-character-move')).toHaveText(String(baseMove+4));await expect(love).toHaveValue('0');await expect(love).toHaveAttribute('max','5');await expect(page.locator('#selected-character-hp')).toHaveText(String(baseMaxHp+1));
});

for(const folder of ['07_skill','08_screen_reader'])test(folder+': Fate Echo icon controls support self and PT countdown; weakness uses its skill icon',async({page})=>{
 await page.goto('/'+folder+'/');await selectCharacter(page,'13');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const maps=page.locator('#mp-map-select');for(const option of await maps.locator('option').all()){await maps.selectOption(await option.getAttribute('value'));await maps.dispatchEvent('change');if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;}
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();
 const card=page.locator('#map-roster-list .roster-card').first(),field=card.locator('.roster-fate-echo'),button=field.locator('button');
 await page.getByRole('button',{name:'フェイト・エコーを発動'}).click();await card.locator('.roster-select').click();
 await expect(field).toHaveText('2');await expect(field.locator('input')).toHaveCount(0);await expect(button.locator('img')).toHaveAttribute('src',/UT_Buff_114_Max\.png$/);await expect(button.locator('img')).toHaveCSS('width','20px');
 await button.click();await expect(field).toHaveText('3');await button.click({button:'right'});await expect(field).toHaveText('2');
 await page.locator('#turn-end').click();await expect(field).toHaveText('1');await page.locator('#turn-end').click();await expect(field).toHaveCount(0);
 await selectCharacter(page,'24');await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="13"]').click();
 await page.locator('.role-tab[data-role="map"]').click();await expect(card.locator('.roster-status-weakness img')).toHaveAttribute('src',/UT_Buff_125_Skill\.png$/);
 await expect(field).toHaveText('0');await expect(button).toHaveAttribute('aria-pressed','false');
 const ct=await page.locator('#selected-character-ct').textContent();await button.click();await expect(field).toHaveText('2');await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('#selected-character-ct')).toHaveText(ct);await expect(page.locator('#selected-character-name')).toHaveText('モーゼス');
 await expect(page.locator('.mode-content[data-role="map"]')).toBeVisible();
 await button.click({button:'right'});await expect(field).toHaveText('1');await button.click();await expect(field).toHaveText('2');
 await page.locator('#turn-end').click();await expect(field).toHaveText('1');await page.locator('#turn-end').click();await expect(field).toHaveText('0');await expect(button).toHaveAttribute('aria-pressed','false');
 await page.locator('#roster-undo').click();await expect(field).toHaveText('1');await expect(button).toHaveAttribute('aria-pressed','true');
 await button.click({button:'right'});await button.click({button:'right'});await expect(field).toHaveText('0');await button.click();await expect(field).toHaveText('2');
});

async function registerSupport(page,id){await page.locator('#selected-party-tab').click();await page.locator('#character-list-tab').click();await page.locator('.character-select[data-id="'+id+'"]').click();await page.locator('#selected-self-tab').click();}
test('07 PT support: shield and confirmed Yume bonus affect self, persist after donor removal, and Undo restores',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'8');await registerSupport(page,'20');
 const atk=Number(await page.locator('#attackPower1').inputValue()),def=Number(await page.locator('#defensePower2').inputValue());
 await page.getByRole('button',{name:/^PTジュジュシールド：/}).click();expect(Number(await page.locator('#damageReduce2').inputValue())).toBe(99);
 const light=page.getByRole('spinbutton',{name:'PTユメ攻撃補正の数'});await light.fill('4');await light.dispatchEvent('change');expect(Number(await page.locator('#attackPower1').inputValue())).toBe(atk+4);expect(Number(await page.locator('#defensePower2').inputValue())).toBe(def);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await page.locator('.role-tab.character-tab').click();await expect(light).toHaveValue('0');
 await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="8"]').click({button:'right'});await page.locator('#selected-self-tab').click();await expect(page.getByRole('button',{name:/^PTジュジュシールド：/})).toHaveAttribute('aria-pressed','true');
});
test('07 PT support: cocktail and Dorothy bonuses expire on turn end; capped healing and Undo',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'103');await registerSupport(page,'104');await registerSupport(page,'10');
 const atk=Number(await page.locator('#attackPower1').inputValue());const attack=page.getByRole('spinbutton',{name:'PTカクテル攻撃の数'});await attack.fill('2');await attack.dispatchEvent('change');await page.getByRole('button',{name:/^PTドロシー攻撃：/}).click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(atk+3);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#turn-end').click();await page.locator('.role-tab.character-tab').click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(atk);await expect(attack).toHaveValue('0');
 const before=await page.evaluate(()=>captureCharacterAbilityState().currentHp);await page.locator('#selected-character-hp-fill').click();await page.getByRole('button',{name:'PTパンダマン回復＋2'}).click();expect(await page.evaluate(()=>captureCharacterAbilityState().currentHp)).toBe(before);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();expect(await page.evaluate(()=>captureCharacterAbilityState().currentHp)).toBe(before-1);
});

test('07 PT support: explicit Yume bonus and Bonnie stealth use received amounts without card tracking',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'20');await registerSupport(page,'27');await registerSupport(page,'103');const base=Number(await page.locator('#attackPower1').inputValue());
 const bonus=page.getByRole('spinbutton',{name:'PTユメ攻撃補正の数'});await bonus.fill('4');await bonus.dispatchEvent('change');expect(Number(await page.locator('#attackPower1').inputValue())).toBe(base+4);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:{name:'test monster',markStacks:2}})));await page.getByRole('button',{name:/^PT潜伏：/}).click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(base+6);
 await page.getByRole('button',{name:/^PT潜伏：/}).click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(base+4);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#turn-end').click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(base);
});

test('07 PT support: confirmed KAngel fan debuff is permanent once-only and undoable',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'101');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();const maps=page.locator('#mp-map-select');for(const option of await maps.locator('option').all()){await maps.selectOption(await option.getAttribute('value'));if(await page.locator('#mp-monster-list .mp-monster:visible').count())break;}
 await page.locator('#mp-monster-list .mp-monster:visible').first().click();const card=page.locator('#map-roster-list .roster-card').first(),attack=card.locator('input[aria-label$="の攻撃力"]');await attack.fill('5');await attack.dispatchEvent('change');await card.locator('.roster-status-fan button').click();await page.locator('#roster-pt-fan-reduce').click();await expect(attack).toHaveValue('4');await expect(page.locator('#roster-pt-fan-reduce')).toBeDisabled();await page.locator('#turn-end').click();await expect(attack).toHaveValue('4');await page.locator('#roster-undo').click();await page.locator('#roster-undo').click();await expect(attack).toHaveValue('5');await expect(page.locator('#roster-pt-fan-reduce')).toBeEnabled();
});

test('07 PT support: Hanna next movement is manually consumed; Sherry reasoning stacks and expires',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'106');await registerSupport(page,'105');const atk=Number(await page.locator('#attackPower1').inputValue());await page.getByRole('button',{name:'PTハンナ推理タイム＋1'}).click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(atk+1);
 const move=page.getByRole('button',{name:/^PTハンナ次の移動：/});await move.click();expect((await page.evaluate(()=>captureCharacterAbilityState())).numbers['PTハンナ次の移動']).toBe(1);await page.locator('.role-tab[data-role="map"]').click();await page.locator('#turn-end').click();expect(Number(await page.locator('#attackPower1').inputValue())).toBe(atk);await page.locator('.role-tab.character-tab').click();await expect(move).toHaveAttribute('aria-pressed','true');await move.click();await expect(move).toHaveAttribute('aria-pressed','false');
});


test('07 Teru: separate follow-up uses pre-consumption stacks, minimum one, no dice and only survivors',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'23');
 const set=async(label,value)=>{const input=page.getByLabel(label,{exact:true});await input.fill(String(value));await input.dispatchEvent('change');};
 await setTeruPartyAttack(page,8);await set('PTテル狐光の数',3);await page.getByRole('button',{name:/^PTテル憑依：/}).click();
 await page.locator('.role-tab[data-role="attack"]').click();
 for(const [id,value] of [['attackPower1',2],['defensePower1',4],['hp1',8],['damageAdd1',0],['damageReduce1',0]]){await page.locator('#'+id).fill(String(value));await page.locator('#'+id).dispatchEvent('input');}
 const result=await page.evaluate(()=>{const mode=document.querySelector('.mode-content[data-role="attack"]');return {base:calculateDefenseDamageGrid(2,4,0,0,8,false,false,false,getTeruFollowUp()),card:calculateCardAwareDamage(mode,2,4,0,0,8,false)};});
 expect(result.base.rows[0].damages).toEqual([8,8,8,8,8,8]);expect(result.base.defeatCount).toBe(36);expect(result.card.defeatProbability).toBeCloseTo(1);
 expect(await page.evaluate(()=>getTeruCombinedDamage(8,4,8,getTeruFollowUp()))).toBe(8);
 expect(await page.evaluate(()=>getTeruCombinedDamage(1,100,8,getTeruFollowUp()))).toBe(2);
 await expect(page.locator('.teru-follow-up-summary')).toContainText('7ダメージ');
 await page.locator('#Atk5').fill('1');await page.locator('#Atk5').dispatchEvent('input');
 await expect(page.locator('.teru-follow-up-summary')).toContainText('7ダメージ');
 expect((await page.evaluate(()=>captureCharacterAbilityState())).numbers['PTテル狐光']).toBe(3);
 await page.getByRole('button',{name:'追撃後の戦闘終了（狐光−1）'}).click();expect((await page.evaluate(()=>captureCharacterAbilityState())).numbers['PTテル狐光']).toBe(2);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();expect((await page.evaluate(()=>captureCharacterAbilityState())).numbers['PTテル狐光']).toBe(3);
 await page.locator('#turn-end').click();expect((await page.evaluate(()=>getTeruFollowUp())).enabled).toBe(true);
 await selectCharacter(page,'23');const fox=page.getByLabel('狐光の数',{exact:true});await fox.fill('3');await fox.dispatchEvent('change');
 await expect(page.getByLabel('憑依先の戦闘ATKの数')).toHaveCount(0);await expect(page.getByRole('button',{name:/^狐光追加攻撃：/})).toHaveCount(0);
 await expect(page.locator('#selected-character-atk')).toHaveValue('2');await expect(page.locator('#attackPower1')).toHaveValue('2');expect(await page.evaluate(()=>getTeruFollowUp())).toBeNull();
 await page.evaluate(()=>consumeTeruFollowUp());await expect(fox).toHaveValue('3');
});


test('07 Padman: skill enables maximum parameters, preserves manual values, fixed-six die excludes other rows',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'6');
 const atk=page.getByLabel('自己主張なし攻撃補正の数');await atk.fill('-1');await atk.dispatchEvent('change');
 await page.getByRole('button',{name:'マジで怒ったぞを発動'}).click();await expect(atk).toHaveValue('2');await expect(atk).toBeDisabled();await expect(page.locator('#selected-character-atk')).toHaveValue('4');
 await expect(page.getByRole('button',{name:/^マジで怒ったぞ：/})).toHaveCount(0);
 for(const [label,file] of [['自己主張なし攻撃補正','Attack.png'],['自己主張なし防御補正','Defense.png'],['自己主張なし移動補正','run.png']])await expect(page.getByRole('button',{name:label+'を増やす',exact:true}).locator('img')).toHaveAttribute('src','../images/UT_Buff/'+file);
 await page.locator('#turn-end').click();await expect(atk).toHaveValue('-1');await expect(atk).toBeEnabled();
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(atk).toHaveValue('2');await expect(atk).toBeDisabled();
 await page.locator('#turn-end').click();
 await page.getByRole('button',{name:/^次の攻撃ダイス6：/}).click();await page.locator('.role-tab[data-role="attack"]').click();
 await expect(page.locator('.mode-content[data-role="attack"] .damage-table tbody tr').first().locator('td')).toHaveText(['－','－','－','－','－','－']);
 expect(await page.evaluate(()=>calculateDefenseDamageGrid(3,2,0,0,10,false,false,false,null,{fixedAttack:6}).totalCombinations)).toBe(6);
});

test('07 Moses: evade minimum excludes faces from table and probability but not ordinary defense',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'24');const stacks=page.getByLabel('精確無比の数');await stacks.fill('1');await stacks.dispatchEvent('change');await page.locator('.role-tab[data-role="defense"]').click();
 await page.getByRole('button',{name:'回避の表',exact:true}).click();
 const mode=page.locator('.mode-content[data-role="defense"]');for(const [id,value] of [['attackPower2',10],['hp2',1],['damageAdd2',0],['damageReduce2',0]]){await page.locator('#'+id).fill(String(value));await page.locator('#'+id).dispatchEvent('input');}
 await expect(mode.locator('.damage-table tbody tr td:first-of-type')).toHaveText(['－','－','－','－','－','－']);await expect(mode.locator('.result-rate')).toHaveText('53.33%');await expect(mode.locator('.future-result-rate')).toHaveText('53.33%');
 const choices=await page.evaluate(()=>getCardAwareDefenseChoices(document.querySelector('.mode-content[data-role="defense"]'),10,2,0,0,1));expect(choices[0].evadeSurvivalProbability).toBeCloseTo(1);expect(choices[5].evadeSurvivalProbability).toBeCloseTo(0.2);
 await page.getByRole('button',{name:'防御の表',exact:true}).click();expect(await mode.locator('.damage-table tbody tr td:first-of-type').first().textContent()).not.toBe('－');
 await selectCharacter(page,'1');expect(await page.locator('.mode-content[data-role="defense"]').getAttribute('data-evade-minimum')).toBe('1');
});

test('07 Teru: target Mark and Fate Echo plus reduction apply separately to main and follow-up',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'23');
 await setTeruPartyAttack(page,8);for(const [label,value] of [['PTテル狐光の数',3]]){const field=page.getByLabel(label,{exact:true});await field.fill(String(value));await field.dispatchEvent('change');}await page.getByRole('button',{name:/^PTテル憑依：/}).click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('character-opponent-change',{detail:{markStacks:1,fateEchoStacks:2,erosionStacks:0}})));
 const effect=await page.evaluate(()=>getTeruFollowUp());expect(effect.damageAdd).toBe(2);
 const values=await page.evaluate(()=>{const f=getTeruFollowUp(),main=getDefenseDamage(2,4,2,1,1,1);return [main,getTeruCombinedDamage(main,4,99,f,1),getTeruCombinedDamage(main,4,99,f,99)];});expect(values).toEqual([2,10,2]);
});


test('07 skill: HP icons decrement on click and increment on right click for self and monsters',async({page})=>{
 await prepareSherryTargets(page);
 const hp=page.locator('#selected-character-current-hp'),icon=page.locator('#selected-character-hp-fill'),initial=Number(await hp.inputValue());
 await icon.click();await expect(hp).toHaveValue(String(initial-1));await icon.click({button:'right'});await expect(hp).toHaveValue(String(initial));await icon.click({button:'right'});await expect(hp).toHaveValue(String(initial));
 const instanceId=await page.locator('#map-roster-list .roster-card').first().getAttribute('data-instance-id');const card=page.locator('#map-roster-list .roster-card[data-instance-id="'+instanceId+'"]'),enemyHp=card.locator('input[aria-label$="の残りHP"]'),enemyIcon=card.getByRole('button',{name:/残りHPを減らす$/}),before=Number(await enemyHp.inputValue());
 await enemyIcon.click();await expect(enemyHp).toHaveValue(String(before-1));await page.locator('#roster-undo').click();await expect(enemyHp).toHaveValue(String(before));await enemyIcon.click({button:'right'});await expect(enemyHp).toHaveValue(String(before+1));await enemyHp.fill('1');await enemyHp.dispatchEvent('change');await enemyIcon.click();await expect(enemyHp).toHaveValue('0');await expect(card).toHaveClass(/defeated/);await page.locator('#roster-undo').click();await expect(enemyHp).toHaveValue('1');await expect(card).not.toHaveClass(/defeated/);
});


test('07 Teru: dialog cancel preserves stats, recast replaces halves and Undo restores one cast',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'23');await page.locator('#selected-character-atk-button').click();
 const skill=page.getByRole('button',{name:'三神憑依を発動'}),source=page.getByLabel('憑依する味方の攻撃力',{exact:true});
 await skill.click();await source.fill('5');await page.getByLabel('憑依する味方の防御力',{exact:true}).fill('3');await page.getByRole('button',{name:'憑依を確定'}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');await expect(page.locator('#selected-character-def')).toHaveValue('3');
 for(let i=0;i<3;i++)await page.locator('#selected-character-ct').click();await skill.click();await source.fill('9');await page.getByRole('button',{name:'キャンセル',exact:true}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue('6');await expect(page.locator('#selected-character-ct')).toContainText('CT 0');
 await skill.click();await expect(source).toHaveValue('5');await source.fill('9');await page.getByRole('button',{name:'憑依を確定'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue('8');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(page.locator('#selected-character-atk')).toHaveValue('6');
 await selectCharacter(page,'1');await selectCharacter(page,'23');await expect(page.getByLabel('狐光の数',{exact:true})).toHaveCount(1);expect(await page.evaluate(()=>getTeruFollowUp())).toBeNull();
 await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue('3');await expect(page.locator('#selected-character-def')).toHaveValue('1');
});

test('07 Teru: pursuit directly follows PT ATK and stops when the donor is removed',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'23');
 await expect(page.getByLabel('PTテル攻撃力の数',{exact:true})).toHaveCount(0);
 const fox=page.getByLabel('PTテル狐光の数',{exact:true}),base=await page.locator('#selected-character-atk').inputValue();
 await setTeruPartyAttack(page,8);await fox.fill('3');await fox.dispatchEvent('change');await page.getByRole('button',{name:/^PTテル憑依：/}).click();
 await expect(page.locator('#selected-character-atk')).toHaveValue(base);expect((await page.evaluate(()=>getTeruFollowUp())).attack).toBe(8);
 await page.locator('.role-tab[data-role="attack"]').click();await page.locator('#defensePower1').fill('4');await page.locator('#defensePower1').dispatchEvent('input');await expect(page.locator('.teru-follow-up-summary')).toContainText('7ダメージ');
 await setTeruPartyAttack(page,10);expect((await page.evaluate(()=>getTeruFollowUp())).attack).toBe(10);await expect(page.locator('.teru-follow-up-summary')).toContainText('9ダメージ');
 await page.locator('.role-tab[data-role="attack"]').click();await page.getByRole('button',{name:'追撃後の戦闘終了（狐光−1）'}).click();await expect(fox).toHaveValue('2');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(fox).toHaveValue('3');
 await page.locator('.role-tab[data-role="character"]').click();await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="23"]').click({button:'right'});await page.locator('#selected-self-tab').click();expect(await page.evaluate(()=>getTeruFollowUp())).toBeNull();await page.evaluate(()=>consumeTeruFollowUp());await expect(fox).toHaveValue('3');
 await registerSupport(page,'23');expect((await page.evaluate(()=>getTeruFollowUp())).attack).toBe(2);
 await selectCharacter(page,'2');await expect(fox).toHaveValue('0');expect((await page.evaluate(()=>getTeruFollowUp())).enabled).toBe(false);await selectCharacter(page,'1');await expect(fox).toHaveValue('3');expect((await page.evaluate(()=>getTeruFollowUp())).attack).toBe(2);
 await selectCharacter(page,'23');expect(await page.evaluate(()=>getTeruFollowUp())).toBeNull();await selectCharacter(page,'1');await expect(fox).toHaveValue('3');expect(await page.evaluate(()=>getTeruFollowUp())).toBeNull();
});

test('07 Teru: file protocol stat dialog supports number pad',async({page})=>{
 const path=require('path'),{pathToFileURL}=require('url');await page.goto(pathToFileURL(path.resolve(__dirname,'../07_skill/index.html')).href);await selectCharacter(page,'23');
 await page.getByRole('button',{name:'三神憑依を発動'}).click();const input=page.getByLabel('憑依する味方の攻撃力',{exact:true});await input.focus();await page.locator('#character-number-pad button[data-key="5"]').click();await page.locator('#character-number-pad button[data-key="確定"]').click();await page.getByRole('button',{name:'憑依を確定'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue('5');
});

async function setTeruPartyAttack(page,value){
 await page.locator('#selected-party-tab').click();
 const stat=page.locator('.party-member-slot[data-character-id="23"] [data-stat="atk"]');
 let current=Number(await stat.locator('b').textContent());
 while(current!==value){await stat.locator('button').click({button:current<value?'left':'right'});current+=current<value?1:-1;}
 await page.locator('#selected-self-tab').click();
}

test('07 Nardis: actual hand count is retained while attack bonus caps at three',async({page})=>{
 const iconRequests=[];page.on('request',request=>{if(request.url().endsWith('/UT_Buff_Hand.png'))iconRequests.push(request.url());});
 await page.goto('/07_skill/');await selectCharacter(page,'15');
 const hand=page.getByLabel('手札枚数の数',{exact:true}),atk=page.locator('#selected-character-atk'),base=Number(await atk.inputValue());
 await expect(page.getByLabel('相手より多い手札の数',{exact:true})).toHaveCount(0);
 for(const count of [0,2,3,10,1]){await hand.fill(String(count));await hand.dispatchEvent('change');await expect(hand).toHaveValue(String(count));await expect(atk).toHaveValue(String(base+Math.min(count,3)));}
 expect(iconRequests.length).toBeGreaterThan(0);
});

test('07 Ren: party support exposes one counter toggle with independent shield and Undo',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'8');
 const counter=page.getByRole('button',{name:/^反撃：/}),shield=page.getByRole('button',{name:/^PTジュジュシールド：/});
 await expect(counter.locator('img')).toHaveAttribute('src','../images/UT_Buff/UT_Buff_Counter.png');
 const atk=await page.locator('#selected-character-atk').inputValue();await counter.click();await shield.click();await counter.click();
 await expect(counter).toHaveAttribute('aria-pressed','false');await expect(shield).toHaveAttribute('aria-pressed','true');await expect(page.locator('#selected-character-atk')).toHaveValue(atk);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(counter).toHaveAttribute('aria-pressed','true');await expect(shield).toHaveAttribute('aria-pressed','true');
 await selectCharacter(page,'10');await expect(counter).toHaveCount(1);await expect(counter).toHaveAttribute('aria-pressed','false');
});

test('07 Lulu: self or party membership exposes Heal stacks and received stacks retain independent state',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'11');const heal=page.getByLabel('ヒールの数',{exact:true});await expect(heal).toHaveValue('0');
 await heal.fill('3');await heal.dispatchEvent('change');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(heal).toHaveValue('0');
 await selectCharacter(page,'1');await expect(heal).toHaveCount(0);await registerSupport(page,'11');await expect(heal).toHaveValue('0');
 await heal.fill('4');await heal.dispatchEvent('change');await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="11"]').click({button:'right'});await page.locator('#selected-self-tab').click();await expect(heal).toHaveValue('4');
 await selectCharacter(page,'2');await expect(heal).toHaveCount(0);await selectCharacter(page,'1');await expect(heal).toHaveValue('4');
});

test('07 Hime: energy count changes stacks without multiplying the fixed stat bonus',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'12');const energy=page.getByLabel('エネルギー保存の数',{exact:true});
 const atk=page.locator('#selected-character-atk'),def=page.locator('#selected-character-def'),baseAtk=Number(await atk.inputValue()),baseDef=Number(await def.inputValue());
 for(const count of [1,5,2,0,5]){await energy.fill(String(count));await energy.dispatchEvent('change');await expect(atk).toHaveValue(String(baseAtk+(count?2:0)));await expect(def).toHaveValue(String(baseDef+(count?2:0)));}
 await page.getByRole('button',{name:'気功修練を発動'}).click();await expect(atk).toHaveValue(String(baseAtk+6));await page.locator('#turn-end').click();await expect(atk).toHaveValue(String(baseAtk+2));await expect(energy).toHaveValue('5');
});

async function prepareZ3000Survivor(page){
 await page.goto('/07_skill/');await page.locator('.role-tab[data-role="map"]').click();await page.locator('#mp-tab-monsters').click();
 const picker=page.locator('#mp-map-select');let found=false;
 for(const value of await picker.locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean))){
  await picker.selectOption(value);await picker.dispatchEvent('change');const tiles=page.locator('#mp-monster-list .mp-monster:visible');
  for(let i=0;i<await tiles.count();i++){await page.locator('#roster-clear').click();await tiles.nth(i).click();if(Number(await page.locator('#map-roster-list input[aria-label$="の残りHP"]').first().inputValue())>5){found=true;break;}}
  if(found)break;
 }
 expect(found).toBe(true);await selectCharacter(page,'9');
 return {target:page.locator('#map-roster-list .roster-select').first(),hp:page.locator('#map-roster-list input[aria-label$="の残りHP"]').first()};
}

test('07 Z3000: ATK seven opens attack for the surviving skill target and Undo restores skill damage',async({page})=>{
 const {target,hp}=await prepareZ3000Survivor(page),before=Number(await hp.inputValue());
 const atk=page.locator('#selected-character-atk');await atk.fill('7');await atk.dispatchEvent('change');await page.getByRole('button',{name:'引き寄せるを発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await target.click();
 await expect(page.locator('.role-tab[data-role="attack"]')).toHaveClass(/active/);await expect(page.locator('#hp1')).toHaveValue(String(before-5));await expect(page.locator('#attackPower1')).toHaveValue('7');await expect(target).toHaveAttribute('aria-pressed','true');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(target).toHaveAttribute('aria-pressed','false');await expect(hp).toHaveValue(String(before));await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 4');
});

test('07 Z3000: a kill raising ATK from six to seven does not retroactively open attack',async({page})=>{
 const {target,hp}=await prepareZ3000Survivor(page);const instanceId=await target.evaluate(button=>button.closest('.roster-card').dataset.instanceId);await hp.fill('4');await hp.dispatchEvent('change');
 const kills=page.getByLabel('モンスター撃破数の数');await kills.fill('1');await kills.dispatchEvent('change');const atk=page.locator('#selected-character-atk');await atk.fill('6');await atk.dispatchEvent('change');
 await page.getByRole('button',{name:'引き寄せるを発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await target.click();await expect(atk).toHaveValue('7');await expect(page.locator('.role-tab[data-role="map"]')).toHaveClass(/active/);await expect(page.locator('#map-roster-list .roster-card[data-instance-id="'+instanceId+'"]')).toHaveClass(/defeated/);
});


test('07 Ren: shield grants counter automatically but each off switch remains independent for self and PT',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'8');
 for(const party of [false,true]){
  if(party){await selectCharacter(page,'1');await registerSupport(page,'8');}
  const shield=page.getByRole('button',{name:party?/^PTジュジュシールド：/:/^ジュジュシールド：/}),counter=page.getByRole('button',{name:/^反撃：/});
  await shield.click();await expect(counter).toHaveAttribute('aria-pressed','true');await shield.click();await expect(counter).toHaveAttribute('aria-pressed','true');await counter.click();await expect(shield).toHaveAttribute('aria-pressed','false');
  await shield.click();await counter.click();await expect(counter).toHaveAttribute('aria-pressed','false');await expect(shield).toHaveAttribute('aria-pressed','true');
  await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(counter).toHaveAttribute('aria-pressed','true');await page.locator('.role-tab.character-tab').click();
 }
});

test('07 Misaki: skill branches on initial Sword Aura 2 versus 3 and Undo restores',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'14');const stacks=page.getByLabel('剣気の数');
 for(const [before,after] of [[2,3],[3,1]]){
  await stacks.fill(String(before));await stacks.dispatchEvent('change');await page.getByRole('button',{name:'桜裂空斬を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();await cards.first().locator('.roster-select').click();await expect(stacks).toHaveValue(String(after));await page.locator('#roster-undo').click();await expect(stacks).toHaveValue(String(before));await page.locator('.role-tab.character-tab').click();
 }
});

test('07 Nardis: skill adds three actual cards without automatic turn-end removal and Undo restores',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'15');const hand=page.getByLabel('手札枚数の数');await hand.fill('2');await hand.dispatchEvent('change');
 await page.getByRole('button',{name:'クィーン プリビレッジを発動'}).click();await expect(hand).toHaveValue('5');await expect(page.locator('#selected-character-atk')).toHaveValue('4');await page.locator('#turn-end').click();await expect(hand).toHaveValue('5');
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await page.locator('#roster-undo').click();await expect(hand).toHaveValue('2');
});

for(const [id,label,key,value] of [['16','オーバードライブのダイスの出目','オーバードライブ',10],['26','吸収した影の数','暗影融合',4]])test('07 skill adjacent number pad: '+id,async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,id);const input=page.getByLabel(label,{exact:true});await input.focus();for(const digit of String(value))await page.locator('#character-number-pad button[data-key="'+digit+'"]').click();await page.locator('#character-number-pad button[data-key="確定"]').click();await expect(input).toHaveValue(String(value));
 const base=Number(await page.locator('#selected-character-atk').inputValue());await page.getByRole('button',{name:key+'を発動'}).click();await expect(page.locator('#selected-character-atk')).toHaveValue(String(base+(id==='16'?2:4)));await page.locator('#turn-end').click();await expect(page.locator('#selected-character-atk')).toHaveValue(String(base));
});

test('07 Luka: Enter confirms selected targets without toggling the focused monster',async({page})=>{
 const cards=await prepareSherryTargets(page);await selectCharacter(page,'17');await page.getByRole('button',{name:'真夜の一閃を発動'}).click();await page.locator('.role-tab[data-role="map"]').click();const targets=cards.locator('.roster-select');await targets.nth(0).click();await targets.nth(1).click();await targets.nth(1).press('Enter');await expect(page.locator('#character-skill-target-banner')).toBeHidden();await expect(page.locator('#selected-character-ct')).toContainText('CT 3');await expect(cards.nth(2).locator('input[aria-label$="の残りHP"]')).toHaveValue('5');
 await page.locator('#roster-undo').click();for(let i=0;i<3;i++)await expect(cards.nth(i).locator('input[aria-label$="の残りHP"]')).toHaveValue('5');
});

test('07 Bonnie: PT phase editor matches self controls and preserves received state and Undo',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'1');await registerSupport(page,'27');const phase=page.getByRole('button',{name:/^潜入調査：/});await expect(phase).toHaveAttribute('title',/フェーズ・ワン/);
 for(let i=0;i<3;i++)await phase.click();await expect(phase).toHaveAttribute('title',/真相解明/);await phase.click();await expect(phase).toHaveAttribute('title',/真相解明/);await phase.click({button:'right'});await expect(phase).toHaveAttribute('title',/フェーズ・スリー/);
 await page.locator('.role-tab[data-role="map"]').click();await page.locator('#roster-undo').click();await expect(phase).toHaveAttribute('title',/真相解明/);await page.locator('.role-tab.character-tab').click();await page.locator('#selected-party-tab').click();await page.locator('.character-select[data-id="27"]').click({button:'right'});await page.locator('#selected-self-tab').click();await expect(phase).toHaveAttribute('title',/真相解明/);
});

test('07 Moses: two stacks make evade faces 3..6 equally likely in base and card-aware results',async({page})=>{
 await page.goto('/07_skill/');await selectCharacter(page,'24');await page.getByLabel('精確無比の数').fill('2');await page.getByLabel('精確無比の数').dispatchEvent('change');await page.locator('.role-tab[data-role="defense"]').click();await page.getByRole('button',{name:'回避の表',exact:true}).click();
 const mode=page.locator('.mode-content[data-role="defense"]');await expect(mode).toHaveAttribute('data-evade-minimum','3');for(const [id,value] of [['attackPower2',10],['hp2',1],['damageAdd2',0],['damageReduce2',0]]){await page.locator('#'+id).fill(String(value));await page.locator('#'+id).dispatchEvent('input');}
 await expect(mode.locator('.result-rate')).toHaveText('62.50%');await expect(mode.locator('.future-result-rate')).toHaveText('62.50%');
 const grid=await page.evaluate(()=>calculateDefenseDamageGrid(10,2,0,0,1,false,false,false,null,{evade:true,minimum:3}));expect(grid.totalCombinations).toBe(24);expect(grid.rows.every(row=>row.damages[0]===null&&row.damages[1]===null)).toBe(true);
});


test('07 skill: Rinrin passage confirmation works from file fallback',async({page})=>{
 const path=require('path'),{pathToFileURL}=require('url');await page.goto(pathToFileURL(path.resolve(__dirname,'../07_skill/index.html')).href);await selectCharacter(page,'28');
 await page.locator('#selected-character-skill').click();await page.locator('#rinrin-area-dialog').getByRole('button',{name:'No',exact:true}).click();await expect(page.locator('#selected-character-ct')).toHaveText('CT 3 / 3');
 await page.locator('#roster-undo').click();await expect(page.locator('#selected-character-ct')).toHaveText('CT 0 / 3');
});
