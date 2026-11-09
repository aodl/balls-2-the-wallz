/** UX-12. Shared geometry/instances; 2D authoritative state is never modified. */
import * as T from 'three';
import {wrap} from './camera.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {createTerrainSurface,previewCells} from './terrain-surface.mjs';
import {displayedMotion} from './motion-effects.mjs';
export const RENDER_LIMITS=Object.freeze({tiles:8192,pieces:4096,effects:128,dpr:2});
export function createArenaRenderer(canvas,{onError=()=>{},onRestore=()=>{}}={}){
 const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setClearColor('#151d24');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,.1,10000);
 scene.add(new T.HemisphereLight(0xe8eef7,0x49565c,1.3));const sun=new T.DirectionalLight(0xffecd6,2);sun.position.set(-20,40,10);scene.add(sun);
 const surface=createTerrainSurface();let surfaceData=null,texture=null,surfaceRevision=-1,forceTerrainUpload=false,previewData=[];
 const material=new T.MeshLambertMaterial({flatShading:true});
 const dummy=new T.Object3D(),color=new T.Color(),motion=displayedMotion();let lost=false,terrainKey='',lastView=null,lastDrawKey='',lastStats=null,effectUntil=0,previewKey='',sizeKey='';
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{lost=true;onError('The arena shader could not be compiled.');throw Error('Arena shader compilation failed: '+gl.getShaderInfoLog(vertex)+' '+gl.getShaderInfoLog(fragment)+' '+gl.getProgramInfoLog(program));};
 const groups=[];
 function batch(geometry,max=RENDER_LIMITS.pieces,mat=material){const m=new T.InstancedMesh(geometry,mat,max);m.count=0;m.frustumCulled=false;scene.add(m);groups.push(m);return m;}
 const groundMaterial=new T.ShaderMaterial({toneMapped:false,uniforms:{ownership:{value:null},worldSize:{value:new T.Vector2(1,1)}},vertexShader:`varying vec2 ground;varying float topFace;void main(){vec4 p=instanceMatrix*vec4(position,1.);ground=p.xz;topFace=normal.y;gl_Position=projectionMatrix*modelViewMatrix*p;}`,fragmentShader:`
 uniform sampler2D ownership;uniform vec2 worldSize;varying vec2 ground;varying float topFace;
 void main(){vec2 cell=mod(ground,worldSize),f=fract(cell),aa=max(fwidth(cell),vec2(.00001));vec4 t=texture2D(ownership,(floor(cell)+.5)/worldSize);float bits=floor(t.a*255.+.5);
 float grid=1.-smoothstep(0.,1.,min(min(f.x,1.-f.x)/aa.x,min(f.y,1.-f.y)/aa.y));float fade=smoothstep(1.5,6.,1./max(aa.x,aa.y));
 vec4 edge=vec4(mod(bits,2.),mod(floor(bits/2.),2.),mod(floor(bits/4.),2.),mod(floor(bits/8.),2.));
 float boundary=max(max(edge.x*(1.-smoothstep(0.,1.2,f.x/aa.x)),edge.y*(1.-smoothstep(0.,1.2,(1.-f.x)/aa.x))),max(edge.z*(1.-smoothstep(0.,1.2,f.y/aa.y)),edge.w*(1.-smoothstep(0.,1.2,(1.-f.y)/aa.y))));
 vec3 ink=mix(t.rgb,t.rgb*.57,grid*fade*.65);ink=mix(ink,mix(t.rgb,vec3(.94),.58),boundary*.78);if(topFace<.5)ink*=.65;gl_FragColor=vec4(ink,1.);}`});
 const tiles=batch(new T.BoxGeometry(1,.10,1),25,groundMaterial),bases=batch(new T.CylinderGeometry(.29,.34,.13,8)),turrets=batch(new T.SphereGeometry(.22,12,8)),barrels=batch(new T.CylinderGeometry(.085,.10,.45,10)),balls=batch(new T.SphereGeometry(.10,12,8),RENDER_LIMITS.pieces,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
 const glow=batch(new T.PlaneGeometry(1,1),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float a=exp(-dot(p,p)*5.)*.30;gl_FragColor=vec4(1.,1.,1.,a);}'}));
 const tails=batch(new T.ConeGeometry(.075,1,8),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,vertexShader:'attribute float tailAlpha;varying float fade;void main(){fade=tailAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying float fade;void main(){gl_FragColor=vec4(1.,1.,1.,.23*fade);}'} ));
 tails.geometry.setAttribute('tailAlpha',new T.InstancedBufferAttribute(new Float32Array(RENDER_LIMITS.pieces),1));
 const ghostMaterial=new T.MeshBasicMaterial({color:0xffe1a5,transparent:true,opacity:.45,depthWrite:false,toneMapped:false}),ghostBase=batch(bases.geometry,1,ghostMaterial),ghostTurret=batch(turrets.geometry,1,ghostMaterial),ghostBarrel=batch(barrels.geometry,1,ghostMaterial);
 const shadows=batch(new T.CircleGeometry(.31,16),RENDER_LIMITS.pieces,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 shadowUv; void main(){shadowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 shadowUv; void main(){float a=.26*(1.-smoothstep(.08,.5,length(shadowUv-vec2(.5))));gl_FragColor=vec4(.015,.025,.03,a);}'}));
 const rings=batch(new T.RingGeometry(.37,.42,24),512,new T.MeshBasicMaterial({color:0xffdf9d,side:T.DoubleSide}));
 const highlights=batch(new T.PlaneGeometry(.87,.87),RENDER_LIMITS.effects,new T.MeshBasicMaterial({color:0xffffdc,transparent:true,opacity:.15,depthWrite:false}));
 const preview=batch(new T.PlaneGeometry(.85,.85),8192,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));
 const guideGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
 const marker=new T.Mesh(new T.RingGeometry(.36,.43,4),new T.MeshBasicMaterial({color:0xffdf9d,side:T.DoubleSide,transparent:true,opacity:.75}));marker.rotation.set(-Math.PI/2,0,Math.PI/4);scene.add(marker);
 const guide=new T.Line(guideGeometry,new T.LineDashedMaterial({color:0xffdf9d,dashSize:.18,gapSize:.12}));scene.add(guide);
 function instance(mesh,x,z,h,sx=1,sy=1,sz=1,tint=null,rotation=null){if(mesh.count>=mesh.instanceMatrix.count)return;dummy.position.set(x,h,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rotation?.[0]??0,rotation?.[1]??0,rotation?.[2]??0);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);if(tint)mesh.setColorAt(mesh.count,color.set(tint));mesh.count++;}
 function visible(camera,x,y,margin=2){const p=camera.screen(x,y);return p.x>=-margin*camera.scale&&p.y>=-margin*camera.scale&&p.x<=camera.viewport.width+margin*camera.scale&&p.y<=camera.viewport.height+margin*camera.scale;}
 const lostHandler=e=>{e.preventDefault();lost=true;motion.reset();onError('Graphics context lost. Waiting to restore the arena.');};
 const restoreHandler=()=>{lost=false;terrainKey='';lastDrawKey='';sizeKey='';forceTerrainUpload=true;texture?.clearUpdateRanges();if(texture)texture.needsUpdate=true;motion.reset();onRestore();};
 canvas.addEventListener('webglcontextlost',lostHandler);canvas.addEventListener('webglcontextrestored',restoreHandler);
 function draw(v,camera,{time=0,selected=null,selection=null,aim=null,reducedMotion=false,wallMs=performance.now()}={}){
  if(lost)return;
  const drawKey=[camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,time,v.territoryRevision,v.entityKey(),selected,selection?.key,selection?.cell,selection?.cells?.length,aim?.cannon.cell,aim?.angle,reducedMotion,devicePixelRatio].join('/');
  if(lastView===v&&lastDrawKey===drawKey&&wallMs>effectUntil&&!lastStats?.effects&&!lastStats?.tails)return lastStats;
  if(time!==lastStats?.time)effectUntil=wallMs+400;lastDrawKey=drawKey;
  const {width,height}=camera.viewport;const dpr=Math.min(devicePixelRatio||1,RENDER_LIMITS.dpr,Math.sqrt(1000000/(width*height))),size=[width,height,dpr].join('/');if(size!==sizeKey){sizeKey=size;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
  const halfW=width/camera.scale/2,halfH=height/camera.scale/2;
  Object.assign(ortho,{left:-halfW,right:halfW,top:halfH,bottom:-halfH});ortho.position.set(camera.x+2500,2500,camera.y+2500);ortho.lookAt(camera.x,0,camera.y);ortho.updateProjectionMatrix();ortho.updateMatrixWorld();
  const copies=camera.copies(1),bounds=camera.bounds();
  // One exact texture covers every canonical cell; camera LOD never changes owners.
  const key=[camera.x,camera.y,camera.scale,width,height,v.territoryRevision,v.entityKey()].join('/');
  const nextSurface=surface.get(v),changed=nextSurface.revision!==surfaceRevision,updateTerrain=key!==terrainKey;terrainKey=key;lastView=v;surfaceData=nextSurface;
  if(!texture||texture.image.width!==v.width||texture.image.height!==v.height){texture?.dispose();texture=new T.DataTexture(surfaceData.rgba,v.width,v.height);texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;groundMaterial.uniforms.ownership.value=texture;groundMaterial.uniforms.worldSize.value.set(v.width,v.height);}
  else if(forceTerrainUpload){texture.clearUpdateRanges();texture.needsUpdate=true;}
  else if(changed){for(const r of surfaceData.ranges)texture.addUpdateRange(r.start,r.count);texture.needsUpdate=true;}
  forceTerrainUpload=false;surfaceRevision=surfaceData.revision;
  if(updateTerrain){tiles.count=0;for(const copy of copies)instance(tiles,v.width/2+copy.x,v.height/2+copy.y,-.05,v.width,1,v.height);}
  const nextPreviewKey=[key,selection?.key,selection?.id,selection?.cell,selection?.cells?.join(',')].join('/'),updatePreview=nextPreviewKey!==previewKey;previewKey=nextPreviewKey;
  for(const g of groups)if(g!==tiles&&(g!==preview||updatePreview))g.count=0;
  const points=[];
  for(const b of v.balls.values()){let x=(Number(b.x0)+b.vx*time)/1024,y=(Number(b.y0)+b.vy*time)/1024;if(v.torus){x=wrap(x,v.width);y=wrap(y,v.height);}points.push({id:b.id,x,y,owner:b.owner});}
  const effects=motion.sample(points,{time,wallMs,width:v.width,height:v.height,torus:v.torus,reducedMotion});
  if(updatePreview)previewData=previewCells(v,camera,selection);
  {
   for(const c of v.cannons.values()){
    const position=camera.cellPoint(c.cell),x=position.x,y=position.y;if(!visible(camera,x,y))continue;
    const tint=v.color(c.id),lod=camera.scale<4?Math.min(8,4/camera.scale):1;
    instance(shadows,x+.06,y+.07,.006,lod,1,lod,null,[-Math.PI/2,0,0]);
    instance(bases,x,y,.09,lod,lod,lod,tint);instance(turrets,x,y,.24,lod,lod*.8,lod,tint);
    const [dx,dy]=heading(Number.isInteger(c.heading)?c.heading:0),theta=Math.atan2(dy,dx),length=.29*lod;
    instance(barrels,x+Math.cos(theta)*length,y+Math.sin(theta)*length,.27,lod,lod,lod,'#b9c4c8',[0,-theta,Math.PI/2]);
    if(c.id===selected)instance(rings,x,y,.015,lod,1,lod,null,[-Math.PI/2,0,0]);
   }
   for(const b of points){const p=camera.point(b.x,b.y),x=p.x,y=p.y;if(!visible(camera,x,y))continue;const lod=Math.max(1,10/camera.scale);instance(shadows,x+.04,y+.05,.008,lod*.6,1,lod*.6,null,[-Math.PI/2,0,0]);instance(glow,x,y,.13*lod,lod*.65,lod*.65,1,null,[-Math.PI/2,0,0]);instance(balls,x,y,.14*lod,lod,lod,lod);}
   for(const t of motion.tails(wallMs)){tails.geometry.attributes.tailAlpha.setX(tails.count,t.alpha);const p=camera.point(t.x,t.y),length=Math.min(.6,Math.max(.12,t.distance*3))*t.alpha,theta=Math.atan2(t.dy,t.dx);instance(tails,p.x-Math.cos(theta)*length/2,p.y-Math.sin(theta)*length/2,.14,1,length,1,null,[0,-theta,-Math.PI/2]);}
   for(const e of effects){const p=camera.cellPoint(e.cell),x=p.x,y=p.y;if(visible(camera,x,y))instance(highlights,x,y,.012,1,1,1,'#'+color.set('#ffffdc').lerp(new T.Color('#39484e'),1-e.alpha).getHexString(),[-Math.PI/2,0,0]);}
   if(updatePreview)for(const cell of previewData){const p=camera.cellPoint(cell),x=p.x,y=p.y;if(visible(camera,x,y)){const a=selection?.anchor,dx=a===undefined?0:Math.abs(cell%v.width-a%v.width),dy=a===undefined?0:Math.abs(Math.floor(cell/v.width)-Math.floor(a/v.width)),near=a!==undefined&&Math.min(dx,v.width-dx)+Math.min(dy,v.height-dy)===1;instance(preview,x,y,.02,1,1,1,near?'#ffdf9d':'#bddde9',[-Math.PI/2,0,0]);}}
  }
  const markCell=selection?.cell??(aim&&v.cannons.get(aim.cannon.id)?.cell!==aim.cannon.cell?aim.cannon.cell:null);marker.visible=markCell!==null;
  if(marker.visible){const p=camera.cellPoint(markCell);marker.position.set(p.x,.03,p.y);}
  if(aim?.cannon.id===null){const p=camera.cellPoint(aim.cannon.cell),a=aim.angle*Math.PI/180;instance(ghostBase,p.x,p.y,.09);instance(ghostTurret,p.x,p.y,.24);instance(ghostBarrel,p.x+Math.cos(a)*.29,p.y+Math.sin(a)*.29,.27,1,1,1,null,[0,-a,Math.PI/2]);}
  guide.visible=Boolean(aim);if(aim){const p=camera.cellPoint(aim.cannon.cell),a=Number(aim.angle)*Math.PI/180,positions=guide.geometry.attributes.position;positions.setXYZ(0,p.x,.025,p.y);positions.setXYZ(1,p.x+Math.cos(a)*2,.025,p.y+Math.sin(a)*2);positions.needsUpdate=true;guide.computeLineDistances();}
  for(const mesh of groups){if(mesh===tiles&&!updateTerrain||mesh===preview&&!updatePreview)continue;if(mesh.count){mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.addUpdateRange(0,mesh.count*3);mesh.instanceColor.needsUpdate=true;}}}
  if(tails.count)tails.geometry.attributes.tailAlpha.needsUpdate=true;
  renderer.render(scene,ortho);
  lastStats={time,draw_calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,tiles:tiles.count,pieces:bases.count+balls.count,effects:effects.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,terrain_revision:surfaceData?.revision,terrain_bytes:surfaceData?.rgba.byteLength,terrain_dirty_rows:surfaceData?.dirtyRows.length,preview_cells:previewData.length,tails:tails.count};return lastStats;
 }
 return {draw,surface:()=>surfaceData,previews:()=>previewData,inspect(){let span=0;const a=preview.instanceMatrix.array;for(let i=0;i<preview.count;i++)span=Math.max(span,Math.hypot(a[i*16],a[i*16+1],a[i*16+2]),Math.hypot(a[i*16+4],a[i*16+5],a[i*16+6]));return{surfaceBound:texture?.image.data===surfaceData?.rgba,previewSpan:span,guide:guide.visible?[guideGeometry.attributes.position.getX(0),guideGeometry.attributes.position.getZ(0)]:null,ghost:ghostBase.count?[ghostBase.instanceMatrix.array[12],ghostBase.instanceMatrix.array[14]]:null};},reset(){motion.reset();lastDrawKey='';},dispose(){canvas.removeEventListener('webglcontextlost',lostHandler);canvas.removeEventListener('webglcontextrestored',restoreHandler);for(const m of groups){m.geometry.dispose();if(m.material!==material)m.material.dispose();m.dispose();}material.dispose();marker.geometry.dispose();marker.material.dispose();guide.geometry.dispose();guide.material.dispose();texture?.dispose();renderer.dispose();}};
}
