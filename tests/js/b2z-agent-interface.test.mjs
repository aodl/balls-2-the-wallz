import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeWorld,PLAYABILITY_CONFIG,PLAYABILITY_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {accountIdentifier} from '../../apps/b2z-observer/identity.mjs';
import {BoardAnalysis} from '../../packages/agents/b2z/analysis.mjs';import {agentOperation,READ_OPERATIONS} from '../../packages/agents/b2z/interface.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url)));
test('all player views and planning reuse the supplied mirror and exact snapshot reference',async()=>{
 const snapshot={world:decodeWorld(Buffer.from(fixture.cases.idle.state_hex,'hex')),reference:{head:7n,...PLAYABILITY_IDENTITY},configuration:PLAYABILITY_CONFIG,trust:'local-synthetic',events:{events:[],receipts:[]},gaps:[]};let reads=0;const observer={current:snapshot,metrics:{},async refresh(){reads++;},async operational(){},analysis(local){return new BoardAnalysis(snapshot,{local});}};
 for(const account of ['01','02','03','04'].map(x=>x.repeat(32))){const r=await agentOperation(observer,{operation:'inspect_player',params:{account}});assert.equal(r.provenance.head,7n);assert.equal(r.player.account,account);}
 assert.equal(reads,4);const opts=await agentOperation(observer,{operation:'action_options',params:{account:accountIdentifier('2vxsx-fae'),budget_e8s:'0'}});assert.equal(opts.provenance.head,7n);assert.ok(opts.candidates.every(c=>c.action.Wait));await assert.rejects(agentOperation(observer,{operation:'approve_campaign'}),/UNKNOWN_OPERATION/);assert.ok(!READ_OPERATIONS.has('submit_action'));
});


test('custom read-only quotes bind one snapshot and cannot override its destination or reserve funds',async()=>{
 const world=decodeWorld(Buffer.from(fixture.cases.idle.state_hex,'hex')),account=accountIdentifier('2vxsx-fae'),old=world.cannons[0].account;for(const x of [...world.cannons,...world.credits,...world.playability.players])if(x.account===old)x.account=account;const snapshot={world,reference:{head:8n,root:'verified-root',...PLAYABILITY_IDENTITY},source:{ledger:'official-fixture-ledger',recipient:'original-fixture-account'},configuration:PLAYABILITY_CONFIG,trust:'local-synthetic',events:{events:[],receipts:[]},gaps:[]};
 const observer={current:snapshot,metrics:{},async refresh(){},async operational(){},analysis(){return new BoardAnalysis(snapshot);}};
 const params={account,action:{Fire:{cannon:world.cannons[0].id,angle:65535,quantity:1}},expected_root:'verified-root'};
 const q=await agentOperation(observer,{operation:'quote_action',params});assert.equal(q.provenance.head,8n);assert.equal(q.destination,snapshot.source);assert.equal(q.quote.action.Fire.angle,65535);assert.equal(Buffer.from(q.quote.memo_hex,'hex').readUInt16BE(5),65535);assert.equal(q.payment_prepared,false);assert.equal(q.full_cost_e8s,null);
 const f=await agentOperation(observer,{operation:'quote_action',params:{...params,fee_e8s:'10000'}});assert.equal(f.full_cost_e8s,f.quote.amount_e8s+10000n);assert.equal(f.fee.certified,false);
 await assert.rejects(agentOperation(observer,{operation:'quote_action',params:{...params,expected_root:'stale-root'}}),/SNAPSHOT_CHANGED/);
 await assert.rejects(agentOperation(observer,{operation:'quote_action',params:{...params,destination:'attacker'}}),/REQUEST_FIELDS/);
 assert.ok(READ_OPERATIONS.has('quote_action'));
});
