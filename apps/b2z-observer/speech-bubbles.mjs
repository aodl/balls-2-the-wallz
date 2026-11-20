/** Bounded cosmetic presentation only; authenticated event application owns eligibility. */
export class SpeechBubbles{
 constructor({now=()=>Date.now(),storage=null}={}){this.clock=now;this.lastNow=0;this.storage=storage;this.scope=null;this.seen=new Set();this.active=new Map();}
 now(){return this.lastNow=Math.max(this.lastNow,this.clock());}
 reset(scope){if(this.scope===scope)return;this.scope=scope;this.active.clear();this.seen.clear();try{const raw=this.storage?.getItem('B2Z-speech-seen-v1');if(raw&&raw.length<=262144){const v=JSON.parse(raw);if(v.scope===scope&&Array.isArray(v.ids)&&v.ids.length<=512)for(const id of v.ids)if(typeof id==='string'&&id.length<=1024)this.seen.add(id);}}catch{}}
 accept(event,view,provenance,{continuous=true}={}){
  const a=event.launch_annotation;if(!a||!provenance?.epoch||!provenance.namespace||!provenance.root)return;
  const scope=provenance.namespace+'/'+provenance.identity+'/'+provenance.epoch;this.reset(scope);
  const cannon=typeof event.cannon==='object'?event.cannon.id:event.cannon,key=provenance.root+'/'+provenance.segment+'/'+event.sequence+'/'+String(a.position)+'/'+cannon;
  if(this.seen.has(key))return;this.seen.add(key);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
  try{this.storage?.setItem('B2Z-speech-seen-v1',JSON.stringify({scope,ids:[...this.seen]}));}catch{}
  // Consume discontinuous history without scheduling speech for later return.
  if(!continuous||!view.cannons.has(cannon))return;
  this.active.delete(cannon);this.active.set(cannon,{key,cannon,account:a.account,text:a.cry,born:this.now(),scope});if(this.active.size>16)this.active.delete(this.active.keys().next().value);
 }
 rows(view){const now=this.now();for(const [id,b]of this.active)if(now-b.born>=60000||!view.cannons.has(id)||view.cannons.get(id).account!==b.account)this.active.delete(id);return[...this.active.values()].map(b=>({...b,opacity:Math.max(0,Math.min(1,(60000-(now-b.born))/5000))}));}
 clear(){this.active.clear();}
}
export function createSpeechLayer(doc){
 let storage;try{storage=globalThis.sessionStorage;}catch{}const store=new SpeechBubbles({storage}),nodes=new Map(),layer=doc.getElementById('speech-layer'),sizes=new Map();
 const observer=new ResizeObserver(entries=>{for(const e of entries){const r=e.borderBoxSize?.[0];if(r)sizes.set(e.target,{width:r.inlineSize,height:r.blockSize});}});
 const hit=(a,b)=>a.left<b.right+6&&a.right>b.left-6&&a.top<b.bottom+6&&a.bottom>b.top-6;
 return{store,clear(){store.clear();},accept:(...args)=>store.accept(...args),draw(view,camera,obstacles=[],scope=null){
  if(scope&&scope!==store.scope)store.reset(scope);
  const rows=store.rows(view),alive=new Set(rows.map(b=>b.key));for(const[key,n]of nodes)if(!alive.has(key)){observer.unobserve(n);sizes.delete(n);n.remove();nodes.delete(key);}
  if(!rows.length)return;
  let count=0;const occupied=[...(typeof obstacles==='function'?obstacles():obstacles)];for(const b of rows){let n=nodes.get(b.key);if(!n){n=doc.createElement('span');n.className='speech-bubble';n.dataset.cannon=String(b.cannon);n.dataset.event=b.key;n.dataset.born=String(b.born);n.setAttribute('role','note');n.setAttribute('aria-label','Player Shout');const text=doc.createElement('bdi');text.dir='auto';text.textContent=b.text;n.append(text);layer.append(n);nodes.set(b.key,n);observer.observe(n);}
   const c=view.cannons.get(b.cannon),p=camera.cellPoint(c.cell),size=sizes.get(n)??{width:176,height:48};let chosen=null;
   if(p.visible&&count<8)for(const [x,y]of[[p.sx-size.width/2,p.sy-50-size.height],[p.sx+46,p.sy-size.height/2],[p.sx-size.width-46,p.sy-size.height/2],[p.sx-size.width/2,p.sy+46]]){const r={left:x,right:x+size.width,top:y,bottom:y+size.height};if(x>=8&&y>=8&&r.right<=camera.viewport.width-8&&r.bottom<=camera.viewport.height-8&&!occupied.some(o=>hit(r,o))){chosen=r;break;}}
   n.hidden=!chosen;if(chosen){n.style.left=Math.round(chosen.left)+'px';n.style.top=Math.round(chosen.top)+'px';n.style.opacity=String(b.opacity);occupied.push(chosen);count++;}
  }
 },dispose(){observer.disconnect();layer.replaceChildren();nodes.clear();store.clear();}};
}
