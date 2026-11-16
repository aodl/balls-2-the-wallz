import {readFile,readdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareQuoteV6,legalAdjacentSites,legalMoveDestination} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {parseV6TextMemo,encodeV6Memo,decodeV6Memo} from '../../packages/protocol/memo-v6.mjs';
import {clearanceActive}from'../../packages/protocol/territory-clearance.mjs';
import {warCrySupported}from'../../apps/b2z-observer/war-cry-policy.mjs';
const root='.work/frontend80-deployment-20261116/live-controls-ready-event';const rows=[];
for(const file of (await readdir(root)).filter(n=>n.endsWith('-quote.json'))){
 const v=JSON.parse(await readFile(root+'/'+file,'utf8'),(_,x)=>x&&typeof x==='object'&&Object.keys(x).length===1&&'$integer'in x?BigInt(x.$integer):x);
 const d=JSON.parse(await readFile(root+'/'+file.replace('-quote.json','-payment.json'),'utf8'));const p=d.memo.split(' ');const account=v.world.cannons[0].account;
 const command=p[0]==='FIRE'?{kind:'fire',cannon:Number(p[1]),angle:p[2],quantity:Number(p[3]),cell:null}:p[0]==='MOVE'?{kind:'move',cannon:Number(p[1]),cell:Number(p[2])}:{kind:'new',angle:p[1],quantity:Number(p[2]),cell:Number(p[3])};
 const q=prepareQuoteV6(v.world,v.config,account,command);assert.equal(v.config.rules_version,7);assert.equal(clearanceActive(v.config),false);assert.equal(warCrySupported(v.config),false);assert.ok(!d.memo.includes('|'));assert.equal(q.memo,d.memo);assert.equal(q.cell,v.composer.cell);assert.equal(d.payer,account);assert.equal(d.recipient,'s5ir5-gqaaa-aaaas-amyna-cai');
 const m=/^(\d+)(?:\.(\d{1,8}))? ICP$/.exec(d.amount);assert.ok(m);const amount=BigInt(m[1])*100000000n+BigInt((m[2]??'').padEnd(8,'0'));assert.equal(amount,q.amount);
 const decoded=parseV6TextMemo(new TextEncoder().encode(d.memo));assert.deepEqual(decodeV6Memo(encodeV6Memo(decoded)),decoded);
 if(command.kind==='move')assert.ok(legalMoveDestination(v.world,account,command.cannon,command.cell,v.config));if(command.kind==='new')assert.ok(legalAdjacentSites(v.world,account,v.config).includes(command.cell));
 rows.push({file,memo:q.memo,amount_e8s:String(q.amount),rules:7,canonical_memo_bytes:Buffer.from(q.memo_bytes).toString('hex'),binary_roundtrip:true,destination:command.cell,recipient:d.recipient,payer:account,status:'PASS'});
}
assert.ok(rows.length>=9);await writeFile(root+'/quote-verification.json',JSON.stringify({status:'PASS',scope:'Pure maintained quote/memo reproduction from authenticated live snapshot/config captures; no transaction or new backend query',rows},null,2)+'\n');console.log('PASS',rows.length,'live payment quotes and canonical memo round trips');
