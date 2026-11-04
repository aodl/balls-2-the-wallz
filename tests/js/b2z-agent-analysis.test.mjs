import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeWorld,encodeWorld,PLAYABILITY_CONFIG,PLAYABILITY_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {BoardAnalysis} from '../../packages/agents/b2z/analysis.mjs';
import {quoteAction,typedAction,exactDegrees,candidates,actionOptions,interactionIssue,consentEvaluation,opponentResponse} from '../../packages/agents/b2z/actions.mjs';
import {parse,stringify,money,operationalSample} from '../../packages/agents/b2z/common.mjs';
import {decide} from '../../packages/agents/b2z/policies.mjs';
import {evaluateActions,forecastWorkerArgs} from '../../packages/agents/b2z/forecast.mjs';
import {accountIdentifier} from '../../apps/b2z-observer/identity.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url))),account=accountIdentifier('2vxsx-fae');
function board(name='ordered'){const world=decodeWorld(Buffer.from(fixtures.cases[name].state_hex,'hex')),old=world.cannons[0].account;for(const c of world.cannons)if(c.account===old)c.account=account;for(const p of world.playability.players)if(p.account===old)p.account=account;for(const c of world.credits)if(c.account===old)c.account=account;const s={world,reference:{head:1n,source_cursor:100n,state:'test-fixture',...PLAYABILITY_IDENTITY},configuration:PLAYABILITY_CONFIG,trust:'local-synthetic',events:{events:[],receipts:[]},observed_ns:null,gaps:[]};return new BoardAnalysis(s,{history:[s]});}
test('lossless JSON preserves large integers and rational values',()=>{const x={amount:18446744073709551615n,time:[9007199254740993n,7n]};assert.deepEqual(parse(stringify(x)),x);});
test('sector aggregation retains every owner and conserves one million cells',()=>{const b=board('mutual'),rows=b.sectors(4);assert.equal(rows.reduce((n,s)=>n+s.ownership.reduce((n,p)=>n+p.cells,0),0),1000000);const ids=new Set(rows.flatMap(s=>s.ownership.filter(p=>p.player).map(p=>p.player)));assert.deepEqual(ids,new Set(b.world.playability.territories.map(t=>t.player)));});
test('toroidal region inspection comes entirely from the local snapshot',()=>{const b=board(),r=b.inspect_region({x:999,y:999,width:32,height:32});assert.equal(r.rectangle.width,32);assert.ok(r.ownership_runs.total>0);assert.ok(r.ownership_runs.items.every(r=>r.x>=0&&r.x<1000&&r.y>=0&&r.y<1000));assert.throws(()=>b.inspect_region({width:129}),/BOUNDS/);});
test('missing history is reported, never replaced by invented events',()=>{const r=board().changes_since({head:0});assert.equal(r.complete,false);assert.equal(r.events.total,0);assert.match(r.missing,/not in/);});
test('player summary preserves exact canonical accrued score and shared island pool',()=>{const b=board(),p=b.inspect_player({account});assert.deepEqual(p.player.accrued_score,b.world.credits.find(c=>c.account===account)?.units??[0n,1n]);assert.equal(p.islands.items[0].next_ball_e8s,10000000n*BigInt(Math.max(1,p.islands.items[0].supporting_balls))**2n);});
test('typed actions reject unknown fields and out-of-range raw headings',()=>{assert.throws(()=>typedAction({Fire:{cannon:1,angle:65536,quantity:1}}),/HEADING/);assert.throws(()=>typedAction({Fire:{cannon:1,angle:0,quantity:1,destination:'other'}}),/FIELDS/);assert.throws(()=>typedAction({Wait:{execute:true}}),/FIELDS/);});
test('raw heading 65535 remains exact; no unrepresentable decimal memo is substituted',()=>{const b=board(),id=b.world.cannons[0].id,q=quoteAction(b.snapshot,account,{Fire:{cannon:id,angle:65535,quantity:1}});assert.equal(Buffer.from(q.memo_hex,'hex').readUInt16BE(5),65535);if(exactDegrees(65535)===null)assert.equal(q.text_memo,null);});
test('candidate budget includes fee and always permits wait',()=>{const b=board(),out=candidates(b,account,{budgetE8s:0n,max:6});assert.deepEqual(out.map(c=>c.id),['wait']);const funded=candidates(b,account,{budgetE8s:1000000000n,max:8});assert.ok(funded.every(c=>c.action.Wait||c.quote.amount_e8s+10000n<=1000000000n));assert.ok(funded.some(c=>c.action.Move));});
test('passive baseline spends nothing and ranking chooses the stronger forecast',()=>{const evaluation={candidates:[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n}},{id:'fire',action:{Fire:{cannon:1,angle:0,quantity:1}},quote:{amount_e8s:10000000n}}],forecasts:[{candidate:'wait',scenario:'now',logical_ticks_completed:1,status:'complete',canonical_score_delta:[0n,1n],territory_before:1,territory_after:1,own_balls_lost:0,opponent_balls_lost:0,dormant_cannons:0},{candidate:'fire',scenario:'now',logical_ticks_completed:1,action_admitted_within_horizon:true,status:'complete',canonical_score_delta:[100n,1n],territory_before:1,territory_after:4,own_balls_lost:0,opponent_balls_lost:0,dormant_cannons:0}]};assert.equal(decide('passive',evaluation).candidate,'wait');assert.equal(decide('frugal-expander',evaluation).candidate,'fire');assert.deepEqual(decide('bounded-random',evaluation,{seed:8}),decide('bounded-random',evaluation,{seed:8}));});
test('forecasts run the exact kernel with explicit time facts and bound every scenario',async()=>{const b=board('revival'),before=Buffer.from(encodeWorld(b.world)),out=await evaluateActions(b,account,{horizon:1,maxCandidates:2,maxMs:2000,budgetE8s:10000000n+10000n,includeStates:true});assert.equal(out.status,'complete');assert.equal(out.forecasts.length,6);assert.deepEqual(Buffer.from(encodeWorld(b.world)),before);assert.ok(out.forecasts.every(r=>r.status==='complete'));const revival=out.forecasts.find(r=>r.candidate!=='wait'&&r.scenario==='no-new-opponent-actions');assert.equal(revival.receipt_outcomes[0].amount_used,10000000n);assert.equal(decodeWorld(Buffer.from(revival.next_state_hex,'hex')).playability.lifecycle[0].deadline_ns,undefined);assert.equal(out.provenance.trust,'local-synthetic');});
test('forecast cache binds the entire publication reference even when state bytes match',async()=>{const a=board('idle'),opts={horizon:1,maxCandidates:1,maxMs:2000,budgetE8s:0n},x=await evaluateActions(a,account,opts),b=new BoardAnalysis({...a.snapshot,reference:{...a.snapshot.reference,head:2n,root:'new-authenticated-publication',source_cursor:101n}}),y=await evaluateActions(b,account,opts);assert.equal(x.provenance.head,1n);assert.equal(y.provenance.head,2n);assert.ok(!y.cache_hit);assert.equal((await evaluateActions(b,account,opts)).cache_hit,true);});

