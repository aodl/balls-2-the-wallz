#!/usr/bin/env node
/** Golden coordinator bytes are implementation-derived, not an independent source oracle. */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {coordinatorScenario} from '../tests/scenarios/coordinator.mjs';
import {encodeCanonical} from '../packages/runtime/canonical.mjs';
import {hex} from '../packages/protocol/bytes.mjs';
import {sha256} from '../packages/runtime/seal.mjs';
const dest=new URL('../tests/fixtures/coordinator-v5.json',import.meta.url);
export function vectors() {
  const rows=[];
  for(const name of ['life','admission','severance','near-impact','dense']){
    const {host,records,end}=coordinatorScenario(name),genesis=host.snapshot(),actions=[];
    const apply=action=>{host.apply(action);const b=host.snapshot();actions.push({action_hex:hex(encodeCanonical(action)),image_hex:hex(b),sha256:sha256(b)});};
    apply({kind:'ingest',start:0n,records,anchor:records.length?'ab'.repeat(32):'00'.repeat(32)});
    apply({kind:'seal',logical_end:end});apply({kind:'step',budget:1});apply({kind:'step',budget:7});
    while(host.status().phase==='running'){apply({kind:'step',budget:100000});if(actions.length>32)throw new Error('vector work bound');}
    apply({kind:'publish',manifest_hash:host.status().ready_hash});
    apply({kind:'publish',manifest_hash:host.status().manifest_hash});
    rows.push({name,game:name==='life'?'life':'btz',genesis_hex:hex(genesis),actions});
  }
  return {schema_version:5,provenance:'Implementation-derived JS coordinator regression bytes. Not an independent ledger or native execution oracle.',rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const value=JSON.stringify(vectors(),null,2)+'\n';
  if(process.argv[2]==='--write'){fs.writeFileSync(dest,value);console.log('Wrote explicit development fixtures.');}
  else if(process.argv[2]==='--check'){
    if(fs.readFileSync(dest,'utf8')!==value)throw new Error('coordinator fixtures changed; do not regenerate to hide a regression');
    console.log('PASS: five coordinator workloads match canonical operation, image and commitment fixtures.');
  }else throw new Error('usage: coordinator_vectors.mjs --check | --write');
}
