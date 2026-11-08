/** UX-12. Shared geometry/instances; 2D authoritative state is never modified. */
import * as T from 'three';
import {wrap} from './camera.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {territoryLayout,boundaryIndex} from './terrain.mjs';
import {displayedMotion} from './motion-effects.mjs';
export const RENDER_LIMITS=Object.freeze({tiles:8192,pieces:4096,effects:128,dpr:2});
export function createArenaRenderer(canvas,{onError=()=>{},onRestore=()=>{}}={}){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setClearColor('#151d24');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,.1,10000);
 scene.add(new T.HemisphereLight(0xe8eef7,0x49565c,1.3));const sun=new T.DirectionalLight(0xffecd6,2);sun.position.set(-20,40,10);scene.add(sun);
 const material=new T.MeshLambertMaterial({flatShading:true});
 const dummy=new T.Object3D(),color=new T.Color(),motion=displayedMotion();let lost=false,terrainKey='',lastView=null,layout=null,layoutStamp='',layoutView=null,layoutRevision=-1,tilePoints=[],lastDrawKey='',lastStats=null,effectUntil=0,previewKey='';
 const groups=[];
 function batch(geometry,max=RENDER_LIMITS.pieces,mat=material){const m=new T.InstancedMesh(geometry,mat,max);m.count=0;m.frustumCulled=false;scene.add(m);groups.push(m);return m;}
 const tiles=batch(new T.BoxGeometry(1,.10,1),RENDER_LIMITS.tiles),bases=batch(new T.CylinderGeometry(.29,.34,.13,8)),turrets=batch(new T.SphereGeometry(.22,12,8)),barrels=batch(new T.CylinderGeometry(.085,.10,.45,10)),balls=batch(new T.SphereGeometry(.10,12,8));
 const shadows=batch(new T.CircleGeometry(.31,16),RENDER_LIMITS.pieces,new T.MeshBasicMaterial({color:0x03080c,transparent:true,opacity:.28,depthWrite:false}));
 const rings=batch(new T.RingGeometry(.37,.42,24),512,new T.MeshBasicMaterial({color:0xffdf9d,side:T.DoubleSide}));
 const highlights=batch(new T.PlaneGeometry(.87,.87),RENDER_LIMITS.effects,new T.MeshBasicMaterial({color:0xffffdc,transparent:true,opacity:.15,depthWrite:false}));
 const preview=batch(new T.PlaneGeometry(.85,.85),8192,new T.MeshBasicMaterial({color:0xffd895,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));
 const edgeGeometry=new T.BufferGeometry();edgeGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(8192*6),3));const edges=new T.LineSegments(edgeGeometry,new T.LineBasicMaterial({color:0xc6d1d1,transparent:true,opacity:.4}));scene.add(edges);
 const guideGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
 const guide=new T.Line(guideGeometry,new T.LineDashedMaterial({color:0xffdf9d,dashSize:.18,gapSize:.12}));scene.add(guide);
 function instance(mesh,x,z,h,sx=1,sy=1,sz=1,tint=null,rotation=null){if(mesh.count>=mesh.instanceMatrix.count)return;dummy.position.set(x,h,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rotation?.[0]??0,rotation?.[1]??0,rotation?.[2]??0);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);if(tint)mesh.setColorAt(mesh.count,color.set(tint));mesh.count++;}
 function visible(camera,x,y,margin=2){const p=camera.screen(x,y);return p.x>=-margin*camera.scale&&p.y>=-margin*camera.scale&&p.x<=camera.viewport.width+margin*camera.scale&&p.y<=camera.viewport.height+margin*camera.scale;}
 const lostHandler=e=>{e.preventDefault();lost=true;motion.reset();onError('Graphics context lost. Waiting to restore the arena.');};
 const restoreHandler=()=>{lost=false;terrainKey='';motion.reset();onRestore();};
 canvas.addEventListener('webglcontextlost',lostHandler);canvas.addEventListener('webglcontextrestored',restoreHandler);
 function draw(v,camera,{time=0,selected=null,selection=null,aim=null,reducedMotion=false,wallMs=performance.now()}={}){
  if(lost)return;
  const drawKey=[camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,time,v.territoryRevision,v.entityKey(),selected,selection?.key,selection?.cell,selection?.cells?.length,aim?.angle,reducedMotion,devicePixelRatio].join('/');
  if(lastView===v&&lastDrawKey===drawKey&&wallMs>effectUntil)return lastStats;
  if(time!==lastStats?.time)effectUntil=wallMs+400;lastDrawKey=drawKey;
  const {width,height}=camera.viewport;renderer.setPixelRatio(Math.min(devicePixelRatio||1,RENDER_LIMITS.dpr,Math.sqrt(1000000/(width*height))));renderer.setSize(width,height,false);
  const halfW=width/camera.scale/2,halfH=height/camera.scale/2;
  Object.assign(ortho,{left:-halfW,right:halfW,top:halfH,bottom:-halfH});ortho.position.set(camera.x+2500,2500,camera.y+2500);ortho.lookAt(camera.x,0,camera.y);ortho.updateProjectionMatrix();ortho.updateMatrixWorld();
  const copies=camera.copies(1),bounds=camera.bounds();
  // Cache terrain on local camera/ownership changes; no per-frame world scan.
  const key=[camera.x,camera.y,camera.scale,width,height,v.territoryRevision,v.entityKey()].join('/');
  if(key!==terrainKey||lastView!==v){
   terrainKey=key;lastView=v;tiles.count=0;tilePoints=[];
   const stamp=layoutView===v&&layoutRevision===v.territoryRevision?layoutStamp:JSON.stringify([v.ownership??v.cells,v.entityKey()]);layoutView=v;layoutRevision=v.territoryRevision;if(layoutStamp!==stamp){layoutStamp=stamp;layout=territoryLayout(v);layout.index=boundaryIndex(layout.edges,v.width,v.height);}
   let edgeCount=0;const positions=edgeGeometry.attributes.position;
   if(camera.scale>=3)for(const copy of copies)layout.index.visit(bounds.x-copy.x,bounds.y-copy.y,bounds.x+bounds.width-copy.x,bounds.y+bounds.height-copy.y,e=>{if(edgeCount>=8192)return;positions.setXYZ(edgeCount*2,e.x1+copy.x,.014,e.y1+copy.y);positions.setXYZ(edgeCount*2+1,e.x2+copy.x,.014,e.y2+copy.y);edgeCount++;});
   edgeGeometry.setDrawRange(0,edgeCount*2);positions.needsUpdate=true;
   let step=camera.scale>=10?1:camera.scale>=3?4:32;
   const estimate=(bounds.width/step+2)*(bounds.height/step+2);
   while(estimate*(camera.scale>=10?1:1)/(step/(camera.scale>=10?1:camera.scale>=3?4:32))**2>RENDER_LIMITS.tiles)step*=2;
   for(const copy of copies){const x0=Math.max(0,Math.floor((bounds.x-copy.x-1)/step)*step),y0=Math.max(0,Math.floor((bounds.y-copy.y-1)/step)*step),x1=Math.min(v.width,Math.ceil(bounds.x+bounds.width-copy.x+1)),y1=Math.min(v.height,Math.ceil(bounds.y+bounds.height-copy.y+1));
    for(let y=y0;y<y1;y+=step)for(let x=x0;x<x1;x+=step){const w=Math.min(step,v.width-x),h=Math.min(step,v.height-y),cx=x+copy.x+w/2,cy=y+copy.y+h/2;if(!visible(camera,cx,cy,step))continue;const owner=v.owner(Math.floor(y+h/2)*v.width+Math.floor(x+w/2)),tint=owner?color.set(v.territoryColor?.(owner)??v.color(owner)).lerp(new T.Color('#35444a'),.65).getHexString():'39484e';if(tilePoints.length<RENDER_LIMITS.tiles)tilePoints.push({x:cx,y:cy,cell:Math.floor(y+h/2)*v.width+Math.floor(x+w/2),w,h});instance(tiles,cx,cy,-.05,w*(step===1?.97:1),1,h*(step===1?.97:1),'#'+tint);}
   }
  }
  const nextPreviewKey=[key,selection?.key,selection?.id,selection?.cell,selection?.cells?.join(',')].join('/'),updatePreview=nextPreviewKey!==previewKey;previewKey=nextPreviewKey;
  for(const g of groups)if(g!==tiles&&(g!==preview||updatePreview))g.count=0;
  const points=[];
  for(const b of v.balls.values()){let x=(Number(b.x0)+b.vx*time)/1024,y=(Number(b.y0)+b.vy*time)/1024;if(v.torus){x=wrap(x,v.width);y=wrap(y,v.height);}points.push({id:b.id,x,y,owner:b.owner});}
  const effects=motion.sample(points,{time,wallMs,width:v.width,height:v.height,torus:v.torus,reducedMotion});
  if(updatePreview&&selection?.legal)for(const p of tilePoints)if(selection.legal(p.cell))instance(preview,p.x,p.y,.02,p.w,p.h,1,null,[-Math.PI/2,0,0]);
  for(const copy of copies){
   for(const c of v.cannons.values()){
    const x=c.cell%v.width+.5+copy.x,y=Math.floor(c.cell/v.width)+.5+copy.y;if(!visible(camera,x,y))continue;
    const tint=v.color(c.id),lod=camera.scale<4?Math.min(8,4/camera.scale):1;
    instance(shadows,x+.06,y+.07,.006,lod,1,lod,null,[-Math.PI/2,0,0]);
    instance(bases,x,y,.09,lod,lod,lod,tint);instance(turrets,x,y,.24,lod,lod*.8,lod,tint);
    const [dx,dy]=heading(Number.isInteger(c.heading)?c.heading:0),theta=Math.atan2(dy,dx),length=.29*lod;
    instance(barrels,x+Math.cos(theta)*length,y+Math.sin(theta)*length,.27,lod,lod,lod,'#b9c4c8',[0,-theta,Math.PI/2]);
    if(c.id===selected)instance(rings,x,y,.015,lod,1,lod,null,[-Math.PI/2,0,0]);
   }
   for(const b of points){const x=b.x+copy.x,y=b.y+copy.y;if(!visible(camera,x,y))continue;const lod=camera.scale<4?Math.min(8,3/camera.scale):1;instance(shadows,x+.04,y+.05,.008,lod*.6,1,lod*.6,null,[-Math.PI/2,0,0]);instance(balls,x,y,.14*lod,lod,lod,lod,v.ballColor?.(b.owner)??v.color(b.owner));}
   for(const e of effects){const x=e.cell%v.width+.5+copy.x,y=Math.floor(e.cell/v.width)+.5+copy.y;if(visible(camera,x,y))instance(highlights,x,y,.012,1,1,1,'#'+color.set('#ffffdc').lerp(new T.Color('#39484e'),1-e.alpha).getHexString(),[-Math.PI/2,0,0]);}
   if(updatePreview&&selection&&!selection.legal)for(const cell of selection.cells){const x=cell%v.width+.5+copy.x,y=Math.floor(cell/v.width)+.5+copy.y;if(visible(camera,x,y))instance(preview,x,y,.02,1,1,1,null,[-Math.PI/2,0,0]);}
  }
  guide.visible=Boolean(aim);if(aim){const c=aim.cannon,x=c.cell%v.width+.5,y=Math.floor(c.cell/v.width)+.5;let dx=x-camera.x,dy=y-camera.y;if(v.torus){dx-=Math.round(dx/v.width)*v.width;dy-=Math.round(dy/v.height)*v.height;}const a=Number(aim.angle)*Math.PI/180,positions=guide.geometry.attributes.position;positions.setXYZ(0,camera.x+dx,.025,camera.y+dy);positions.setXYZ(1,camera.x+dx+Math.cos(a)*2,.025,camera.y+dy+Math.sin(a)*2);positions.needsUpdate=true;guide.computeLineDistances();}
  for(const mesh of groups){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  renderer.render(scene,ortho);
  lastStats={time,draw_calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,tiles:tiles.count,pieces:bases.count+balls.count,effects:effects.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};return lastStats;
 }
 return {draw,reset(){motion.reset();lastDrawKey='';},dispose(){canvas.removeEventListener('webglcontextlost',lostHandler);canvas.removeEventListener('webglcontextrestored',restoreHandler);for(const m of groups){m.geometry.dispose();if(m.material!==material)m.material.dispose();m.dispose();}material.dispose();edgeGeometry.dispose();edges.material.dispose();guide.geometry.dispose();guide.material.dispose();renderer.dispose();}};
}
