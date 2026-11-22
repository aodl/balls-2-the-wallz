import {economyAt} from '../../packages/kernels/b2z/economy17.mjs';
import {marginal} from '../../packages/protocol/economy17.mjs';
/** Read-only reference from already authenticated snapshots/configuration. */
export function cannonReference(world,config,pricedAt=world.playability?.elapsed_ns){
  const ownerAt=cell=>{if(!(world.version>=5))return world.cells[cell];let low=0,high=world.ownership.overrides.length;while(low<high){const mid=(low+high)>>1;if(world.ownership.overrides[mid].start<=cell)low=mid+1;else high=mid;}if(low&&cell<world.ownership.overrides[low-1].end)return world.ownership.overrides[low-1].owner;const x=cell%world.width,y=Math.floor(cell/world.width),source=Math.floor(y*world.ownership.source_height/world.height)*world.ownership.source_width+Math.floor(x*world.ownership.source_width/world.width);return world.ownership.base[source];};
  const lifecycle=new Map(world.playability?.lifecycle.map(row=>[row.cannon,row]));
  const players=new Map(world.playability?.territories.map(row=>[row.id,row.player]));
  const areas=new Map(world.ownership?.counts.map(row=>[row.owner,row.cells]));
  const islandBalls=new Map(),playerBalls=new Map();
  for(const b of world.balls){
    const region=world.version>=6?ownerAt(b.cell):b.owner;
    islandBalls.set(region,(islandBalls.get(region)??0)+1);
    playerBalls.set(b.owner,(playerBalls.get(b.owner)??0)+1);
  }
  const rate=world.version>=9?economyAt(world.economy,pricedAt).current:null;
  return world.cannons.map(c=>{
    const life=world.version>=6?lifecycle.get(c.id):null,region=world.version>=6?ownerAt(c.cell):c.id,player=life?.player??c.id;
    const playerAt=cell=>{const id=ownerAt(cell);return world.version>=6?(id===0?0:players.get(id)):id;};
    const balls=islandBalls.get(region)??0;
    const owned_count=world.version>=5?(areas.get(region)??0):world.cells.filter(owner=>owner===c.id).length;
    return {id:c.id,account:c.account,cell:c.cell,heading:c.heading,balls,
      next_ball_e8s:rate!==null?(world.next_ball_id===0xffffffff?null:marginal(config.ball_base_e8s,rate,playerBalls.get(player)??0)):balls>=(world.version>=6?config.max_purchase_balls_per_island:config.max_per_cannon)||world.balls.length>=config.max_balls?null:config.ball_base_e8s*BigInt(world.version>=6?Math.max(1,balls):balls)**2n,
      owned_count,owned_cells:world.version>=5?[c.cell]:world.cells.flatMap((owner,n)=>owner===c.id?[n]:[]),owns:cell=>Number.isSafeInteger(cell)&&cell>=0&&cell<world.width*world.height&&playerAt(cell)===player,...(life?{island_id:region,player_id:player,dormant:life.deadline_ns!==undefined,deadline_ns:life.deadline_ns}:{})};
  });
}
/** Operational idling may label only an authenticated empty snapshot. */
export function idleArena(status,world){
 return Boolean(status?.run.running&&status.run.idle&&!status.run.last_error.length&&status.source.binding_checked&&!status.source.last_error.length&&world&&(world.cannons.length===0||world.version>=6&&world.playability.lifecycle.every(l=>l.deadline_ns!==undefined))&&!world.balls.length&&!world.pending.length);
}
