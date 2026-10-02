async function loadCharacterData({listStatus,chipStatus}){
 async function load(kind,file,status){
  if(location.protocol==='file:')return parseMapCSV(CHARACTER_CSV_SNAPSHOT[kind]);
  try{const response=await fetch('../csv/'+file,{cache:'no-cache'});if(!response.ok)throw Error(file);const rows=parseMapCSV(await response.text());if(rows.length&&!Object.hasOwn(rows[0],'id'))throw Error('Missing id');return rows;}
  catch(error){status.textContent='CSVを取得できないため、同梱データを表示しています。';return parseMapCSV(CHARACTER_CSV_SNAPSHOT[kind]);}
 }
 function parseRules(text){
  if(!text.split(/\\r?\\n/,1)[0].includes('\\t'))return parseMapCSV(text);
  const lines=text.replace(/^\\uFEFF/,'').trim().split(/\\r?\\n/).map(line=>line.split('\\t'));
  const headers=lines.shift();return lines.map(values=>Object.fromEntries(headers.map((header,i)=>[header,values[i]||''])));
 }
 async function loadRules(){
  if(location.protocol==='file:')return CHIP_RULES_SNAPSHOT;
  try{const response=await fetch('../csv/chip_stat_rules.csv',{cache:'no-cache'});if(!response.ok)throw Error('chip_stat_rules.csv');return parseRules(await response.text());}
  catch(error){chipStatus.textContent='ルールCSVを取得できないため、同梱データを表示しています。';return CHIP_RULES_SNAPSHOT;}
 }
 async function loadStatusIcons(){
  let csv=STATUS_ICON_SNAPSHOT;
  if(location.protocol!=='file:'){
   try{const response=await fetch('../csv/status_icon_map_all.csv',{cache:'no-cache'});if(!response.ok)throw Error('status_icon_map_all.csv');csv=await response.text();}
   catch(error){console.warn('アイコン対応CSVを取得できないため、同梱データを使用します。',error);}
  }
  const rows=parseMapCSV(csv);
  return {mapKeywords:rows.filter(row=>row.group==='マップ固有'&&row.map_id&&['number','checkbox'].includes(row.input_kind)),statusIcons:new Map(rows.filter(row=>['number','checkbox'].includes(row.input_kind)&&/^(?:chip_icon\\/)?[^/\\\\]+\\.png$/i.test(row.icon_file)).map(row=>[row.effect_key,row.icon_file]))};
 }
 async function loadCharacterSkills(){
  let csv=CHARACTER_SKILLS_SNAPSHOT;
  if(location.protocol!=='file:'){
   try{const response=await fetch('../csv/character_skills.csv',{cache:'no-cache'});if(!response.ok)throw Error('character_skills.csv');csv=await response.text();}
   catch(error){console.warn('キャラクター能力CSVを取得できないため、同梱データを使用します。',error);}
  }
  return new Map(parseMapCSV(csv).filter(row=>row.id&&row.ability).map(row=>[row.id,row.ability]));
 }
 const [characters,chips,rules,icons,characterSkills]=await Promise.all([load('characters','character_stats.csv',listStatus),load('chips','chip_list.csv',chipStatus),loadRules(),loadStatusIcons(),loadCharacterSkills()]);
 return {characters,chips,rules,statusIcons:icons.statusIcons,mapKeywords:icons.mapKeywords,characterSkills};
}
