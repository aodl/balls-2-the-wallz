/** Interpret a displayed reversal, never predict a crossing or change game state.
 * Exact pre-event coordinates identify only the reversed faces. Mixed/cannon/
 * vertex-blocked contacts are deliberately neutral. */
export function contactMeaning(view,b,after,time,account,vertexBlocked=false){
 if(!account||vertexBlocked||!view.owner||!b)return 'neutral';
 const accountOf=player=>view.version===6?view.playability?.players.find(p=>p.id===player)?.account:view.cannons.get(player)?.account;
 const [n,d]=time,unit=1024n*d;if(d<=0n)return 'neutral';
 const floor=(a,z)=>a>=0n?a/z:(a-z+1n)/z;
 const coords=['x','y'].map(axis=>{const v=b['v'+axis],q=b[axis+'0']*d+BigInt(v)*n;return {q,cell:Number(floor(q,unit))-(q%unit===0n&&v>0?1:0),boundary:q%unit===0n};});
 const targets=[];for(let i=0;i<2;i++){const axis=i?'y':'x',v=b['v'+axis];if(!v||after['v'+axis]!==-v)continue;if(!coords[i].boundary)return 'neutral';const xy=coords.map(c=>c.cell);xy[i]+=Math.sign(v);if(!view.torus&&(xy[0]<0||xy[0]>=view.width||xy[1]<0||xy[1]>=view.height))return 'neutral';const x=(xy[0]%view.width+view.width)%view.width,y=(xy[1]%view.height+view.height)%view.height;targets.push(y*view.width+x);}
 if(!targets.length||targets.some(cell=>[...view.cannons.values()].some(c=>c.cell===cell)))return 'neutral';
 const attacker=accountOf(b.owner);if(!attacker)return 'neutral';if(attacker===account)return 'friendly';
 const owners=targets.map(cell=>accountOf(view.playerForTerritory(view.owner(cell))));
 return owners.every(owner=>owner===account)?'threat':'neutral';
}
