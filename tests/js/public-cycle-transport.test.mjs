/** Real pinned SDK + native fetch + actual unresponsive local HTTP transport. */
import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {publicStatusReader,publicCycleMonitor} from '../../apps/b2z-observer/public-cycles.mjs';
for(const headersSent of[false,true])test(`telemetry deadline reaches native query and certificate-key ${headersSent?'response bodies':'requests'}`,{timeout:6000},async()=>{
 let entered=0,active=0,aborted=0;const urls=[],signals=[];
 const server=http.createServer((req,res)=>{entered++;active++;req.resume();res.on('close',()=>{active--;aborted++;});if(headersSent){res.writeHead(200,{'Content-Type':'application/cbor'});res.write(Buffer.from([0xa1]));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const read=publicStatusReader({network:'ic',host:'https://icp-api.io',canister_id:'s5ir5-gqaaa-aaaas-amyna-cai'},{fetch:(url,options)=>{urls.push(String(url));signals.push(options.signal);return fetch(`http://127.0.0.1:${server.address().port}${new URL(url).pathname}`,options);}});
 const jobs=new Map();let serial=0;const states=[];const monitor=publicCycleMonitor({read,onState:s=>states.push(s),hidden:()=>false,schedule:(fn,delay)=>{jobs.set(++serial,{fn,delay});return serial;},cancel:id=>jobs.delete(id),timeout:12});
 const wait=async predicate=>{const until=Date.now()+3000;while(!predicate()){assert.ok(Date.now()<until,'bounded transport settlement');await new Promise(r=>setTimeout(r,5));}};
 try{jobs.get(1).fn();jobs.delete(1);await wait(()=>entered===2);const deadline=[...jobs.values()].find(j=>j.delay===12);deadline.fn();await wait(()=>!monitor.busy&&active===0);assert.equal(states.at(-1).label,'Unavailable');assert.equal(aborted,2);assert.ok(signals.every(s=>s.aborted));assert.ok(urls.some(u=>u.endsWith('/query')));assert.ok(urls.some(u=>u.endsWith('/read_state')));assert.ok(urls.every(u=>u.startsWith('https://icp-api.io/api/v3/canister/s5ir5-gqaaa-aaaas-amyna-cai/')));assert.equal(entered,2,'SDK must not make uncancellable retries');}
 finally{monitor.stop();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
