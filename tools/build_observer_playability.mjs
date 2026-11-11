#!/usr/bin/env node
/** Extend the frozen observer builder with v6 configuration and public docs only.
 * Offline asset preparation; no runner, identity, deployment or MCP opt-in. */
import {parseArgs} from 'node:util';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CONFIGURATION_ASSETS} from '../apps/b2z-observer/configuration.generated.mjs';
import {PLAYABILITY_IDENTITY} from '../apps/b2z-observer/torus-identity.generated.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const {values}=parseArgs({options:{canister:{type:'string'},'local-test-config':{type:'string'},'delegated-payments':{type:'boolean',default:false},output:{type:'string',default:'.work/s14/assets'}}}),out=resolve(values.output);
try{await access(out);throw Error('Use a new output directory; existing artifacts are preserved');}catch(e){if(e.code!=='ENOENT')throw e;}
const builder=await readFile('tools/build_observer_mainnet.mjs');
if(sha(builder)!=='206b56efb012878cadb66b29f80dab27a0f3326387f876224ff7651503857b68')throw Error('Frozen base observer builder changed');
const config=await readFile('apps/b2z-observer/configuration-playability.bin');
if(sha(config)!==PLAYABILITY_IDENTITY.config_hash||CONFIGURATION_ASSETS[sha(config)]!=='configuration-playability.bin')throw Error('v6 configuration binding');
execFileSync(process.execPath,['tools/build_observer_mainnet.mjs',...process.argv.slice(2)],{stdio:'inherit'});
for(const [source,name]of[['apps/b2z-observer/configuration-playability.bin','configuration-playability.bin'],['apps/b2z-observer/configuration-entry.bin','configuration-entry.bin'],['apps/b2z-observer/configuration-delegation.bin','configuration-delegation.bin'],['docs/operations/B2Z_AGENT_API.md','agent-api.md'],[values['delegated-payments']?'canisters/runtime-lab/runtime-lab-delegated-payments.did':'canisters/runtime-lab/runtime-lab.did','backend.did']])await copyFile(source,out+'/'+name);
await mkdir(out+'/cursors',{recursive:true});await copyFile('apps/b2z-observer/cursors/reticle.svg',out+'/cursors/reticle.svg');
const manifest=JSON.parse(await readFile(out+'/build-manifest.json','utf8'));
for(const name of ['cursors/reticle.svg','configuration-playability.bin','configuration-entry.bin','configuration-delegation.bin','agent-api.md','backend.did']){const bytes=await readFile(out+'/'+name);manifest.files[name]={sha256:sha(bytes),bytes:bytes.length};}
manifest.delegated_payments_enabled=values['delegated-payments'];manifest.supported_configuration_assets=CONFIGURATION_ASSETS;manifest.base_builder_sha256=sha(builder);manifest.playability_wrapper_sha256=sha(await readFile(new URL(import.meta.url)));manifest.mcp_service_discovery='INACTIVE; no architecture manifest or terms opt-in';
await writeFile(out+'/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
