function setupCharacterSkillTooltip({characterSkills}){
 const element=document.createElement('aside');element.id='character-skill-tooltip';element.className='character-skill-tooltip';element.setAttribute('role','tooltip');element.hidden=true;document.body.append(element);
 let timer;
 function hide(){clearTimeout(timer);element.hidden=true;}
 function scheduleHide(){clearTimeout(timer);timer=setTimeout(hide,180);}
 function show(button,row){
  const ability=characterSkills.get(String(row.id));if(!ability)return;
  clearTimeout(timer);element.replaceChildren();
  const {stats,description}=createCharacterSkillTooltipView(row,ability);
  element.append(stats,description);element.hidden=false;element.scrollTop=0;
  const box=button.getBoundingClientRect(),width=element.offsetWidth,height=element.offsetHeight,gap=10;
  let left=box.right+gap;if(left+width>window.innerWidth-8)left=box.left-width-gap;
  element.style.left=Math.max(8,Math.min(left,window.innerWidth-width-8))+'px';
  element.style.top=Math.max(8,Math.min(box.top,window.innerHeight-height-8))+'px';
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 document.getElementById('character-image-list').addEventListener('scroll',hide);
 return {element,show,scheduleHide};
}
