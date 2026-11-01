/** Small frozen policies. Inputs are public analysis, own history and typed candidates only. */
import {check} from './common.mjs';
export const POLICY_VERSION='b2z-policies-1';
export const POLICIES=['frugal-expander','anchor-defender','attrition-raider','island-engineer','opportunist','adaptive-allocator','bounded-random','passive'];
const value=r=>Number(r[0]*1000000n/r[1])/1e6;
export function decide(policy,evaluation,{seed=1,ownHistory=[]}={}){
 check(POLICIES.includes(policy),'UNKNOWN_POLICY');const choices=evaluation.candidates,wait=choices.find(c=>c.action.Wait!==undefined);check(wait,'WAIT_REQUIRED');
 if(policy==='passive')return{policy,version:POLICY_VERSION,candidate:wait.id,reason:'Passive baseline: maintain existing entities with no new purchases.'};
 if(policy==='bounded-random'){const n=(Math.imul(seed>>>0,1664525)+1013904223)>>>0;return{policy,version:POLICY_VERSION,candidate:choices[n%choices.length].id,seed,reason:'Seeded bounded random selection among legal, budget-filtered candidates, including wait.'};}
 if(policy==='adaptive-allocator'){
  const options=POLICIES.slice(0,5),stats=options.map(name=>({name,rows:ownHistory.filter(r=>r.policy===name&&Number.isFinite(r.reward))}));
  const selected=stats.find(s=>s.rows.length===0)?.name??stats.sort((a,b)=>b.rows.reduce((n,r)=>n+r.reward,0)/b.rows.length-a.rows.reduce((n,r)=>n+r.reward,0)/a.rows.length)[0].name;
  return{...decide(selected,evaluation,{seed,ownHistory}),policy,delegate:selected,reason:'Own-history exploration/empirical allocation; no other agent private plans used.'};
 }
 const ranked=choices.map(c=>{const rows=evaluation.forecasts.filter(r=>r.candidate===c.id&&r.status==='complete');if(!rows.length)return{c,rank:-Infinity};const gain=rows.reduce((n,r)=>n+value(r.canonical_score_delta),0)/rows.length,area=rows.reduce((n,r)=>n+r.territory_after-r.territory_before,0)/rows.length,loss=rows.reduce((n,r)=>n+r.own_balls_lost,0),kills=rows.reduce((n,r)=>n+r.opponent_balls_lost,0),dormant=rows.reduce((n,r)=>n+r.dormant_cannons,0),cost=Number(c.quote.amount_e8s)/100000000;
  const rank=policy==='frugal-expander'?(gain+area*.001)/(1+cost*10)-loss*.5:policy==='anchor-defender'?gain+area*.01-loss*20-dormant*100-cost:policy==='attrition-raider'?kills*15-loss*15+gain-cost*5:policy==='island-engineer'?gain+area*.02-dormant*30-loss*5-cost*2:gain+area*.005+kills*3-loss*4-cost;
  return{c,rank,heuristic:{gain,area,loss,kills,dormant,cost_icp_for_ranking_only:cost}};
 }).sort((a,b)=>b.rank-a.rank||(a.c.quote.amount_e8s<b.c.quote.amount_e8s?-1:a.c.quote.amount_e8s>b.c.quote.amount_e8s?1:0));
 const selected=ranked.find(r=>Number.isFinite(r.rank))??{c:wait};return{policy,version:POLICY_VERSION,candidate:selected.c.id,ranking:ranked.map(r=>({candidate:r.c.id,rank:Number.isFinite(r.rank)?r.rank:null,heuristic:r.heuristic})),reason:'Scenario-based heuristic over exact-kernel forecasts, not a claim of optimal play. Monetary validation remains integer e8s.'};
}
