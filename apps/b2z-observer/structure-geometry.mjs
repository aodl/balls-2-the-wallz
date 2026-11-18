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
// Colour only the existing mesh faces. Flat normals let the metal band stay
// crisp without a second surface, material or lighting pass.
function faceFinish(geometry,ink,includes){
 const tint=new T.Color(ink),normal=geometry.attributes.normal,position=geometry.attributes.position,colors=geometry.attributes.color;
 for(let i=0;i<position.count;i++){
  if(includes(normal.getY(i),position.getY(i)))colors.setXYZ(i,tint.r,tint.g,tint.b);
 }
 return geometry;
}
function cannonBase(){
 const deck=faceFinish(colour(plate(.84,.012,.145),'#242b30'),'#465054',(up)=>up>.99);
 faceFinish(deck,'#9da8a8',(up,y)=>up>.25&&up<.99&&y>.126);
 // A stamped hexagonal bolt head sits flush just above the deck. It never
 // rotates with the turret and needs only six triangles in the base batch.
 const fasteners=[];
 for(const x of [-.289,.289])for(const z of [-.289,.289]){
  fasteners.push(colour(new T.CircleGeometry(.054,6).rotateX(-Math.PI/2).translate(x,.146,z),'#07090a'));
 }
 return combine([deck,...fasteners,box(.15,.019,.010,0,.073,-.421,'#dfe8d8',true),box(.15,.019,.010,0,.073,.421,'#dfe8d8',true)]);
}
export function structureGeometry(kind='cannon'){
 if(!['cannon','deflector'].includes(kind))throw Error('structure family');
 const def=kind==='deflector';
 const base=def?combine([colour(plate(.88,.012,.075),'#353b40'),box(.19,.022,.010,0,.044,-.441,'#dfe8d8',true),box(.19,.022,.010,0,.044,.441,'#dfe8d8',true)]):cannonBase();
 let upper;
 if(!def){
  const hull=colour(new T.CylinderGeometry(.235,.285,.23,8,1,false).translate(-.075,.263,0),'#333d44');
  const cap=faceFinish(colour(new T.CylinderGeometry(.205,.235,.065,8,1,false).translate(-.075,.409,0),'#242c32'),'#aeb7b6',up=>up>0&&up<.85);
  const collar=tube(.132,.148,.105,.098,.282,'#b2bdbd'),barrel=tube(.077,.094,.292,.272,.282,'#465158');
  const rim=colour(new T.RingGeometry(.054,.082,8).rotateY(Math.PI/2).translate(.421,.282,0),'#e5eddb',true);
  const recess=colour(new T.CircleGeometry(.055,8).rotateY(Math.PI/2).translate(.419,.282,0),'#030506');
  upper=combine([hull,cap,collar,barrel,rim,recess,box(.112,.018,.009,-.09,.335,-.235,'#e5eddb',true),box(.112,.018,.009,-.09,.335,.235,'#e5eddb',true)]);
 }else{
  const shape=new T.BufferGeometry(),p=[.39,.11,0,-.28,.11,-.24,-.28,.11,.24,.39,.15,0,-.28,.17,-.24,-.28,.17,.24];shape.setAttribute('position',new T.Float32BufferAttribute(p,3));shape.setIndex([3,4,5,0,2,1,0,4,3,0,1,4,1,5,4,1,2,5,2,3,5,2,0,3]);const wedge=shape.toNonIndexed();shape.dispose();wedge.computeVertexNormals();colour(wedge,'#515e68');
  const edge=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],g=new T.BoxGeometry(Math.hypot(dx,dz),.015,.022);g.rotateY(-Math.atan2(dz,dx));g.translate((a[0]+b[0])/2,.177,(a[1]+b[1])/2);return colour(g,'#e5eddb',true);};
  upper=combine([wedge,edge([-.28,-.24],[.39,0]),edge([.39,0],[-.28,.24])]);
 }
 return {base,upper};
}
/** Vertex mask keeps metal graphite while only the authored strips use owner hue. */
export function structureMaterial(lift=0){
 const m=new T.MeshLambertMaterial({vertexColors:true,flatShading:true,toneMapped:false});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float accentChannel;\nvarying float vAccentChannel;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`vAccentChannel=accentChannel;
vColor=vec4(color,1.);
#ifdef USE_INSTANCING_COLOR
vColor.rgb=mix(vColor.rgb,instanceColor.rgb,accentChannel);
#endif`);
  shader.uniforms.graphiteLift={value:lift};
  shader.fragmentShader='varying float vAccentChannel;\nuniform float graphiteLift;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    // The neutral body's illumination is independent of the owner colour.
    vec3 strip=mix(vColor.rgb,vec3(1.),.16);
    outgoingLight=mix(outgoingLight*(1.+graphiteLift),strip,vAccentChannel);
    #include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=> 'b2z-graphite-mask-2';
 return m;
}
