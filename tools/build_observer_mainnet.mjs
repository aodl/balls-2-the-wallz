#!/usr/bin/env node
/** Offline asset build only. Never creates, installs, funds or publishes canisters. */
import {parseArgs} from 'node:util';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {TEST_CONFIG} from '../packages/kernels/btz/world.mjs';
import {mainnetPolicy} from '../apps/btz-observer/mainnet.mjs';
const {values}=parseArgs({options:{canister:{type:'string'},output:{type:'string',default:'.work/s14/assets'}}});
const policy=mainnetPolicy({network:'ic',host:'https://icp-api.io',canister_id:values.canister});
if(!Buffer.from(await readFile('apps/btz-observer/configuration.bin')).equals(Buffer.from(encodeCanonical(TEST_CONFIG))))throw new Error('configuration asset differs from current kernel');
const out=resolve(values.output);await mkdir(out,{recursive:true});
const deployment=JSON.stringify(policy);
await build({entryPoints:['apps/btz-observer/app.mjs'],bundle:true,format:'esm',platform:'browser',outfile:out+'/app.mjs',
 plugins:[{name:'trusted-deployment',setup(b){b.onLoad({filter:/\/btz-observer\/deployment\.mjs$/},()=>({contents:`export default ${deployment};`,loader:'js'}));}}]});
for(const file of ['style.css','icon.svg','configuration.bin'])await cp('apps/btz-observer/'+file,out+'/'+file);
const html=(await readFile('apps/btz-observer/index.html','utf8')).replace("connect-src 'self'","connect-src 'self' https://icp-api.io");
await writeFile(out+'/index.html',html);await writeFile(out+'/deployment.json',deployment+'\n');
console.log(`Built observer for ${policy.canister_id}: ${out}`);

await writeFile(out+'/.ic-assets.json5',JSON.stringify([{match:'**/*',headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'",'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}}],null,2)+'\n');