test('agent action options expose exact costs and campaign-specific rejection reasons at one head',()=>{const b=board('idle'),r=actionOptions(b,account,{budgetE8s:500000000n,limits:{max_balls_per_player:1,max_cannons_per_player:1,max_quantity:2,approved_accounts:[account]}});assert.ok(r.candidates.some(c=>c.action.Wait));assert.ok(r.unavailable.some(c=>c.reason==='PLAYER_BALL_LIMIT'));assert.ok(r.candidates.every(c=>c.action.Wait||c.full_cost_e8s===c.quote.amount_e8s+10000n));assert.equal(r.selection.selected_cannon,b.world.cannons[0].id);});
test('an agent can inspect a specific owned cannon and cannot select an opponent',()=>{const b=board('additional'),c={...b.world.cannons[0],id:99,cell:b.world.cannons[0].cell+1};b.world.cannons.push(c);b.world.playability.lifecycle.push({cannon:99,player:1,generation:1});const rebuilt=new BoardAnalysis(b.snapshot);const r=actionOptions(rebuilt,account,{budgetE8s:500000000n,cannonId:99});assert.ok(r.candidates.some(c=>c.action.Fire?.cannon===99));assert.equal(r.selection.selected_cannon,99);assert.throws(()=>actionOptions(rebuilt,account,{cannonId:98}),/NOT_OWNER/);});
test('local candidate consent and execution share the same toroidal proximity check',()=>{const b=board('mutual'),action={Fire:{cannon:b.world.cannons[0].id,angle:0,quantity:1}};assert.equal(interactionIssue(b.world,[],action),'UNKNOWN_PLAYER_INTERACTION_STOP');assert.equal(interactionIssue(b.world,b.world.playability.players.map(p=>p.account),action),null);assert.equal(interactionIssue(b.world,[],{Wait:{}}),null);});

