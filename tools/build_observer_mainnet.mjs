#!/usr/bin/env node
/** Offline asset build only. Never creates, installs, funds or publishes canisters. */
import {parseArgs} from 'node:util';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {mainnetPolicy} from '../apps/btz-observer/mainnet.mjs';
const {values}=parseArgs({options:{canister:{type:'string'},output:{type:'string',default:'.work/s14/assets'}}});
const policy=mainnetPolicy({network:'ic',host:'https://icp-api.io',canister_id:values.canister});
const out=resolve(values.output);await mkdir(out,{recursive:true});
const deployment=JSON.stringify(policy);
await build({entryPoints:['apps/btz-observer/app.mjs'],bundle:true,format:'esm',platform:'browser',outfile:out+'/app.mjs',
 plugins:[{name:'trusted-deployment',setup(b){b.onLoad({filter:/\/btz-observer\/deployment\.mjs$/},()=>({contents:`export default ${deployment};`,loader:'js'}));}}]});
for(const file of ['style.css','icon.svg'])await cp('apps/btz-observer/'+file,out+'/'+file);
const html=(await readFile('apps/btz-observer/index.html','utf8')).replace("connect-src 'self'","connect-src 'self' https://icp-api.io");
await writeFile(out+'/index.html',html);await writeFile(out+'/deployment.json',deployment+'\n');
console.log(`Built observer for ${policy.canister_id}: ${out}`);
