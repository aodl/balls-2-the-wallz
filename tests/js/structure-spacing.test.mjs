import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {structureSiteReason,hasStructureClearance,structureMap} from '../../packages/protocol/structure-sites.mjs';
import {decodeWorld,encodeWorld,setOwnerRange,SHOUT_CONFIG,SHOUT_IDENTITY,SPACING_CONFIG,SPACING_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {preparePurchase} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {prepareContextDeflector} from '../../packages/kernels/b2z/context-structures.mjs';
import {entryHasClearance} from '../../packages/kernels/b2z/entry-v7.mjs';
import {beginEntrySpawn,spawnStep} from '../../packages/kernels/b2z/spawn.mjs';
import {contextSites} from '../../apps/b2z-observer/context-sites.mjs';
import {nearestDestination} from '../../apps/b2z-observer/destination-search.mjs';
import {quoteV6,legalMoveDestination} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {parseContextText,encodeContextMemo} from '../../packages/protocol/context-structures.mjs';

const width=1000,height=1000;
const site=(dx,dy)=>((dy+height)%height)*width+(dx+width)%width;
const shapes=[{kind:'cannon',id:1,owner:1},{kind:'deflector',id:1,owner:2}];
test('Rules15 clears all structures at distances 0–3, including diagonals and both seams',()=>{
 for(const shape of shapes)for(const owner of [1,2])for(const [dx,dy] of [[1,0],[0,-1],[-1,0],[0,1],[1,1],[-1,-1],[1,-1],[-1,1]])for(let d=0;d<=5;d++){
  const structures=new Map([[site(dx*d,dy*d),{...shape,owner}]]);
  assert.equal(hasStructureClearance(width,height,0,undefined,structures),d>=4);
  assert.equal(hasStructureClearance(width,height,0,shape,structures),true);
  structures.set(site(-2,1),{kind:shape.kind,id:2,owner});
  assert.equal(hasStructureClearance(width,height,0,shape,structures),false);
 }
});
test('site policy keeps ownership, active island, occupancy and enemy territory requirements',()=>{
 const flags={width,height,owner:1,cell:0,deflector:true,spacing:true,occupied:new Set(),structures:new Map(),ownerAt:n=>n===0?1:n===site(-3,-3)?2:0,active:()=>true};
 assert.equal(structureSiteReason(flags),'ENEMY_TERRITORY_TOO_CLOSE');
 const clear={...flags,ownerAt:n=>n===0?1:n===site(-4,-4)?2:0};
 assert.equal(structureSiteReason(clear),null);
 assert.equal(structureSiteReason({...clear,spacing:false}),'NO_FRIENDLY_STRUCTURE_NEARBY');
 assert.equal(structureSiteReason({...clear,active:()=>false}),'NO_ACTIVE_ISLAND');
 assert.equal(structureSiteReason({...clear,ownerAt:()=>0}),'NOT_OWN_TERRITORY');
 assert.equal(structureSiteReason({...clear,occupied:new Set([0])}),'SITE_OCCUPIED');
});
const fixture=()=>decodeWorld(Buffer.from(JSON.parse(readFileSync('tests/fixtures/context-structures-v13.json')).rows[0].initial_hex,'hex'));
const memo=text=>encodeContextMemo(parseContextText(new TextEncoder().encode(text)).command);
test('versioned Build and Move quotes and kernel plan agree without changing the world',()=>{
 const w=fixture(),account=w.cannons[0].account,initial=encodeWorld(w);
 assert.equal(SPACING_IDENTITY.schema_hash,SHOUT_IDENTITY.schema_hash);
 assert.notEqual(SPACING_IDENTITY.config_hash,SHOUT_IDENTITY.config_hash);
 assert.notEqual(SPACING_IDENTITY.rules_hash,SHOUT_IDENTITY.rules_hash);
 for(const [cell,reason] of [[4007,'STRUCTURE_TOO_CLOSE'],[4008,null]])for(const [kind,text,plan] of [
   ['new',`NEW 0 1 ${cell}`,preparePurchase],['deflect',`DEFLECT ${cell} N`,prepareContextDeflector]
 ]){
  const result=plan===preparePurchase?plan(w,account,500000000n,memo(text),[],true,true):plan(w,account,500000000n,memo(text),true);
  if(reason){assert.equal(result.reason,reason);assert.throws(()=>quoteV6(w,SPACING_CONFIG,account,{kind,cell}),new RegExp(reason));}
  else{assert.notEqual(result.kind,'rejected');assert.equal(quoteV6(w,SPACING_CONFIG,account,{kind,cell}).cell,cell);}
 }
 assert.equal(contextSites(w,SHOUT_CONFIG).reason(account,4007),null);
 assert.equal(contextSites(w,SHOUT_CONFIG).reason(account,4008),'NO_FRIENDLY_STRUCTURE_NEARBY');
 assert.equal(preparePurchase(w,account,10000n,memo('MOVE 1 4005'),[],true,true).kind,'move');
 assert.equal(preparePurchase(w,account,10000n,memo('MOVE 1 4005'),[],true,false).reason,'NO_FRIENDLY_STRUCTURE_NEARBY');
 assert.equal(legalMoveDestination(w,account,1,4005,SPACING_CONFIG),true);
 assert.deepEqual(encodeWorld(w),initial);
});
test('automatic Join clears existing territory and both structure types',()=>{
 const w=fixture();
 assert.equal(entryHasClearance(w,4004),false);
 assert.equal(entryHasClearance(w,4008),false);
 for(let y=196;y<=204;y++)setOwnerRange(w,1000*y+196,1000*y+205,1,0);
 assert.equal(entryHasClearance(w,200200),true);
 w.deflectors.push({id:1,cell:200203,owner:1,orientation:'NE'});
 assert.equal(entryHasClearance(w,200200),false);
 assert.equal(hasStructureClearance(width,height,200199,undefined,structureMap(w,()=>1)),true);
});
test('cooperative nearest search supports sparse destinations outside the previous radius',async()=>{
 const visited=[],steps=[];
 const job=nearestDestination({width,height,source:0,chunk:32,schedule:fn=>steps.push(fn),legal:cell=>{
  visited.push(cell);return cell===6||cell===994;
 }});
 assert.equal(visited.length,0);
 while(steps.length)steps.shift()();
 assert.equal(await job.promise,6);
 assert.ok(job.stats.chunks>1);
});

test('automatic Join keeps exact maximin selection and rejects a fully owned map without a flat scan',()=>{
 const w=fixture(),seed='0'.repeat(64),blocked=beginEntrySpawn(w,seed,true);
 assert.equal(spawnStep(w,blocked,true),true);assert.equal(blocked.result,null);
 for(let y=500;y<=508;y++)setOwnerRange(w,1000*y+504,1000*y+513,1,0);
 const job=beginEntrySpawn(w,seed,true);
 let steps=0;while(!spawnStep(w,job,true))assert.ok(++steps<256);
 assert.equal(job.result.cell,504508);
 assert.equal(job.result.kind,5);
 assert.equal(job.result.patch.length,9);
});
