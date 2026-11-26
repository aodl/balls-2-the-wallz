import {marginal} from '../../protocol/economy17.mjs';
import {BALL_BASE_E8S} from '../../protocol/economy17.generated.mjs';

// The tariff supplies its authenticated population symbolically. Reject an
// amount beyond the Ledger bound before evaluating its exponential factor.
const MAX_LEDGER_AMOUNT=(1n<<64n)-1n;
function isCount(n){return Number.isInteger(n)&&n>=0&&n<=0xffff_ffff;}

export function marginalPrice(baseE8s,population,currentPersonalCount){
 if(typeof baseE8s!=='bigint'||baseE8s<=0n||baseE8s>MAX_LEDGER_AMOUNT||
    !isCount(population)||!isCount(currentPersonalCount))return null;
 const excess=Math.max(0,population-1000);
 if(excess>=64)return null;
 const shift=BigInt(excess),next=BigInt(currentPersonalCount)+1n;
 const unshifted=baseE8s*BigInt(Math.min(1000,Math.max(1,population)))*next*next;
 return unshifted<=MAX_LEDGER_AMOUNT>>shift?unshifted<<shift:null;
}

/** Each authenticated daily population row retains its own formula epoch.
 * The previous Rules19 tariff stays linear during the first successor grace. */
export function tariffs20(schedule,formulaStartNs,blockNs){
 let lo=0,hi=schedule.snapshots.length;
 while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(schedule.snapshots[mid].effective_ns<=blockNs)lo=mid+1;else hi=mid;}
 if(lo===0)return {current:{formula:'linear',multiplier:schedule.initial_multiplier},previous:null};
 const active=schedule.snapshots[lo-1];
 const named=(population,effective)=>effective>=formulaStartNs?
  {formula:'exponential',population}:{formula:'linear',multiplier:population};
 const current=named(active.multiplier,active.effective_ns);
 const priorEffective=lo>1?schedule.snapshots[lo-2].effective_ns:0n;
 const prior=named(active.previous_multiplier,priorEffective);
 return {current,previous:blockNs<active.grace_end_ns&&
   (current.formula!==prior.formula||current.population!==prior.population||current.multiplier!==prior.multiplier)?prior:null};
}

export function priceAtTariff(tariff,base,held){
 if(Number.isInteger(tariff))return marginal(base,tariff,held);
 switch(tariff.formula){
  case 'linear':return marginal(base,tariff.multiplier,held);
  case 'exponential':return marginalPrice(base,tariff.population,held);
  default:throw Error('Unknown tariff formula');
 }
}

function affordable(tariff,purchase,payment){
 let remaining=payment,count=0;
 if(purchase.structure){
  const first=priceAtTariff(tariff,purchase.structure.base,purchase.structure.held);
  if(first===null||first>remaining)return {tariff,count,spent:0n};
  remaining-=first;
  count=1;
 }
 for(let offset=0;offset<purchase.additionalBalls;offset++){
  const held=purchase.ballsHeld+offset;
  const next=isCount(held)?priceAtTariff(tariff,BALL_BASE_E8S,held):null;
  if(next===null||next>remaining)break;
  remaining-=next;
  count++;
 }
 return {tariff,count,spent:payment-remaining};
}

// A current overflow ends only its own affordable prefix. An eligible
// previous formula is priced independently and ties keep the current tariff.
export function chooseTariff(current,previous,purchase,payment){
 if(typeof payment!=='bigint'||payment<0n||payment>MAX_LEDGER_AMOUNT||
    !isCount(purchase.ballsHeld)||!isCount(purchase.additionalBalls)||purchase.additionalBalls>0xffff)
  throw Error('Invalid tariff purchase bounds');
 const primary=affordable(current,purchase,payment);
 if(!previous)return primary;
 const grace=affordable(previous,purchase,payment);
 return grace.count>primary.count?grace:primary;
}
