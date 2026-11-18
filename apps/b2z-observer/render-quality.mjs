// Rendered foreground cadence is an inexpensive proxy for sustainable fill rate.
export const PIXEL_BUDGETS=Object.freeze([786432,1000000,2073600]);
export function backingQuality(){
 let level=1,last=null,slow=0,fast=0;
 return {
  get pixels(){return PIXEL_BUDGETS[level];},
  observe(now){
   if(!Number.isFinite(now))return;
   const interval=last===null?0:now-last;
   last=now;
   if(interval<=0||interval>500){slow=fast=0;return;}
   slow=interval>=40?slow+1:0;
   fast=interval<=20?fast+1:0;
   if(slow>=6&&level>0){level--;slow=fast=0;}
   else if(fast>=90&&level<PIXEL_BUDGETS.length-1){level++;slow=fast=0;}
  },
  resetTime(){last=null;slow=fast=0;}
 };
}
