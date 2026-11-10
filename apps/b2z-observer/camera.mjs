/** Local presentation in cell coordinates. No simulation or network authority. */
export const wrap=(n,size)=>((n%size)+size)%size;
// The viewport, inverse projected to the ground, clipped to a canonical world.
export function clipPolygon(points,left,top,right,bottom){
  let p=points;
  for(const [axis,edge,sign]of [['x',left,1],['x',right,-1],['y',top,1],['y',bottom,-1]]){
    const next=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],inside=v=>sign*(v[axis]-edge)>=0,ai=inside(a),bi=inside(b);
      if(ai)next.push(a);if(ai!==bi){const t=(edge-a[axis])/(b[axis]-a[axis]);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}
    p=next;if(!p.length)break;
  }return p;
}
export const polygonArea=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2;
export function splitInterval(start,length,size){
  if(length>=size)return [[0,size]];
  const a=wrap(start,size),end=a+length;
  return end<=size?[[a,end]]:[[a,size],[0,end-size]];
}
export class Camera {
  constructor(){this.width=0;this.height=0;this.x=0;this.y=0;this.scale=1;this.viewport={width:1,height:1};this.initialized=false;this.torus=false;}
  configure(width,height,vw,vh,torus=false){
    if(![width,height,vw,vh].every(x=>Number.isFinite(x)&&x>0))throw new Error('camera dimensions');
    this.width=width;this.height=height;this.viewport={width:vw,height:vh};this.torus=torus;
    if(!this.initialized){this.fit();this.initialized=true;}else this.constrain();
  }
  get fitScale(){
    const {width:A,height:B}=this.viewport;
    if(!this.torus)return .9*Math.min(A/((this.width+this.height)/Math.SQRT2),B/((this.width+this.height)/Math.sqrt(6)));
    // Current toroidal versions are square. Periods (1,1), (1,-1), (1,0)
    // and (0,1) determine the tight rectangular-screen non-overlap bound.
    const L=this.width;
    if(L===this.height)return (1+1e-7)*Math.max(A/(L*Math.SQRT2),B/(L*Math.sqrt(2/3)),Math.min(A*Math.SQRT2/L,B*Math.sqrt(6)/L));
    return (1+1e-7)*Math.max((A*Math.SQRT2+B*Math.sqrt(6))/(2*this.width),(A*Math.SQRT2+B*Math.sqrt(6))/(2*this.height));
  }
  get maxScale(){return Math.max(this.fitScale*24,96);}
  frameCell(cell){if(this.width>=1000)this.scale=Math.max(this.scale,48);this.centre(cell%this.width+.5,Math.floor(cell/this.width)+.5);}
  fit(){this.x=this.width/2;this.y=this.height/2;this.scale=this.fitScale;}
  constrain(){
    this.scale=Math.max(this.fitScale,Math.min(this.maxScale,this.scale));
    this.x=this.torus?wrap(this.x,this.width):Math.max(0,Math.min(this.width,this.x));
    this.y=this.torus?wrap(this.y,this.height):Math.max(0,Math.min(this.height,this.y));
  }
  world(sx,sy){const a=(sx-this.viewport.width/2)/this.scale*Math.SQRT2,b=(sy-this.viewport.height/2)/this.scale*Math.sqrt(6);return {x:this.x+(a+b)/2,y:this.y+(b-a)/2};}
  screen(x,y,height=0){const dx=x-this.x,dy=y-this.y;return {x:(dx-dy)/Math.SQRT2*this.scale+this.viewport.width/2,y:((dx+dy)/Math.sqrt(6)-height*Math.sqrt(2/3))*this.scale+this.viewport.height/2};}
  pan(dx,dy){const p=this.world(this.viewport.width/2-dx,this.viewport.height/2-dy);this.x=p.x;this.y=p.y;this.constrain();}
  centre(x,y){this.x=x;this.y=y;this.constrain();}
  zoom(factor,sx=this.viewport.width/2,sy=this.viewport.height/2){
    if(!Number.isFinite(factor)||factor<=0)return;
    const anchor=this.world(sx,sy);this.scale*=factor;this.constrain();const after=this.world(sx,sy);
    this.x+=anchor.x-after.x;this.y+=anchor.y-after.y;this.constrain();
  }
  cell(sx,sy){const p=this.world(sx,sy),x=Math.floor(this.torus?wrap(p.x,this.width):p.x),y=Math.floor(this.torus?wrap(p.y,this.height):p.y);return x>=0&&x<this.width&&y>=0&&y<this.height?y*this.width+x:null;}
  bounds(){const {width,height}=this.viewport,p=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>this.world(x,y)),x=Math.min(...p.map(p=>p.x)),y=Math.min(...p.map(p=>p.y));return {x,y,width:Math.max(...p.map(p=>p.x))-x,height:Math.max(...p.map(p=>p.y))-y};}
  footprint(padding=0){const {width,height}=this.viewport,d=padding*this.scale;return [[-d,-d],[width+d,-d],[width+d,height+d],[-d,height+d]].map(([x,y])=>this.world(x,y));}
  copies(padding=0){
    if(!this.torus)return [{x:0,y:0}];
    const cacheKey=[this.width,this.height,this.x,this.y,this.scale,this.viewport.width,this.viewport.height].join('/');if(this.copyKey!==cacheKey){this.copyKey=cacheKey;this.copyCache=new Map();}if(this.copyCache.has(padding))return this.copyCache.get(padding);
    const bounds=this.bounds(),b={x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+2*padding,height:bounds.height+2*padding},out=[];
    const polygon=this.footprint(padding);
    for(let y=Math.floor(b.y/this.height);y<=Math.floor((b.y+b.height)/this.height);y++)for(let x=Math.floor(b.x/this.width);x<=Math.floor((b.x+b.width)/this.width);x++){const dx=x*this.width,dy=y*this.height;if(polygonArea(clipPolygon(polygon,dx,dy,dx+this.width,dy+this.height))>1e-9)out.push({x:dx,y:dy});}
    this.copyCache.set(padding,out);return out;
  }
  point(x,y,height=0){
    let best=null;for(const copy of this.copies(3)){const wx=x+copy.x,wy=y+copy.y,p=this.screen(wx,wy,height),outside=Math.hypot(Math.max(0,-p.x,p.x-this.viewport.width),Math.max(0,-p.y,p.y-this.viewport.height)),score=outside*1e6+Math.hypot(p.x-this.viewport.width/2,p.y-this.viewport.height/2);
      if(!best||score<best.score)best={x:wx,y:wy,sx:p.x,sy:p.y,visible:outside===0,score};}return best??{x,y,...Object.fromEntries(Object.entries(this.screen(x,y,height)).map(([k,v])=>[k==='x'?'sx':'sy',v])),visible:false};
  }
  cellPoint(cell,height=0){return this.point(cell%this.width+.5,Math.floor(cell/this.width)+.5,height);}
  minimapPolygons(origin=null){
    const polygon=this.footprint(),left=this.torus&&origin?origin.x-this.width/2:0,top=this.torus&&origin?origin.y-this.height/2:0,b=this.bounds(),out=[];
    const xs=this.torus?[Math.floor((b.x-left)/this.width),Math.floor((b.x+b.width-left)/this.width)]:[0,0],ys=this.torus?[Math.floor((b.y-top)/this.height),Math.floor((b.y+b.height-top)/this.height)]:[0,0];
    for(let y=ys[0];y<=ys[1];y++)for(let x=xs[0];x<=xs[1];x++){const dx=left+x*this.width,dy=top+y*this.height,p=clipPolygon(polygon.map(p=>({x:p.x-dx,y:p.y-dy})),0,0,this.width,this.height);if(polygonArea(p)>1e-9)out.push(p);}return out;
  }
  get minimapUseful(){return true;}
}
