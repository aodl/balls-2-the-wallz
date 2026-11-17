/** Geometry design checkpoint only. NOT an admitted game opcode or interpreter.
 * Unit-cell exact fractions expose the new representation requirement. */
import {rat,add,sub,cmp}from'../packages/kernels/b2z/math.mjs';
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]),div=(a,b)=>rat(a[0]*b[1],a[1]*b[0]);
export const fraction=s=>{const p=String(s).split('/');if(p.length>2)throw Error('fraction');return rat(p[0],p[1]??1);};
export const text=r=>r[1]===1n?String(r[0]):`${r[0]}/${r[1]}`;
export function contact(row){
 const p=row.entry_position.map(fraction),v=row.incoming_velocity.map(fraction),out=row.outgoing_velocity.map(fraction),entry=fraction(row.entry_time);
 if(p.length!==2||v.length!==2||out.length!==2||p.some(x=>cmp(x,rat(0))<0||cmp(x,rat(1))>0))throw Error('bounds');
 const exits=v.flatMap((x,i)=>x[0]?[div(sub(rat(x[0]>0n?1:0),p[i]),x)]:[]);
 if(!exits.length)return null;
 const duration=exits.reduce((a,b)=>cmp(a,b)<0?a:b),half=div(duration,rat(2)),point=p.map((x,i)=>add(x,mul(v[i],half)));
 if(cmp(duration,rat(0))<=0||point.some(x=>cmp(x,rat(0))<=0||cmp(x,rat(1))>=0))return null;
 const time=add(entry,half),intercept=point.map((x,i)=>sub(x,mul(out[i],time)));
 return {id:row.id,geometric_exit_time:text(add(entry,duration)),contact_time:text(time),contact_position:point.map(text),outgoing_global_intercept:intercept.map(text)};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file://').href){const{readFileSync}=await import('node:fs');const input=JSON.parse(readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(input.vectors.map(contact)));}
