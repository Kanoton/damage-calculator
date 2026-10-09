// Stateless DOM builders for roster cards.
function createRosterCardShell(enemy,selectedId,displayName,assignImage,icons){
 const card=document.createElement('article');card.className='roster-card';card.classList.toggle('defeated',!!enemy.defeated);card.classList.toggle('selected',enemy.instanceId===selectedId);
 const select=document.createElement('button');select.type='button';select.disabled=!!enemy.defeated;select.className='roster-select';select.setAttribute('aria-pressed',String(enemy.instanceId===selectedId));select.setAttribute('aria-label',displayName+'を計算機に登録');
 const heading=document.createElement('span');heading.className='roster-name';const portrait=document.createElement('img');portrait.className='roster-portrait';portrait.alt='';assignImage(portrait,enemy.image);const nameText=document.createElement('span');nameText.className='monster-name-text';nameText.textContent=displayName;heading.append(portrait,nameText);
 if(enemy.boss){const icon=document.createElement('img');icon.className='roster-icon';icon.alt='マップボス';assignImage(icon,'../images/UT_Buff/Boss.png');nameText.append(icon);}if(enemy.reflect){const icon=document.createElement('img');icon.className='roster-icon';icon.alt='反撃可能';assignImage(icon,icons.reflect);nameText.append(icon);}
 select.append(heading);const actions=document.createElement('div');actions.className='roster-card-actions';const top=document.createElement('div');top.className='roster-card-top';top.append(select,actions);card.append(top);return {card,select,nameText,actions,top};
}
function createRosterActionButton(className,text,label,disabled=false){const button=document.createElement('button');button.type='button';button.className=className;button.textContent=text;button.disabled=disabled;button.setAttribute('aria-label',label);return button;}
function createRosterMarkControl(enemy,displayName){
 const field=document.createElement('div');field.className='roster-mark';field.title='マーク：左クリックで＋1、右クリックで−1';const button=document.createElement('button');button.type='button';button.className='roster-mark-button';button.disabled=!!enemy.defeated;button.setAttribute('aria-label',displayName+'のマークを増やす');const icon=document.createElement('img');icon.src='../images/UT_Buff/UT_Buff_Lock.png';icon.alt='マーク';button.append(icon);const value=document.createElement('strong');value.textContent=String(enemy.markStacks||0);field.append(button,value);return {field,button};
}

function createRosterStats(enemy,displayName,assignImage,icons,onCommit){
 const stats=document.createElement('span');stats.className='roster-stats';
 [['攻撃',enemy.attack],['防御',enemy.defense],['HP',enemy.hp],['コイン',enemy.coin]].forEach(([key,value])=>{const cell=document.createElement('span');cell.className='roster-stat';if(value!==null){const icon=document.createElement('img');icon.className='roster-icon';icon.alt=key;assignImage(icon,icons[key]);let amount;if(key==='HP'||key==='攻撃'||key==='防御'){const field=key==='HP'?'hp':key==='攻撃'?'attack':'defense',label=key==='HP'?'残りHP':key+'力';amount=document.createElement('input');amount.type='number';amount.disabled=!!enemy.defeated;amount.min='0';amount.step='1';amount.value=value;amount.className='roster-hp';amount.setAttribute('aria-label',displayName+'の'+label);amount.title=label+'を入力'+(key==='HP'?'（0で撃破）':'');const input=amount;input.addEventListener('focus',()=>input.select());const commit=(next=input.value)=>onCommit({key,field,label,input,value:next});input.addEventListener('change',()=>commit());input.addEventListener('blur',()=>commit());input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}if(event.key==='Escape'){input.value=enemy[field];input.blur();}});const iconButton=document.createElement('button');iconButton.type='button';iconButton.disabled=!!enemy.defeated;iconButton.className='roster-stat-icon';iconButton.title=label+(key==='HP'?'：左クリックで−1、右クリックで＋1':'：左クリックで＋1、右クリックで−1');iconButton.setAttribute('aria-label',displayName+'の'+label+(key==='HP'?'を減らす':'を増やす'));iconButton.append(icon);iconButton.addEventListener('click',()=>commit(Math.max(0,enemy[field]+(key==='HP'?-1:1))));iconButton.addEventListener('contextmenu',event=>{event.preventDefault();commit(Math.max(0,enemy[field]+(key==='HP'?1:-1)));});cell.append(iconButton,amount);amount=null;}else{amount=document.createElement('strong');amount.textContent=value;}if(amount)cell.append(icon,amount);}stats.append(cell);});
 return stats;
}

function createRosterSkillView(enemy,displayName,skill,isOpen,targets,assignImage,onToggle,onSummon){
 if(!skill||skill.map!==enemy.mapId||enemy.defeated)return {button:null,choices:null};
 const button=document.createElement('button');button.type='button';button.className='roster-skill';button.textContent='スキル';button.setAttribute('aria-label',displayName+'の召喚スキル');
 if(enemy.monsterId==='M0021')button.title='近くに魔法のティーポットがいない場合に使用（距離は手動確認）';if(enemy.monsterId==='M0020')button.title='「この人です」を3枚使用したら押す（カード枚数は手動管理）';
 if(skill.targets.length>1){button.setAttribute('aria-expanded',String(isOpen));button.addEventListener('click',onToggle);}else button.addEventListener('click',()=>onSummon(skill.targets[0]));
 if(!isOpen||skill.targets.length<2)return {button,choices:null};
 const choices=document.createElement('div');choices.className='roster-skill-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label',displayName+'が召喚するモンスターを選択');
 for(const target of targets){if(!target)continue;const choice=document.createElement('button');choice.type='button';choice.className='roster-skill-choice';choice.setAttribute('aria-label',target.name+'を1体召喚');const image=document.createElement('img');image.alt='';assignImage(image,target.image);const label=document.createElement('span');label.textContent=target.name;choice.append(image,label);choice.addEventListener('click',()=>onSummon(target.id));choices.append(choice);}
 return {button,choices};
}

function createRosterCharacterStatusControl(enemy,displayName,config){
 const field=document.createElement('span');field.className='roster-mark roster-character-status roster-status-'+config.key;
 const button=document.createElement('button');button.type='button';button.className='roster-mark-button roster-status-button';button.disabled=!!enemy.defeated;
 const value=config.stack?Math.max(0,Number(enemy[config.key])||0):Boolean(enemy[config.key]);
 button.setAttribute('aria-label',displayName+'の'+config.label+(config.stack?'を増やす':'：'+(value?'オン':'オフ')));
 if(!config.stack)button.setAttribute('aria-pressed',String(value));button.title=config.label+(config.stack?'：左クリックで＋1、右クリックで−1':'：クリックで切り替え');
 if(config.icon){const icon=document.createElement('img');icon.src='../images/UT_Buff/'+config.icon;icon.alt=config.label;button.append(icon);}else button.textContent=config.label;
 field.append(button);if(config.stack){const count=document.createElement('strong');count.textContent=String(value);field.append(count);}return {field,button};
}
