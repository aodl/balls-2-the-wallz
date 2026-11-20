/** Presentation only: screen clockwise-from-up <-> unchanged canonical world angle. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
const norm=n=>(n%360+360)%360;
export function worldToScreen(angle){const a=Number(angle)*Math.PI/180,x=(Math.cos(a)-Math.sin(a))/Math.SQRT2,y=(Math.cos(a)+Math.sin(a))/Math.sqrt(6);return norm(Math.atan2(x,-y)*180/Math.PI);}
export function screenToWorld(angle){const a=Number(angle);if(String(angle).trim()===''||!Number.isFinite(a)||a<0||a>=360)throw Error('HEADING_BOUNDS');const r=a*Math.PI/180,sx=Math.sin(r),sy=-Math.cos(r);return norm(Math.atan2((-Math.SQRT2*sx+Math.sqrt(6)*sy)/2,(Math.SQRT2*sx+Math.sqrt(6)*sy)/2)*180/Math.PI);}
export function encodedHeading(display){const world=screenToWorld(display),rounded=(Math.round(world*100)%36000)/100;return describeTextMemo('angle',String(rounded)).text.slice(6);}
export const displayHeading=world=>String(Math.round(worldToScreen(world)*100)/100%360);
export function storedHeadingForMemo(heading){
  if(!Number.isInteger(heading)||heading<0||heading>65535)throw Error('HEADING_BOUNDS');
  // Scale and round in integer units. The largest numerator fits in 32 bits.
  const centidegrees=Math.floor((heading*36000+32768)/65536)%36000;
  const whole=Math.floor(centidegrees/100),fraction=centidegrees%100;
  return fraction===0?String(whole):`${whole}.${fraction%10===0?fraction/10:String(fraction).padStart(2,'0')}`;
}
