#!/usr/bin/env node
/** Read-only/planning CLI. No signer, wallet, controller or Ledger-update imports. */
import {readFile,stat} from 'node:fs/promises';
import {VerifiedObserver,MAINNET} from '../packages/agents/b2z/observer.mjs';
import {agentOperation} from '../packages/agents/b2z/interface.mjs';
import {parse,stringify,check} from '../packages/agents/b2z/common.mjs';
const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
if(args.includes('--help')||!args.length){console.log('B2Z agent: node tools/b2z_agent.mjs <observe_game|inspect_region|inspect_player|inspect_island|changes_since|action_options|evaluate_actions|decide|stdio> [--request request.json] [--account 64hex] [--store directory] [--local-config pinned.json]\nJSON requests: {operation, params}. stdio keeps one shared verified mirror for all players. No real payment can be submitted by this CLI.');process.exit(0);}
let policy=MAINNET;if(get('--local-config')){const p=parse(await readFile(get('--local-config'),'utf8'));policy={...p,rootKey:Buffer.from(p.root_key_hex,'hex')};}
const observer=await VerifiedObserver.connect({policy,store:get('--store')??null});
const perform=req=>agentOperation(observer,req);
if(args[0]==='stdio'){
 observer.start();
 const {createInterface}=await import('node:readline');const input=createInterface({input:process.stdin,crlfDelay:Infinity});for await(const line of input){if(!line.trim())continue;try{check(Buffer.byteLength(line)<=65536,'REQUEST_BOUND');console.log(stringify(await perform(parse(line)),0));}catch(e){console.log(stringify({schema:'b2z-agent/1',status:'error',error:e.message},0));}}
 observer.stop();
}else{let request;if(get('--request')){check((await stat(get('--request'))).size<=65536,'REQUEST_BOUND');request=parse(await readFile(get('--request'),'utf8'));}else request={operation:args[0],params:{...(get('--account')?{account:get('--account')}:{})}};console.log(stringify(await perform(request)));}