test('shortlists retain both fire and movement rather than filling every slot with one action type',()=>{const b=board('idle'),r=actionOptions(b,account,{budgetE8s:500000000n,max:3,limits:{max_cannons_per_player:1,max_balls_per_player:2}});assert.ok(r.candidates.some(c=>c.action.Wait));assert.ok(r.candidates.some(c=>c.action.Fire));assert.ok(r.candidates.some(c=>c.action.Move));});
test('agent money inputs reject unsafe numeric JSON and preserve exact integer strings',()=>{assert.equal(money('9007199254740993'),9007199254740993n);assert.equal(money(10000),10000n);for(const v of[9007199254740992,0.1,-1,'1.25','-1','18446744073709551616'])assert.throws(()=>money(v),/MONEY_BOUNDS/);});

test('file workers discard only parent source-selection flags and retain security/runtime flags',()=>{assert.deepEqual(forecastWorkerArgs(['--permission','--allow-fs-read=/home/test','--input-type','module','-e','private test source','--trace-warnings']),['--permission','--allow-fs-read=/home/test','--trace-warnings']);assert.deepEqual(forecastWorkerArgs(['--input-type=module','--eval=example','--max-old-space-size=128']),['--max-old-space-size=128']);});


test('campaign forecasts do not intentionally trade unknown players balls and distinguish natural losses',()=>{
 const candidates=[{id:'wait',action:{Wait:{}}},{id:'fire',action:{Fire:{cannon:1,angle:0,quantity:1}}}],rows=['now','response','delay'].flatMap(scenario=>[{candidate:'wait',scenario,status:'complete',lifecycle_complete:true,casualty_attribution_complete:true,action_admitted_within_horizon:true,logical_ticks_completed:1,elapsed_window_ns:1n,opposing_ball_losses:[{id:9,account:'outside',counterfactual_key:'existing:9',counterfactual_death_key:'same-canonical-death'}]},{candidate:'fire',scenario,status:'complete',lifecycle_complete:true,casualty_attribution_complete:true,action_admitted_within_horizon:true,logical_ticks_completed:1,elapsed_window_ns:1n,opposing_ball_losses:[{id:9,account:'outside',counterfactual_key:'existing:9',counterfactual_death_key:'same-canonical-death'},{id:10,account:'test'}]}]);
 assert.equal(consentEvaluation({candidates,forecasts:rows},['test']).candidates.length,2);
 const hostile=structuredClone(rows);hostile[1].opposing_ball_losses.push({id:11,account:'outside'});const blocked=consentEvaluation({candidates,forecasts:hostile},['test']);assert.deepEqual(blocked.candidates.map(c=>c.id),['wait']);assert.equal(blocked.consent_screen.blocked[0].reason,'PREDICTED_OUTSIDE_PLAYER_LOSS');
 assert.equal(consentEvaluation({candidates,forecasts:rows.slice(1)},['test']).consent_screen.blocked[0].reason,'INCOMPLETE_CONSENT_FORECAST');
});


