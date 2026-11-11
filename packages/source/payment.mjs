import {encodeDelegatedPayment} from '../protocol/delegation.mjs';
import { canonicalAccount } from '../protocol/account.mjs';
import { decodeLedgerMemo } from '../protocol/memo.mjs';
import { uint,hex } from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
/** Application classifier over a normalized *authoritative* ledger record; not a wire/proof verifier. */
export function classifyPayment(tx, recipient) {
  const destination = canonicalAccount(recipient);
  if (!tx || !['Transfer','Mint','Burn','Approve'].includes(tx.kind)) throw new Error('unknown ledger operation; halt adapter');
  if (tx.kind !== 'Transfer') return { outcome: 'ignored', reason: 'NOT_TRANSFER' };
  const to = canonicalAccount(tx.to), from = canonicalAccount(tx.from);
  const amount = uint(tx.amount_e8s); uint(tx.fee_e8s);
  if (to !== destination) return { outcome: 'ignored', reason: 'OTHER_DESTINATION' };
  if (from === destination) return { outcome: 'ignored', reason: 'SELF_TRANSFER' };
  if (tx.spender !== null) {
    canonicalAccount(tx.spender);
    return { outcome: 'rejected', reason: 'DELEGATED_TRANSFER_UNSUPPORTED', amount_e8s: amount.toString(), account: from };
  }
  try {
    const command = decodeLedgerMemo(tx.memo, tx.icrc1_memo);
    return { outcome: 'candidate', account: from, amount_e8s: amount.toString(), command };
  } catch (error) {
    return { outcome: 'rejected', reason: 'INVALID_MEMO', amount_e8s: amount.toString(), account: from };
  }
}

/** Adapter 5 over an authoritative decoded Index row, not a wire verifier.
 * The caller preserves/checks the wire schema and supplies its raw-row digest.
 * Gameplay authorization belongs to the rules-8 ordered registry, never here.
 */
export function normalizePaymentV5(tx,recipient,{position,raw_digest}){
  const destination=canonicalAccount(recipient);
  if(!tx||!['Transfer','Mint','Burn','Approve'].includes(tx.kind))throw Error('unknown ledger operation; halt adapter');
  for(const field of tx.kind==='Mint'?['to']:tx.kind==='Approve'?['from','spender']:['from'])canonicalAccount(tx[field]);
  if(tx.kind==='Burn'&&tx.spender!==null)canonicalAccount(tx.spender);
  if(tx.kind!=='Transfer')return{outcome:'ignored',reason:'NOT_TRANSFER'};
  const to=canonicalAccount(tx.to),from=canonicalAccount(tx.from);
  for(const field of['spender','icrc1_memo','created_at_ns','ledger_time_ns'])if(!Object.hasOwn(tx,field))throw Error('AUTH_INDEX_MISSING_'+field);
  const spender=tx.spender===null?null:canonicalAccount(tx.spender);
  if(to!==destination)return{outcome:'ignored',reason:'OTHER_DESTINATION'};
  if(from===destination)return{outcome:'ignored',reason:'SELF_TRANSFER'};
  if(typeof raw_digest!=='string'||!/^[0-9a-f]{64}$/.test(raw_digest))throw Error('AUTH_DIGEST');
  const payload=encodeDelegatedPayment({from,spender,to,amount:uint(tx.amount_e8s,64),fee:uint(tx.fee_e8s,64),position:uint(position,64),ledger_time_ns:uint(tx.ledger_time_ns,64),created_at_ns:tx.created_at_ns===null?null:uint(tx.created_at_ns,64),legacy_memo:uint(tx.memo,64),memo:tx.icrc1_memo,raw_digest});
  return{outcome:'candidate',payload_hex:hex(payload)};
}
