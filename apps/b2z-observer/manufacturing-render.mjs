import * as T from 'three';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {accountColor} from './identity.mjs';
import {luminousAccent} from './theme.mjs';
import {MAX_MANUFACTURING_SITES} from './manufacturing.mjs';
import {STRUCTURE_BOUNDS} from './structure-geometry.mjs';

const UP=new T.Vector3(0,1,0);
export function fabricationPose(seconds,index){
 const phase=seconds*(index===0?.89:-.69)+index*Math.PI;
 return {x:Math.cos(phase)*.69,z:Math.sin(phase)*.69,
  y:.62+Math.sin(seconds*1.14+index*2.6)*.14,phase};
}

function fabricationMaterial(){
 const scan={value:0};
 const material=new T.MeshBasicMaterial({transparent:true,opacity:.72,depthWrite:false,toneMapped:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.fabricationHeight=scan;
  shader.vertexShader='varying float fabricationY;\n'+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nfabricationY=position.y;');
  shader.fragmentShader='uniform float fabricationHeight;\nvarying float fabricationY;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',
   'float band=1.0-smoothstep(.002,.028,abs(fabricationY-fabricationHeight));\n'+
   'outgoingLight=mix(mix(outgoingLight*.20,vec3(.78,.90,.96),.18),vec3(.91,.98,1.0),band*.92);\n'+
   'diffuseColor.a*=.86+.14*band;\n#include <opaque_fragment>');
 };
 return {material,scan};
}

export function createManufacturingLayer(scene,structures){
 const hull=new T.CylinderGeometry(.85,1,1,6);
 const rail=new T.BoxGeometry(1,1,1);
 const beam=new T.CylinderGeometry(1,1,1,6,1,true);
 const bar=new T.PlaneGeometry(1,1);
 const shell=new T.MeshLambertMaterial({color:0x36434c,flatShading:true});
 const hot=new T.MeshBasicMaterial({color:0xf1fbff,toneMapped:false,depthWrite:false});
 const track=new T.MeshBasicMaterial({color:0x081419,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const delta=new T.Vector3(),contact=new T.Vector3(),axis=new T.Vector3(0,1,0);
 const slots=Array.from({length:MAX_MANUFACTURING_SITES},()=>{
  const root=new T.Group(),{material,scan}=fabricationMaterial();
  const accent=new T.MeshBasicMaterial({transparent:true,opacity:.54,depthWrite:false,toneMapped:false});
  const indicator=new T.MeshBasicMaterial({depthWrite:false,toneMapped:false});
  const pulse=new T.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const shapes=Object.fromEntries(Object.entries(structures).map(([kind,geometry])=>{
   const base=new T.Mesh(geometry.base,material),upper=new T.Mesh(geometry.upper,material);
   root.add(base,upper);
   return [kind,{base,upper}];
  }));
  const drones=Array.from({length:2},()=>{
   const craft=new T.Group(),body=new T.Mesh(hull,shell),stripe=new T.Mesh(rail,indicator);
   body.scale.set(.118,.054,.085);stripe.scale.set(.014,.012,.164);stripe.position.y=-.02;
   craft.add(body,stripe);
   const outer=new T.Mesh(beam,accent),core=new T.Mesh(beam,hot);
   root.add(craft,outer,core);
   return {craft,outer,core};
  });
  const progress=new T.Group(),background=new T.Mesh(bar,track),light=new T.Mesh(bar,pulse);
  background.renderOrder=6;light.renderOrder=7;
  light.position.z=.001;
  progress.add(background,light);
  root.add(progress);root.visible=false;scene.add(root);
  return {root,shapes,drones,progress,light,material,accent,indicator,pulse,scan};
 });
 function moveBeam(mesh,start,end,radius){
  delta.subVectors(end,start);
  mesh.position.copy(start).lerp(end,.5);
  mesh.quaternion.setFromUnitVectors(UP,axis.copy(delta).normalize());
  mesh.scale.set(radius,delta.length(),radius);
 }
 function contactOnMesh(mesh,s,theta){
  const g=mesh.geometry,index=g.index,positions=g.attributes.position,count=index.count/3;
  const t=(Math.floor(s*1.7)%count+count)%count,weight=.2+.6*(.5+.5*Math.sin(s*3));
  const a=index.getX(t*3),b=index.getX(t*3+1);
  contact.set(positions.getX(a)+(positions.getX(b)-positions.getX(a))*weight,
   positions.getY(a)+(positions.getY(b)-positions.getY(a))*weight,
   positions.getZ(a)+(positions.getZ(b)-positions.getZ(a))*weight);
  if(theta)contact.applyAxisAngle(UP,-theta);
 }
 return {
  draw(sites,ortho,scale,wallMs,reducedMotion){
   for(let i=0;i<slots.length;i++){
    const slot=slots[i],site=sites[i];
    slot.root.visible=Boolean(site);
    if(!site)continue;
    const s=reducedMotion?1.1:wallMs/1000+i*1.7;
    const tint=luminousAccent(accountColor(site.account));
    slot.root.position.set(site.x,0,site.y);
    slot.material.color.set(tint);slot.accent.color.set(tint);slot.indicator.color.set(tint);slot.pulse.color.set(tint);
    const [hx,hy]=heading(site.heading),theta=Math.atan2(hy,hx),shape=slot.shapes[site.kind];
    for(const [kind,parts] of Object.entries(slot.shapes))parts.base.visible=parts.upper.visible=kind===site.kind;
    shape.upper.rotation.y=-theta;
    slot.scan.value=(.5-.5*Math.cos(s*.99))*STRUCTURE_BOUNDS[site.kind].height;
    for(let j=0;j<slot.drones.length;j++){
     const {craft,outer,core}=slot.drones[j],pose=fabricationPose(s,j);
     craft.position.set(pose.x,pose.y,pose.z);craft.rotation.y=-pose.phase+Math.PI/2;
     const upper=j===0||Math.sin(s*.77)>.05;
     contactOnMesh(upper?shape.upper:shape.base,s+j*3.9,upper?theta:0);
     moveBeam(outer,craft.position,contact,.020);moveBeam(core,craft.position,contact,.008);
    }
    slot.progress.position.set(0,.99,0);
    slot.progress.quaternion.copy(ortho.quaternion);
    slot.progress.scale.set(Math.max(28,Math.min(54,scale*1.35))/scale,5/scale,1);
    // A travelling pulse, with empty track on either side, never represents
    // elapsed progress or promises a checkpoint.
    slot.light.position.x=.30*Math.sin(s*1.83);
    slot.light.scale.set(.29,.52,1);
   }
  },
  dispose(){
   for(const slot of slots){
    scene.remove(slot.root);slot.material.dispose();slot.accent.dispose();slot.indicator.dispose();slot.pulse.dispose();
   }
   for(const resource of [hull,rail,beam,bar,shell,hot,track])resource.dispose();
  },
 };
}
