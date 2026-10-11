// Offline formatter/source checks, no gameplay or character/PT sweep.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../07_skill/js/hover-text.js'),'utf8');
const element={dataset:{hoverKey:'parameter.increase',hoverName:'攻撃力'}};
const context=vm.createContext({document:{querySelectorAll:()=>[element]}});vm.runInContext(source,context);
const run=expression=>vm.runInContext(expression,context);
assert.equal(element.title,'攻撃力：左クリックで＋1／右クリックで−1');
assert.equal(run("getSkillHoverText('operation.toggle',{name:'反撃',state:'オン'})"),'反撃：オン\nクリックで切り替え');
assert.equal(run("getSkillHoverText('skill.cooldown',{max:3})"),'CT上限 3：左クリックで1減らす／右クリックで1増やす');
assert.equal(run("getSkillHoverText('skill.input',{name:'<b>{state}</b>'})"),'<b>{state}</b>');
assert.throws(()=>run("getSkillHoverText('missing')"),/Unknown hover text/);
assert.throws(()=>run("getSkillHoverText('operation.toggle',{name:'反撃'})"),/Missing hover value/);
assert.equal(run('Object.isFrozen(SKILL_HOVER_TEXT)'),true);
assert.equal(run("getSkillHoverText('ability.8').includes('ジュジュシールド')"),true);
console.log('ok hover templates, missing values, literal text and HTML controls');
