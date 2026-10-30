/** Local presentation in cell coordinates. No simulation or network authority. */
export const wrap=(n,size)=>((n%size)+size)%size;
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
  get fitScale(){return .9*Math.min(this.viewport.width/this.width,this.viewport.height/this.height);}
  get maxScale(){return Math.max(this.fitScale*24,96);}
  frameCell(cell){if(this.width>=1000)this.scale=Math.max(this.scale,24);this.centre(cell%this.width+.5,Math.floor(cell/this.width)+.5);}
  fit(){this.x=this.width/2;this.y=this.height/2;this.scale=this.fitScale;}
  constrain(){
    this.scale=Math.max(this.fitScale*.6,Math.min(this.maxScale,this.scale));
    this.x=this.torus?wrap(this.x,this.width):Math.max(0,Math.min(this.width,this.x));
    this.y=this.torus?wrap(this.y,this.height):Math.max(0,Math.min(this.height,this.y));
  }
  world(sx,sy){return {x:this.x+(sx-this.viewport.width/2)/this.scale,y:this.y+(sy-this.viewport.height/2)/this.scale};}
  screen(x,y){return {x:(x-this.x)*this.scale+this.viewport.width/2,y:(y-this.y)*this.scale+this.viewport.height/2};}
  pan(dx,dy){this.x-=dx/this.scale;this.y-=dy/this.scale;this.constrain();}
  centre(x,y){this.x=x;this.y=y;this.constrain();}
  zoom(factor,sx=this.viewport.width/2,sy=this.viewport.height/2){
    if(!Number.isFinite(factor)||factor<=0)return;
    const anchor=this.world(sx,sy);this.scale*=factor;this.constrain();const after=this.world(sx,sy);
    this.x+=anchor.x-after.x;this.y+=anchor.y-after.y;this.constrain();
  }
  cell(sx,sy){const p=this.world(sx,sy),x=Math.floor(this.torus?wrap(p.x,this.width):p.x),y=Math.floor(this.torus?wrap(p.y,this.height):p.y);return x>=0&&x<this.width&&y>=0&&y<this.height?y*this.width+x:null;}
  bounds(){const {width,height}=this.viewport;const p=this.world(0,0);return {x:p.x,y:p.y,width:width/this.scale,height:height/this.scale};}
  copies(padding=0){
    if(!this.torus)return [{x:0,y:0}];
    const bounds=this.bounds(),b={x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+2*padding,height:bounds.height+2*padding},out=[];
    for(let y=Math.floor(b.y/this.height);y<=Math.floor((b.y+b.height)/this.height);y++)for(let x=Math.floor(b.x/this.width);x<=Math.floor((b.x+b.width)/this.width);x++)out.push({x:x*this.width,y:y*this.height});
    return out;
  }
  minimapRects(){
    const b=this.bounds();
    if(this.torus)return splitInterval(b.x,b.width,this.width).flatMap(([x,right])=>splitInterval(b.y,b.height,this.height).map(([y,bottom])=>({x,y,width:right-x,height:bottom-y})));
    const x=Math.max(0,b.x),y=Math.max(0,b.y);return [{x,y,width:Math.max(0,Math.min(this.width,b.x+b.width)-x),height:Math.max(0,Math.min(this.height,b.y+b.height)-y)}];
  }
  get minimapUseful(){const b=this.bounds();return b.width<this.width*.98||b.height<this.height*.98;}
}
