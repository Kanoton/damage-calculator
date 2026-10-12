const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=folder=>fs.readFileSync(path.join(root,folder,'js/hover-text.js'),'utf8');
if(read('07_skill')!==read('08_screen_reader'))throw Error('Regenerate 07 hover text and synchronize it to 08');
console.log('ok 08 hover text matches the 07 canonical descriptions');
