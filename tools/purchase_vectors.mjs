#!/usr/bin/env node
/** Synthetic v6 purchase continuations, before enclosing cursor accounting/physics. */
import {readFile,writeFile} from 'node:fs/promises';import {createHash}from'node:crypto';
import {decodeWorld,encodeWorld}from'../packages/kernels/b2z/world.mjs';import{stageMillionWorld}from'../packages/kernels/b2z/migration.mjs';
import{migratePlayability}from'../packages/kernels/b2z/playability.mjs';import{encodeV6Memo,parseV6TextMemo}from'../packages/protocol/memo-v6.mjs';
import{PurchaseBatch,preparePurchase,adjacentSites,chooseAdjacent,placeNew}from'../packages/kernels/b2z/purchases-v6.mjs';
import{encodeCanonical,cloneCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{beginSpawn,spawnStep}from'../packages/kernels/b2z/spawn.mjs';
const f=JSON.parse(await readFile('tests/fixtures/b2z-torus-v4.json','utf8'));
const w=migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(f.migration.new_hex,'hex'))),9007199254740993n),account=w.cannons[0].account;
const memo=encodeV6Memo(parseV6TextMemo(new TextEncoder().encode('FIRE 1 0 2'))),p=preparePurchase(w,account,50000000n,memo),batch=PurchaseBatch.fire(account,50000000n,p);
const sites=adjacentSites(w,1),selected=chooseAdjacent(w,1,'ab'.repeat(32));while(batch.stop_reason===null)batch.step(w);
const sha=b=>createHash('sha256').update(b).digest('hex');
const spawns={};
for(const first of[true,false]){
 const original=migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(f.migration.new_hex,'hex'))),9007199254740993n),sender=first?'02'.repeat(32):original.cannons[0].account,budget=first?150000000n:450000000n;
 const plan=preparePurchase(original,sender,budget,encodeV6Memo(parseV6TextMemo(new TextEncoder().encode('NEW 0 3'))));
 let placement;
 if(first){const job=beginSpawn('ab'.repeat(32));while(!spawnStep(original,job));placement=job.result;const old=cloneCanonical(original);old.version=5;delete old.playability;const control=beginSpawn('ab'.repeat(32));while(!spawnStep(old,control));if(JSON.stringify(control.result)!==JSON.stringify(placement))throw Error('first spawn changed');}
 else{const cell=chooseAdjacent(original,1,'ab'.repeat(32));placement={cell,patch:[cell],kind:4,other:-1,checked:1};}
 const created=placeNew(original,sender,budget,plan,placement),batch=PurchaseBatch.afterNew(sender,budget,created.cannon.id,plan);while(batch.stop_reason===null)batch.step(created.world);
 spawns[first?'first':'additional']={placement,state_sha256:sha(encodeWorld(created.world)),event_sha256:sha(encodeCanonical(created.event)),receipt_sha256:sha(encodeCanonical(batch.receipt()))};
}
const result=JSON.stringify({spawns,scope:'Purchase helper only; no Ledger admission, simulation step or IC authenticity claim',state_sha256:sha(encodeWorld(w)),receipt_sha256:sha(encodeCanonical(batch.receipt())),adjacent_sites:sites,selected_adjacent:selected},null,2)+'\n';
const path='tests/fixtures/purchases-v6.json';if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==result)throw Error('v6 purchase vector mismatch');}else await writeFile(path,result);console.log('PASS: v6 purchase public state/receipt vectors');