test('bounded firing shortlists cover all eight exact coarse headings across rotations',()=>{
 const b=board('idle'),angles=new Set();for(let offset=0;offset<8;offset++){const r=actionOptions(b,account,{headingOffset:offset,max:3,budgetE8s:500000000n,limits:{max_cannons_per_player:1,max_balls_per_player:2}}),fire=r.candidates.find(c=>c.action.Fire);assert.ok(fire);const a=fire.action.Fire.angle;angles.add(a);assert.equal(Buffer.from(fire.quote.memo_hex,'hex').readUInt16BE(5),a);assert.equal(r.candidates.length,3);}
 assert.deepEqual([...angles].sort((a,b)=>a-b),[0,8192,16384,24576,32768,40960,49152,57344]);
 assert.throws(()=>actionOptions(b,account,{headingOffset:-1}),/BOUNDS/);
});

test('marginal policy ranking does not punish a purchase for score already earned by waiting',()=>{
 const candidates=[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n},full_cost_e8s:0n},{id:'fire',action:{Fire:{cannon:1,angle:0,quantity:1}},quote:{amount_e8s:10000000n},full_cost_e8s:10010000n}],row=(candidate,scenario,gain,admitted=true)=>({candidate,scenario,status:'complete',logical_ticks_completed:8,action_admitted_within_horizon:admitted,canonical_score_delta:[BigInt(gain),1n],territory_before:1,territory_after:1,own_balls_lost:0,opponent_balls_lost:0,dormant_cannons:0}),evaluation={candidates,forecasts:['now','late','later'].flatMap(s=>[row('wait',s,1000,false),row('fire',s,s==='now'?1020:1000,s==='now')])};
 assert.equal(decide('frugal-expander',evaluation,{version:'b2z-policies-1'}).candidate,'wait');
 const d=decide('frugal-expander',evaluation);assert.equal(d.candidate,'fire');assert.equal(d.version,'b2z-policies-3');assert.equal(d.ranking.find(r=>r.candidate==='fire').heuristic.gain,20);assert.equal(d.ranking.find(r=>r.candidate==='fire').heuristic.cost_icp_for_ranking_only,.1001);assert.equal(d.forecast_coverage.find(r=>r.candidate==='fire').unassessed.length,2);
 const unmatched=structuredClone(evaluation);unmatched.forecasts[1].logical_ticks_completed=7;assert.equal(decide('frugal-expander',unmatched).candidate,'wait');
 const never=structuredClone(evaluation);never.forecasts[1].action_admitted_within_horizon=false;assert.equal(decide('frugal-expander',never).candidate,'wait');
 assert.throws(()=>decide('passive',evaluation,{version:'unknown'}),/UNKNOWN_POLICY_VERSION/);
});


test('selecting a cannon never falls back to paying for a new one under another account',()=>{
 const b=board('idle'),other=accountIdentifier('aaaaa-aa');assert.throws(()=>actionOptions(b,other,{cannonId:b.world.cannons[0].id,budgetE8s:500000000n}),/NOT_OWNER/);
});


test('response forecasts choose a nearby active opponent rather than the first dormant account',()=>{
 const snapshot=parse(readFileSync(new URL('../../evidence/B2Z/policy-v2-2026-11-02/snapshot.json',import.meta.url),'utf8')),w=snapshot.world,account=w.cannons.find(c=>c.id===7).account;
 assert.equal(w.cannons[0].id,3);assert.ok(!w.balls.some(b=>b.owner===3));const selected=opponentResponse(w,account);assert.ok(selected);assert.notEqual(selected.id,3);assert.notEqual(selected.account,account);
 const expected=w.cannons.filter(c=>c.account!==account&&c.id!==3).map(c=>{const mine=w.cannons.find(c=>c.id===7),dx=Math.abs(mine.cell%1000-c.cell%1000),dy=Math.abs(Math.floor(mine.cell/1000)-Math.floor(c.cell/1000));return {id:c.id,d:Math.min(dx,1000-dx)**2+Math.min(dy,1000-dy)**2};}).sort((a,b)=>a.d-b.d||a.id-b.id)[0];assert.equal(selected.id,expected.id);
 const dormant=board('revival');assert.equal(opponentResponse(dormant.world,accountIdentifier('aaaaa-aa')),null);
});


