import{validRat}from'./math.mjs';
/** Schema7 fixed-slot decimal audit, never a rewrite of historical events.
 * All arithmetic values remain exact. Owner is immutable for an authenticated
 * ball ID and is taken from its verified initial snapshot or spawn event.
 */
const orientations=['NE','SE','SW','NW'],faces=['N','E','S','W'];
const decimal=(v,max)=>{if(typeof v!=='string'||v.length>max||!/^(0|-?[1-9][0-9]*)$/.test(v))throw Error('Deflector decimal integer');return BigInt(v);};
export function packDeflectorEvent(e){
 if(e.kind!=='motion')return e;const b=e.ball_state,c=e.deflector_contact;
 return[0,e.sequence,e.time.map(String),e.ball,e.from_cell,[b.cell,String(b.x0),String(b.y0),b.vx,b.vy,String(b.den)],c?[c.id,orientations.indexOf(c.orientation),faces.indexOf(c.face),0,c.front]:null,e.vertex_blocked];
}
export function unpackDeflectorEvent(e,owner){
 if(!Array.isArray(e)){if(e.kind==='motion')throw Error('Deflector motion must use canonical packed wire');return e;}
 if(e.length!==8||e[0]!==0||typeof e[7]!=='boolean'||!Array.isArray(e[2])||e[2].length!==2)throw Error('Deflector motion wire');
 const time=[decimal(e[2][0],21),decimal(e[2][1],11)];validRat(time);
 const a=e[5],c=e[6];if(!Array.isArray(a)||a.length!==6||!Number.isSafeInteger(owner)||owner<1)throw Error('Deflector audit trajectory');
 let contact;
 if(c!==null){if(!Array.isArray(c)||c.length!==5||!Number.isSafeInteger(c[0])||c[0]<1||!Number.isInteger(c[1])||c[1]<0||c[1]>3||!Number.isInteger(c[2])||c[2]<0||c[2]>3||c[3]!==0||typeof c[4]!=='boolean')throw Error('Deflector audit contact');contact={id:c[0],orientation:orientations[c[1]],face:faces[c[2]],kind:'deflector_redirect',front:c[4]};}
 return{kind:'motion',sequence:e[1],time,ball:e[3],from_cell:e[4],ball_state:{id:e[3],owner,cell:a[0],x0:decimal(a[1],20),y0:decimal(a[2],20),vx:a[3],vy:a[4],den:decimal(a[5],5)},...(contact?{deflector_contact:contact}:{}),vertex_blocked:e[7]};
}
export function unpackDeflectorAudit(a,balls){if(a.version!==7)return a;const owners=new Map(balls.map(b=>[b.id,b.owner]));return{...a,events:a.events.map(e=>{if(e.ball&&['ball_spawned','cannon_spawned'].includes(e.kind))owners.set(e.ball.id,e.ball.owner);return unpackDeflectorEvent(e,owners.get(Array.isArray(e)?e[3]:e.ball));})};}
