/** Schema7 audit packing, not compression of or changes to historical events.
 * Exact integers/rationals are retained. Fixed array positions bound wire cost.
 */
const orientations=['NE','SE','SW','NW'],faces=['N','E','S','W'];
export function packDeflectorEvent(e){
 if(e.kind!=='motion')return e;
 const b=e.ball_state,c=e.deflector_contact;
 return[0,e.sequence,e.time,e.ball,e.from_cell,[b.cell,b.x0,b.y0,b.vx,b.vy,b.den,b.deflector_rearm??null],c?[c.id,orientations.indexOf(c.orientation),faces.indexOf(c.face),c.kind==='deflector_redirect'?0:1,c.front??null]:null,e.vertex_blocked];
}
export function unpackDeflectorEvent(e,owner){
 if(Array.isArray(e)){if(e.length!==8||e[0]!==0||typeof e[7]!=='boolean')throw Error('Deflector motion wire');e={kind:'motion',sequence:e[1],time:e[2],ball:e[3],from_cell:e[4],ball_state:e[5],...(e[6]===null?{}:{deflector_contact:e[6]}),vertex_blocked:e[7]};}
 else {if(e.kind==='motion')throw Error('Deflector motion must use canonical packed wire');return e;}
 const a=e.ball_state,c=e.deflector_contact;
 if(!Array.isArray(a)||a.length!==7||!Number.isSafeInteger(owner)||owner<1||typeof a[5]!=='bigint'||a[6]!==null&&(!Array.isArray(a[6])||a[6].length!==2))throw Error('Deflector audit trajectory');
 let contact;
 if(c!==undefined){
  if(!Array.isArray(c)||c.length!==5||!Number.isSafeInteger(c[0])||c[0]<1||!Number.isInteger(c[1])||c[1]<0||c[1]>3||!Number.isInteger(c[2])||c[2]<0||c[2]>3||![0,1].includes(c[3])||(c[3]===0?typeof c[4]!=='boolean':c[4]!==null))throw Error('Deflector audit contact');
  contact={id:c[0],orientation:orientations[c[1]],face:faces[c[2]],kind:c[3]===0?'deflector_redirect':'deflector_rearm_reflection',...(c[4]===null?{}:{front:c[4]})};
 }
 return{...e,vertex_blocked:e.vertex_blocked??false,ball_state:{id:e.ball,owner,cell:a[0],x0:a[1],y0:a[2],vx:a[3],vy:a[4],den:a[5],...(a[6]===null?{}:{deflector_rearm:a[6]})},...(contact?{deflector_contact:contact}:{})};
}
export function unpackDeflectorAudit(a,balls){if(a.version!==7)return a;const owners=new Map(balls.map(b=>[b.id,b.owner]));return{...a,events:a.events.map(e=>{if(e.ball&&['ball_spawned','cannon_spawned'].includes(e.kind))owners.set(e.ball.id,e.ball.owner);return unpackDeflectorEvent(e,owners.get(Array.isArray(e)?e[3]:e.ball));})};}