test('a dormant-only opposing world is not revived by a hypothetical response without evidence',async()=>{
 const b=board('revival'),out=await evaluateActions(b,accountIdentifier('aaaaa-aa'),{horizon:1,maxCandidates:1,maxMs:1000,budgetE8s:0n,delaySeconds:[0,0,0],includeStates:true});assert.equal(out.status,'complete');assert.equal(out.forecasts.length,3);for(const row of out.forecasts){assert.equal(row.assumed_opponent_actions.length,0);assert.equal(decodeWorld(Buffer.from(row.next_state_hex,'hex')).balls.length,0);}
});


test('interrupted forecasts name missing scenarios and cannot appear fully assessed',()=>{
 const e={candidates:[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n}},{id:'move',action:{Move:{cannon:1,cell:1}},quote:{amount_e8s:10000n}}],assumptions:{scenarios:[{name:'now'},{name:'delayed'}]},forecasts:[]},d=decide('frugal-expander',e);assert.equal(d.candidate,'wait');for(const c of d.forecast_coverage){assert.equal(c.unassessed.length,2);assert.ok(c.unassessed.every(s=>s.reason==='MISSING_FORECAST'));}
});


test('dormant-world revival compares the same elapsed window while keeping logical progress explicit',async()=>{
 const b=board('revival'),e=await evaluateActions(b,account,{horizon:4,maxCandidates:2,maxMs:2000,budgetE8s:10010000n,delaySeconds:[0,0,0]}),d=decide('frugal-expander',e);assert.notEqual(d.candidate,'wait');const wait=e.forecasts.find(r=>r.candidate==='wait'),fire=e.forecasts.find(r=>r.candidate===d.candidate);assert.equal(wait.logical_ticks_completed,0);assert.equal(fire.logical_ticks_completed,4);assert.equal(wait.elapsed_window_ns,fire.elapsed_window_ns);assert.equal(fire.receipt_outcomes[0].amount_used,10000000n);assert.ok(d.forecast_coverage.find(c=>c.candidate===d.candidate).comparison_bases.every(r=>r.basis==='elapsed-window-with-idle'));
});
test('zero funding pace never produces invented immediate admission or progressing physics',async()=>{
 const b=board('idle');b.snapshot={...b.snapshot,operational:{run:{pace:{nominal_milli:0}}}};const e=await evaluateActions(b,account,{horizon:4,maxCandidates:2,maxMs:1000,budgetE8s:10010000n});assert.equal(e.status,'paused');assert.equal(e.forecasts.length,0);assert.equal(e.measurements.total_work,0);assert.equal(decide('frugal-expander',e).candidate,'wait');assert.equal(decide('bounded-random',e,{seed:8}).candidate,'wait');
});


test('manual or admission pauses do not become funding reductions or assumed resumes',async()=>{
 for(const run of[{running:false,pace:{nominal_milli:200}},{running:true,pace:{nominal_milli:200,admission_open:false}}]){const b=board('idle');b.snapshot={...b.snapshot,operational:{run}};const e=await evaluateActions(b,account,{maxCandidates:1});assert.equal(e.status,'paused');assert.equal(e.assumptions.zero_funding_rate,false);assert.equal(e.measurements.total_work,0);}
});


test('operational sample age and funding changes remain separate from an unchanged game head',()=>{
 const b=board('idle'),now=Date.now();b.snapshot={...b.snapshot,operational_observed_at_ms:now-15000,operational:{run:{running:true,pace:{mode:'Lifeline',nominal_milli:50,admission_open:true}},source:{last_error:[]}}};const first=operationalSample(b.snapshot),p=b.provenance();assert.ok(p.operational_age_ms>=15000);assert.equal(p.operational_observed_at_ms,now-15000);const paused=operationalSample({...b.snapshot,operational_observed_at_ms:now,operational:{...b.snapshot.operational,run:{running:true,pace:{mode:'ReserveProtection',nominal_milli:0,admission_open:false}}}});assert.notDeepEqual(first.values,paused.values);assert.equal(b.snapshot.reference.head,1n);assert.equal(paused.values.performance_limited,false);assert.equal(operationalSample({}),null);
});

