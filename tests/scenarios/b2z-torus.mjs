import {fixtureWorld,TORUS_IDENTITY,encodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {encodePayment} from '../../packages/kernels/b2z/kernel.mjs';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
const account=n=>n.toString(16).padStart(2,'0').repeat(32);
export const ball=(id,owner,cell,vx=812,vy=623,dx=512,dy=512)=>({id,owner,cell,vx,vy,x0:BigInt(cell%32*1024+dx),y0:BigInt(Math.floor(cell/32)*1024+dy)});
export const world=(cells,cannons,balls)=>fixtureWorld({version:4,width:32,height:32,cells,cannons:cannons.map((cell,i)=>({id:i+1,cell,account:account(i+1)})),balls});
const pay=(n,amount,kind,value,position=0)=>({position:BigInt(position),payload_hex:hex(encodePayment(account(n),amount,{kind,value}))});
export function torusCases(){
 const full=()=>Array(1024).fill(1),duel=()=>Array.from({length:1024},(_,i)=>i%32<16?1:2);
 const cases=[];const add=(name,w,end=2n,inputs=[])=>cases.push({name,world:w,inputs,context:{...TORUS_IDENTITY,logical_start:0n,logical_end:end}});
 add('horizontal-right-seam',world(full(),[400],[ball(1,1,351,1024,0)]));
 add('horizontal-left-seam',world(full(),[400],[ball(1,1,320,-1024,0)]));
 add('vertical-down-seam',world(full(),[400],[ball(1,1,1002,0,1024)]));
 add('vertical-up-seam',world(full(),[400],[ball(1,1,10,0,-1024)]));
 const blocked=full();blocked[0]=2;add('simultaneous-corner-blocked-across-seam',world(blocked,[400,0],[ball(1,1,1023,724,724),ball(2,2,0,1,0)]));
 add('simultaneous-corner',world(full(),[400],[ball(1,1,1023,724,724)]));
 add('non-cardinal-multiple-seams',world(full(),[400],[ball(1,1,1023,812,623),ball(2,1,0,-623,-812)]),4n);
 add('seam-territory-strike-annihilation',world(duel(),[330,350],[ball(1,1,320,-1024,0),ball(2,2,351,1024,0)]));
 add('seam-territory-delayed-capture',world(duel(),[330,350],[ball(1,1,320,-1024,0),ball(2,2,350,0,1)]));
 add('accepted-heading-persists-through-reflection',world(full(),[400],[ball(1,1,399,1024,0)]),2n,[pay(1,10000000n,'angle',6827)]);
 add('rejected-shot-keeps-unknown-heading',world(full(),[400],[ball(1,1,399,1024,0)]),2n,[pay(1,1n,'angle',16384)]);
 add('torus-spawn-non-cardinal',world(Array(1024).fill(0),[],[]),2n,[pay(1,100000000n,'angle',6827),pay(2,100000000n,'angle',40960,1)]);
 const cut=Array(1024).fill(0);for(const n of[350,351,320,321])cut[n]=1;cut[318]=cut[319]=2;add('seam-severance-through-collision',world(cut,[321,318],[ball(1,1,320,0,1),ball(2,1,350,0,1),ball(3,2,319,0,1024)]));
 const ring=Array(1024).fill(0);for(let x=0;x<32;x++)ring[320+x]=1;ring[292]=ring[293]=2;add('capture-preserves-alternate-seam-connectivity',world(ring,[330,292],[ball(1,1,320,1,0),ball(2,2,293,0,1024)]));
 const stripe=Array(1024).fill(0);for(const n of [320,321,351,350])stripe[n]=1;
 add('narrow-connected-through-seam',world(stripe,[321],[ball(1,1,350,1024,0)]));
 return cases;
}
