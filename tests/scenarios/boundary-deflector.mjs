import{scaledOwnership,validateWorld,setOwner}from'../../packages/kernels/b2z/world.mjs';
import{migrateDeflectorWorld}from'../../packages/kernels/b2z/deflectors-v12.mjs';
import{heading}from'../../packages/kernels/b2z/math.mjs';
export const ACCOUNT='01'.repeat(32);
export function predecessorWorld(angle=8191,cell=1001){
 const[vx,vy]=heading(angle,32000),x=(cell%1000)*1024+512,y=Math.floor(cell/1000)*1024+512;
 return validateWorld({version:6,width:1000,height:1000,ownership:scaledOwnership(Array(1024).fill(1)),
  cannons:[{id:1,cell:4004,account:ACCOUNT,heading:0}],balls:[{id:1,owner:1,cell,x0:BigInt(x),y0:BigInt(y),vx,vy}],
  time:[0n,1n],next_cannon_id:2,next_ball_id:2,pending:[],next_strike_id:1,received_e8s:0n,credits:[{account:ACCOUNT,units:[0n,1n]}],
  playability:{elapsed_ns:0n,next_player_id:2,next_territory_id:2,players:[{id:1,account:ACCOUNT}],territories:[{id:1,player:1}],lifecycle:[{cannon:1,player:1,generation:1}]}});
}
export const successorWorld=(angle=8191,cell=1001)=>validateWorld(migrateDeflectorWorld(predecessorWorld(angle,cell)));
/** One dormant enemy marker, with territory retained exactly at its cannon. */
export function enemyWorld(enemyCell){
 const w=successorWorld();setOwner(w,enemyCell,2);w.cannons.push({id:2,cell:enemyCell,account:'02'.repeat(32),heading:0});w.next_cannon_id=3;
 const p=w.playability;p.players.push({id:2,account:'02'.repeat(32)});p.territories.push({id:2,player:2});p.lifecycle.push({cannon:2,player:2,generation:1,dormant_since_ns:0n,deadline_ns:86400000000000n});p.next_player_id=3;p.next_territory_id=3;
 return validateWorld(w);
}
/** Sixteen active stripes, 64 normal-speed balls, 256 legal stored structures.
 * Synthetic maximum-population state, not evidence of paid construction. */
export function capacityWorld(){
 const w=successorWorld();w.ownership=scaledOwnership(Array.from({length:1024},(_,i)=>Math.floor(i%32/2)+1));
 w.cannons=[];w.balls=[];w.credits=[];w.deflectors=[];
 const p=w.playability;p.players=[];p.territories=[];p.lifecycle=[];p.next_player_id=17;p.next_territory_id=17;
 for(let i=0;i<16;i++){
  const id=i+1,account=id.toString(16).padStart(2,'0').repeat(32),x=Math.floor((i+.5)*1000/16);
  w.cannons.push({id,cell:100000+x,account,heading:0});w.credits.push({account,units:[0n,1n]});p.players.push({id,account});p.territories.push({id,player:id});p.lifecycle.push({cannon:id,player:id,generation:1});
  for(let j=0;j<4;j++)w.balls.push({id:i*4+j+1,owner:id,cell:102000+x,x0:BigInt(x*1024+512),y0:104960n,vx:0,vy:32000,den:1n});
  for(let j=0;j<16;j++)w.deflectors.push({id:i*16+j+1,owner:id,cell:(104+Math.floor(j/4)*2)*1000+x+(j%4)*2-2,orientation:['NE','SE','SW','NW'][j%4]});
 }
 w.deflectors.sort((a,b)=>a.cell-b.cell);w.next_deflector_id=257;w.next_ball_id=65;w.next_cannon_id=17;return validateWorld(w);
}

/** Four immutable, separated devices form an exact repeating diamond. */
export function diamondWorld(){const w=successorWorld(8191,2003);w.deflectors=[[2004,'NE'],[4002,'SE'],[2000,'SW'],[2,'NW']].map(([cell,orientation],i)=>({id:i+1,owner:1,cell,orientation})).sort((a,b)=>a.cell-b.cell);w.next_deflector_id=5;return validateWorld(w);}

/** Near-parallel incoming shot: cannon walls reflect only y before an east exit. */
export function steepWorld(){const w=successorWorld(16383);w.balls[0].x0=2047n;for(const[id,cell]of[[2,1],[3,2001]]){w.cannons.push({id,cell,account:ACCOUNT,heading:0});w.playability.lifecycle.push({cannon:id,player:1,generation:1});}w.next_cannon_id=4;return validateWorld(w);}

