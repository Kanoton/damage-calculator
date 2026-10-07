// Identity catalog for training previews, not calibrated game-screen descriptors.
(()=>{
 'use strict';
 const fallback=window.ScreenReaderMiniCharacterMappingData;
 let rows=fallback,source='同梱対応表';
 function validate(candidate,characters){
  if(!Array.isArray(candidate)||!candidate.length)throw Error('対応表が空です。');
  const seen=new Set();
  for(const r of candidate){
   if(!/^UT_Hero_ProfilePhoto_\d+(?:_(?:\d+|Max))?\.png$/.test(r.image_file)||seen.has(r.image_file))throw Error('画像名が不正または重複しています。');
   seen.add(r.image_file);
   if(r.entity_type==='キャラクター'){
    if(r.reader_target!=='対象'||r.status!=='確認済み'||r.monster_ids||!characters.some(c=>c.id===r.character_id&&c.name===r.name))throw Error('キャラクターの対応が不正です。');
   }else if(!['モンスター','判別不能'].includes(r.entity_type)||r.reader_target!=='対象外'||r.character_id)throw Error('対象外画像の指定が不正です。');
  }
  if(candidate.length!==fallback.length||fallback.some(r=>!seen.has(r.image_file)))throw Error('対応表の画像一覧が一致しません。');
  return candidate;
 }
 async function load(characters){
  rows=validate(fallback,characters);
  if(location.protocol==='file:')return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  try{
   const response=await fetch('../csv/mini_character_mapping.csv',{signal:controller.signal});
   if(!response.ok)throw Error('対応表を取得できません。');
   rows=validate(parseMapCSV(await response.text()),characters);source='CSV対応表';
  }catch{source='同梱対応表（CSV取得・検証失敗）';}
  finally{clearTimeout(timeout);}
 }
 function forCharacter(id){return rows.filter(r=>r.entity_type==='キャラクター'&&r.reader_target==='対象'&&r.status==='確認済み'&&r.character_id===id);}
 function summary(){return {source,total:rows.length,characters:rows.filter(r=>r.reader_target==='対象').length,excluded:rows.filter(r=>r.reader_target==='対象外').length};}
 window.ScreenReaderMiniCharacterMapping={load,forCharacter,summary};
})();
