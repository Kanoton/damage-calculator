// Unknown paths, deletions and non-PR events deliberately retain full coverage.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const chipPaths=[
 /^08_screen_reader\/js\/screen-reader-chip-shape-references\.js$/,
 /^scripts\/build-screen-reader-chip-shapes\.py$/,
 /^tests\/fixtures\/screen-reader\/chip-grid-[a-z0-9-]+\.json$/,
 /^tests\/08-chip-reader\.spec\.js$/
];
function classify(changes,event='pull_request'){
 if(event!=='pull_request'||!changes.length)return 'full';
 let chip=false;
 for(const {status,path} of changes){
  if(!['A','M'].includes(status))return 'full';
  if(chipPaths.some(pattern=>pattern.test(path))){chip=true;continue;}
  if(path==='WORKING_GUIDE.md'||path==='AGENTS.md'||/^docs\/.+\.md$/.test(path))continue;
  return 'full';
 }
 return chip?'chips':'full';
}
function parseDiff(raw){
 const fields=raw.split('\0');if(fields.at(-1)==='')fields.pop();
 if(fields.length%2)throw Error('Unexpected git diff format');
 return fields.reduce((rows,value,i)=>i%2?rows:[...rows,{status:value,path:fields[i+1]}],[]);
}
if(require.main===module){
 const event=process.env.GITHUB_EVENT_NAME||'local';let mode='full';
 if(event==='pull_request'){
  const data=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  const base=data.pull_request.base.sha,head=data.pull_request.head.sha;
  if(!/^[a-f0-9]{40}$/.test(base)||!/^[a-f0-9]{40}$/.test(head))throw Error('Invalid diff refs');
  // Disable rename detection so both the old and new path must pass the policy.
  const diff=execFileSync('git',['diff','--name-status','--no-renames','-z',base+'...'+head],{encoding:'utf8'});
  mode=classify(parseDiff(diff),event);
 }
 console.log('CI test scope: '+mode);
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+mode+'\n');
}
module.exports={classify,parseDiff};
