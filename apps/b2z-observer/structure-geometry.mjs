/** Original procedural models. Units are canonical tiles; +X is outgoing direction.
 * Fixed base and rotating upper use two shared batches per family. No textures,
 * groups, lights, per-player materials or fullscreen effects are introduced. */
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export const STRUCTURE_BOUNDS=Object.freeze({cannon:{baseWidth:.84,upperRadius:.43,height:.45},deflector:{baseWidth:.88,upperRadius:.42,height:.18}});
function colour(g,ink,accent=false){
 const n=g.attributes.position.count,c=new T.Color(ink),rgb=new Float32Array(n*3),mask=new Float32Array(n);
 for(let i=0;i<n;i++){rgb.set([c.r,c.g,c.b],i*3);mask[i]=accent?1:0;}
 g.setAttribute('color',new T.BufferAttribute(rgb,3));g.setAttribute('accentChannel',new T.BufferAttribute(mask,1));g.deleteAttribute('uv');return g;
}
function combine(gs){const flat=gs.map(g=>g.index?g.toNonIndexed():g),out=mergeGeometries(flat,false);for(const g of new Set([...flat,...gs]))g.dispose();if(!out)throw Error('Incompatible structure attributes');const indexed=mergeVertices(out,1e-6);out.dispose();indexed.computeBoundingBox();indexed.computeBoundingSphere();return indexed;}
function plate(width,bottom,top){
 const half=width/2,cut=width*.13,points=[[-half+cut,-half],[half-cut,-half],[half,-half+cut],[half,half-cut],[half-cut,half],[-half+cut,half],[-half,half-cut],[-half,-half+cut]],positions=[],indices=[];
 for(const [h,s] of [[bottom,.92],[bottom+.025,1],[top-.018,1],[top,.91]])for(const [x,z]of points)positions.push(x*s,h,z*s);
 for(let r=0;r<3;r++)for(let i=0;i<8;i++){const a=r*8+i,b=r*8+(i+1)%8;indices.push(a,b+8,b,a,a+8,b+8);}
 for(let i=1;i<7;i++)indices.push(24,24+i+1,24+i,0,i,i+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}
function box(w,h,d,x,y,z,ink,accent=false){return colour(new T.BoxGeometry(w,h,d).translate(x,y,z),ink,accent);}
function tube(r1,r2,length,x,y,ink){return colour(new T.CylinderGeometry(r1,r2,length,8,1,false).rotateZ(-Math.PI/2).translate(x,y,0),ink);}
export function structureGeometry(kind='cannon'){
 if(!['cannon','deflector'].includes(kind))throw Error('structure family');
 const def=kind==='deflector',base=combine([colour(plate(def?.88:.84,.012,def?.075:.145),'#414a50'),box(.19,.018,.009,0,def?.042:.072,-(def?.441:.421),'#dfe8d8',true),box(.19,.018,.009,0,def?.042:.072,def?.441:.421,'#dfe8d8',true)]);
 let upper;
 if(!def){
  const hull=colour(new T.CylinderGeometry(.235,.285,.23,8,1,false).translate(-.055,.265,0),'#68737b');
  const cap=colour(new T.CylinderGeometry(.205,.235,.065,8,1,false).translate(-.055,.412,0),'#505a62');
  const collar=tube(.126,.145,.09,.095,.285,'#879199'),barrel=tube(.077,.094,.24,.245,.285,'#697780');
  const rim=colour(new T.RingGeometry(.058,.080,8).rotateY(Math.PI/2).translate(.368,.285,0),'#e5eddb',true);
  const recess=colour(new T.CircleGeometry(.058,8).rotateY(Math.PI/2).translate(.364,.285,0),'#080d10');
  upper=combine([hull,cap,collar,barrel,rim,recess,box(.14,.018,.009,-.09,.335,-.235,'#e5eddb',true),box(.14,.018,.009,-.09,.335,.235,'#e5eddb',true)]);
 }else{
  const shape=new T.BufferGeometry(),p=[.39,.11,0,-.28,.11,-.24,-.28,.11,.24,.39,.15,0,-.28,.17,-.24,-.28,.17,.24];shape.setAttribute('position',new T.Float32BufferAttribute(p,3));shape.setIndex([3,4,5,0,2,1,0,4,3,0,1,4,1,5,4,1,2,5,2,3,5,2,0,3]);const wedge=shape.toNonIndexed();shape.dispose();wedge.computeVertexNormals();colour(wedge,'#65727b');
  const edge=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],g=new T.BoxGeometry(Math.hypot(dx,dz),.010,.014);g.rotateY(-Math.atan2(dz,dx));g.translate((a[0]+b[0])/2,.177,(a[1]+b[1])/2);return colour(g,'#e5eddb',true);};
  upper=combine([wedge,edge([-.28,-.24],[.39,0]),edge([.39,0],[-.28,.24])]);
 }
 return {base,upper};
}
/** Vertex mask keeps metal graphite while only the authored strips use owner hue. */
export function structureMaterial(){
 const m=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
 m.onBeforeCompile=s=>{s.vertexShader='attribute float accentChannel;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <color_vertex>',`vColor=vec4(color,1.);\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb=mix(vColor.rgb,instanceColor.rgb,accentChannel);\n#endif`);};m.customProgramCacheKey=()=> 'b2z-graphite-mask-1';return m;
}
