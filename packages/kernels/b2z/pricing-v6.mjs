/** Rules-v6 opt-in arithmetic, using the generated prelaunch economics. */
import {PRICING} from './economics.generated.mjs';
const MAX=18446744073709551615n;
function count(n){if(!Number.isSafeInteger(n)||n<0||n>4294967295)throw Error('COUNT_BOUNDS');return BigInt(n);}
function amount(n){if(typeof n!=='bigint'||n<0n||n>MAX)throw Error('PRICE_OVERFLOW');return n;}
function quantity(n){if(!Number.isInteger(n)||n<1||n>64)throw Error('QUANTITY_BOUNDS');}
export function ballPrice(pool){const n=count(pool);return amount(PRICING.ball_base_e8s*(n||1n)**2n);}
export function cannonPrice(retained){const n=count(retained)+1n;return amount(PRICING.join_e8s*n*n);}
export function sequentialCost(pool,requested){quantity(requested);count(pool);let total=0n;for(let i=0;i<requested;i++)total=amount(total+ballPrice(pool+i));return total;}
export function newCannonCost(retained,totalBalls,pool=0){quantity(totalBalls);count(pool);if(pool===4294967295&&totalBalls>1)throw Error('PRICE_OVERFLOW');return amount(cannonPrice(retained)+(totalBalls>1?sequentialCost(pool+1,totalBalls-1):0n));}
export function affordablePrefix(pool,requested,budget,freeSlots){
 quantity(requested);count(pool);count(freeSlots);amount(budget);
 const out={prices:[],used:0n,remainder:budget,stop_reason:'quantity_limit'};
 for(let i=0;i<requested;i++){
  if(i>=freeSlots){out.stop_reason='capacity';break;}
  const price=ballPrice(pool+i);if(price>out.remainder){out.stop_reason='insufficient_payment';break;}
  out.prices.push(price);out.used+=price;out.remainder-=price;
 }
 return out;
}
