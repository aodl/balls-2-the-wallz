/** Presentation only: opaque territory and fixed cell-space piece geometry. */
import {wrap} from './camera.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
const COLORS=['#30415b','#54f0d2','#84b7ff','#e4a4ff','#ffc778','#ff8b9b'];
export const color=id=>COLORS[id===0?0:1+(id-1)%5];
// Precompose against the arena background. Overrides replace, never tint, a base owner.
export function territoryColor(owner){
  const foreground=color(owner),background='#071423',alpha=owner? .4:.114;
  return '#'+[1,3,5].map(i=>Math.round(parseInt(foreground.slice(i,i+2),16)*alpha+parseInt(background.slice(i,i+2),16)*(1-alpha)).toString(16).padStart(2,'0')).join('');
}
export function pieceGeometry(cell,ball={vx:0,vy:0},ratio=1){
  return {cannonRadius:.28*cell,cannonStroke:.05*cell,cannonCore:.10*cell,
    barrelLength:.448*cell,barrelStroke:.10*cell,selectionRadius:.40*cell,selectionStroke:.04*cell,
    ballRadius:.073*cell,tailX:ball.vx/1024*.12*cell,tailY:ball.vy/1024*.12*cell,
    tailStroke:.073*cell,glow:.18*cell*ratio,strikeRadius:.10*cell,strikeStroke:.04*cell,effectStroke:.04*cell};
}
const append=(runs,start,end,owner)=>{
  if(start>=end)return;
  const last=runs.at(-1);if(last&&last.end===start&&last.owner===owner)last.end=end;else runs.push({start,end,owner});
};
/** Sweep compact base/override intervals, never expand the million-cell array. */
export function territoryLayout(v){
  const rows=[],overrides=Array.from({length:v.height},()=>[]),base=[];
  if(v.version===5){
    for(let sy=0;sy<32;sy++){
      const row=[];for(let sx=0;sx<32;sx++)append(row,Math.ceil(sx*v.width/32),Math.ceil((sx+1)*v.width/32),v.ownership.base[sy*32+sx]);base.push(row);
    }
    for(const r of v.ownership.overrides)for(let start=r.start;start<r.end;){
      const y=Math.floor(start/v.width),end=Math.min(r.end,(y+1)*v.width);overrides[y].push({start:start%v.width,end:end-y*v.width,owner:r.owner});start=end;
    }
  }
  for(let y=0;y<v.height;y++){
    const row=[];
    if(v.version<5){for(let x=0;x<v.width;x++)append(row,x,x+1,v.owner(y*v.width+x));}
    else{
      const b=base[Math.floor(y*32/v.height)],o=overrides[y];let at=0;
      for(const r of b){let x=r.start;
        while(at<o.length&&o[at].end<=x)at++;
        while(x<r.end){const change=o[at];
          if(!change||change.start>=r.end){append(row,x,r.end,r.owner);break;}
          if(x<change.start){append(row,x,change.start,r.owner);x=change.start;}
          const end=Math.min(r.end,change.end);append(row,x,end,change.owner);x=end;if(x===change.end)at++;
        }
      }
    }
    rows.push(row);
  }
  // Merge equal adjacent rows into disjoint opaque rectangles, removing storage seams.
  const rects=[],edges=[];let prior=new Map();const vertical=new Map();
  for(let y=0;y<v.height;y++){
    const current=new Map(),row=rows[y];
    for(const r of row){const key=`${r.start}:${r.end}:${r.owner}`,old=prior.get(key);
      if(old)old.height++;else rects.push({x:r.start,y,width:r.end-r.start,height:1,owner:r.owner});current.set(key,old??rects.at(-1));
    }prior=current;
    const xs=row.slice(1).map(r=>r.start);
    if(!v.torus||row[0].owner!==row.at(-1).owner)xs.push(0);
    if(!v.torus)xs.push(v.width);
    for(const x of xs){const old=vertical.get(x);if(old&&old.y2===y)old.y2++;else{const edge={x1:x,y1:y,x2:x,y2:y+1};edges.push(edge);vertical.set(x,edge);}}
    const up=y?rows[y-1]:v.torus?rows.at(-1):null;
    if(up){let a=0,b=0,x=0,last=null;
      while(x<v.width){const end=Math.min(row[a].end,up[b].end);
        if(row[a].owner!==up[b].owner){if(last?.x2===x)last.x2=end;else{last={x1:x,y1:y,x2:end,y2:y};edges.push(last);}}else last=null;
        x=end;if(row[a].end===end)a++;if(up[b].end===end)b++;
      }
    }else edges.push({x1:0,y1:0,x2:v.width,y2:0});
  }
  if(!v.torus)edges.push({x1:0,y1:v.height,x2:v.width,y2:v.height});
  return {rects,edges};
}
export function gridLines(bounds,width,height,scale){
  if(scale<=12)return {x:[],y:[],alpha:0};
  const axis=(start,length,max)=>Array.from({length:Math.max(0,Math.floor(Math.min(max,start+length))-Math.ceil(Math.max(0,start))+1)},(_,i)=>Math.ceil(Math.max(0,start))+i);
  return {x:axis(bounds.x,bounds.width,width),y:axis(bounds.y,bounds.height,height),alpha:Math.min(1,(scale-12)/12)};
}
export function createArenaRenderer(canvasFactory=()=>document.createElement('canvas')){
  let cache=null;
  function terrain(v){
    if(cache?.view===v&&cache.revision===v.territoryRevision)return cache;
    // New certified segments often change only trajectories/time. Reuse the
    // raster across those views, comparing compact ownership rather than cells.
    if(cache&&cache.revision===cache.view.territoryRevision&&cache.view.version===v.version&&cache.view.width===v.width&&cache.view.height===v.height){
      const old=cache.view,same=v.version===5
        ?old.ownership.base.every((owner,i)=>owner===v.ownership.base[i])&&old.ownership.overrides.length===v.ownership.overrides.length&&old.ownership.overrides.every((r,i)=>{const next=v.ownership.overrides[i];return r.start===next.start&&r.end===next.end&&r.owner===next.owner;})
        :old.cells.every((owner,i)=>owner===v.cells[i]);
      if(same){cache.view=v;cache.revision=v.territoryRevision;return cache;}
    }
    const image=cache?.image??canvasFactory();image.width=v.width;image.height=v.height;
    const layout=territoryLayout(v),context=image.getContext('2d');
    for(const r of layout.rects){context.fillStyle=territoryColor(r.owner);context.fillRect(r.x,r.y,r.width,r.height);}
    cache={view:v,revision:v.territoryRevision,image,...layout};return cache;
  }
  function draw(ctx,v,camera,{time=0,selection=null,selected=null,ratio=1}={}){
    const cell=camera.scale,bounds=camera.bounds(),layer=terrain(v),g=pieceGeometry(cell),viewport=camera.viewport;
    for(const tile of camera.copies()){
      const origin=camera.screen(tile.x,tile.y),x0=Math.max(0,Math.floor(bounds.x-tile.x)),y0=Math.max(0,Math.floor(bounds.y-tile.y)),x1=Math.min(v.width,Math.ceil(bounds.x+bounds.width-tile.x)),y1=Math.min(v.height,Math.ceil(bounds.y+bounds.height-tile.y));
      if(x1<=x0||y1<=y0)continue;
      ctx.save();ctx.translate(origin.x,origin.y);ctx.imageSmoothingEnabled=false;
      ctx.drawImage(layer.image,x0,y0,x1-x0,y1-y0,x0*cell,y0*cell,(x1-x0)*cell,(y1-y0)*cell);
      ctx.strokeStyle='#b6c9df66';ctx.lineWidth=.035*cell;ctx.beginPath();
      for(const e of layer.edges){if(Math.max(e.x1,e.x2)<x0||Math.min(e.x1,e.x2)>x1||Math.max(e.y1,e.y2)<y0||Math.min(e.y1,e.y2)>y1)continue;ctx.moveTo(e.x1*cell,e.y1*cell);ctx.lineTo(e.x2*cell,e.y2*cell);}ctx.stroke();
      const grid=gridLines({x:x0,y:y0,width:x1-x0,height:y1-y0},v.width,v.height,cell);
      if(grid.alpha){ctx.globalAlpha=grid.alpha;ctx.strokeStyle='#45638455';ctx.lineWidth=.0125*cell;ctx.beginPath();for(const x of grid.x){ctx.moveTo(x*cell,y0*cell);ctx.lineTo(x*cell,y1*cell);}for(const y of grid.y){ctx.moveTo(x0*cell,y*cell);ctx.lineTo(x1*cell,y*cell);}ctx.stroke();ctx.globalAlpha=1;}
      ctx.restore();
    }
    let margin=.6;for(const b of v.balls.values())margin=Math.max(margin,Math.hypot(b.vx,b.vy)/1024*.12+.3);
    const onScreen=(x,y,extent)=>x+extent>=0&&x-extent<=viewport.width&&y+extent>=0&&y-extent<=viewport.height;
    for(const tile of camera.copies(margin)){
      const origin=camera.screen(tile.x,tile.y);ctx.save();ctx.translate(origin.x,origin.y);ctx.lineCap='round';
      if(selection&&selection.width===v.width&&selection.height===v.height){
        ctx.save();ctx.setLineDash([.16*cell,.12*cell]);ctx.strokeStyle='#ffcc80';ctx.lineWidth=.04*cell;
        for(const n of selection.cells)ctx.strokeRect((n%v.width+.1)*cell,(Math.floor(n/v.width)+.1)*cell,.8*cell,.8*cell);
        if(selection.cell!==null){ctx.setLineDash([]);ctx.lineWidth=.06*cell;const n=selection.cell;ctx.strokeRect((n%v.width+.16)*cell,(Math.floor(n/v.width)+.16)*cell,.68*cell,.68*cell);}ctx.restore();
      }
      for(const c of v.cannons.values()){
        const x=(c.cell%v.width+.5)*cell,y=(Math.floor(c.cell/v.width)+.5)*cell,r=g.cannonRadius;
        if(!onScreen(x+origin.x,y+origin.y,.6*cell))continue;
        ctx.fillStyle='#071423';ctx.strokeStyle=color(c.id);ctx.lineWidth=g.cannonStroke;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.strokeRect(x-r,y-r,2*r,2*r);
        ctx.fillStyle=color(c.id);ctx.beginPath();ctx.arc(x,y,g.cannonCore,0,Math.PI*2);ctx.fill();
        if(Number.isInteger(c.heading)){const [vx,vy]=heading(c.heading),d=Math.hypot(vx,vy);ctx.lineWidth=g.barrelStroke;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+vx/d*g.barrelLength,y+vy/d*g.barrelLength);ctx.stroke();}
        if(c.id===selected){ctx.strokeStyle='#ffcc80';ctx.lineWidth=g.selectionStroke;ctx.beginPath();ctx.arc(x,y,g.selectionRadius,0,Math.PI*2);ctx.stroke();}
      }
      for(const p of v.pending.values())if(Number(p.deadline[0])/Number(p.deadline[1])>=time){
        const ax=p.from%v.width+.5,ay=Math.floor(p.from/v.width)+.5;let bx=p.to%v.width+.5,by=Math.floor(p.to/v.width)+.5;
        if(v.torus){bx-=Math.round((bx-ax)/v.width)*v.width;by-=Math.round((by-ay)/v.height)*v.height;}
        ctx.strokeStyle='#ffd790';ctx.lineWidth=g.strikeStroke;ctx.beginPath();ctx.arc((ax+bx)/2*cell,(ay+by)/2*cell,g.strikeRadius,0,Math.PI*2);ctx.stroke();
      }
      for(const b of v.balls.values()){
        let bx=(Number(b.x0)+b.vx*time)/1024,by=(Number(b.y0)+b.vy*time)/1024;if(v.torus){bx=wrap(bx,v.width);by=wrap(by,v.height);}
        const x=bx*cell,y=by*cell,s=pieceGeometry(cell,b,ratio),extent=Math.hypot(s.tailX,s.tailY)+.3*cell;
        if(!onScreen(x+origin.x,y+origin.y,extent))continue;
        ctx.strokeStyle=color(b.owner)+'66';ctx.lineWidth=s.tailStroke;ctx.beginPath();ctx.moveTo(x-s.tailX,y-s.tailY);ctx.lineTo(x,y);ctx.stroke();
        ctx.shadowBlur=s.glow;ctx.shadowColor=color(b.owner);ctx.fillStyle='#f2fbff';ctx.beginPath();ctx.arc(x,y,s.ballRadius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      }
      for(const e of v.effects){const age=time-e.t;if(age<0||age>.9)continue;const x=(e.cell===undefined?e.x:e.cell%v.width+.5)*cell,y=(e.cell===undefined?e.y:Math.floor(e.cell/v.width)+.5)*cell;
        ctx.globalAlpha=1-age/.9;ctx.strokeStyle=e.kind==='burst'?'#ffdc9c':color(e.owner);ctx.lineWidth=g.effectStroke;ctx.beginPath();ctx.arc(x,y,cell*(.12+age*.7),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      }ctx.restore();
    }
  }
  return {draw,terrain};
}
