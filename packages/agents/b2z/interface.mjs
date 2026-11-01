/** Shared bounded observation/planning operations; no signer or controller imports. */
import {evaluateActions} from './forecast.mjs';
import {decide} from './policies.mjs';
import {check} from './common.mjs';
export const READ_OPERATIONS=new Set(['observe_game','inspect_region','inspect_player','inspect_island','changes_since','evaluate_actions','decide']);
export async function agentOperation(observer,req){check(req&&typeof req.operation==='string','OPERATION_REQUIRED');const params=req.params??{};await observer.refresh();if(!observer.current)throw Error('STALE_RESPONSE_RETRY_REQUIRED');await observer.operational();const board=observer.analysis(req.local_budget_and_pending??null),start=performance.now();let output;
 if(['observe_game','inspect_region','inspect_player','inspect_island','changes_since'].includes(req.operation))output=board[req.operation](params);
 else if(['evaluate_actions','decide'].includes(req.operation)){const evaluation=await evaluateActions(board,params.account,{...params,budgetE8s:BigInt(params.budget_e8s??0),feeE8s:BigInt(params.fee_e8s??10000)});output=req.operation==='decide'?{...evaluation,operation:'decide',decision:decide(params.policy??'frugal-expander',evaluation,{seed:params.seed??1,ownHistory:params.own_history??[]})}:evaluation;}
 else throw Error('UNKNOWN_OPERATION');
 output.measurements={...output.measurements,view_ms:performance.now()-start,observer:{...observer.metrics}};return output;}
