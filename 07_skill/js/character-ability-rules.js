// ===== キャラクター固有能力ルール =====
const CHARACTER_ABILITY_RULES={
 '106':{
  controls:[{key:'推理タイム',type:'number',min:0,max:4}],
  modifiers:[{target:'atk',formula:'per_stack',source:'推理タイム',value:1}],
  turnEnd:[{key:'推理タイム',delta:-1,min:0}]
 },
 '18':{
  controls:[{key:'ファイアウォール',type:'toggle'}],
  modifiers:[
   {target:'atk',formula:'fixed',value:2,when:{key:'ファイアウォール',equals:1}},
   {target:'def',formula:'fixed',value:2,when:{key:'ファイアウォール',equals:1}}
  ]
 },
 '16':{
  controls:[
   {key:'オーバードライブ結果',type:'choice',options:[{value:0,label:'変化なし'},{value:1,label:'10未満'},{value:2,label:'10以上'}]},
   {key:'累計移動ポイント',type:'number',min:0}
  ],
  modifiers:[
   {target:'def',formula:'fixed',value:2,when:{key:'オーバードライブ結果',equals:1}},
   {target:'atk',formula:'fixed',value:2,when:{key:'オーバードライブ結果',equals:2}},
   {target:'atk',formula:'alternating_steps',source:'累計移動ポイント',unit:13,order:0},
   {target:'def',formula:'alternating_steps',source:'累計移動ポイント',unit:13,order:1}
  ]
 }
};
