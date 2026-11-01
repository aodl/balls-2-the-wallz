/** Shared bounded observation/planning operations; no signer or controller imports. */
import {evaluateActions} from './forecast.mjs';
import {actionOptions,quoteAction} from './actions.mjs';
import {decide} from './policies.mjs';
import {check,money,envelope} from './common.mjs';
export const READ_OPERATIONS=new Set(['observe_game','inspect_region','inspect_player','inspect_island','changes_since','evaluate_actions','decide','action_options','quote_action']);
export async function agentOperation(observer,req){check(req&&typeof req.operation==='string','OPERATION_REQUIRED');const params=req.params??{};await observer.refresh();if(!observer.current)throw Error('STALE_RESPONSE_RETRY_REQUIRED');await observer.operational();const board=observer.analysis(req.local_budget_and_pending??null),start=performance.now();let output;
 if(['observe_game','inspect_region','inspect_player','inspect_island','changes_since'].includes(req.operation))output=board[req.operation](params);
 else if(req.operation==='quote_action'){
  check(Object.keys(params).every(k=>['account','action','fee_e8s','expected_root'].includes(k)),'REQUEST_FIELDS');
  check(params.expected_root===undefined||params.expected_root===board.snapshot.reference.root,'SNAPSHOT_CHANGED');
  const quote=quoteAction(board.snapshot,params.account,params.action),fee=params.fee_e8s===undefined?null:money(params.fee_e8s);
  output=envelope('quote_action',board,{account:params.account,quote,destination:board.snapshot.source,fee:{e8s:fee,source:fee===null?'not supplied':'caller-supplied; executor rechecks the actual Ledger fee',certified:false},full_cost_e8s:fee===null?null:quote.amount_e8s+(quote.action.Wait?0n:fee),reservation:false,payment_prepared:false,notice:'Local derivation from this exact verified snapshot. Does not reserve funds, create a transaction or authorize spending.'});
 }
 else if(req.operation==='action_options')output={schema:'b2z-agent/1',operation:'action_options',provenance:board.provenance(),...actionOptions(board,params.account,{budgetE8s:money(params.budget_e8s??0),feeE8s:money(params.fee_e8s??10000),max:params.max??12,cannonId:params.cannon_id??null,limits:params.limits??{}})};
 else if(['evaluate_actions','decide'].includes(req.operation)){const evaluation=await evaluateActions(board,params.account,{...params,budgetE8s:money(params.budget_e8s??0),feeE8s:money(params.fee_e8s??10000)});output=req.operation==='decide'?{...evaluation,operation:'decide',decision:decide(params.policy??'frugal-expander',evaluation,{seed:params.seed??1,ownHistory:params.own_history??[]})}:evaluation;}
 else throw Error('UNKNOWN_OPERATION');
 output.measurements={...output.measurements,view_ms:performance.now()-start,observer:{...observer.metrics}};return output;}
