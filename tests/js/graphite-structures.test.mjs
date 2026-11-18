import test from 'node:test';import assert from 'node:assert/strict';
import{structureGeometry,STRUCTURE_BOUNDS}from'../../apps/b2z-observer/structure-geometry.mjs';
import{luminousAccent,contrast,GRAPHITE,themeCacheSize}from'../../apps/b2z-observer/theme.mjs';
test('complete quantized-heading sweep keeps both rotating models inside their tile',()=>{
 for(const kind of ['cannon','deflector']){const m=structureGeometry(kind),p=m.upper.attributes.position;let radial=0;
  for(let i=0;i<p.count;i++)radial=Math.max(radial,Math.hypot(p.getX(i),p.getZ(i)));
  assert(radial<=STRUCTURE_BOUNDS[kind].upperRadius,`${kind}: ${radial}`);
  // The radial analytic bound proves every rotation; the full quantized sweep
  // additionally catches transform/order mistakes at each supported heading.
  for(let a=0;a<65536;a++){const c=Math.cos(a*Math.PI/32768),s=Math.sin(a*Math.PI/32768);for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);assert(Math.abs(x*c-z*s)<.5&&Math.abs(x*s+z*c)<.5);}}
  const b=m.base.boundingBox;assert(b.min.x>=-.45&&b.min.z>=-.45&&b.max.x<=.45&&b.max.z<=.45);assert(b.min.y>=0);
  assert(m.base.index&&m.upper.index);assert(m.base.attributes.position.count+p.count<=(kind==='cannon'?400:250));const triangles=(m.base.index.count+m.upper.index.count)/3;assert(triangles<= (kind==='cannon'?300:120));
  for(const g of Object.values(m)){assert.equal(g.groups.length,0);assert.equal(g.attributes.accentChannel.count,g.attributes.position.count);g.dispose();}
 }
});
test('contrast adjustment preserves light account hues and safely lifts dark examples',()=>{
 for(const ink of ['#baff44','#20ddff','#ff00ee','#ffaa00','#ff0000','#000078','#020204','#fdf9f5',null]){const tint=luminousAccent(ink);assert(contrast(tint,GRAPHITE.paper)>=4.5);}
 assert.equal(luminousAccent('#fdf9f5'),'#fdf9f5');assert.equal(luminousAccent(null),GRAPHITE.neutral);assert(contrast(GRAPHITE.ink,GRAPHITE.paper)>=4.5);
});

test('contrast palette cache remains bounded under many distinct declared colours',()=>{for(let i=0;i<4000;i++)luminousAccent('#'+i.toString(16).padStart(6,'0'));assert(themeCacheSize()<=1024);assert(contrast(luminousAccent('#000001'),GRAPHITE.paper)>=4.5);});

test('merged cannon upper retains a real dark muzzle, owner rim and substantial barrel',()=>{
 const {base,upper}=structureGeometry('cannon'),p=upper.attributes.position,c=upper.attributes.color,m=upper.attributes.accentChannel;
 let dark=0,rim=0,barrel=0;
 for(let i=0;i<p.count;i++){
  if(Math.abs(p.getX(i)-.419)<1e-6&&Math.max(c.getX(i),c.getY(i),c.getZ(i))<.01&&m.getX(i)===0)dark++;
  if(Math.abs(p.getX(i)-.421)<1e-6&&m.getX(i)===1)rim++;
  if(Math.abs(p.getX(i)-.126)<1e-6&&Math.hypot(p.getY(i)-.282,p.getZ(i))>.07)barrel++;
 }
 assert(dark>=9,'dark muzzle disc omitted');assert(rim>=16,'ownership muzzle rim omitted');assert(barrel>=8,'barrel body omitted');base.dispose();upper.dispose();
});
