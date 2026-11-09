/** Compact territory geometry shared by isometric presentation and integrity checks. */
const append=(runs,start,end,owner)=>{if(start>=end)return;const last=runs.at(-1);if(last&&last.end===start&&last.owner===owner)last.end=end;else runs.push({start,end,owner});};
export function territoryLayout(v,{includeRows=false}={}){
  const rows=[],overrides=Array.from({length:v.height},()=>[]),base=[];
  if(v.version>=5){
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
  return includeRows?{rects,edges,rows}:{rects,edges};
}
/** Fixed spatial bins; each query visits only intersecting bins and emits once.
 * The stamp array avoids allocating a Set/list of edges during camera movement.
 */
export function boundaryIndex(edges,width,height){
  const size=32,columns=Math.ceil(width/size),rows=Math.ceil(height/size),bins=Array.from({length:columns*rows},()=>[]),seen=new Uint32Array(edges.length);let stamp=0;
  edges.forEach((e,id)=>{
    const x0=Math.min(columns-1,Math.max(0,Math.floor(Math.min(e.x1,e.x2)/size))),x1=Math.min(columns-1,Math.floor(Math.max(e.x1,e.x2)/size));
    const y0=Math.min(rows-1,Math.max(0,Math.floor(Math.min(e.y1,e.y2)/size))),y1=Math.min(rows-1,Math.floor(Math.max(e.y1,e.y2)/size));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)bins[y*columns+x].push(id);
  });
  return {visit(x0,y0,x1,y1,emit){
    if(++stamp===0x100000000){seen.fill(0);stamp=1;}
    let visited=0;
    const left=Math.min(columns-1,Math.max(0,Math.floor(x0/size))),right=Math.min(columns-1,Math.floor(x1/size)),top=Math.min(rows-1,Math.max(0,Math.floor(y0/size))),bottom=Math.min(rows-1,Math.floor(y1/size));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)for(const id of bins[y*columns+x]){
      if(seen[id]===stamp)continue;seen[id]=stamp;visited++;const e=edges[id];
      if(Math.max(e.x1,e.x2)<x0||Math.min(e.x1,e.x2)>x1||Math.max(e.y1,e.y2)<y0||Math.min(e.y1,e.y2)>y1)continue;emit(e);
    }
    return visited;
  }};
}
