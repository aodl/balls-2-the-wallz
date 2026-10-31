#!/usr/bin/env node
/** Extend the frozen observer builder with v6 configuration and public docs only.
 * Offline asset preparation; no runner, identity, deployment or MCP opt-in. */
import {parseArgs} from 'node:util';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CONFIGURATION_ASSETS} from '../apps/b2z-observer/configuration.generated.mjs';
import {PLAYABILITY_IDENTITY} from '../apps/b2z-observer/torus-identity.generated.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const {values}=parseArgs({options:{canister:{type:'string'},'local-test-config':{type:'string'},output:{type:'string',default:'.work/s14/assets'}}}),out=resolve(values.output);
try{await access(out);throw Error('Use a new output directory; existing artifacts are preserved');}catch(e){if(e.code!=='ENOENT')throw e;}
const builder=await readFile('tools/build_observer_mainnet.mjs');
if(sha(builder)!=='915e0e0ca6ff6c31a6252832e1dbc03fcab21a3f1763689ec1d5f40c9b610d38')throw Error('Frozen base observer builder changed');
const config=await readFile('apps/b2z-observer/configuration-playability.bin');
if(sha(config)!==PLAYABILITY_IDENTITY.config_hash||CONFIGURATION_ASSETS[sha(config)]!=='configuration-playability.bin')throw Error('v6 configuration binding');
execFileSync(process.execPath,['tools/build_observer_mainnet.mjs',...process.argv.slice(2)],{stdio:'inherit'});
for(const [source,name]of[['apps/b2z-observer/configuration-playability.bin','configuration-playability.bin'],['docs/operations/B2Z_AGENT_API.md','agent-api.md'],['canisters/runtime-lab/runtime-lab.did','backend.did']])await copyFile(source,out+'/'+name);
const manifest=JSON.parse(await readFile(out+'/build-manifest.json','utf8'));
for(const name of ['configuration-playability.bin','agent-api.md','backend.did']){const bytes=await readFile(out+'/'+name);manifest.files[name]={sha256:sha(bytes),bytes:bytes.length};}
manifest.supported_configuration_assets=CONFIGURATION_ASSETS;manifest.base_builder_sha256=sha(builder);manifest.playability_wrapper_sha256=sha(await readFile(new URL(import.meta.url)));manifest.mcp_service_discovery='INACTIVE; no architecture manifest or terms opt-in';
await writeFile(out+'/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
