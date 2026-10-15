/** Read-only reference from already authenticated snapshots/configuration. */
export function cannonReference(world,config){
  return world.cannons.map(c=>{
    const balls=world.balls.filter(b=>b.owner===c.id).length;
    return {id:c.id,account:c.account,cell:c.cell,balls,
      next_ball_e8s:balls>=config.max_per_cannon||world.balls.length>=config.max_balls?null:config.ball_base_e8s*BigInt(balls)**2n,
      owned_cells:world.cells.flatMap((owner,n)=>owner===c.id?[n]:[])};
  });
}
export function operationalText(status){
  if(!status)return 'Operational status unavailable — wait before making purchases.';
  const error=status.run.last_error[0]??status.source.last_error[0];
  if(error)return `Service error — wait before making purchases: ${error}`;
  if(!status.source.binding_checked)return 'Index binding pending — wait before making purchases.';
  if(!status.run.running)return 'Gameplay paused — do not make purchases. Source reconciliation continues.';
  return `Gameplay running; index cursor ${status.source.admitted_to_exclusive}; ${status.source.pending_records} history rows pending. Index lag and the 60-second fallback can delay discovery.`;
}
