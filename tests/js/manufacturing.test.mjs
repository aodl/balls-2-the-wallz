import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constructionPresentation,preparedConstruction,signedConstruction} from '../../apps/b2z-observer/manufacturing.mjs';
import {createManufacturingLayer} from '../../apps/b2z-observer/manufacturing-render.mjs';
import {structureGeometry} from '../../apps/b2z-observer/structure-geometry.mjs';
import {DEFLECTOR_HEADINGS} from '../../packages/protocol/deflector-orientation.generated.mjs';
import {SCREEN_ORIENTATIONS} from '../../packages/protocol/context-structures.mjs';
import * as T from 'three';

const now=Date.UTC(2026,10,26);
const backend='backend',account='payer';
const manual=(memo,id='a')=>({id,memo,state:'copied',action:memo.startsWith('DEFLECT')?'deflect':'start',backend,account,prepared_at:now});
const journal=(memo,state='Ledger confirmed')=>({id:'b',memo:Buffer.from(memo).toString('hex'),backend,state,created_at_time:String(BigInt(now)*1000000n)});
const world=()=>({cannons:new Map(),deflectors:new Map()});

test('only a deliberate explicit construction handoff seeds a local plan',()=>{
 const row=Object.freeze(manual('NEW 0 1 0'));
 assert.deepEqual(preparedConstruction(row),{kind:'cannon',cell:0,heading:0,key:'manual/a',account,backend,at:now,label:'Construction planned in wallet instructions',targetId:null});
 for(const row of [manual('NEW 0 1'),manual('FIRE 1 0 1'),manual('RESERVOIR 0'),{...manual('NEW 0 1 0'),state:'draft'}])
  assert.equal(preparedConstruction(row),null);
 for(const [direction,orientation] of Object.entries(SCREEN_ORIENTATIONS))
  assert.equal(preparedConstruction(manual('DEFLECT 999999 '+direction)).heading,DEFLECTOR_HEADINGS[orientation]);
});

test('signed states never equate submission or a Ledger confirmation with birth',()=>{
 for(const state of ['Submitting','Outcome unknown','Ledger confirmed']){
  const plan=signedConstruction(journal('NEW 0 1 0',state),account);
  assert.equal(plan.targetId,null);
 }
 assert.equal(signedConstruction(journal('NEW 0 1 0','Ledger rejected'),account),null);
 assert.equal(signedConstruction(journal('NEW 0 1 0','Game outcome verified'),account),null);
 assert.equal(signedConstruction(journal('NEW 0 1 0'),account,{status:'rejected'}),null);
 const receipt={status:'applied',kind:'deflector_built',structure:{id:7,cell:999999,orientation:SCREEN_ORIENTATIONS.N}};
 assert.equal(signedConstruction(journal('DEFLECT 999999 N'),account,receipt).targetId,7);
 assert.equal(signedConstruction(journal('DEFLECT 999999 E'),account,receipt),null);
});

test('plans are bounded by payer, backend, cell, expiry and verified displayed arrival',()=>{
 const p=constructionPresentation(),v=world(),first=manual('NEW 0 1 0');
 p.manual([first,manual('DEFLECT 1 N','c'),manual('NEW 0 1 2','d')]);
 p.signed([signedConstruction(journal('NEW 0 1 0'),account,{status:'applied',kind:'purchase_completed',new_cannon:true,cannon:8})]);
 assert.deepEqual(p.sites(v,account,backend,now).map(s=>s.key),['signed/b','manual/c']);
 assert.deepEqual(p.sites(v,'enemy',backend,now),[]);
 assert.deepEqual(p.sites(v,account,'other backend',now),[]);
 v.cannons.set(8,{id:8,cell:0});
 assert.deepEqual(p.sites(v,account,backend,now).map(s=>s.key),['manual/c','manual/d']);
 p.dismiss('manual/c');
 assert.deepEqual(p.sites(v,account,backend,now).map(s=>s.key),['manual/d']);
 assert.deepEqual(p.sites(v,account,backend,now+15*60000),[]);
 assert.deepEqual([...v.cannons.keys()],[8]);
});

test('manufacturing uses the finished base and upper meshes with canonical transforms',()=>{
 const scene=new T.Scene(),camera=new T.OrthographicCamera();
 const meshes=Object.fromEntries(['cannon','deflector'].map(kind=>[kind,structureGeometry(kind)]));
 const layer=createManufacturingLayer(scene,meshes);
 for(const kind of Object.keys(meshes)){
  layer.draw([{kind,x:999.5,y:.5,heading:8192,account:'0'.repeat(64)}],camera,48,1000,false);
  const root=scene.children[0];
  assert.deepEqual(root.position.toArray(),[999.5,0,.5]);
  const pieces=root.children.filter(mesh=>mesh.visible&&[meshes[kind].base,meshes[kind].upper].includes(mesh.geometry));
  assert.equal(pieces.length,2);
  assert.equal(pieces[0].rotation.y,0);
  assert.equal(pieces[1].rotation.y,-Math.PI/4);
  const moving=root.children.at(-2).position.clone();
  layer.draw([{kind,x:999.5,y:.5,heading:8192,account:'0'.repeat(64)}],camera,48,1950,false);
  assert.equal(root.children.at(-2).position.equals(moving),false);
  layer.draw([{kind,x:999.5,y:.5,heading:8192,account:'0'.repeat(64)}],camera,48,1950,true);
  const quiet=root.children.at(-2).position.clone();
  layer.draw([{kind,x:999.5,y:.5,heading:8192,account:'0'.repeat(64)}],camera,48,4000,true);
  assert.equal(root.children.at(-2).position.equals(quiet),true);
 }
 layer.draw([],camera,48,5000,false);
 assert.equal(scene.children.every(root=>!root.visible),true);
 layer.dispose();
 assert.equal(scene.children.length,0);
});
