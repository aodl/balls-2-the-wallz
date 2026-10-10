import { canonicalAccount } from '../protocol/account.mjs';
import { decodeLedgerMemo } from '../protocol/memo.mjs';
import { uint } from '../protocol/bytes.mjs';
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
