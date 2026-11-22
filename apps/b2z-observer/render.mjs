import{trajectoryColors}from'./ball-presentation.mjs';
import {ReservoirOccupancy} from './reservoir-occupancy.mjs';
import {tileIndicator,turretPresentation} from './arena-indicators.mjs';
import {orientSceneCamera} from './isometric-projection.mjs';
import {backingQuality} from './render-quality.mjs';
import {structureGeometry,structureMaterial} from './structure-geometry.mjs';
import {luminousAccent} from './theme.mjs';
import{orientationHeading}from'../../packages/kernels/b2z/deflector-boundary.mjs';
import {audioPose} from './audio-visibility.mjs';
/** UX-12. Shared geometry/instances; 2D authoritative state is never modified. */
import {aimingArrow,movementArrow} from './guide-clearance.mjs';
import * as T from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {wrap} from './camera.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {createTerrainSurface,previewCells} from './terrain-surface.mjs';
import {displayedMotion} from './motion-effects.mjs';
import {displayedBalls} from './ball-presentation.mjs';
import {createReservoirLayer} from './reservoir-render.mjs';
import {reservoirMaskShader} from './reservoir-materials.mjs';
export const RENDER_LIMITS=Object.freeze({tiles:8192,pieces:4096,effects:128,dpr:1.5});
export function createArenaRenderer(canvas,{onError=()=>{},onRestore=()=>{}}={}){
 const quality=backingQuality();
 const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setClearColor('#151d24');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,.1,10000);
 scene.add(new T.HemisphereLight(0xe8eef7,0x49565c,1.3));const sun=new T.DirectionalLight(0xffecd6,2);sun.position.set(-20,40,10);scene.add(sun);
 const surface=createTerrainSurface();let lastFollowed=null,lastHover=null,surfaceData=null,texture=null,surfaceRevision=-1,forceTerrainUpload=false,previewData=[];
 const tokens=getComputedStyle(canvas),token=(name,fallback)=>tokens.getPropertyValue('--'+name).trim()||fallback;
 const eligibleInk=token('eligible','#bddde9');
 const hoverInk=token('hover','#fff4d9'),chosenInk=token('selected','#f5c77e'),invalidInk=token('invalid','#f3a8a1'),previewInk=token('preview','#ffdf9d'),guideInk=token('guide','#ffedc9'),guideUnderInk=token('guide-under','#101317');
 const material=structureMaterial(), cannonGeometry=structureGeometry(), deflectorGeometry=structureGeometry('deflector');
 const dummy=new T.Object3D(),color=new T.Color(),motion=displayedMotion(),facing=turretPresentation();let lost=false,terrainKey='',lastView=null,lastDrawKey='',structureKey='',lastStats=null,previewKey='',sizeKey='';
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{lost=true;onError('The arena shader could not be compiled.');throw Error('Arena shader compilation failed: '+gl.getShaderInfoLog(vertex)+' '+gl.getShaderInfoLog(fragment)+' '+gl.getProgramInfoLog(program));};
 let audioMembership=null,audioGeneration=0,reservoirLayer=null;
 let reservoirView=null,reservoirRevision=-1,verifiedReservoirs=null,displayedReservoirCells=new Set();
 function updateReservoirLayer(occupancy){
  reservoirLayer?.dispose();
  reservoirLayer=occupancy?createReservoirLayer(occupancy,scene,groundMaterial,renderer):null;
  lastDrawKey='';
 }
 function updateVerifiedReservoirs(v){
  if(reservoirView===v&&reservoirRevision===v.reservoirRevision)return;
  reservoirView=v;reservoirRevision=v.reservoirRevision;
  if(!verifiedReservoirs){
   if(!v.reservoirs.size)return;
   verifiedReservoirs=new ReservoirOccupancy(v.width,v.height,v.torus);
   updateReservoirLayer(verifiedReservoirs);
  }
  const added=[],removed=[];
  for(const cell of v.reservoirs)if(!displayedReservoirCells.has(cell))added.push(cell);
  for(const cell of displayedReservoirCells)if(!v.reservoirs.has(cell))removed.push(cell);
  verifiedReservoirs.setCells(removed,false);
  verifiedReservoirs.setCells(added);
  displayedReservoirCells=new Set(v.reservoirs);
 }
 const groups=[];
 function batch(geometry,max=RENDER_LIMITS.pieces,mat=material){const m=new T.InstancedMesh(geometry,mat,max);m.count=0;m.frustumCulled=false;scene.add(m);groups.push(m);return m;}
 const groundMaterial=new T.ShaderMaterial({toneMapped:false,uniforms:{ownership:{value:null},worldSize:{value:new T.Vector2(1,1)},reservoirMask:{value:null},reservoirBounds:{value:new T.Vector4()},reservoirAtlasWidth:{value:1},reservoirWrap:{value:0}},vertexShader:`varying vec2 ground;varying float topFace;void main(){vec4 p=instanceMatrix*vec4(position,1.);ground=p.xz;topFace=normal.y;gl_Position=projectionMatrix*modelViewMatrix*p;}`,fragmentShader:`
 uniform sampler2D ownership;uniform vec2 worldSize;varying vec2 ground;varying float topFace;
 #ifdef USE_RESERVOIRS
 ${reservoirMaskShader}
 uniform vec4 reservoirBounds;
 #endif
 void main(){
 vec2 cell=mod(ground,worldSize);
 #ifdef USE_RESERVOIRS
 if(topFace>.5 && all(greaterThanEqual(cell,reservoirBounds.xy)) && all(lessThan(cell,reservoirBounds.zw)) && reservoirAt(floor(cell),worldSize)>.5)discard;
 #endif
 vec2 f=fract(cell),aa=max(fwidth(ground),vec2(.00001));vec4 t=texture2D(ownership,(floor(cell)+.5)/worldSize);float bits=floor(t.a*255.+.5);
 float grid=1.-smoothstep(0.,1.,min(min(f.x,1.-f.x)/aa.x,min(f.y,1.-f.y)/aa.y));float fade=smoothstep(1.5,6.,1./max(aa.x,aa.y));
 vec4 edge=vec4(mod(bits,2.),mod(floor(bits/2.),2.),mod(floor(bits/4.),2.),mod(floor(bits/8.),2.));
 float boundary=max(max(edge.x*(1.-smoothstep(0.,1.2,f.x/aa.x)),edge.y*(1.-smoothstep(0.,1.2,(1.-f.x)/aa.x))),max(edge.z*(1.-smoothstep(0.,1.2,f.y/aa.y)),edge.w*(1.-smoothstep(0.,1.2,(1.-f.y)/aa.y))));
 vec3 face=t.rgb*.91;float relief=smoothstep(10.,28.,1./max(aa.x,aa.y))*.018;float lip=(1.-smoothstep(0.,.06,min(1.-f.x,1.-f.y)))-(1.-smoothstep(0.,.06,min(f.x,f.y)));vec3 ink=face*(1.+lip*relief);float owned=step(16.,bits);vec3 lit=mix(face*1.13,clamp(t.rgb*1.60,0.,1.),owned);ink=mix(ink,lit,grid*fade*mix(.56,.78,smoothstep(24.,64.,1./max(aa.x,aa.y))));ink=mix(ink,mix(face,vec3(.94),.52),boundary*.72);if(topFace<.5)ink*=.65;gl_FragColor=vec4(ink,1.);}`});
 const tiles=batch(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),25,groundMaterial),bases=batch(cannonGeometry.base),turrets=batch(cannonGeometry.upper),balls=batch(new T.SphereGeometry(.10,12,8),RENDER_LIMITS.pieces,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
 const barrels=turrets; // The complete rotating upper includes the physical barrel.

 const deflectorBases=batch(deflectorGeometry.base),deflectorUppers=batch(deflectorGeometry.upper);
 const structureBatches=new Set([bases,turrets,deflectorBases,deflectorUppers]);
 const expandableBatches=new Set([...structureBatches,balls]);
 const distantMarkers=batch(new T.RingGeometry(.15,.22,4),RENDER_LIMITS.pieces,new T.MeshBasicMaterial({side:T.DoubleSide,toneMapped:false}));
 const boundedTiles=batch(new T.BoxGeometry(1,.10,1),1,groundMaterial);
 const glow=batch(new T.PlaneGeometry(1,1),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float a=exp(-dot(p,p)*5.)*.30;gl_FragColor=vec4(1.,1.,1.,a);}'}));
 const tails=batch(new T.ConeGeometry(.075,1,8),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,vertexShader:'attribute float tailAlpha;varying float fade;void main(){fade=tailAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying float fade;void main(){gl_FragColor=vec4(1.,1.,1.,.50*fade);}'} ));
 tails.geometry.setAttribute('tailAlpha',new T.InstancedBufferAttribute(new Float32Array(RENDER_LIMITS.pieces),1));
 const tailInner=batch(tails.geometry,RENDER_LIMITS.pieces,tails.material.clone());tailInner.material.fragmentShader='varying float fade;void main(){gl_FragColor=vec4(1.,1.,1.,.98*fade);}';
 const ghostMaterial=new T.MeshLambertMaterial({color:0xffe6a4,emissive:0xffd777,emissiveIntensity:.30,flatShading:true,transparent:true,opacity:.48,depthWrite:false}),ghostBarrelMaterial=ghostMaterial;
 const ghostBase=batch(bases.geometry,1,ghostMaterial),ghostTurret=batch(turrets.geometry,1,ghostMaterial);

 const hoverGhost=batch(new T.CylinderGeometry(.29,.34,.13,8),1,new T.MeshBasicMaterial({color:hoverInk,transparent:true,opacity:.12,depthWrite:false}));
 const shadows=batch(new T.CircleGeometry(.31,16),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 shadowUv; void main(){shadowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 shadowUv; void main(){float a=.26*(1.-smoothstep(.08,.5,length(shadowUv-vec2(.5))));gl_FragColor=vec4(.015,.025,.03,a);}'}));
 const boundedDecorations=new Set([shadows,glow,distantMarkers]);
 const rings=batch(new T.RingGeometry(.37,.42,24),512,new T.MeshBasicMaterial({color:previewInk,side:T.DoubleSide}));
 const ballSelection=batch(new T.RingGeometry(.20,.25,24),4,new T.MeshBasicMaterial({side:T.DoubleSide,toneMapped:false}));
 const parts={base:bases,turret:turrets};
 const provisional={base:ghostBase,turret:ghostTurret};
 let themeRevision=0,proposalAccent=luminousAccent(token('player-accent','#c3d1d5'));
 const themeHandler=e=>{proposalAccent=luminousAccent(e.detail?.accent);ghostMaterial.color.set(proposalAccent);ghostBarrelMaterial.color.set(proposalAccent);themeRevision++;};canvas.ownerDocument.addEventListener('b2z-theme',themeHandler);
 const selectionMaterial=structureMaterial(.18);selectionMaterial.polygonOffset=true;selectionMaterial.polygonOffsetFactor=-1;selectionMaterial.polygonOffsetUnits=-1;
 const outlineMaterial=new T.MeshBasicMaterial({color:0x090b0c,side:T.BackSide,transparent:true,opacity:.35,depthWrite:false});
 const highlighted=Object.fromEntries(Object.entries(parts).map(([k,m])=>[k,batch(m.geometry,1,selectionMaterial)]));
 const outlined=Object.fromEntries(Object.entries(parts).map(([k,m])=>[k,batch(m.geometry,2,outlineMaterial)]));for(const mesh of Object.values(outlined))mesh.renderOrder=-1;
 const provisionalDeflector={base:batch(deflectorGeometry.base,1,ghostMaterial),turret:batch(deflectorGeometry.upper,1,ghostMaterial)};
 const outlinedDeflector={base:batch(deflectorGeometry.base,1,outlineMaterial),turret:batch(deflectorGeometry.upper,1,outlineMaterial)};
 for(const mesh of Object.values(outlinedDeflector))mesh.renderOrder=-1;
 /** Every real, selected and provisional part uses these exact physical transforms. */
 function cannon(meshes,x,y,theta,lod=1,palette={},edge=1){
  // A fixed tile-aligned plate, and one rotating upper; LOD never enlarges physics.
  instance(meshes.base,x,y,0,edge,edge,edge,palette.accent??proposalAccent);
  instance(meshes.turret,x,y,0,edge,edge,edge,palette.accent??proposalAccent,[0,-theta,0]);
 }
 const contourUnderlay=batch(new T.RingGeometry(.644,.707,4),8,new T.MeshBasicMaterial({color:guideUnderInk,side:T.DoubleSide,toneMapped:false}));
 const hoverRings=batch(new T.RingGeometry(.662,.688,4),4,new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,toneMapped:false}));
 // The largest case is a selected Diverter, a selected destination and a hovered tile.
 const indicatorGeometry=new LineSegmentsGeometry().setPositions(new Float32Array(18*6)).setColors(new Float32Array(18*6));
 const tileLines=[new LineSegments2(indicatorGeometry,new LineMaterial({color:guideUnderInk,linewidth:5.5,depthTest:false,depthWrite:false,toneMapped:false})),new LineSegments2(indicatorGeometry,new LineMaterial({vertexColors:true,linewidth:2.8,depthTest:false,depthWrite:false,toneMapped:false}))];
 tileLines.forEach((line,i)=>{line.frustumCulled=false;line.renderOrder=3+i;scene.add(line);});
 let tileHighlights=[];const displayedTurrets=[];
 function updateTileLines(camera,highlights){
  tileHighlights=highlights;
  const coords=indicatorGeometry.attributes.instanceStart.data,inks=indicatorGeometry.attributes.instanceColorStart.data;
  let count=0;
  for(const {kind,segments} of highlights){
   color.set(kind==='invalid'?invalidInk:kind==='hover'?hoverInk:kind==='destination'?previewInk:0xffffff);
   for(const segment of segments){
    for(const [x,y] of segment){
     coords.array.set([x,.016,y],3*count);
     inks.array.set([color.r,color.g,color.b],3*count++);
    }
   }
  }
  indicatorGeometry.instanceCount=count/2;
  for(const line of tileLines){line.visible=count>0;line.material.resolution.set(camera.viewport.width,camera.viewport.height);}
  coords.needsUpdate=inks.needsUpdate=true;
 }
 const highlights=batch(new T.PlaneGeometry(.97,.97),RENDER_LIMITS.effects,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'attribute float effectAlpha;varying float fade;void main(){fade=effectAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying float fade;void main(){gl_FragColor=vec4(0.,0.,0.,.20*fade);}'}));highlights.geometry.setAttribute('effectAlpha',new T.InstancedBufferAttribute(new Float32Array(RENDER_LIMITS.effects),1));
 const preview=batch(new T.PlaneGeometry(.85,.85),8192,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide}));
 const guideGeometry=new LineGeometry().setPositions([0,0,0,0,0,0]);
 const marker=new T.Mesh(new T.RingGeometry(.36,.43,4),new T.MeshBasicMaterial({color:previewInk,side:T.DoubleSide,transparent:true,opacity:.75}));marker.rotation.set(-Math.PI/2,0,Math.PI/4);scene.add(marker);
 const guide=new Line2(guideGeometry,new LineMaterial({color:guideInk,linewidth:2,depthTest:true,depthWrite:false,toneMapped:false})),guideUnder=new Line2(guideGeometry,new LineMaterial({color:guideUnderInk,linewidth:4,depthTest:true,depthWrite:false,toneMapped:false}));guideUnder.renderOrder=1;guide.renderOrder=2;scene.add(guideUnder,guide);
 function growAttribute(previous){
  const next=new T.InstancedBufferAttribute(new Float32Array(previous.array.length*2),previous.itemSize,previous.normalized).setUsage(previous.usage);
  next.array.set(previous.array);
  return next;
 }
 function instance(mesh,x,z,h,sx=1,sy=1,sz=1,tint=null,rotation=null){
  if(mesh.count>=mesh.instanceMatrix.count){
   if(boundedDecorations.has(mesh))return;
   if(!expandableBatches.has(mesh))throw Error('Arena instance capacity exceeded');
   const matrices=growAttribute(mesh.instanceMatrix),colors=mesh.instanceColor&&growAttribute(mesh.instanceColor);
   mesh.dispose();
   mesh.instanceMatrix=matrices;mesh.instanceColor=colors;
  }
  dummy.position.set(x,h,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rotation?.[0]??0,rotation?.[1]??0,rotation?.[2]??0);
  if(mesh===glow)dummy.quaternion.copy(ortho.quaternion);
  dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);
  if(tint)mesh.setColorAt(mesh.count,color.set(tint));
  mesh.count++;
 }
 function visible(camera,x,y,margin=2){const p=camera.screen(x,y);return p.x>=-margin*camera.scale&&p.y>=-margin*camera.scale&&p.x<=camera.viewport.width+margin*camera.scale&&p.y<=camera.viewport.height+margin*camera.scale;}
 const lostHandler=e=>{e.preventDefault();lost=true;motion.reset();onError('Graphics context lost. Waiting to restore the arena.');};
 const restoreHandler=()=>{quality.resetTime();structureKey='';lost=false;terrainKey='';lastDrawKey='';sizeKey='';forceTerrainUpload=true;texture?.clearUpdateRanges();if(texture)texture.needsUpdate=true;motion.reset();reservoirLayer?.restore();onRestore();};
 canvas.addEventListener('webglcontextlost',lostHandler);canvas.addEventListener('webglcontextrestored',restoreHandler);
 function renderFrame(v,camera,{time=0,selected=null,selectedTile=null,selectedDeflector=null,selection=null,hover=null,aim=null,followed=null,selectedBalls=null,points=null,guideObstacles=[],reducedMotion=false,audioEligible=false,wallMs=performance.now(),frameTime=null}={}){
  if(lost)return;lastHover=hover;lastFollowed=followed;
  const facingRevision=facing.sample(v.cannons,aim,wallMs,reducedMotion);
  const drawKey=[themeRevision,facingRevision,audioEligible,camera.x,camera.y,camera.scale,camera.angle,camera.viewport.width,camera.viewport.height,time,v.territoryRevision,v.entityKey(),selected,selectedTile,selectedDeflector,selection?.deflector?.orientation,followed,selectedBalls&&JSON.stringify([...selectedBalls]),hover?.kind,hover?.id,hover?.cell,selection?.key,selection?.cell,selection?.cells?.length,aim?.cannon.cell,aim?.angle,JSON.stringify(guideObstacles),reducedMotion,devicePixelRatio].join('/');
  if(v.reservoirs)updateVerifiedReservoirs(v);
  else if(verifiedReservoirs){verifiedReservoirs=null;reservoirView=null;displayedReservoirCells.clear();updateReservoirLayer(null);}
  const reservoirRefresh=reservoirLayer?.prepare(camera,{wallMs,frameTime,reducedMotion,hidden:canvas.ownerDocument.hidden});
  if(lastView===v&&lastDrawKey===drawKey&&!lastStats?.effects&&!lastStats?.tails&&!reservoirRefresh)return lastStats;
  lastDrawKey=drawKey;quality.observe(frameTime);
  const {width,height}=camera.viewport,cannonLod=1;const dpr=Math.min(devicePixelRatio||1,RENDER_LIMITS.dpr,Math.sqrt(quality.pixels/(width*height))),size=[width,height,dpr].join('/');if(size!==sizeKey){sizeKey=size;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
  guide.material.resolution.set(width,height);guideUnder.material.resolution.set(width,height);
  const halfW=width/camera.scale/2,halfH=height/camera.scale/2;
  Object.assign(ortho,{left:-halfW,right:halfW,top:halfH,bottom:-halfH});orientSceneCamera(ortho,camera);
  const copies=camera.copies(1),bounds=camera.bounds();
  // One exact texture covers every canonical cell; camera LOD never changes owners.
  const key=[camera.x,camera.y,camera.scale,camera.angle,width,height,v.torus,v.territoryRevision,v.entityKey()].join('/');
  const nextSurface=surface.get(v),changed=nextSurface.revision!==surfaceRevision,updateTerrain=key!==terrainKey;terrainKey=key;lastView=v;surfaceData=nextSurface;
  if(!texture||texture.image.width!==v.width||texture.image.height!==v.height){texture?.dispose();texture=new T.DataTexture(surfaceData.rgba,v.width,v.height);texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;groundMaterial.uniforms.ownership.value=texture;groundMaterial.uniforms.worldSize.value.set(v.width,v.height);}
  else if(forceTerrainUpload){texture.clearUpdateRanges();texture.needsUpdate=true;}
  else if(changed){texture.clearUpdateRanges();for(const r of surfaceData.ranges)texture.addUpdateRange(r.start,r.count);texture.needsUpdate=true;}
  forceTerrainUpload=false;surfaceRevision=surfaceData.revision;
  if(updateTerrain){tiles.count=boundedTiles.count=0;if(v.torus){for(const copy of copies)instance(tiles,v.width/2+copy.x,v.height/2+copy.y,0,v.width,1,v.height);}else instance(boundedTiles,v.width/2,v.height/2,-.05,v.width,1,v.height);}
  const nextPreviewKey=[key,selection?.key,selection?.id,selection?.cell,selection?.cells?.join(',')].join('/'),updatePreview=nextPreviewKey!==previewKey;previewKey=nextPreviewKey;
  const nextStructureKey=[key,[...v.cannons.values()].map(c=>[c.id,c.heading,c.generation].join(':')).join(','),[...v.deflectors?.values()??[]].map(d=>[d.id,d.generation,d.cell,d.owner,d.heading,d.orientation].join(':')).join(',')].join('/'),updateStructures=nextStructureKey!==structureKey;structureKey=nextStructureKey;
  for(const g of groups)if(g!==tiles&&g!==boundedTiles&&(g!==preview||updatePreview)&&(!structureBatches.has(g)||updateStructures))g.count=0;
  points??=displayedBalls(v,time);
  const effects=motion.sample(points,{time,wallMs,width:v.width,height:v.height,torus:v.torus,reducedMotion,pixelsPerCell:camera.scale,basis:camera.basis,trajectories:v.balls,knots:v.motionKnots});
  if(updatePreview)previewData=previewCells(v,camera,selection);
  let turretIndex=0,turretBytes=0;
  {
   const audioBalls=audioEligible?new Map():null,audioCannons=audioEligible?new Map():null;audioMembership=null;
   for(const c of v.cannons.values()){
    const position=camera.cellPoint(c.cell),x=position.x,y=position.y;if(!visible(camera,x,y))continue;
    const tint=updateStructures||c.id===selected||camera.scale<8?luminousAccent(v.color(c.id)):null,lod=cannonLod;
    instance(shadows,x+.06,y+.07,.006,lod,1,lod,null,[-Math.PI/2,0,0]);
    const theta=facing.angle(c.id);
    if(audioEligible&&bases.count<RENDER_LIMITS.pieces&&audioBalls.size+audioCannons.size<4096)audioCannons.set(c.id,{x,y});
    if(updateStructures)cannon(parts,x,y,theta,lod,{accent:tint});
    else{
     const angle=displayedTurrets[turretIndex];
     if(angle!==theta){
      dummy.position.set(x,0,y);dummy.scale.setScalar(1);dummy.rotation.set(0,-theta,0);
      dummy.updateMatrix();turrets.setMatrixAt(turretIndex,dummy.matrix);
      turrets.instanceMatrix.addUpdateRange(turretIndex*16,16);turretBytes+=64;
     }
    }
    displayedTurrets[turretIndex++]=theta;
    if(camera.scale<8)instance(distantMarkers,x,y,.02,8/camera.scale,1,8/camera.scale,tint,[-Math.PI/2,0,Math.PI/4]);
    if(c.id===selected){cannon(outlined,x,y,theta,lod,{},1.055);cannon(highlighted,x,y,theta,lod,{accent:tint});}
    if(c.id===selected||hover?.kind==='cannon'&&hover.id===c.id){instance(contourUnderlay,x,y,.019,lod,1,lod,null,[-Math.PI/2,0,Math.PI/4]);instance(hoverRings,x,y,.02,lod,1,lod,c.id===selected?tint:hoverInk,[-Math.PI/2,0,Math.PI/4]);}

   }
   // Only a validated observer view may supply authoritative structures. Current
   // Rules7/11 views have no Deflectors; render fixtures are labelled separately.
   for(const d of v.deflectors?.values()??[]){
    const p=camera.cellPoint(d.cell);if(!visible(camera,p.x,p.y))continue;
    const tint=updateStructures?luminousAccent(v.playerColor(d.owner)):null,[dx,dy]=heading(d.orientation?orientationHeading(d.orientation):d.heading),theta=Math.atan2(dy,dx);
    instance(shadows,p.x+.025,p.y+.03,.006,1,1,1,null,[-Math.PI/2,0,0]);
    if(updateStructures){instance(deflectorBases,p.x,p.y,0,1,1,1,tint);instance(deflectorUppers,p.x,p.y,0,1,1,1,tint,[0,-theta,0]);}
   }
   for(const b of points){const p=camera.point(b.x,b.y),x=p.x,y=p.y;if(!visible(camera,x,y))continue;if(audioEligible&&balls.count<RENDER_LIMITS.pieces&&audioBalls.size+audioCannons.size<4096)audioBalls.set(b.id,{x,y});const lod=Math.max(1,10/camera.scale);instance(shadows,x+.04,y+.05,.008,lod*.6,1,lod*.6,null,[-Math.PI/2,0,0]);instance(glow,x,y,.14*lod,lod*.65,lod*.65,1,null,[-Math.atan(1/Math.SQRT2),Math.PI/4,0]);instance(balls,x,y,.14*lod,lod,lod,lod);const ink=trajectoryColors[selectedBalls?.get(b.id)];if(ink||b.id===followed||hover?.kind==='ball'&&hover.id===b.id)instance(ballSelection,x,y,.018,lod,1,lod,ink??chosenInk,[-Math.PI/2,0,0]);}
   for(const t of motion.tails(wallMs).slice(-RENDER_LIMITS.pieces)){tails.geometry.attributes.tailAlpha.setX(tails.count,t.alpha);const p=camera.point(t.x,t.y),length=t.distance,theta=Math.atan2(t.dy,t.dx);instance(tails,p.x-Math.cos(theta)*length/2,p.y-Math.sin(theta)*length/2,.14,1,length,1,null,[0,-theta,-Math.PI/2]);instance(tailInner,p.x-Math.cos(theta)*length/2,p.y-Math.sin(theta)*length/2,.14,.60,length,.60,null,[0,-theta,-Math.PI/2]);}
   for(const e of effects){highlights.geometry.attributes.effectAlpha.setX(highlights.count,e.alpha);const p=camera.cellPoint(e.cell),x=p.x,y=p.y;if(visible(camera,x,y))instance(highlights,x,y,.012,1,1,1,null,[-Math.PI/2,0,0]);}
   if(updatePreview)for(const cell of previewData){if(cell===selection?.cell)continue;const p=camera.cellPoint(cell),x=p.x,y=p.y;if(visible(camera,x,y)){const a=selection?.anchor,dx=a===undefined?0:Math.abs(cell%v.width-a%v.width),dy=a===undefined?0:Math.abs(Math.floor(cell/v.width)-Math.floor(a/v.width)),near=a!==undefined&&Math.min(dx,v.width-dx)+Math.min(dy,v.height-dy)===1;instance(preview,x,y,.02,1,1,1,near?previewInk:eligibleInk,[-Math.PI/2,0,0]);}}
   if(audioEligible)audioMembership={balls:audioBalls,cannons:audioCannons,pose:audioPose(camera),time};
  }
  const markCell=aim&&aim.cannon.id!==null&&v.cannons.get(aim.cannon.id)?.cell!==aim.cannon.cell?aim.cannon.cell:null;marker.visible=markCell!==null;
  if(marker.visible){const p=camera.cellPoint(markCell);marker.position.set(p.x,.03,p.y);}
  if(aim&&(aim.cannon.id===null||v.cannons.get(aim.cannon.id)?.cell!==aim.cannon.cell)){const p=camera.cellPoint(aim.cannon.cell),a=aim.angle*Math.PI/180;cannon(aim.kind==='deflect'?outlinedDeflector:outlined,p.x,p.y,a,cannonLod,{},1.07);cannon(aim.kind==='deflect'?provisionalDeflector:provisional,p.x,p.y,a,cannonLod);}

  const move=(selection?.id!==undefined||selection?.deflector)&&selection.cell!==null&&selection.legal?.(selection.cell)?selection:null,source=move&&(move.deflector??move.reference?.cannons.find(c=>c.id===move.id)??v.cannons.get(move.id));const arrow=aimingArrow(camera,aim,guideObstacles)??(source?movementArrow(camera,source.cell,move.cell):null);guide.visible=guideUnder.visible=Boolean(arrow);if(arrow)guideGeometry.setPositions(arrow.world.flatMap(([x,y])=>[x,arrow.height,y]));
  const tileContours=[];
  const contour=(cell,kind)=>{if(cell!=null){const next=tileIndicator(camera,cell,kind);if(next)tileContours.push(next);}};
  if(selectedTile!==null&&!selection)contour(selectedTile,'selected');
  const activeDeflector=v.deflectors?.get(selectedDeflector);
  if(activeDeflector&&activeDeflector.cell!==selection?.cell)contour(activeDeflector.cell,'selected');
  if(!selection&&['tile','deflector'].includes(hover?.kind)&&hover.cell!==selectedTile&&hover.cell!==activeDeflector?.cell)contour(hover.cell,'hover');
  if(move?.deflector){
   const p=camera.cellPoint(move.cell),angle=orientationHeading(move.deflector.orientation)*Math.PI/32768;
   cannon(outlinedDeflector,p.x,p.y,angle,cannonLod,{},1.07);
   cannon(provisionalDeflector,p.x,p.y,angle,cannonLod);
  }
  if(selection){const legal=n=>selection.legal?selection.legal(n):selection.cells.includes(n);contour(selection.cell,selection.cell!==null&&!legal(selection.cell)?'invalid':'destination');
   if(selection.cell!==null&&selection.id!==undefined&&legal(selection.cell)){const p=camera.cellPoint(selection.cell),c=selection.reference?.cannons.find(c=>c.id===selection.id)??v.cannons.get(selection.id),[dx,dy]=heading(c?.heading??0),a=Math.atan2(dy,dx);cannon(outlined,p.x,p.y,a,cannonLod,{},1.07);cannon(provisional,p.x,p.y,a,cannonLod);}
   if(hover?.cell!=null&&hover.cell!==selection.cell&&hover.kind==='place'){
    contour(hover.cell,'hover');
    if(hover.kind==='place'){const p=camera.cellPoint(hover.cell);instance(hoverGhost,p.x,p.y,.09);}
   }
  }

  updateTileLines(camera,tileContours);
  if(turretBytes)turrets.instanceMatrix.needsUpdate=true;
  for(const mesh of groups){if(structureBatches.has(mesh)&&!updateStructures)continue;if((mesh===tiles||mesh===boundedTiles)&&!updateTerrain||mesh===preview&&!updatePreview)continue;if(mesh.count){mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.addUpdateRange(0,mesh.count*3);mesh.instanceColor.needsUpdate=true;}}}
  if(tails.count)tails.geometry.attributes.tailAlpha.needsUpdate=true;if(highlights.count)highlights.geometry.attributes.effectAlpha.needsUpdate=true;
  reservoirLayer?.preflight(ortho);
  renderer.render(scene,ortho);reservoirLayer?.drawn();if(audioMembership)audioMembership.generation=++audioGeneration;
  lastStats={time,deflectors:deflectorBases.count,structure_triangles:(cannonGeometry.base.index.count+cannonGeometry.upper.index.count)/3*bases.count+(deflectorGeometry.base.index.count+deflectorGeometry.upper.index.count)/3*deflectorBases.count,pixel_budget:quality.pixels,buffer_width:canvas.width,buffer_height:canvas.height,structure_uploads:updateStructures,instance_upload_bytes:groups.reduce((n,g)=>n+(structureBatches.has(g)&&!updateStructures?0:g.count*(64+(g.instanceColor?12:0))),turretBytes),draw_calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,tiles:tiles.count,pieces:bases.count+balls.count,effects:effects.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,terrain_revision:surfaceData?.revision,terrain_bytes:surfaceData?.rgba.byteLength,terrain_dirty_rows:surfaceData?.dirtyRows.length,preview_cells:previewData.length,tails:tails.count,motion:motion.inspect()};return lastStats;
 }
 function draw(...args){audioMembership=null;try{return renderFrame(...args);}catch(error){audioMembership=null;throw error;}}
 return {
  // Local presentation data only. Certified observations never supply this layer.
  setReservoirs:updateReservoirLayer,
  reservoirs:()=>reservoirLayer?.inspect()??null,
  audioMembership:()=>lost?null:audioMembership,draw,surface:()=>surfaceData,previews:()=>previewData,inspect(){let span=0;const a=preview.instanceMatrix.array;for(let i=0;i<preview.count;i++)span=Math.max(span,Math.hypot(a[i*16],a[i*16+1],a[i*16+2]),Math.hypot(a[i*16+4],a[i*16+5],a[i*16+6]));return{ghostKind:provisionalDeflector.base.count?'deflector':ghostBase.count?'cannon':null,deflectorGhostParts:Object.fromEntries(Object.entries(provisionalDeflector).map(([k,m])=>[k,[...m.instanceMatrix.array.slice(0,m.count*16)]])),ghostStyle:{wireframe:ghostMaterial.wireframe,opacity:ghostMaterial.opacity,depthTest:ghostMaterial.depthTest,depthWrite:ghostMaterial.depthWrite,body:ghostMaterial.color.getHexString(),barrel:ghostBarrelMaterial.color.getHexString()},guideDepth:{test:guide.material.depthTest,write:guide.material.depthWrite,height:guideGeometry.attributes.instanceStart.getY(0)},tileHighlights,selectedContours:highlighted.base.count,selectedBodies:highlighted.base.count,cannonParts:Object.fromEntries(Object.entries(parts).map(([k,m])=>[k,[...m.instanceMatrix.array.slice(0,m.count*16)]])),ghostParts:Object.fromEntries(Object.entries(provisional).map(([k,m])=>[k,[...m.instanceMatrix.array.slice(0,m.count*16)]])),followed:lastFollowed, surfaceBound:texture?.image.data===surfaceData?.rgba,previewSpan:span,hover:lastHover,barrels:[...barrels.instanceMatrix.array.slice(0,barrels.count*16)],guideEnd:guide.visible?[guideGeometry.attributes.instanceEnd.getX(0),guideGeometry.attributes.instanceEnd.getZ(0)]:null,guide:guide.visible?[guideGeometry.attributes.instanceStart.getX(0),guideGeometry.attributes.instanceStart.getZ(0)]:null,ghost:ghostBase.count?[ghostBase.instanceMatrix.array[12],ghostBase.instanceMatrix.array[14]]:null};},reset(){audioMembership=null;motion.reset();facing.reset();lastDrawKey='';structureKey='';},dispose(){reservoirLayer?.dispose();canvas.ownerDocument.removeEventListener('b2z-theme',themeHandler);canvas.removeEventListener('webglcontextlost',lostHandler);canvas.removeEventListener('webglcontextrestored',restoreHandler);const disposedGeometry=new Set(),disposedMaterials=new Set();for(const m of groups){if(!disposedGeometry.has(m.geometry)){m.geometry.dispose();disposedGeometry.add(m.geometry);}if(m.material!==material&&!disposedMaterials.has(m.material)){m.material.dispose();disposedMaterials.add(m.material);}m.dispose();}material.dispose();marker.geometry.dispose();marker.material.dispose();indicatorGeometry.dispose();for(const line of tileLines)line.material.dispose();guide.geometry.dispose();guide.material.dispose();guideUnder.material.dispose();texture?.dispose();renderer.dispose();}};
}
