#!/usr/bin/env node
/** Offline asset build only. Never creates, installs, funds or publishes canisters. */
import {parseArgs} from 'node:util';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {TEST_CONFIG} from '../packages/kernels/btz/world.mjs';
import {mainnetPolicy} from '../apps/btz-observer/mainnet.mjs';
const {values}=parseArgs({options:{canister:{type:'string'},'local-test-config':{type:'string'},output:{type:'string',default:'.work/s14/assets'}}});
const test=Boolean(values['local-test-config']);
if(test&&values.canister)throw new Error('local test configuration and mainnet canister are exclusive');
const policy=test?(await import('./fixtures/s14-local-deployment.mjs')).deploymentPolicy(JSON.parse(await readFile(values['local-test-config'],'utf8'))):mainnetPolicy({network:'ic',host:'https://icp-api.io',canister_id:values.canister});
if(!Buffer.from(await readFile('apps/btz-observer/configuration.bin')).equals(Buffer.from(encodeCanonical(TEST_CONFIG))))throw new Error('configuration asset differs from current kernel');
const out=resolve(values.output);await mkdir(out,{recursive:true});
const deployment=JSON.stringify(policy);
const moduleSource=test?`export default ${deployment}; export {deploymentPolicy,deploymentConnection,deploymentSource} from '${resolve('tools/fixtures/s14-local-deployment.mjs')}';`:(await readFile('apps/btz-observer/deployment.mjs','utf8')).replace('export default null;',`export default ${deployment};`);
const built=await build({metafile:true,entryPoints:['apps/btz-observer/app.mjs'],bundle:true,format:'esm',platform:'browser',outfile:out+'/app.mjs',
 plugins:[{name:'trusted-deployment',setup(b){b.onLoad({filter:/\/btz-observer\/deployment\.mjs$/},()=>({contents:moduleSource,loader:'js',resolveDir:resolve('apps/btz-observer')}));}}]});
for(const file of ['style.css','icon.svg','configuration.bin'])await cp('apps/btz-observer/'+file,out+'/'+file);
const html=(await readFile('apps/btz-observer/index.html','utf8')).replace("connect-src 'self'","connect-src 'self' https://icp-api.io");
await writeFile(out+'/index.html',html);await writeFile(out+'/deployment.json',deployment+'\n');
if(!test&&Object.keys(built.metafile.inputs).some(p=>p.includes('s14-local-deployment')))throw new Error('test adapter leaked into production');
await writeFile(out+'/build-manifest.json',JSON.stringify({local_test_only:test,inputs:Object.keys(built.metafile.inputs),configuration:'configuration.bin'},null,2)+'\n');
console.log(`Built observer for ${policy.canister_id}: ${out}`);

await writeFile(out+'/.ic-assets.json5',JSON.stringify([{match:'**/*',headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'",'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}}],null,2)+'\n');
