import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {marginal,timestampedPayment,untimedPayment,U64_MAX} from '../../packages/protocol/economy17.mjs';
import {BALL_BASE_E8S,CANNON_BASE_E8S,DIVERTER_BASE_E8S,DAY_NS,GRACE_NS} from '../../packages/protocol/economy17.generated.mjs';
import {encodeReservoirPayment,reservoirPut} from '../../packages/protocol/reservoir.mjs';
import {economyAt,migrateEconomy,participatingPlayers} from '../../packages/kernels/b2z/economy17.mjs';
import {migrateReservoirs} from '../../packages/kernels/b2z/reservoirs.mjs';
import {decodeWorld,encodeWorld,ECONOMY_IDENTITY,ECONOMY_CONFIG,RESERVOIR_CONFIG,scaledOwnership,setOwner} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel,B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {expireV6} from '../../packages/kernels/b2z/lifecycle-v6.mjs';
import {quoteV6} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {snapshot,prepareDerivedSegment} from '../../apps/b2z-observer/model.mjs';

const initial=()=>migrateReservoirs(decodeWorld(Buffer.from(JSON.parse(readFileSync('tests/fixtures/context-structures-v13.json')).rows[0].initial_hex,'hex')));
const hex=bytes=>Buffer.from(bytes).toString('hex');
const at=20000n*DAY_NS;
function run(world,inputs,commit,restore=false){
  let cursor=B2zKernel.begin(encodeWorld(world),inputs,{...ECONOMY_IDENTITY,logical_start:world.time[0],logical_end:world.time[0]+1n});
  for(let steps=0;!cursor.step(149).complete;steps++){
    assert.ok(steps<4000);
    if(restore){
      const bytes=cursor.snapshot();
      cursor=B2zCursor.restore(bytes,sha256(bytes));
    }
  }
  cursor.finalizeElapsed(commit);
  return cursor.result();
}
function input(world,command,amount,ts,position=1n){
  return {position,payload_hex:hex(timestampedPayment(encodeReservoirPayment(world.cannons[0].account,amount,command),ts))};
}
const fire=(quantity=1)=>({kind:'fire',cannon:1,angle:40960,quantity});
const receipts=result=>decodeCanonical(result.events).receipts;

test('exact square pricing and checked Ledger timestamp envelope',()=>{
  const base=[CANNON_BASE_E8S,DIVERTER_BASE_E8S,BALL_BASE_E8S];
  for(const p of [1,2,3,10,100,10000])for(const n of [0,1,2,4,9,19,999,23000]){
    for(const b of base)assert.equal(marginal(b,p,n),b*BigInt(p)*BigInt(n+1)**2n);
  }
  assert.deepEqual([0,1,2,9].map(n=>marginal(CANNON_BASE_E8S,1,n)),[1_000_000n,4_000_000n,9_000_000n,100_000_000n]);
  assert.equal(marginal(CANNON_BASE_E8S,1_000_000,999_999),null);
  assert.equal(marginal(U64_MAX,1,0),U64_MAX);
  const world=initial(),raw=encodeReservoirPayment(world.cannons[0].account,40000n,fire());
  assert.deepEqual(untimedPayment(timestampedPayment(raw,at)),{previous:raw,recordedNs:at});
  assert.throws(()=>untimedPayment(raw));
  assert.throws(()=>timestampedPayment(raw,0n));
});

test('late publisher records the preceding state, publishes tomorrow and never reopens missed tariffs',()=>{
  const predecessor=initial();
  predecessor.reservoirs=reservoirPut(predecessor.reservoirs,4005);
  const w=migrateEconomy(predecessor,at-20n,sha256(encodeWorld(predecessor)));
  const {version,economy,playability,...unchanged}=w;
  assert.deepEqual({...unchanged,version:8,playability:{...playability,elapsed_ns:predecessor.playability.elapsed_ns}},predecessor);
  assert.equal(economy.initial_multiplier,2);
  const late=at+6_000_000_000n;
  const interval=run(w,[],late,true), current=decodeWorld(interval.state);
  const [record]=current.economy.snapshots;
  assert.equal(record.boundary_ns,at);
  assert.equal(record.predecessor_state_hash,sha256(encodeWorld(w)));
  assert.equal(record.population,participatingPlayers(w));
  assert.equal(record.effective_ns,at+DAY_NS);
  assert.equal(current.reservoirs,predecessor.reservoirs);
  const next=expireV6(current,at+4n*DAY_NS+1n,[]);
  assert.ok(next,'empty due fences can still publish a daily checkpoint without a tick');
  const resumed=decodeWorld(next.output.state);
  const missed=resumed.economy.snapshots.at(-1);
  assert.equal(missed.first_boundary_ns,at+DAY_NS);
  assert.equal(missed.boundary_ns,at+4n*DAY_NS);
  assert.equal(missed.effective_ns,at+5n*DAY_NS);
  assert.deepEqual(resumed.time,current.time);
  assert.equal(economyAt(resumed.economy,at+3n*DAY_NS).current,record.multiplier);
});

