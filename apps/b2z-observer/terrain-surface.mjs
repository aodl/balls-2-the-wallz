/** One exact persistent raster shared by the GPU and overview. Compact row-run
 * differences dirty neighbouring cells; pan/zoom never rebuild ownership. */
import {Color} from 'three';
import {territoryLayout} from './terrain.mjs';
import {splitInterval,wrap} from './camera.mjs';
export function createTerrainSurface(){
 let view=null,revision=-1,entities='',stamp='',data=null,palette=new Map(),serial=0;
 return {get(v){const e=v.entityKey();if(v===view&&revision===v.territoryRevision&&entities===e)return data;
  view=v;revision=v.territoryRevision;entities=e;const next=JSON.stringify([v.width,v.height,v.torus,v.ownership??v.cells,e]);if(next===stamp&&data)return data;stamp=next;
  const layout=territoryLayout(v,{includeRows:true}),colours=new Map(),colour=new Color();
  for(const r of layout.rects)if(!colours.has(r.owner)){const hex=r.owner?colour.set(v.territoryColor?.(r.owner)??v.color(r.owner)).lerp(new Color('#71818a'),.18).getHex():0x536773;colours.set(r.owner,[(hex>>16)&255,(hex>>8)&255,hex&255]);}
  const initial=!data||data.width!==v.width||data.height!==v.height,rgba=initial?new Uint8Array(v.width*v.height*4):data.rgba,dirty=new Map();
  function mark(y,left,right){if(v.torus)y=wrap(y,v.height);if(y<0||y>=v.height)return;const spans=v.torus?splitInterval(left,right-left,v.width):[[Math.max(0,left),Math.min(v.width,right)]];let list=dirty.get(y);if(!list){list=[];dirty.set(y,list);}for(const [a,b]of spans)if(a<b)list.push([a,b]);}
  if(initial){for(let y=0;y<v.height;y++)mark(y,0,v.width);}
  else for(let y=0;y<v.height;y++){const old=data.layout.rows[y],row=layout.rows[y];let a=0,b=0,x=0;while(x<v.width){const end=Math.min(old[a].end,row[b].end),oldOwner=old[a].owner,owner=row[b].owner;
   if(oldOwner!==owner||String(palette.get(oldOwner))!==String(colours.get(owner)))for(let dy=-1;dy<=1;dy++)mark(y+dy,x-1,end+1);
   x=end;if(old[a].end===end)a++;if(row[b].end===end)b++;
  }}
  const owner=(x,y)=>{if(v.torus){x=wrap(x,v.width);y=wrap(y,v.height);}if(x<0||y<0||x>=v.width||y>=v.height)return -1;const row=layout.rows[y];let lo=0,hi=row.length-1;while(lo<hi){const m=(lo+hi)>>1;if(x<row[m].end)hi=m;else lo=m+1;}return row[lo].owner;};
  // Initial upload fills compact regions, not a per-cell ownership reconstruction.
  if(initial){const words=new Uint32Array(rgba.buffer);for(const r of layout.rects){const c=colours.get(r.owner),packed=c[0]|c[1]<<8|c[2]<<16;for(let y=r.y;y<r.y+r.height;y++)words.fill(packed,y*v.width+r.x,y*v.width+r.x+r.width);}
   const bit=(x,y,n)=>{if(v.torus){x=wrap(x,v.width);y=wrap(y,v.height);}if(x>=0&&y>=0&&x<v.width&&y<v.height)rgba[(y*v.width+x)*4+3]|=n;};
   for(const e of layout.edges)if(e.x1===e.x2)for(let y=e.y1;y<e.y2;y++){bit(e.x1,y,1);bit(e.x1-1,y,2);}else for(let x=e.x1;x<e.x2;x++){bit(x,e.y1,4);bit(x,e.y1-1,8);}
  }else for(const [y,spans]of dirty){spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const span of spans){const last=merged.at(-1);if(last&&span[0]<=last[1])last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
   for(const [a,b]of merged)for(let x=a;x<b;x++){const id=owner(x,y),c=colours.get(id),n=(y*v.width+x)*4;rgba[n]=c[0];rgba[n+1]=c[1];rgba[n+2]=c[2];rgba[n+3]=(owner(x-1,y)!==id?1:0)|(owner(x+1,y)!==id?2:0)|(owner(x,y-1)!==id?4:0)|(owner(x,y+1)!==id?8:0);}
  }
  const dirtyRows=[...dirty.keys()].sort((a,b)=>a-b),ranges=[];
  // At most 32 GPU row-band updates; no full raster allocation for incremental changes.
  if(!initial){const chunk=Math.max(1,Math.ceil(dirtyRows.length/32));for(let i=0;i<dirtyRows.length;i+=chunk){const first=dirtyRows[i],last=dirtyRows[Math.min(i+chunk-1,dirtyRows.length-1)];ranges.push({start:first*v.width*4,count:(last-first+1)*v.width*4});}}
  const changed=initial||dirtyRows.length>0;data={width:v.width,height:v.height,rgba,layout,revision:changed?++serial:data.revision,dirtyRows,ranges,initial,owner:cell=>v.owner(cell)};palette=colours;return data;
 }};
}
/** Coarse views defer precision selection to Focus, never paint an aggregate legal. */
export function previewCells(v,camera,selection,limit=8192){
 if(!selection)return[];if(!selection.legal)return selection.cells;
 const b=camera.bounds();if((b.width+2)*(b.height+2)>limit)return selection.cell!==null&&selection.legal(selection.cell)?[selection.cell]:[];
 const found=new Set();for(const copy of camera.copies())for(let y=Math.max(0,Math.floor(b.y-copy.y));y<Math.min(v.height,Math.ceil(b.y+b.height-copy.y));y++)for(let x=Math.max(0,Math.floor(b.x-copy.x));x<Math.min(v.width,Math.ceil(b.x+b.width-copy.x));x++){const cell=y*v.width+x;if(selection.legal(cell))found.add(cell);}return [...found];
}
