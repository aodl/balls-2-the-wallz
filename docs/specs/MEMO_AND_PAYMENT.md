> Historical implementation context. The active S14 application is specified in [BTZ application](BTZ_APPLICATION.md). Existing memo/seal encodings remain; earlier global-scanner, local-only and future-implementation statements below do not define the current application.

# BTZ payment protocol, provisional wire version 1

**Implemented:** pure Rust/JavaScript memo codecs, the JavaScript classifier, and one local-only runtime-lab adapter exercised with valueless records from a pinned upstream ICP ledger Wasm. **Not implemented:** public payment admission, wallet transaction execution, refunds/payouts or production destination publication.

## Eight bytes, two commands

| Bytes | Meaning |
|---|---|
| 0–2 | ASCII `BTZ` (`42 54 5a`). |
| 3 | `11` hexadecimal = version 1 ANGLE; `12` hexadecimal = version 1 MOVE. |
| 4–7 | Big-endian unsigned 32-bit payload. |

ANGLE uses only the low 16 bits; its high 16 bits must be zero. `0`, `16384`, `32768`, `49152` represent 0, 90, 180, 270 degrees. MOVE uses a row-major cell index; board bounds and ownership are checked by the future BTZ kernel, not the byte codec. Direction conversion/physics is not implemented yet.

Tags and reserved bits are protocol machinery, not additional player choices. Unknown versions/opcodes, wrong length, or nonzero ANGLE reserved bits reject. There is no JSON or text parsing on the game path.

The **legacy numeric memo** is the unsigned big-endian interpretation of the same eight bytes. The **ICRC blob memo** is those eight bytes exactly. The numeric value exceeds JavaScript's safe-integer range: use decimal strings/BigInt and Candid `nat64`, never `Number`. The offline helper prints both representations without signing or sending anything.

## Observed ledger fields

The pinned ICP implementation exposes legacy `memo` plus optional `icrc1_memo` fields [R3](../IC_REFERENCES.md). S09 exercises legacy direct transfers; the exact typed response retains both fields and applies these rules:

| Observed fields | Behavior |
|---|---|
| Blob absent | Decode the exact legacy u64 bytes. |
| Blob present and legacy zero | Decode the blob, even when invalid. |
| Blob present and legacy nonzero | Reject mixed fields, even if one interpretation looks valid. |
| Empty/malformed blob | Reject; never fall back to a numeric interpretation. |

These are strict rules against the selected interface contract, not a promise that every wallet exposes either field correctly. S09 does not claim an executed ICRC-1 wallet path.

## Account and authority

The canonical participant key is the 32-byte funding **account identifier** from the ledger, encoded as lowercase hex in tooling. Validate length/checksum to catch transcription errors. A CRC is not authentication. The original principal cannot be inferred from this hash; one account is not one person, and one principal may control multiple accounts.

For now only direct transfers are command-capable. A Transfer with a non-null `spender` is rejected as `DELEGATED_TRANSFER_UNSUPPORTED`, including a self-spender case. An allowance grants spending rights; it does not necessarily grant the right to move the owner's cannon. A delegated-command protocol would need explicit authorization and is outside v1.

Ignore mint/burn/approve, transfers to another destination, and transfers from the recipient account to itself. Unknown operation variants or malformed authoritative wire fields halt ingestion for review; they are not silently treated as donations. The real wire adapter must explicitly handle optional/missing operation representations before it can be promoted.

A valid memo produces a **candidate**. The game later evaluates join/fire/move semantics, current price, capacity and ownership in sealed ledger order. `amount_e8s` is the transferred amount: do not add or subtract the sender's fee. Each ANGLE transaction is provisionally one operation, not an automatic amount-to-many-balls multiplication; this remains a BTZ economics decision before the full kernel.

Underfunded/invalid/capacity-failed **game** operations retain incoming ICP, with rejection receipts; excess is retained too. This classifier does not move funds or execute that treasury policy. Retained ICP is not itself cycles burned.

## Supported paths and gates

Legacy direct-transfer and ICRC-1 direct-transfer are the two targeted paths. S09 executes only legacy direct-transfer against the local upstream artifact, including destination, amount, memo and funding-account validation. No named wallet has been compatibility-certified. Before accepting money, test exact memo preservation, account identity/subaccounts, repeated identical transfers and ledger deduplication, fees, source delivery, and prominent no-refund warnings using test funds. Never experiment with potentially lossy memos using real ICP.
