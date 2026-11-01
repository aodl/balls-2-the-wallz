/** Operational balances only. Neither gameplay certification nor a gross billed meter. */
export function createCycleMeterView(){
 let previous=null,gate=0n,generation=null;
 return function view(h){
  if(!h||h.version!==1)return {rate:null,reason:'Unavailable'};
  if(h.runtime_started_ns!==generation){previous=null;gate=0n;generation=h.runtime_started_ns;}
  if(previous&&h.observed_at_ns<previous.at)return {rate:null,reason:'Older operational observation'};
  if(!previous||h.observed_at_ns>previous.at){
   if(previous&&h.total_cycles>previous.total)gate=h.observed_at_ns;
   previous={at:h.observed_at_ns,total:h.total_cycles};
  }
  const net=h.net_decline_cycles?.[0],span=h.sample_end_ns-h.sample_start_ns;
  if(gate&&h.sample_start_ns<=gate)return {rate:null,reason:'Balance increase/refund discontinuity; waiting for a new comparable window'};
  if(net===undefined||span<60000000000n)return {rate:null,reason:h.discontinuity||'Measuring'};
  return {rate:Number(net)*3.6e12/Number(span)/1e12,reason:'Observed callback-balance net decline; includes calls/storage/refunds and outstanding-reservation uncertainty, not gross billed consumption'};
 };
}
