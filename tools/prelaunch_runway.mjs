// Derive comparable workload projections from settled operational samples.
const DAY_SECONDS=86400n;
const BILLION=1_000_000_000n;
const DAY_NS=DAY_SECONDS*BILLION;
const RESERVE_FLOOR=1_000_000_000_000n;
const FULL_SPEED_FLOOR=2_070_000_000_000n;
const FRONTEND_INSTALL_RECOVERY=450_000_000_000n;
export function freezingEstimate(status){
 return BigInt(status.idle_cycles_burned_per_day)*BigInt(status.settings.freezing_threshold)/DAY_SECONDS;
}
function population(sample){
 const p=sample.publication;
 return [p.cannons,p.balls,p.diverters,p.reservoirs,p.accounts_with_cannons].join('/');
}
export function prelaunchRunway(before,after){
 const frontendCycles=BigInt(after.frontend.cycles);
 const frontendFreeze=freezingEstimate(after.frontend);
 const backendFreeze=freezingEstimate(after.backend);
 const report={
  backend_freezing_estimate_cycles:String(backendFreeze),
  frontend_freezing_estimate_cycles:String(frontendFreeze),
  frontend_install_recovery_headroom_cycles:String(frontendCycles-frontendFreeze-FRONTEND_INSTALL_RECOVERY),
 };
 if(!after.settlement?.settled)return {...report,reason:'Backend balance bracket has an unsettled or changing sample.'};
 const liquid=BigInt(after.health.liquid_cycles);
 report.backend_liquid_cycles=String(liquid);
 report.full_speed_cycle_floor_met=liquid>=FULL_SPEED_FLOOR;
 if(!before?.settlement?.settled)return {...report,reason:'Two comparable settled samples are required for a fresh projection.'};
 // The balance belongs to runtime_health, not the later outer JSON write time.
 // Keep the observed interval at nanosecond precision until the final rate division.
 const elapsedNs=BigInt(after.health.observed_at_ns)-BigInt(before.health.observed_at_ns);
 if(elapsedNs<3600n*BILLION)return {...report,reason:'A comparable sampling window of at least one hour is required.'};
 const prior=BigInt(before.health.liquid_cycles),now=liquid;
 if(before.backend.module_sha256!==after.backend.module_sha256||before.health.runtime_started_ns!==after.health.runtime_started_ns||
    before.signed_status.run.pace.mode!==after.signed_status.run.pace.mode||
    before.signed_status.run.running!==after.signed_status.run.running||
    population(before)!==population(after)||prior<=now||
    BigInt(before.health.known_treasury_credit_delta)!==0n||BigInt(after.health.known_treasury_credit_delta)!==0n){
  return {...report,reason:'Module, runtime, workload, pace or observed balance discontinuity prevents comparison.'};
 }
 const delta=prior-now;
 const remaining=floorValue=>String(liquid>floorValue?(liquid-floorValue)*elapsedNs/delta/BILLION:0n);
 return {...report,measurement_kind:'Observed settled net decline, with unknown intervening credits possible',
  elapsed_ns:String(elapsedNs),elapsed_seconds:Number(elapsedNs/BILLION),
  liquid_decline_cycles:String(delta),net_cycles_per_day:String(delta*DAY_NS/elapsedNs),
  publication_delta:String(BigInt(after.publication.head)-BigInt(before.publication.head)),
  seconds_to_reserve_protection:remaining(RESERVE_FLOOR),seconds_to_full_speed_floor:remaining(FULL_SPEED_FLOOR)};
}
