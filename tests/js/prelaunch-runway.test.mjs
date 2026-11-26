import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prelaunchRunway} from '../../tools/prelaunch_runway.mjs';

function row(hour,liquid){
 const limits={idle_cycles_burned_per_day:'2000000000',settings:{freezing_threshold:'2592000'}};
 return {observed_at:`2026-11-26T0${hour}:00:00.000Z`,settlement:{settled:true},
  backend:{...limits,module_sha256:'same'},frontend:{...limits,cycles:'900000000000'},
  health:{liquid_cycles:liquid,runtime_started_ns:'9000',known_treasury_credit_delta:'0'},
  signed_status:{run:{running:true,pace:{mode:'Trickle'}}},
  publication:{head:String(hour*36),balls:2,cannons:2,diverters:1,reservoirs:4,accounts_with_cannons:1}};
}

test('settled, comparable samples use the actual elapsed time',()=>{
 const before=row(1,'3022000000000'),after=row(2,'3000000000000');
 const result=prelaunchRunway(before,after);
 assert.equal(result.net_cycles_per_day,'528000000000');
 assert.equal(result.publication_delta,'36');
 assert.equal(result.backend_freezing_estimate_cycles,'60000000000');
 assert.equal(result.frontend_install_recovery_headroom_cycles,'390000000000');
 assert.equal(result.full_speed_cycle_floor_met,true);
 assert.equal(result.seconds_to_reserve_protection,'327272');
});
test('unsettled reserves, short windows, workload shifts and known credits cannot project a rate',()=>{
 const before=row(1,'3022000000000');
 for(const change of [
  r=>{r.settlement.settled=false;},r=>{r.observed_at=before.observed_at;},
  r=>{r.publication.balls++;},r=>{r.health.known_treasury_credit_delta='1';},r=>{r.backend.module_sha256='changed';},
 ]){
  const after=row(2,'3000000000000');change(after);
  const result=prelaunchRunway(before,after);
  assert.equal(result.net_cycles_per_day,undefined);
  assert.ok(result.reason);
 }
});