test('authenticated interval accepts only the terminal daily economy snapshot before elapsed time',async()=>{
  const predecessor=initial(),world=migrateEconomy(predecessor,at-20n,sha256(encodeWorld(predecessor)));
  const start=encodeWorld(world),result=run(world,[],at+6_000_000_000n);
  const events=decodeCanonical(result.events).events;
  assert.deepEqual(events.slice(-2).map(e=>e.kind),['economy_snapshot','lifecycle_time']);
  const publication={version:8,identity:ECONOMY_IDENTITY,render_format:null,
    head:{seal:{logical_start:world.time[0],logical_end:world.time[0]+1n,previous_state:sha256(start)},state_hash:sha256(result.state)},
    artifacts:[{kind:'events',sha256:sha256(result.events)}]};
  const verified=await prepareDerivedSegment(start,result.state,result.events,publication);
  assert.deepEqual(verified.events.slice(-2).map(e=>e.kind),['economy_snapshot','lifecycle_time']);
  const altered=decodeCanonical(result.events);
  altered.events[altered.events.length-2].kind='unrelated_terminal_event';
  const alteredBytes=encodeCanonical(altered);
  await assert.rejects(prepareDerivedSegment(start,result.state,alteredBytes,
    {...publication,artifacts:[{kind:'events',sha256:sha256(alteredBytes)}]}),/derived animation event order\/range/);
});

test('delayed and grace Ledger payments keep one deterministic tariff across the entire batch',()=>{
  const raw=initial();
  const w=migrateEconomy(raw,at-1n,sha256(encodeWorld(raw)));
  // Retire an existing dormant player within the current day. The announced
  // population is captured after retirement and the bootstrap tariff stays 2.
  const dormant=w.playability.lifecycle.find(l=>l.deadline_ns!==undefined);
  assert.ok(dormant);
  dormant.dormant_since_ns=at-DAY_NS-1n;
  dormant.deadline_ns=at-1n;
  const before=expireV6(w,at-1n,[{cannon:dormant.cannon,generation:dormant.generation,deadline_ns:dormant.deadline_ns}]);
  const changed=decodeWorld(before.output.state);
  assert.equal(participatingPlayers(changed),1);
  const announced=decodeWorld(run(changed,[],at).state);
  const transition=at+DAY_NS;
  assert.equal(economyAt(announced.economy,transition-1n).current,2);
  assert.equal(economyAt(announced.economy,transition).previous,2);
  assert.equal(economyAt(announced.economy,transition+GRACE_NS-1n).previous,2);
  assert.equal(economyAt(announced.economy,transition+GRACE_NS).previous,null);
  const price=quoteV6(announced,ECONOMY_CONFIG,announced.cannons[0].account,{kind:'fire',cannon:1,angle:'225',quantity:2,priced_at_ns:transition});
  assert.deepEqual(price.per_item,[40_000n,90_000n]);
  const atClock=transition+3n*GRACE_NS;
  for(const [time,budget,rate,used,count] of [
    [transition-1n,260_000n,2,260_000n,2],
    [transition,260_000n,1,130_000n,2],
    [transition+GRACE_NS-1n,260_000n,1,130_000n,2],
    [transition+GRACE_NS,80_000n,1,40_000n,1],
  ]){
    const [r]=receipts(run(announced,[input(announced,fire(2),budget,time)],atClock,true));
    assert.equal(r.ledger_recorded_ns,time);
    assert.equal(r.price_multiplier,rate);
    assert.equal(r.amount_used,used);
    assert.equal(r.actual_quantity,count);
    assert.equal(r.remainder,budget-used);
  }
});