test('an immediate benefit is not robust across unassessed 60/120-second delays',()=>{
 const candidates=[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n}},{id:'fire',action:{Fire:{}},quote:{amount_e8s:10000000n}}];
 const forecasts=['now','60s','120s'].flatMap(scenario=>candidates.map(c=>({candidate:c.id,scenario,status:'complete',logical_ticks_completed:8,action_admitted_within_horizon:scenario==='now',canonical_score_delta:[c.id==='fire'&&scenario==='now'?100n:90n,1n],territory_before:1,territory_after:1,own_balls_lost:0,opponent_balls_lost:0,dormant_cannons:0})));
 const e={candidates,forecasts},decision=decide('frugal-expander',e);assert.equal(decision.candidate,'fire');assert.equal(decision.robustness.assessed_all_declared_scenarios,false);assert.deepEqual(consentEvaluation(e,[]).candidates.map(c=>c.id),['wait']);
});
test('adaptive allocator ignores passive accrual and unmatched opponent effects',()=>{
 const evaluation={candidates:[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n}}],forecasts:[]};
 const policies=['frugal-expander','anchor-defender','attrition-raider','island-engineer','opportunist'];
 const ownHistory=policies.map((policy,i)=>({policy,reward:i===0?10000:10,comparison:'matched-wait',complete:true,initial_state:'same',wait_initial_state:'same',future_inputs:'identical-opponent-inputs',wait_future_inputs:'identical-opponent-inputs',logical_horizon:8,wait_logical_horizon:8,budget_e8s:25000000n,wait_budget_e8s:25000000n,incremental_score_delta:[i===1?8n:0n,1n]}));
 assert.equal(decide('adaptive-allocator',evaluation,{version:'b2z-policies-2',ownHistory}).delegate,'frugal-expander');
 assert.equal(decide('adaptive-allocator',evaluation,{ownHistory}).delegate,'anchor-defender');
 assert.equal(decide('adaptive-allocator',evaluation,{ownHistory:[...ownHistory,{policy:'frugal-expander',reward:999999,comparison:'unmatched-observation'}]}).delegate,'anchor-defender');
 assert.equal(decide('adaptive-allocator',evaluation,{ownHistory:ownHistory.map(r=>({...r,future_inputs:'different'}))}).reward_evidence.accepted,0);
});

test('controlled-population conditional shortlist needs trusted approval and one matching certified head',()=>{
 const candidates=[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n}},{id:'fire',action:{Fire:{}},quote:{amount_e8s:10000000n}}],rows=['now','60s','120s'].flatMap(scenario=>candidates.map(c=>({candidate:c.id,scenario,status:'complete',lifecycle_complete:true,casualty_attribution_complete:true,logical_ticks_completed:8,elapsed_window_ns:40000000000n,action_admitted_within_horizon:scenario==='now',canonical_score_delta:[c.id==='fire'&&scenario==='now'?120n:100n,1n],territory_before:1,territory_after:1,own_balls_lost:0,opponent_balls_lost:0,dormant_cannons:0,opposing_ball_losses:[]})));
 const snapshot={trust:'certificate-verifier',reference:{root:'certified-root',head:1n},world:{playability:{players:[{id:1,account:'approved'}]},cannons:[{account:'approved'}],balls:[{owner:1}]}};
 const evaluation={provenance:snapshot.reference,candidates,forecasts:rows};
 assert.equal(consentEvaluation(evaluation,['approved']).candidates.length,1);
 const good=consentEvaluation(evaluation,['approved'],{snapshot,campaignApproved:true});assert.equal(good.candidates.length,2);assert.equal(good.consent_screen.controlled_population_conditional,true);assert.match(good.consent_screen.unassessed_delays,/not ranked or proven safe/);assert.equal(decide('frugal-expander',good).candidate,'fire');assert.equal(decide('frugal-expander',good).robustness.assessed_all_declared_scenarios,false);
 for(const context of [{snapshot,campaignApproved:false},{snapshot:{...snapshot,trust:'local-synthetic'},campaignApproved:true},{snapshot:{...snapshot,reference:{...snapshot.reference,head:2n}},campaignApproved:true},{snapshot:{...snapshot,world:{...snapshot.world,cannons:[...snapshot.world.cannons,{account:'outside'}]}},campaignApproved:true}])assert.equal(consentEvaluation(evaluation,['approved'],context).candidates.length,1);
});
