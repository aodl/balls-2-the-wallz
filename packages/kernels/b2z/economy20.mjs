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
