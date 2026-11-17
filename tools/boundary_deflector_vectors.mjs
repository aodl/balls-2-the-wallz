/** Generate new candidate vectors only. Never rewrites historical fixtures. */
import fs from'node:fs';import{B2zCursor}from'../packages/kernels/b2z/kernel.mjs';
import{DEFLECTOR_IDENTITY,encodeWorld}from'../packages/kernels/b2z/world.mjs';
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{successorWorld,ACCOUNT,enemyWorld,capacityWorld}from'../tests/scenarios/boundary-deflector.mjs';
import{encodeDeflectorPayment}from'../packages/protocol/deflector.mjs';
const hex=b=>Buffer.from(b).toString('hex'),rows=[];
function row(name,world,commands,recover=false){
 const initial=encodeWorld(world),inputs=commands.map((c,i)=>({position:BigInt(i),payload_hex:hex(encodeDeflectorPayment(c.account??ACCOUNT,c.amount??10000000n,c.command,c.cry??''))}));
 const context={...DEFLECTOR_IDENTITY,logical_start:0n,logical_end:1n};let cursor=new B2zCursor(initial,inputs,context),steps=0;
 while(!cursor.step(recover?1:17).complete){if(++steps>100000)throw Error('unbounded work');if(recover){const b=cursor.snapshot();cursor=B2zCursor.restore(b,sha256(b));}}
 cursor.finalizeElapsed(1n);const outputs=Object.fromEntries(Object.entries(cursor.result()).map(([k,b])=>[k,{hex:hex(b),sha256:sha256(b)}]));
 rows.push({name,initial_hex:hex(initial),inputs_hex:hex(encodeCanonical(inputs)),context_hex:hex(encodeCanonical(context)),observed_ns:'1',recover_each_work_unit:recover,outputs});
}
const poses={W:{cell:1002,heading:0},N:{cell:2001,heading:16384},E:{cell:1000,heading:32768},S:{cell:1,heading:49152}};
for(const orientation of['NE','SE','SW','NW'])for(const[face,p]of Object.entries(poses))for(const delta of[-4096,0,4096])row(`${orientation}-${face}-${delta}`,successorWorld((p.heading+delta+65536)%65536),[{command:{kind:'deflect',cell:p.cell,orientation}}]);
row('corridor-with-recovery',successorWorld(),[1002,2001].map(cell=>({command:{kind:'deflect',cell,orientation:'NE'}})),true);
row('blocked-vertex',successorWorld(8192),[{command:{kind:'deflect',cell:2002,orientation:'NE'}}]);
row('toroidal-contact',successorWorld(32768,0),[{command:{kind:'deflect',cell:999,orientation:'NE'}}]);
for(const[reason,options,cell]of[['underfunded',{amount:9999999n},1002],['wrong-account',{account:'02'.repeat(32)},1002],['occupied',{},4004]])row(reason,successorWorld(),[{...options,command:{kind:'deflect',cell,orientation:'SE'}}]);
row('war-cry-preserved',successorWorld(),[{command:{kind:'deflect',cell:1002,orientation:'NE'}},{command:{kind:'fire',cannon:1,angle:0,quantity:1},cry:'é😀'}],true);
row('ordinary-bare-fire',successorWorld(),[{command:{kind:'fire',cannon:1,angle:0,quantity:1}}]);
for(const candidate of[0,300300])for(const diagonal of[false,true])for(let d=0;d<=5;d++){
 const x=candidate%1000,y=Math.floor(candidate/1000),enemy=((y+1000-(diagonal?d:0))%1000)*1000+(x+1000-d)%1000;
 row(`clearance-${candidate}-${diagonal?'diagonal':'cardinal'}-${d}`,enemyWorld(enemy),[{command:{kind:'deflect',cell:candidate,orientation:'SE'}}]);
}
row('clearance-rejects-deflect-move-and-annotated-new',enemyWorld(4008),[{command:{kind:'deflect',cell:4005,orientation:'NW'}},{command:{kind:'move_cannon',cannon:1,cell:4005}},{amount:1000000000n,command:{kind:'new',angle:0,quantity:1,cell:4005},cry:'Unsafe!'}],true);
row('same-batch-structure-occupancy',successorWorld(),[0,1].map(()=>({command:{kind:'deflect',cell:300300,orientation:'SW'}})));
const capacity=successorWorld();capacity.deflectors=Array.from({length:16},(_,i)=>({id:i+1,owner:1,cell:300300+i,orientation:'NE'}));capacity.next_deflector_id=17;
row('player-capacity-retained-payment',capacity,[{command:{kind:'deflect',cell:300320,orientation:'NE'}}]);
row('global-capacity-64-balls-256-structures',capacityWorld(),[{command:{kind:'deflect',cell:300031,orientation:'NE'}}]);
const result={scope:'New provisional Rules12 public-output vectors. Python Fraction oracle independently covers contact algebra. Not installed qualification.',identity:DEFLECTOR_IDENTITY,rows};
const text=JSON.stringify(result,null,2)+'\n';if(process.argv.includes('--check')){if(fs.readFileSync(process.argv[2],'utf8')!==text)throw Error('Stale new Deflector vectors');}else fs.writeFileSync(process.argv[2],text);console.log('PASS',process.argv.includes('--check')?'checked':'generated',rows.length,'new vectors; no historical fixtures changed');
