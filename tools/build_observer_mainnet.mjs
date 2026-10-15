#!/usr/bin/env node
/** Offline asset build only. Never creates, installs, funds or publishes canisters. */
import {parseArgs} from 'node:util';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
// Local acceptance assets permit only their explicitly pinned loopback gateway.
// Production always permits the single reviewed IC endpoint.
const connect=test?new URL(policy.host).origin:'https://icp-api.io';
const html=(await readFile('apps/btz-observer/index.html','utf8')).replace("connect-src 'self'",`connect-src 'self' ${connect}`);
await writeFile(out+'/index.html',html);await writeFile(out+'/deployment.json',deployment+'\n');
if(!test&&Object.keys(built.metafile.inputs).some(p=>p.includes('s14-local-deployment')))throw new Error('test adapter leaked into production');
console.log(`Built observer for ${policy.canister_id}: ${out}`);

await writeFile(out+'/.ic-assets.json5',JSON.stringify([{match:'**/*',security_policy:'hardened',headers:{'Content-Security-Policy':`default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ${connect}; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}}],null,2)+'\n');
const files={};
for(const name of ['index.html','app.mjs','style.css','icon.svg','configuration.bin','deployment.json','.ic-assets.json5']){
 const bytes=await readFile(out+'/'+name);files[name]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
await writeFile(out+'/build-manifest.json',JSON.stringify({source_commit:git('rev-parse','HEAD'),source_dirty:Boolean(git('status','--porcelain')),
 local_test_only:test,deployment:policy,inputs:Object.keys(built.metafile.inputs),configuration:'configuration.bin',files,
 npm_lock_sha256:createHash('sha256').update(await readFile('package-lock.json')).digest('hex')},null,2)+'\n');
