// Pure roster helpers. Keep DOM and map-controller state in map.js.
function createRosterState(context){return {monsters:[],nextId:1,selectedId:null,serials:new Map(),history:[],round:1,progress:1,context};}
function addRosterMonster(state,enemy){
 enemy.markStacks=Math.max(0,Math.floor(Number(enemy.markStacks)||0));
 if(!enemy.boss){const serial=(state.serials.get(enemy.monsterId)||0)+1;state.serials.set(enemy.monsterId,serial);enemy.serial=serial;}
 state.monsters.push(enemy);return enemy;
}
function rosterMonsterDisplayName(enemy){return enemy.name+(enemy.boss?'':' '+enemy.serial);}
function updateRosterEnemy(enemy,statValue){if(enemy.defeated)return;enemy.attack=statValue(enemy.base,'攻撃')+(enemy.manualAttack||0)+(enemy.eventAttack||0);enemy.defense=statValue(enemy.base,'防御')+(enemy.manualDefense||0)+(enemy.eventDefense||0);enemy.hp=statValue(enemy.base,'HP')-enemy.damageTaken;}
