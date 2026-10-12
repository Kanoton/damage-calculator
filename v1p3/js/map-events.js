// Map event helpers without controller-specific state ownership.
function mapEventKey(mapId,level,group){return JSON.stringify([mapId,level,group.route_id||'',group['進捗']]);}
function ghostEventKey(level,monsterId){return JSON.stringify(['MAP0006',level,'ghost-spawn',monsterId]);}
function libraryEventKey(mapId,level){return JSON.stringify([mapId,level,'','__library_truth__']);}
function updateMapEventRows(root,executed){root.querySelectorAll('#mp-event-body tr').forEach(tr=>{const done=executed.has(tr.dataset.eventKey);tr.classList.toggle('mp-event-done',done);const button=tr.querySelector('button');if(button){button.disabled=done;button.setAttribute('aria-pressed',String(done));}});}
function collectEventChanges(group,statsRows,level,statValue){
 const pending=[],buffDelta={attack:0,defense:0};
 for(const row of group.rows){const change=eventBuff(row);buffDelta.attack+=change.attack;buffDelta.defense+=change.defense;const ids=String(row.monster_id||'').split('|').map(x=>x.trim()).filter(Boolean),counts=String(row['出現数']||'').split('|').map(x=>x.trim());if(!ids.length){if(String(row['出現数']||'').trim())throw Error('モンスターIDが未登録です。');continue;}if(ids.length!==counts.length)throw Error('モンスターIDと出現数の個数が一致していません。');ids.forEach((id,i)=>{const count=Number(counts[i]);if(!counts[i]||!Number.isSafeInteger(count)||count<1)throw Error('出現数は1以上の整数で指定してください。');const stats=statsRows.find(r=>r.monster_id===id&&r['難易度']===level);if(!stats)throw Error(id+' の'+level+'のステータスが未登録です。');if(['攻撃','防御','HP'].some(k=>statValue(stats,k)===null||!Number.isFinite(statValue(stats,k))))throw Error(id+' の能力値が不足しています。');pending.push({stats,count});});}
 return {pending,buffDelta};
}
