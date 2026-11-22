import {readReservoirPayment} from './reservoir.mjs';
import {BALL_BASE_E8S} from './economy17.generated.mjs';

export const ECONOMY_ADAPTER=11;
export const ECONOMY_PAYMENT='BTZPAY08';
export const U64_MAX=(1n<<64n)-1n;

/** Returns null if the result cannot be represented as a Ledger e8s amount. */
export function marginal(base,multiplier,existing){
  if(!Number.isSafeInteger(existing)||existing<0||!Number.isInteger(multiplier)||multiplier<1||multiplier>0xffffffff)return null;
  const number=BigInt(existing)+1n, price=base*BigInt(multiplier)*number*number;
  return price<=U64_MAX?price:null;
}

export function affordableBalls(budget,multiplier,existing,limit){
  for(let i=0;i<limit;i++){
    const price=marginal(BALL_BASE_E8S,multiplier,existing+i);
    if(price===null||price>budget)return i;
    budget-=price;
  }
  return limit;
}

export function untimedPayment(input){
  if(!(input instanceof Uint8Array)||input.length<65||input.length>96||
     ECONOMY_PAYMENT.split('').some((c,i)=>input[i]!==c.charCodeAt(0)))throw Error('adapter11 payment envelope');
  const recordedNs=new DataView(input.buffer,input.byteOffset,input.length).getBigUint64(input.length-8);
  if(recordedNs===0n)throw Error('adapter11 Ledger block timestamp');
  const previous=input.slice(0,-8);
  previous[7]=55;
  readReservoirPayment(previous);
  return {previous,recordedNs};
}

export function timestampedPayment(previous,recordedNs){
  readReservoirPayment(previous);
  if(typeof recordedNs!=='bigint'||recordedNs<=0n||recordedNs>U64_MAX)throw Error('adapter11 Ledger block timestamp');
  const input=new Uint8Array(previous.length+8);
  input.set(previous);
  input[7]=56;
  new DataView(input.buffer).setBigUint64(previous.length,recordedNs);
  return input;
}
