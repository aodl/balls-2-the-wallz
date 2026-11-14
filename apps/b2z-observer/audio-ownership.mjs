/** Best-effort same-origin audible lease; never a preference or gameplay authority. */
export function audioOwnership(onChange=()=>{},{now=()=>Date.now(),channelFactory=name=>new BroadcastChannel(name),id=globalThis.crypto?.randomUUID?.()??String(Math.random())}={}){
 let channel=null,owner=null,visible=true,enabled=false,last=false,readyAt=now()+120,lastSent=-Infinity,serial=0;
 const valid=o=>o&&typeof o.id==='string'&&Number.isFinite(o.at)&&[0,1].includes(o.priority)&&o.until>now()&&o.until<=now()+15000;
 const wins=(a,b)=>!valid(b)||a.priority>b.priority||a.priority===b.priority&&(a.at>b.at||a.at===b.at&&a.id>b.id);
 const post=value=>{try{channel?.postMessage(value);}catch{}};
 function update(){const owns=enabled&&visible&&(!channel||valid(owner)&&owner.id===id);if(owns!==last){last=owns;onChange(owns);}return owns;}
 function release(){if(owner?.id===id)post({kind:'release',id});owner=null;update();}
 function claim(deliberate=false){if(!enabled||!visible)return false;const candidate={id,priority:deliberate?1:0,at:now()+Math.min(++serial,999)/1000,until:now()+6000};if(deliberate||!valid(owner)){owner=candidate;post({kind:'claim',owner});}return update();}
 try{channel=channelFactory('b2z-audio-v2');channel.onmessage=({data:d})=>{
  if(d?.kind==='hello'&&owner?.id===id&&update())post({kind:'claim',owner});
  else if(d?.kind==='release'&&d.id===owner?.id){owner=null;readyAt=now();tick();}
  else if(d?.kind==='claim'&&valid(d.owner)&&d.owner.id!==id&&wins(d.owner,owner)){owner=d.owner;update();}
 };post({kind:'hello',id});}catch{channel=null;}
 function tick(){if(!enabled||!visible)return update();if(owner?.id===id){owner.until=now()+6000;if(now()-lastSent>=2000){lastSent=now();post({kind:'claim',owner});}}else if(!valid(owner)&&now()>=readyAt)claim();return update();}
 return{set(active,shown){const changed=shown!==visible;enabled=active;visible=shown;if(!enabled||!visible)release();else if(changed){readyAt=now()+120;post({kind:'hello',id});}return tick();},claim:()=>claim(true),tick,owns:update,inspect:()=>({id,owner:owner?.id??null,owns:last,coordinated:Boolean(channel)}),dispose(){release();channel?.close();channel=null;}};
}
