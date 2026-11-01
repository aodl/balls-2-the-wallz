#!/usr/bin/env node
/** Read-only/planning CLI. No signer, wallet, controller or Ledger-update imports. */
import {readFile,stat} from 'node:fs/promises';
import {VerifiedObserver,MAINNET} from '../packages/agents/b2z/observer.mjs';
import {evaluateActions} from '../packages/agents/b2z/forecast.mjs';
import {decide} from '../packages/agents/b2z/policies.mjs';
import {parse,stringify,check} from '../packages/agents/b2z/common.mjs';
const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
if(args.includes('--help')||!args.length){console.log('B2Z agent: node tools/b2z_agent.mjs <observe_game|inspect_region|inspect_player|inspect_island|changes_since|evaluate_actions|decide|stdio> [--request request.json] [--account 64hex] [--store directory] [--local-config pinned.json]\nJSON requests: {operation, params}. stdio keeps one shared verified mirror for all players. No real payment can be submitted by this CLI.');process.exit(0);}
let policy=MAINNET;if(get('--local-config')){const p=parse(await readFile(get('--local-config'),'utf8'));policy={...p,rootKey:Buffer.from(p.root_key_hex,'hex')};}
const observer=await VerifiedObserver.connect({policy,store:get('--store')??null});
async function perform(req){check(req&&typeof req.operation==='string','OPERATION_REQUIRED');const params=req.params??{};await observer.refresh();if(!observer.current)throw Error('STALE_RESPONSE_RETRY_REQUIRED');await observer.operational();const board=observer.analysis(req.local_budget_and_pending??null),start=performance.now();let output;
 if(['observe_game','inspect_region','inspect_player','inspect_island','changes_since'].includes(req.operation))output=board[req.operation](params);
 else if(['evaluate_actions','decide'].includes(req.operation)){const evaluation=await evaluateActions(board,params.account,{...params,budgetE8s:BigInt(params.budget_e8s??0),feeE8s:BigInt(params.fee_e8s??10000)});output=req.operation==='decide'?{...evaluation,operation:'decide',decision:decide(params.policy??'frugal-expander',evaluation,{seed:params.seed??1,ownHistory:params.own_history??[]})}:evaluation;}
 else throw Error('UNKNOWN_OPERATION');
 output.measurements={...output.measurements,view_ms:performance.now()-start,observer:{...observer.metrics}};return output;}
if(args[0]==='stdio'){
 observer.start();
 const {createInterface}=await import('node:readline');const input=createInterface({input:process.stdin,crlfDelay:Infinity});for await(const line of input){if(!line.trim())continue;try{check(Buffer.byteLength(line)<=65536,'REQUEST_BOUND');console.log(stringify(await perform(parse(line)),0));}catch(e){console.log(stringify({schema:'b2z-agent/1',status:'error',error:e.message},0));}}
 observer.stop();
}else{let request;if(get('--request')){check((await stat(get('--request'))).size<=65536,'REQUEST_BOUND');request=parse(await readFile(get('--request'),'utf8'));}else request={operation:args[0],params:{...(get('--account')?{account:get('--account')}:{})}};console.log(stringify(await perform(request)));}
