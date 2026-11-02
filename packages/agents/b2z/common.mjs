/** Lossless, bounded local JSON. Public strings are data, never instructions. */
export const SCHEMA='b2z-agent/1';
export function check(ok,code){if(!ok)throw new Error(code);}
export function integer(n,min,max,code='BOUNDS'){check(Number.isSafeInteger(n)&&n>=min&&n<=max,code);return n;}
export const stringify=(v,space=2)=>JSON.stringify(v,(_k,x)=>typeof x==='bigint'?{$integer:x.toString()}:x,space);
export const parse=s=>JSON.parse(s,(_k,x)=>x&&typeof x==='object'&&Object.keys(x).length===1&&/^[-]?[0-9]+$/.test(x.$integer??'')?BigInt(x.$integer):x);
export function freeze(x){if(x&&typeof x==='object'&&!ArrayBuffer.isView(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
export const bounded=(xs,n)=>({items:xs.slice(0,n),total:xs.length,truncated:xs.length>n});
export function envelope(operation,board,data){return{schema:SCHEMA,operation,provenance:board.provenance(),classification:{facts:'Authenticated state and original event artifacts, if provenance.trust is certificate-verifier',derived:'All summaries, geometry, prices and metrics are local derivations from that state',predictions:'Only explicitly labelled forecasts; not authenticated futures',operational:'Pace, wallet budgets and pending transactions are separately sourced, not certified gameplay'},...data};}
export const fractionSub=(a,b)=>[a[0]*b[1]-b[0]*a[1],a[1]*b[1]];
export const fractionCmp=(a,b)=>a[0]*b[1]<b[0]*a[1]?-1:a[0]*b[1]>b[0]*a[1]?1:0;

export function money(value,code='MONEY_BOUNDS'){check(typeof value==='bigint'||typeof value==='string'&&/^[0-9]+$/.test(value)||typeof value==='number'&&Number.isSafeInteger(value)&&value>=0,code);const n=BigInt(value);check(n>=0n&&n<=18446744073709551615n,code);return n;}


/** Operational samples may change while the certified gameplay publication is idle. */
export function operationalSample(snapshot){const op=snapshot?.operational;if(!op)return null;return{observed_at_ms:snapshot.operational_observed_at_ms??null,values:{running:op.run.running,idle:op.run.idle??false,mode:op.run.pace?.mode??'unknown',nominal_milli:op.run.pace?.nominal_milli??null,admission_open:op.run.pace?.admission_open??false,performance_limited:op.run.pace?.performance_limited??false,source_error:String(op.source?.last_error?.[0]??'').slice(0,160)}};}
