import{ORIENTATIONS}from'../../packages/protocol/deflector-orientation.generated.mjs';
/** Validated presentation facts, never local construction or ball simulation. */
import{gcd,validRat,cmp,rat}from'../../packages/kernels/b2z/math.mjs';
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
const check=(b,s)=>{if(!b)throw Error('observer: deflector '+s);};
const equal=(a,b)=>{const x=encodeCanonical(a),y=encodeCanonical(b);return x.length===y.length&&x.every((v,i)=>v===y[i]);};
export function validateRationalTrack(b){
 check(typeof b.den==='bigint'&&b.den>=1n&&b.den<=65536n,'denominator');
 check(gcd(gcd(b.x0,b.y0),b.den)===1n,'canonical trajectory');
 check(b.den===1n||Math.abs(b.vx)===22627&&Math.abs(b.vy)===22627,'diagonal class');
 check(b.vx*b.vx+b.vy*b.vy<=32001*32001,'speed bound');
 check(b.deflector_rearm===undefined,'unsupported rearm field');
}
function structure(view,d){
 check(d&&Object.keys(d).sort().join(',')==='cell,id,orientation,owner'&&Number.isSafeInteger(d.id)&&d.id>0&&d.id<4294967295&&Number.isSafeInteger(d.cell)&&d.cell>=0&&d.cell<1000000&&ORIENTATIONS.includes(d.orientation),'entity');
 check(view.playability.players.some(p=>p.id===d.owner)&&view.playerForTerritory(view.owner(d.cell))===d.owner,'canonical owner');
 check(![...view.cannons.values()].some(c=>c.cell===d.cell),'cannon conflict');
}
export function validateDeflectorSnapshot(view,w){
 check(Array.isArray(w.deflectors)&&w.deflectors.length<=256&&Number.isSafeInteger(w.next_deflector_id)&&w.next_deflector_id>0&&w.next_deflector_id<=4294967295,'capacity');
 const cells=new Set(w.deflectors.map(d=>d.cell));for(const d of w.deflectors)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)check(!cells.has(((Math.floor(d.cell/1000)+dy+1000)%1000)*1000+(d.cell%1000+dx+1000)%1000),'spacing');
 const ids=new Set(),counts=new Map();let prior=-1;
 for(const d of w.deflectors){structure(view,d);check(d.cell>prior&&!ids.has(d.id)&&d.id<w.next_deflector_id,'order/counter');prior=d.cell;ids.add(d.id);counts.set(d.owner,(counts.get(d.owner)??0)+1);check(counts.get(d.owner)<=16,'player capacity');check(!w.balls.some(b=>b.cell===d.cell),'ball in structure');}
}
export function applyDeflectorBuilt(view,e){
 if(e.kind!=='deflector_built')return false;
 check(view.version>=7,'unsupported capability');structure(view,e.structure);
 check(e.reason==='ACCEPTED'&&e.status==='applied'&&e.structure.id===view.next_deflector_id&&!view.deflectors.has(e.structure.id)&&![...view.deflectors.values()].some(d=>d.cell===e.structure.cell),'construction binding');
 view.deflectors.set(e.structure.id,structuredClone(e.structure));view.next_deflector_id++;return true;
}
export function applyDeflectorOperation(view,event){
 const moving=event.kind==='deflector_moved';
 if(!moving&&event.kind!=='deflector_reoriented')return false;
 check(view.version>=7&&view.contextStructures,'operation capability');
 const before=event.before,after=event.structure;
 structure(view,before);structure(view,after);
 check(event.reason==='ACCEPTED'&&event.status==='applied'&&equal(view.deflectors.get(before.id),before)
   &&before.id===after.id&&before.owner===after.owner,'operation predecessor');
 if(moving){
   check(before.cell!==after.cell&&before.orientation===after.orientation,'movement fields');
   const dx=other=>Math.abs(after.cell%1000-other.cell%1000);
   const dy=other=>Math.abs(Math.floor(after.cell/1000)-Math.floor(other.cell/1000));
   check(![...view.deflectors.values()].some(other=>other.id!==after.id&&Math.min(dx(other),1000-dx(other))<2&&Math.min(dy(other),1000-dy(other))<2),'move spacing');
 }else check(before.cell===after.cell&&before.orientation!==after.orientation,'reorientation fields');
 view.deflectors.set(after.id,structuredClone(after));return true;
}
export function applyDeflectorRemovals(view,e){
 if(view.version<7)return;const gone=e.removed_deflectors??[];check(Array.isArray(gone)&&gone.length<=256,'removal bounds');const seen=new Set();
 for(const d of gone){check(!seen.has(d.id)&&equal(view.deflectors.get(d.id),d),'removal identity');seen.add(d.id);view.deflectors.delete(d.id);}
}
export function matchesDeflectors(view,w){check(view.next_deflector_id===w.next_deflector_id&&equal([...view.deflectors.values()].sort((a,b)=>a.cell-b.cell),w.deflectors),'final structures');}
