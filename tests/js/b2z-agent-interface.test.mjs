import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeWorld,PLAYABILITY_CONFIG,PLAYABILITY_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {BoardAnalysis} from '../../packages/agents/b2z/analysis.mjs';import {agentOperation,READ_OPERATIONS} from '../../packages/agents/b2z/interface.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url)));
test('all player views and planning reuse the supplied mirror and exact snapshot reference',async()=>{
 const snapshot={world:decodeWorld(Buffer.from(fixture.cases.idle.state_hex,'hex')),reference:{head:7n,...PLAYABILITY_IDENTITY},configuration:PLAYABILITY_CONFIG,trust:'local-synthetic',events:{events:[],receipts:[]},gaps:[]};let reads=0;const observer={current:snapshot,metrics:{},async refresh(){reads++;},async operational(){},analysis(local){return new BoardAnalysis(snapshot,{local});}};
 for(const account of ['01','02','03','04'].map(x=>x.repeat(32))){const r=await agentOperation(observer,{operation:'inspect_player',params:{account}});assert.equal(r.provenance.head,7n);assert.equal(r.player.account,account);}
 assert.equal(reads,4);await assert.rejects(agentOperation(observer,{operation:'approve_campaign'}),/UNKNOWN_OPERATION/);assert.ok(!READ_OPERATIONS.has('submit_action'));
});
