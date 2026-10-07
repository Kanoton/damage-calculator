// Pure roster helpers. Keep DOM and map-controller state in map.js.
function createRosterState(context){return {monsters:[],nextId:1,selectedId:null,serials:new Map(),history:[],round:1,progress:1,context};}
function addRosterMonster(state,enemy){
 enemy.markStacks=Math.max(0,Math.floor(Number(enemy.markStacks)||0));
 if(!enemy.boss){const serial=(state.serials.get(enemy.monsterId)||0)+1;state.serials.set(enemy.monsterId,serial);enemy.serial=serial;}
 state.monsters.push(enemy);return enemy;
}
function rosterMonsterDisplayName(enemy){return enemy.name+(enemy.boss?'':' '+enemy.serial);}
function updateRosterEnemy(enemy,statValue){if(enemy.defeated)return;enemy.attack=statValue(enemy.base,'攻撃')+(enemy.manualAttack||0)+(enemy.eventAttack||0)-(enemy.fanSkillAttackReduction?1:0);enemy.attack=Math.max(0,enemy.attack);enemy.defense=statValue(enemy.base,'防御')+(enemy.manualDefense||0)+(enemy.eventDefense||0);const maxHp=statValue(enemy.base,'HP');if(enemy.manualHp!==undefined&&enemy.manualHp!==null){enemy.manualHp=Math.min(maxHp,Math.max(0,Number(enemy.manualHp)||0));enemy.hp=enemy.manualHp;}else if(enemy.hp===undefined||enemy.hp===null)enemy.hp=maxHp-Math.max(0,Number(enemy.damageTaken)||0);else enemy.hp=Math.min(maxHp,Math.max(0,Number(enemy.hp)||0));enemy.damageTaken=Math.max(0,maxHp-enemy.hp);}
