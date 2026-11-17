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
  for(let j=0;j<16;j++)w.deflectors.push({id:i*16+j+1,owner:id,cell:104000+x+j-8,orientation:['NE','SE','SW','NW'][j%4]});
 }
 w.deflectors.sort((a,b)=>a.cell-b.cell);w.next_deflector_id=257;w.next_ball_id=65;w.next_cannon_id=17;return validateWorld(w);
}
