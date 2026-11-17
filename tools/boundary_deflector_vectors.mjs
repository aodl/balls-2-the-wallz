/** Generate new candidate vectors only. Never rewrites historical fixtures. */
import fs from'node:fs';import{B2zCursor}from'../packages/kernels/b2z/kernel.mjs';
import{DEFLECTOR_IDENTITY,encodeWorld,decodeWorld}from'../packages/kernels/b2z/world.mjs';
import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{successorWorld,ACCOUNT,enemyWorld,capacityWorld,diamondWorld,steepWorld,lossWorld,interactionWorld,delayedLossWorld,cancellationWorld,seamLossWorld}from'../tests/scenarios/boundary-deflector.mjs';
import{encodeDeflectorPayment}from'../packages/protocol/deflector.mjs';
const hex=b=>Buffer.from(b).toString('hex'),rows=[];
function row(name,world,commands,recover=false,rawInputs=null){
 const initial=encodeWorld(world),inputs=rawInputs??commands.map((c,i)=>({position:BigInt(i),payload_hex:hex(encodeDeflectorPayment(c.account??ACCOUNT,c.amount??10000000n,c.command,c.cry??''))}));
 const context={...DEFLECTOR_IDENTITY,logical_start:world.time[0]/world.time[1],logical_end:world.time[0]/world.time[1]+1n};let cursor=new B2zCursor(initial,inputs,context),steps=0;
 while(!cursor.step(recover?1:17).complete){if(++steps>100000)throw Error('unbounded work');if(recover){const b=cursor.snapshot();cursor=B2zCursor.restore(b,sha256(b));}}
 const observed=world.playability.elapsed_ns+1n;cursor.finalizeElapsed(observed);const outputs=Object.fromEntries(Object.entries(cursor.result()).map(([k,b])=>[k,{hex:hex(b),sha256:sha256(b)}]));
 rows.push({name,initial_hex:hex(initial),inputs_hex:hex(encodeCanonical(inputs)),context_hex:hex(encodeCanonical(context)),observed_ns:String(observed),recover_each_work_unit:recover,outputs});
}
for(const attacker of[1,2])for(const defender of[1,2])for(const face of['W','E'])for(const orientation of['NE','SE','SW','NW'])row(`ownership-${attacker}-${defender}-${face}-${orientation}`,interactionWorld(attacker,defender,face),[{account:defender.toString(16).padStart(2,'0').repeat(32),command:{kind:'deflect',cell:face==='W'?1503:1496,orientation}}]);
const poses={W:{cell:1002,heading:0},N:{cell:2001,heading:16384},E:{cell:1000,heading:32768},S:{cell:1,heading:49152}};
for(const orientation of['NE','SE','SW','NW'])for(const[face,p]of Object.entries(poses))for(const delta of[-4096,0,4096])row(`${orientation}-${face}-${delta}`,successorWorld((p.heading+delta+65536)%65536),[{command:{kind:'deflect',cell:p.cell,orientation}}]);
for(const orientation of['NE','SE','SW','NW'])row('near-parallel-cannon-reflection-'+orientation,steepWorld(),[{command:{kind:'deflect',cell:1002,orientation}}]);
row('corridor-with-recovery',successorWorld(),[1002,3000].map(cell=>({command:{kind:'deflect',cell,orientation:'NE'}})),true);
row('blocked-vertex',successorWorld(8192),[{command:{kind:'deflect',cell:2002,orientation:'NE'}}]);
row('toroidal-blocked-vertex',successorWorld(40960,0),[{command:{kind:'deflect',cell:999999,orientation:'NE'}}]);
row('toroidal-contact',successorWorld(32768,0),[{command:{kind:'deflect',cell:999,orientation:'NE'}}]);
for(const[reason,options,cell]of[['underfunded',{amount:9999999n},1002],['wrong-account',{account:'02'.repeat(32)},1002],['occupied',{},4004]])row(reason,successorWorld(),[{...options,command:{kind:'deflect',cell,orientation:'SE'}}]);
row('war-cry-preserved',successorWorld(),[{command:{kind:'deflect',cell:1002,orientation:'NE'}},{command:{kind:'fire',cannon:1,angle:0,quantity:1},cry:'é😀'}],true);
row('paid-structure-occupancy-and-first-entry',successorWorld(),[{command:{kind:'deflect',cell:4005,orientation:'NE'}},{amount:1000000000n,command:{kind:'move_cannon',cannon:1,cell:4005}},{amount:1000000000n,command:{kind:'new',angle:0,quantity:1,cell:4005}},{command:{kind:'deflect',cell:1001,orientation:'NE'}},{command:{kind:'deflect',cell:4004,orientation:'NE'}},{account:'02'.repeat(32),amount:1000000000n,command:{kind:'new',angle:0,quantity:1,cell:null}}],true);
row('ordinary-bare-fire',successorWorld(),[{command:{kind:'fire',cannon:1,angle:0,quantity:1}}]);
row('immutable-four-direction-diamond',diamondWorld(),[],true);
row('nearby-deflector-rejection',successorWorld(),[1002,2001].map(cell=>({command:{kind:'deflect',cell,orientation:'NE'}})));
for(const candidate of[0,300300])for(const diagonal of[false,true])for(let d=0;d<=5;d++){
 const x=candidate%1000,y=Math.floor(candidate/1000),enemy=((y+1000-(diagonal?d:0))%1000)*1000+(x+1000-d)%1000;
 row(`clearance-${candidate}-${diagonal?'diagonal':'cardinal'}-${d}`,enemyWorld(enemy),[{command:{kind:'deflect',cell:candidate,orientation:'SE'}}]);
}
row('clearance-rejects-deflect-move-and-annotated-new',enemyWorld(4008),[{command:{kind:'deflect',cell:4005,orientation:'NW'}},{command:{kind:'move_cannon',cannon:1,cell:4005}},{amount:1000000000n,command:{kind:'new',angle:0,quantity:1,cell:4005},cry:'Unsafe!'}],true);
row('same-batch-structure-occupancy',successorWorld(),[0,1].map(()=>({command:{kind:'deflect',cell:300300,orientation:'SW'}})));
const capacity=successorWorld();capacity.deflectors=Array.from({length:16},(_,i)=>({id:i+1,owner:1,cell:300300+2*i,orientation:'NE'}));capacity.next_deflector_id=17;
row('player-capacity-retained-payment',capacity,[{command:{kind:'deflect',cell:300340,orientation:'NE'}}]);
row('global-capacity-64-balls-256-structures',capacityWorld(),[{command:{kind:'deflect',cell:300031,orientation:'NE'}}]);
for(const [name,a,b]of[['x',0,999],['y',0,999000],['corner',0,999999],['allowed',0,998998]]){
 const w=successorWorld(0,500500);w.deflectors=[{id:1,owner:1,cell:a,orientation:'NE'}];w.next_deflector_id=2;row('spacing-seam-'+name,w,[{command:{kind:'deflect',cell:b,orientation:'SW'}}]);
}
const tangent=successorWorld(0);tangent.balls[0].y0=1024n;tangent.deflectors=[{id:1,owner:1,cell:1,orientation:'NE'}];tangent.next_deflector_id=2;row('tangent-no-entry',tangent,[]);
const combined=JSON.parse(fs.readFileSync('tests/fixtures/combined-v11.json'));
for(const old of combined.rows.filter(r=>r.name.startsWith('annotation/'))){
 const w=decodeWorld(Buffer.from(old.initial_hex,'hex'));const migrated=(await import('../packages/kernels/b2z/deflectors-v12.mjs')).migrateDeflectorWorld(w);
 const inputs=decodeCanonical(Buffer.from(old.inputs_hex,'hex')).map(i=>{const p=Buffer.from(i.payload_hex,'hex');if(p.subarray(0,8).toString()!=='BTZPAY03')throw Error('expected historical03');p[7]=52;return{...i,payload_hex:p.toString('hex')};});
 row('successor-retains-'+old.name,migrated,[],false,inputs);
}
const captures=JSON.parse(fs.readFileSync('tests/fixtures/rules-v6.json'));
for(const name of['bridge_left','wall_pair','mutual']){
 const old=captures.cases[name],w=(await import('../packages/kernels/b2z/deflectors-v12.mjs')).migrateDeflectorWorld(decodeWorld(Buffer.from(old.state_hex,'hex')));
 if(name==='bridge_left'){w.deflectors=[{id:1,owner:1,cell:104,orientation:'NE'}];w.next_deflector_id=2;}
 row('successor-topology-'+name,w,[],true);
}
row('paid-cancellation-before-future-bridge',cancellationWorld(),[119,103].map((cell,i)=>({command:{kind:'deflect',cell,orientation:i?'SE':'NW'}})));
let cancellation=decodeWorld(Buffer.from(rows.find(r=>r.name==='paid-cancellation-before-future-bridge').outputs.state.hex,'hex'));let cancelled=false;
for(let step=1;step<=9&&!cancelled;step++){
 row('future-bridge-cancellation-step-'+step,cancellation,step===1?[{account:'02'.repeat(32),amount:1000000000n,command:{kind:'fire',cannon:3,angle:49152,quantity:1},cry:'Hold!'}]:[],true);
 const last=rows.at(-1);cancelled=decodeCanonical(Buffer.from(last.outputs.events.hex,'hex')).events.some(e=>e.cancelled_capture);cancellation=decodeWorld(Buffer.from(last.outputs.state.hex,'hex'));
}
if(!cancelled||cancellation.deflectors.length!==2||!cancellation.balls.some(b=>b.id===2)||cancellation.balls.some(b=>b.id===1))throw Error('real bridge cancellation or surviving Deflector invariant');
row('paid-stable-before-future-bridge-loss',delayedLossWorld(),[119,103].map((cell,i)=>({command:{kind:'deflect',cell,orientation:i?'SE':'NW'}})));
row('paid-safe-then-toroidal-bridge-loss',seamLossWorld(),[{command:{kind:'deflect',cell:4,orientation:'NW'}}],true);
row('paid-safe-then-genuine-bridge-loss',lossWorld(),[{command:{kind:'deflect',cell:119,orientation:'NW'}}],true);
const revived=JSON.parse(fs.readFileSync('tests/fixtures/boundary-deflector-topology-v12.json'));row('revival-does-not-restore-destroyed-deflector',decodeWorld(Buffer.from(revived.cases.left.state_hex,'hex')),[{amount:1000000000n,command:{kind:'fire',cannon:2,angle:0,quantity:1},cry:'Return!'}],true);
const cryA=rows.find(r=>r.name==='successor-retains-annotation/fire'),cryB=rows.find(r=>r.name==='successor-retains-annotation/fire-alt');if(cryA.outputs.state.sha256!==cryB.outputs.state.sha256)throw Error('cosmetic War Cry changed gameplay');
const result={scope:'New provisional Rules12 public-output vectors. Python Fraction oracle independently covers contact algebra. Not installed qualification.',identity:DEFLECTOR_IDENTITY,rows};
const text=JSON.stringify(result,null,2)+'\n';if(process.argv.includes('--check')){if(fs.readFileSync(process.argv[2],'utf8')!==text)throw Error('Stale new Deflector vectors');}else fs.writeFileSync(process.argv[2],text);console.log('PASS',process.argv.includes('--check')?'checked':'generated',rows.length,'new vectors; no historical fixtures changed');