/** A currently safe right branch loses its bridge to a real later enemy strike. */
export function lossWorld(){
 const w=successorWorld(0,101);w.ownership=scaledOwnership(Array(1024).fill(0));for(let cell=100;cell<=120;cell++)setOwner(w,cell,1);setOwner(w,1115,3);
 w.cannons=[{id:1,cell:100,account:ACCOUNT,heading:0},{id:2,cell:120,account:ACCOUNT,heading:0},{id:3,cell:1115,account:'02'.repeat(32),heading:49152}];
 w.balls[0].vx=1;w.balls[0].vy=0;w.balls.push({id:2,owner:2,cell:1115,x0:118272n,y0:1536n,vx:0,vy:-32000,den:1n});
 w.next_cannon_id=4;w.next_ball_id=3;Object.assign(w.playability,{next_player_id:3,next_territory_id:4,players:[{id:1,account:ACCOUNT},{id:2,account:'02'.repeat(32)}],territories:[{id:1,player:1},{id:3,player:2}],lifecycle:[{cannon:1,player:1,generation:1},{cannon:2,player:1,generation:1},{cannon:3,player:2,generation:1}]});w.credits.push({account:'02'.repeat(32),units:[0n,1n]});return validateWorld(w);
}

/** A genuine hostile frontier, with a purchasable device four cells behind it.
 * Owner combinations are explicit; collision response must never branch on them. */
export function interactionWorld(attacker=1,defender=2,face='W'){
 const w=successorWorld(0,1499),account=id=>id.toString(16).padStart(2,'0').repeat(32);
 w.ownership=scaledOwnership(Array.from({length:1024},(_,i)=>i%32<16?attacker:defender));
 w.cannons=[{id:1,cell:1498,account:account(attacker),heading:0},{id:2,cell:1510,account:account(defender),heading:0}];
 w.balls=[{id:1,owner:attacker,cell:1499,x0:511488n,y0:1536n,vx:32000,vy:0,den:1n},{id:2,owner:defender,cell:1510,x0:522752n,y0:1536n,vx:0,vy:32000,den:1n}];
 w.next_cannon_id=3;w.next_ball_id=3;w.credits=[1,2].map(id=>({account:account(id),units:[0n,1n]}));
 Object.assign(w.playability,{next_player_id:3,next_territory_id:3,players:[1,2].map(id=>({id,account:account(id)})),territories:[...new Set([attacker,defender])].sort().map(id=>({id,player:id})),lifecycle:[{cannon:1,player:attacker,generation:1},{cannon:2,player:defender,generation:1}]});
 if(face==='E'){
  w.ownership=scaledOwnership(Array.from({length:1024},(_,i)=>i%32<16?defender:attacker));
  const mirror=cell=>Math.floor(cell/1000)*1000+999-cell%1000;
  for(const c of w.cannons)c.cell=mirror(c.cell);
  for(const b of w.balls){b.cell=mirror(b.cell);b.x0=1024000n-b.x0;b.vx=b.vx?-b.vx:0;}
 }else if(face!=='W')throw Error('interaction face');
 return validateWorld(w);
}

/** Destruction demonstration starts stable; only a later real enemy FIRE cuts it. */
export function delayedLossWorld(){const w=lossWorld();w.balls[1].vx=32000;w.balls[1].vy=0;return validateWorld(w);}

/** A later bridge attempt isolates two friendly balls without an anchor.
 * The existing atomic pairing must cancel the transfer and preserve the survivor. */
export function cancellationWorld(){
 const w=delayedLossWorld();w.cannons=w.cannons.filter(c=>c.id!==2);w.cannons.find(c=>c.id===3).cell=10115;w.playability.lifecycle=w.playability.lifecycle.filter(l=>l.cannon!==2);
 w.balls=[{id:1,owner:1,cell:117,x0:120320n,y0:512n,vx:1,vy:0,den:1n},{id:2,owner:1,cell:118,x0:121344n,y0:512n,vx:1,vy:0,den:1n},{id:3,owner:2,cell:10115,x0:118272n,y0:10752n,vx:1,vy:0,den:1n}];
 setOwner(w,1115,0);setOwner(w,10115,3);w.next_ball_id=4;return validateWorld(w);
}

/** Identical paid loss geometry translated across x=999/0, no new physics. */
export function seamLossWorld(){
 const w=lossWorld(),old=w.ownership.overrides,shift=c=>Math.floor(c/1000)*1000+(c%1000+885)%1000;w.ownership=scaledOwnership(Array(1024).fill(0));for(const r of old)for(let c=r.start;c<r.end;c++)setOwner(w,shift(c),r.owner);for(const c of w.cannons)c.cell=shift(c.cell);for(const b of w.balls){b.cell=shift(b.cell);b.x0=(b.x0-117760n+1024000n)%1024000n;}return validateWorld(w);
}

/** Real historical lifecycle activation rehearsal: no fabricated Root markers. */
export function expiryPredecessorWorld(){
 const cells=Array(128).fill(0);cells[50]=1;cells[51]=1;cells[52]=2;
 return validateWorld({version:3,width:16,height:8,cells,cannons:[{id:1,cell:50,account:ACCOUNT},{id:2,cell:52,account:'02'.repeat(32)}],balls:[{id:1,owner:1,cell:51,x0:3584n,y0:3584n,vx:1,vy:0},{id:2,owner:2,cell:52,x0:4608n,y0:3584n,vx:0,vy:1}],time:[0n,1n],next_cannon_id:3,next_ball_id:3,pending:[],next_strike_id:1,received_e8s:0n,credits:[{account:ACCOUNT,units:[0n,1n]},{account:'02'.repeat(32),units:[0n,1n]}]});
}
