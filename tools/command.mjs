#!/usr/bin/env node
/** Offline tools only: no network, wallet access, signing or token transfers. */
import{readFileSync}from'node:fs';import{describeMemo}from'../packages/protocol/memo.mjs';import{board,LifeCursor}from'@dtr/timeline-runtime/examples/life';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
const usage='Usage: node tools/command.mjs memo <angle|move> <integer> | replay [case-name] [comma-separated-budgets]';
try{
 const[command,arg,value]=process.argv.slice(2);
 if(command==='memo'){
  if(!arg||value===undefined)throw new Error(usage);
  console.log(JSON.stringify(describeMemo({kind:arg,value}),null,2));
 }else if(command==='replay'){
  const data=JSON.parse(readFileSync(new URL('../tests/fixtures/life.json',import.meta.url),'utf8'));
  const selected=arg?data.cases.filter(v=>v.name===arg):data.cases;if(!selected.length)throw new Error('unknown Life case');
  const budgets=(value??'1,7,64').split(',').map(x=>Number(x));
  if(!budgets.length||budgets.some(x=>!Number.isInteger(x)||x<1||x>1000000))throw new Error('invalid work budgets');
  const results=[];
  for(const v of selected){let c=new LifeCursor(board(v.width,v.height,v.cells,v.generation),v.steps),interrupts=0;
   while(c.remaining){c.step(budgets[interrupts%budgets.length]);const s=c.snapshot();c=LifeCursor.restore(s,sha256(s));interrupts++;}
   const r=c.result(),row={name:v.name,interrupts,state_hash:sha256(r.state),event_hash:sha256(r.events),score_hash:sha256(r.scores),matches_reference:sha256(r.state)===v.state_hash&&sha256(r.events)===v.events_hash&&sha256(r.scores)===v.scores_hash};
   if(!row.matches_reference)throw new Error(`reference mismatch: ${v.name}`);results.push(row);
  }
  console.log(JSON.stringify({mode:'offline synthetic conformance; no IC certification',results},null,2));
 }else throw new Error(usage);
}catch(e){console.error(e.message);process.exitCode=1;}
