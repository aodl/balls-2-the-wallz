#!/usr/bin/env node
import {transform} from 'esbuild';
import {extendAudioAssets} from './audio_assets.mjs';
/** Extend the frozen observer builder with v6 configuration, public docs and approved optional audio.
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
const {values}=parseArgs({options:{canister:{type:'string'},'local-test-config':{type:'string'},output:{type:'string',default:'.work/s14/assets'}}}),out=resolve(values.output);
try{await access(out);throw Error('Use a new output directory; existing artifacts are preserved');}catch(e){if(e.code!=='ENOENT')throw e;}
const builder=await readFile('tools/build_observer_mainnet.mjs');
if(sha(builder)!=='915e0e0ca6ff6c31a6252832e1dbc03fcab21a3f1763689ec1d5f40c9b610d38')throw Error('Frozen base observer builder changed');
const config=await readFile('apps/b2z-observer/configuration-playability.bin');
if(sha(config)!==PLAYABILITY_IDENTITY.config_hash||CONFIGURATION_ASSETS[sha(config)]!=='configuration-playability.bin')throw Error('v6 configuration binding');
execFileSync(process.execPath,['tools/build_observer_mainnet.mjs',...process.argv.slice(2)],{stdio:'inherit'});
for(const [source,name]of[['apps/b2z-observer/configuration-playability.bin','configuration-playability.bin'],['apps/b2z-observer/configuration-entry.bin','configuration-entry.bin'],['apps/b2z-observer/configuration-clearance.bin','configuration-clearance.bin'],['apps/b2z-observer/configuration-war-cry.bin','configuration-war-cry.bin'],['apps/b2z-observer/configuration-combined.bin','configuration-combined.bin'],['apps/b2z-observer/configuration-deflector.bin','configuration-deflector.bin'],['apps/b2z-observer/configuration-context.bin','configuration-context.bin'],['apps/b2z-observer/configuration-shout.bin','configuration-shout.bin'],['apps/b2z-observer/configuration-spacing.bin','configuration-spacing.bin'],['apps/b2z-observer/configuration-reservoir.bin','configuration-reservoir.bin'],['apps/b2z-observer/configuration-economy.bin','configuration-economy.bin'],['apps/b2z-observer/configuration-delegated.bin','configuration-delegated.bin'],['apps/b2z-observer/configuration-compact-reservoir.bin','configuration-compact-reservoir.bin'],['docs/operations/B2Z_AGENT_API.md','agent-api.md'],['canisters/runtime-lab/runtime-lab.did','backend.did']])await copyFile(source,out+'/'+name);
await mkdir(out+'/cursors',{recursive:true});await copyFile('apps/b2z-observer/cursors/reticle.svg',out+'/cursors/reticle.svg');
const manifest=JSON.parse(await readFile(out+'/build-manifest.json','utf8'));
if(!values['local-test-config']){
 const path=out+'/app.mjs',source=await readFile(path,'utf8');
 const {code}=await transform(source,{minify:true,format:'esm',legalComments:'eof'});
 const bytes=Buffer.from(code);await writeFile(path,bytes);
 manifest.files['app.mjs']={sha256:sha(bytes),bytes:bytes.length};
}
for(const name of ['cursors/reticle.svg','configuration-playability.bin','configuration-entry.bin','configuration-clearance.bin','configuration-war-cry.bin','configuration-combined.bin','configuration-deflector.bin','configuration-context.bin','configuration-shout.bin','configuration-spacing.bin','configuration-reservoir.bin','configuration-economy.bin','configuration-delegated.bin','configuration-compact-reservoir.bin','agent-api.md','backend.did']){const bytes=await readFile(out+'/'+name);manifest.files[name]={sha256:sha(bytes),bytes:bytes.length};}
manifest.supported_configuration_assets=CONFIGURATION_ASSETS;manifest.base_builder_sha256=sha(builder);manifest.playability_wrapper_sha256=sha(await readFile(new URL(import.meta.url)));manifest.mcp_service_discovery='INACTIVE; no architecture manifest or terms opt-in';
// The historical base builder remains byte-pinned for delivery qualification.
const branding={
 'balls-to-the-wallz-b2z-wordmark.svg':'0e5090613b73948228b406845244f7eb0d42df9a3ed0a2fc6fb2b5398066296b',
 'balls-to-the-wallz-b2-icon-matched.svg':'42bd1317cbf53a0566b24e8ef477d0de759aeaae914b27fa3718e9829a87d872',
 'favicon.ico':'e34ccbadc26ea0c6745d275041daea741ebc9fbba1899d59ae14e54fcffccceb',
 '404.html':null,
 'not-found.css':null,
};
for(const [name,expected] of Object.entries(branding)){
 const source='apps/b2z-observer/'+name,bytes=await readFile(source),digest=sha(bytes);
 if(expected!==null&&digest!==expected)throw Error('Official branding asset changed: '+name);
 await copyFile(source,out+'/'+name);
 manifest.files[name]={sha256:digest,bytes:bytes.length};
}
await extendAudioAssets(out,manifest);
await writeFile(out+'/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
