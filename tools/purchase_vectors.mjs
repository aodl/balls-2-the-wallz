#!/usr/bin/env node
/** Synthetic v6 purchase continuations, before enclosing cursor accounting/physics. */
import {readFile,writeFile} from 'node:fs/promises';import {createHash}from'node:crypto';
import {decodeWorld,encodeWorld}from'../packages/kernels/b2z/world.mjs';import{stageMillionWorld}from'../packages/kernels/b2z/migration.mjs';
import{migratePlayability}from'../packages/kernels/b2z/playability.mjs';import{encodeV6Memo,parseV6TextMemo}from'../packages/protocol/memo-v6.mjs';
import{PurchaseBatch,preparePurchase,adjacentSites,chooseAdjacent}from'../packages/kernels/b2z/purchases-v6.mjs';
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
const f=JSON.parse(await readFile('tests/fixtures/b2z-torus-v4.json','utf8'));
const w=migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(f.migration.new_hex,'hex'))),9007199254740993n),account=w.cannons[0].account;
const memo=encodeV6Memo(parseV6TextMemo(new TextEncoder().encode('FIRE 1 0 2'))),p=preparePurchase(w,account,50000000n,memo),batch=PurchaseBatch.fire(account,50000000n,p);
const sites=adjacentSites(w,1),selected=chooseAdjacent(w,1,'ab'.repeat(32));while(batch.stop_reason===null)batch.step(w);
const sha=b=>createHash('sha256').update(b).digest('hex');
const result=JSON.stringify({scope:'Purchase helper only; no Ledger admission, simulation step or IC authenticity claim',state_sha256:sha(encodeWorld(w)),receipt_sha256:sha(encodeCanonical(batch.receipt())),adjacent_sites:sites,selected_adjacent:selected},null,2)+'\n';
const path='tests/fixtures/purchases-v6.json';if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==result)throw Error('v6 purchase vector mismatch');}else await writeFile(path,result);console.log('PASS: v6 purchase public state/receipt vectors');
