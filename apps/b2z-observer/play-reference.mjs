/** Read-only reference from already authenticated snapshots/configuration. */
export function cannonReference(world,config){
  const ownerAt=cell=>{if(world.version<5)return world.cells[cell];let low=0,high=world.ownership.overrides.length;while(low<high){const mid=(low+high)>>1;if(world.ownership.overrides[mid].start<=cell)low=mid+1;else high=mid;}if(low&&cell<world.ownership.overrides[low-1].end)return world.ownership.overrides[low-1].owner;const x=cell%world.width,y=Math.floor(cell/world.width),source=Math.floor(y*world.ownership.source_height/world.height)*world.ownership.source_width+Math.floor(x*world.ownership.source_width/world.width);return world.ownership.base[source];};
  return world.cannons.map(c=>{
    const life=world.version===6?world.playability.lifecycle.find(l=>l.cannon===c.id):null,region=world.version===6?ownerAt(c.cell):c.id,player=life?.player??c.id;
    const playerAt=cell=>{const id=ownerAt(cell);return world.version===6?(id===0?0:world.playability.territories.find(r=>r.id===id)?.player):id;};
    const balls=world.balls.filter(b=>b.owner===player&&(world.version!==6||ownerAt(b.cell)===region)).length;
    const owned_count=world.version>=5?(world.ownership.counts.find(n=>n.owner===region)?.cells??0):world.cells.filter(owner=>owner===c.id).length;
    return {id:c.id,account:c.account,cell:c.cell,balls,
      next_ball_e8s:balls>=(world.version===6?config.max_purchase_balls_per_island:config.max_per_cannon)||world.balls.length>=config.max_balls?null:config.ball_base_e8s*BigInt(world.version===6?Math.max(1,balls):balls)**2n,
      owned_count,owned_cells:world.version>=5?[c.cell]:world.cells.flatMap((owner,n)=>owner===c.id?[n]:[]),owns:cell=>Number.isSafeInteger(cell)&&cell>=0&&cell<world.width*world.height&&playerAt(cell)===player,...(life?{island_id:region,player_id:player,dormant:life.deadline_ns!==undefined,deadline_ns:life.deadline_ns}:{})};
  });
}
export function operationalText(status){
  if(!status)return 'Operational status unavailable — wait before making purchases.';
  if(status.run.world_transition)return 'World transition in progress — existing payments and unfinished work are draining. Wait before preparing a payment.';
  if(status.run.pace?.admission_open===false)return 'Reserve protection — pending payments are preserved and funding recovery remains active; wait before making purchases.';
  const error=status.run.last_error[0]??status.source.last_error[0];
  if(error)return `Service error — wait before making purchases: ${error}`;
  if(!status.source.binding_checked)return 'Index binding pending — wait before making purchases.';
  if(!status.run.running)return 'Gameplay paused — do not make purchases. Source reconciliation continues.';
  if(status.run.idle)return 'Arena idle — waiting for a payment. Independent 60-second Index polling continues.';
  return `Gameplay running; index cursor ${status.source.admitted_to_exclusive}; ${status.source.pending_records} history rows pending. Index lag and the 60-second fallback can delay discovery.`;
}

/** Operational idling may label only an authenticated empty snapshot. */
export function idleArena(status,world){
 return Boolean(status?.run.running&&status.run.idle&&!status.run.last_error.length&&status.source.binding_checked&&!status.source.last_error.length&&world&&(world.cannons.length===0||world.version===6&&world.playability.lifecycle.every(l=>l.deadline_ns!==undefined))&&!world.balls.length&&!world.pending.length);
}