test('larger inventory and population remain playable above the former caps',()=>{
  const start=initial(),w=migrateEconomy(start,at,sha256(encodeWorld(start)));
  const player=w.playability.players[0],account=player.account;
  w.cannons=w.cannons.slice(0,1);w.balls=w.balls.slice(0,1);
  w.ownership=scaledOwnership(Array(1024).fill(1));
  w.playability.players=[player];
  w.playability.lifecycle=[{cannon:1,player:1,generation:1}];
  w.playability.territories=[{id:1,player:1}];
  w.credits=[];
  for(let i=2;i<=65;i++){
    const b=w.balls[0];
    w.balls.push({...b,id:i,owner:1});
  }
  w.next_ball_id=66;
  for(let i=2;i<=1026;i++){
    const own=i<=18,a=own?account:i.toString(16).padStart(64,'0'),cell=100000+i;
    if(!own){
      w.playability.players.push({id:i,account:a});w.playability.territories.push({id:i,player:i});
      setOwner(w,cell,i);
    }
    w.cannons.push({id:i,account:a,cell,heading:40960});
    w.playability.lifecycle.push({cannon:i,player:own?1:i,generation:1,...(!own?{dormant_since_ns:at,deadline_ns:at+DAY_NS}:{})});
  }
  w.next_cannon_id=1027;w.playability.next_player_id=1027;w.playability.next_territory_id=1027;
  for(let i=0;i<257;i++)w.deflectors.push({id:i+1,cell:300000+4*i+Math.floor(i/250)*1000,owner:1,orientation:'NW'});
  w.deflectors.sort((a,b)=>a.cell-b.cell);w.next_deflector_id=258;
  // Add enough distinct funded accounts to exceed the former 1,024 cap.
  for(let i=1027;i<=1045;i++){
    const a=i.toString(16).padStart(64,'0'),cell=100000+i;
    w.playability.players.push({id:i,account:a});w.playability.territories.push({id:i,player:i});setOwner(w,cell,i);
    w.cannons.push({id:i,account:a,cell,heading:40960});
    w.playability.lifecycle.push({cannon:i,player:i,generation:1,dormant_since_ns:at,deadline_ns:at+DAY_NS});
  }
  w.next_cannon_id=w.playability.next_player_id=w.playability.next_territory_id=1046;
  assert.equal(participatingPlayers(w),1028);
  const state=encodeWorld(w);
  assert.equal(snapshot(state,ECONOMY_IDENTITY).deflectors.length,257);
  assert.equal(snapshot(state,ECONOMY_IDENTITY).balls.length,65);
  const price=quoteV6(w,ECONOMY_CONFIG,account,{kind:'fire',cannon:1,angle:'225',quantity:1}).amount;
  assert.equal(price,marginal(BALL_BASE_E8S,w.economy.initial_multiplier,65));
  assert.throws(()=>quoteV6(w,RESERVOIR_CONFIG,account,{kind:'fire',cannon:1}),/ECONOMY_SCHEMA/);
  const extra=w.next_cannon_id,site=140014,diverterSite=140022;
  const buildPrice=quoteV6(w,ECONOMY_CONFIG,account,{kind:'new',angle:'225',quantity:2,cell:site});
  assert.deepEqual(buildPrice.per_item,[marginal(CANNON_BASE_E8S,2,18),marginal(BALL_BASE_E8S,2,66)]);
  const diverterPrice=quoteV6(w,ECONOMY_CONFIG,account,{kind:'deflect',angle:'225',cell:diverterSite}).amount;
  const paid=[
    input(w,{kind:'new',angle:40960,quantity:2,cell:site},buildPrice.amount,at+1n),
    input(w,{kind:'deflect',orientation:'NW',cell:diverterSite},diverterPrice,at+1n,2n),
    input(w,fire(),marginal(BALL_BASE_E8S,2,67),at+1n,3n),
  ];
  let result=run(w,paid,at+2n);
  assert.deepEqual(receipts(result).map(r=>r.reason),['ACCEPTED','ACCEPTED','ACCEPTED']);
  let end=decodeWorld(result.state);
  assert.equal(end.cannons.find(c=>c.id===extra).cell,site);
  assert.equal(end.balls.length,68);
  assert.equal(end.deflectors.length,258);
  for(let n=3n;n<=5n;n++){
    result=run(end,[],at+n);
    end=decodeWorld(result.state);
    assert.equal(end.balls.length,68);
  }

});

test('a higher current tariff only uses the outgoing tariff if it buys a larger prefix',()=>{
  const start=initial();
  const w=migrateEconomy(start,at-1n,sha256(encodeWorld(start)));
  // Build a confirmed bootstrap of one for a one-player world, then observe
  // the second player at midnight. Use the intact fixture inventories for the
  // actual purchase and test both branches of the grace-period tie rule.
  w.economy.population=1;
  w.economy.initial_multiplier=1;
  const announced=decodeWorld(run(w,[],at).state);
  const effective=at+DAY_NS;
  for(const [paid,time,rate,used,count] of [
    [130_000n,effective,1,130_000n,2],
    [260_000n,effective,2,260_000n,2],
    [130_000n,effective+GRACE_NS-1n,1,130_000n,2],
    [130_000n,effective+GRACE_NS,2,80_000n,1],
  ]){
    const [r]=receipts(run(announced,[input(announced,fire(2),paid,time)],effective+3n*GRACE_NS));
    assert.deepEqual([r.price_multiplier,r.amount_used,r.actual_quantity],[rate,used,count]);
  }
});
