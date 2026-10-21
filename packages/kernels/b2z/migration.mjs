/** Staged B2Z migration bytes only. The pinned DTR has no live Transition API. */
import {cloneCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {decodeWorld,encodeWorld,Q,TORUS_IDENTITY,PRELAUNCH_IDENTITY} from './world.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
export function stageTorusMigration(bytes,{staged=false,pending_inputs=0,source_pending=false,source_in_flight=false,source_cursor,ledger_cutover,account_history_complete_through,source_anchor,identity}={}){
 if(staged||pending_inputs||source_pending||source_in_flight)throw new Error('Drain old inputs and complete the old segment before transition; pending MOVE bytes cannot be reinterpreted.');
 const asU64=v=>{if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)v=BigInt(v);if(typeof v!=='bigint'||v<0n||v>=(1n<<64n))throw new Error('Index history barrier required for old-width MOVE commands');return v;};
 source_cursor=asU64(source_cursor);ledger_cutover=asU64(ledger_cutover);account_history_complete_through=asU64(account_history_complete_through);
 if(ledger_cutover<source_cursor||account_history_complete_through<ledger_cutover)throw new Error('Index history barrier required for old-width MOVE commands');
 if(typeof source_anchor!=='string'||!/^[0-9a-f]{64}$/.test(source_anchor))throw new Error('authenticated source boundary required');
 if(!identity||typeof identity.source_id!=='string'||!/^[0-9a-f]{64}$/.test(identity.source_id)||Object.keys(PRELAUNCH_IDENTITY).some(k=>identity[k]!==PRELAUNCH_IDENTITY[k]))throw new Error('old identity');
 const old=decodeWorld(bytes);if(old.version!==3||old.width!==16||old.height!==8||old.time[1]!==1n)throw new Error('old committed world');
 const w=cloneCanonical(old),cell=n=>(Math.floor(n/16)+12)*32+n%16+8;
 w.version=4;w.width=32;w.height=32;w.cells=Array(1024).fill(0);old.cells.forEach((owner,n)=>{w.cells[cell(n)]=owner;});
 w.cannons=w.cannons.map(c=>({...c,cell:cell(c.cell)}));
 w.balls=w.balls.map(b=>({...b,cell:cell(b.cell),x0:b.x0+8n*BigInt(Q),y0:b.y0+12n*BigInt(Q)}));
 w.pending=w.pending.map(p=>({...p,from:cell(p.from),to:cell(p.to),position:[p.position[0]+BigInt((p.axis==='x'?12:8)*Q)*p.position[1],p.position[1]]}));
 const state=encodeWorld(w);
 return {state,transition:{version:1,migration:'B2Z_EMBED_16X8_IN_32_TORUS_01',old_identity:identity,new_identity:{...TORUS_IDENTITY,source_id:identity.source_id},previous_state:sha256(bytes),new_state:sha256(state),logical_boundary:old.time,source_cursor,ledger_cutover,account_history_complete_through,source_anchor},deployable:false,blocked_by:'Pinned DTR lacks authenticated identity/schema transition'};
}
