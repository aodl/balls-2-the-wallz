/** Maintained agent, genuine live certificate, query-only disposable canister. */
import {readFileSync} from 'node:fs';
import {VerifiedObserver} from '../packages/agents/b2z/observer.mjs';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const policy={...config,rootKey:Uint8Array.from(Buffer.from(config.root_key_hex,'hex'))};
const observer=await VerifiedObserver.connect({policy});
const result=await observer.refresh();
if(result.status!=='advanced'||observer.current?.trust!=='certificate-verifier')throw Error('Agent did not authenticate live publication');
const observation=await observer.connection.client.observation();
await observer.verify(observation);
if(process.argv[3]==='established'&&!observation.operationalBurn)throw Error('Certified burn absent');
if(process.argv[3]==='none'&&observation.operationalBurn)throw Error('Unexpected burn record');
console.log(JSON.stringify({status:'PASS',head:String(observer.current.reference.head),
  root:observer.current.reference.root,identity:observer.current.reference.rules_hash,
  composed:Boolean(observation.operationalBurn),queries:observer.metrics.queries}));
