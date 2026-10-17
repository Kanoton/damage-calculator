// DOM builders for map-specific roster gimmicks. State changes are supplied as callbacks.
function createMapFeatureSections(rows){
 const fragment=document.createDocumentFragment();
 for(const [kind,title]of [['card','マップ固有カード'],['keyword','状態効果']]){
  const entries=rows.filter(row=>row.kind===kind);if(!entries.length)continue;
  const section=document.createElement('section'),heading=document.createElement('h2'),grid=document.createElement('div');section.className='mp-feature-section';heading.textContent=title;grid.className='mp-feature-grid';
  for(const row of entries){
   const article=document.createElement('article');article.className='mp-feature';article.dataset.featureName=row.name;
   const source=safeAssetUrl('../images/',row.image);if(source){const link=document.createElement('a'),image=document.createElement('img');link.href=source;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',row.name+'のカード画像を開く');image.src=source;image.alt=row.name;image.loading='lazy';link.append(image);article.append(link);}
   const name=document.createElement('h3'),description=document.createElement('p');name.textContent=row.name;description.textContent=row.description;article.append(name,description);
   if(row.building_effect){const effect=document.createElement('p'),label=document.createElement('strong');label.textContent='設置後：';effect.append(label,document.createTextNode(row.building_effect));article.append(effect);}
   grid.append(article);
  }
  section.append(heading,grid);fragment.append(section);
 }
 return fragment;
}
function createLibraryGimmickControls({truthDone,evidenceEnabled,evidenceActive,evidenceCount,wardenPending,onTruth,onEvidence,onRevive}){
 const nodes=[];const truth=document.createElement('button');truth.type='button';truth.className='roster-truth';truth.textContent='真相発覚';truth.disabled=truthDone;truth.setAttribute('aria-pressed',String(truthDone));truth.setAttribute('aria-label',truthDone?'真相発覚（発動済み）':'真相発覚を発動');truth.addEventListener('click',onTruth);nodes.push(truth);
 const evidence=document.createElement('button');evidence.type='button';evidence.className='roster-evidence'+(evidenceActive?' is-active':'');const icon=document.createElement('img');icon.src='../images/icon/'+encodeURIComponent('罪証.png');icon.alt='';evidence.append(icon,document.createTextNode('罪証考慮'));evidence.disabled=!evidenceEnabled;evidence.setAttribute('aria-pressed',String(evidenceActive));evidence.title=evidence.disabled?'キャラクターを選択すると操作できます':('選択キャラクターの罪証 '+evidenceCount+'スタックを対象モンスターの攻撃力に'+(evidenceActive?'反映中':'反映しない'));evidence.setAttribute('aria-label','罪証考慮：'+(evidenceActive?'オン':'オフ')+'。選択キャラクターの罪証 '+evidenceCount+'スタック');evidence.addEventListener('click',onEvidence);nodes.push(evidence);
 if(wardenPending){const revive=document.createElement('button');revive.type='button';revive.className='roster-warden-revive';revive.textContent='看守復活';revive.title='撃破から2ラウンド後に手動で押す。復活のたび最大HP＋2';revive.addEventListener('click',onRevive);nodes.push(revive);}return nodes;
}
function createGhostSpawnButton(choice,done,onSpawn){const button=document.createElement('button');button.type='button';button.dataset.gimmick='ghost-spawn-'+choice.spawn;button.textContent=choice.label;button.disabled=done;button.setAttribute('aria-pressed',String(done));button.setAttribute('aria-label',done?choice.label+'（実行済み）':choice.label);button.addEventListener('click',onSpawn);return button;}
function createRosterGimmickButton(row,maximum,count,onChange){const button=document.createElement('button');button.type='button';button.dataset.gimmick=row.gimmick_id;button.textContent=row['表示名']+(maximum===1?'':' '+count);button.classList.toggle('mp-gimmick-complete',count>=maximum);button.setAttribute('aria-pressed',String(count>0));button.title='左クリック：＋1 ／ 右クリック：−1';button.addEventListener('click',()=>onChange(1));button.addEventListener('contextmenu',event=>{event.preventDefault();onChange(-1);});button.addEventListener('keydown',event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();onChange(-1);}});return button;}
