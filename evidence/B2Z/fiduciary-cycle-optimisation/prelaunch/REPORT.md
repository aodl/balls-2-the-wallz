# Pre-launch release decision — 28 October 2026

**Recommend Option A: preserve state with a v5→v5 Wasm upgrade. Release NO-GO
pending immutable upstream publication, final build/qualification, CI and funding.**
Operator testimony identifies this as an unannounced test installation. No public
customer population is assumed. Preservation is recommended because it avoids a
new payment cutover mechanism, not because every test score must survive at any cost.

Starting reviewed HEAD: `2a038539feb13f2fe239f3aaf5e641af83230da9`, clean.
Work is isolated on `qualification/b2z-a2-prelaunch`. No application, dependency,
artifact, controller, account, pacing or production setting was changed.

## Which approach is simpler?

| Concern | A: existing v5 state-preserving upgrade | B: clean reinstall |
| --- | --- | --- |
| Implementation | Existing tested upgrade path; no world transition | New reset/source-cutover design if old receipts must not replay |
| Accounts/security | Same principal, source identity, certified observer, fiduciary subnet | Same principal retains receiving account; another subaccount breaks current treasury support; another principal adds bindings/controllers/subnet-placement work |
| State | Preserve accounts, scores, credits, receipts, source, treasury and retained bytes | Erase heap/stable gameplay, credits, receipts, source progress, treasury journals and in-canister DTR history |
| External history | Continue official Ledger reconciliation | Ledger payments and CMC conversions remain; erasing canister storage cannot erase them |
| DTR | Continue authenticated v8/epoch-2 history | New genesis/publication identity; exact existing-observer bootstrap must be rehearsed, not assumed |
| Tests/cost | Reuse successful exact-A0 upgrade/recovery evidence; qualify final Git-built bytes | Same provenance, cost, CI and delivery gates plus reset/replay/fence/treasury tests; no measured install saving establishes a benefit |
| Time/risk saved | Avoids financial cutover implementation | No demonstrated net saving; introduces additional unqualified work |

No reset proposal is recommended and no reset approval is requested. A reset
would also need independent authenticated archives, explicit acceptance of lost
credits/history and inspection of any pending financial callback. An IC snapshot
does not recover payments arriving after that snapshot.

## Exact official account-history audit

Read-only official Index query returned all **14 account transactions**, including
its reported oldest `39526411`, in one 100-row request. This is an official-Index
snapshot under the application's existing trust model, not an independent Ledger
archive rescan. [Every transaction and classification](payment-audit.json).

Seven incoming transfers total **620,000,000 e8s (6.2 ICP)**. Seven outgoing CMC
conversions total **619,930,000 e8s**, plus **70,000 e8s outgoing fees**. These
exactly consume 6.2 ICP; actual account balance is zero. The senders separately
paid 70,000 e8s in wallet fees; those fees never entered gameplay or treasury.
Certified `received_e8s` is exactly 620,000,000. Cumulative treasury-reported cycles
remain 12.11027282T; the latest success is historical, not a new replenishment.

Incoming IDs, in order: **39526411, 39630823, 39631215, 39631581, 39632173,
39710842, 39711108**. Their text memos are respectively ANGLE 37.5, 250, 273.88,
150.64, 129.07, 37.5, 37.5. All seven are non-self incoming transfers without a
spender: `source.rs::classify` creates BTZPAY02 inputs again after cursor-zero
initialization. Outgoing conversion IDs **39582090, 39631047, 39631236, 39631735,
39632296, 39710934, 39711126** produce no gameplay input, but remain committed
into source-anchor history. No Mint/Burn/Approve rows occur in this account result.

Source admission is not successful gameplay spending: the kernel increments
`received_e8s` before command acceptance and can reject underfunded/capacity or
other commands. Earlier individual command outcomes cannot all be reconstructed
from the current 16 retained publications. A new genesis would execute the seven
commands against a different world, not reproduce current gameplay. Old payments
could create game pieces/credit despite the corresponding ICP already being
converted. Their original fees are not replayed or refunded.

Two sender account IDs occur and both have certified credit/earned-score entries.
The operator describes these as personal test payments; account IDs alone do not
prove wallet control. No third-party obligation is invented or silently waived.
Option A preserves both entries and avoids needing an irreversible ownership/
credit cancellation decision. Automatic payouts remain unavailable.

The code supports only `StartingPolicy::FromBeginning`, initialized cursor zero.
The receiving account derives from the unchanged backend principal and numeric
subaccount zero. `funding.rs::context` requires the reviewed backend/default
account. A safe non-replay reset would need an authenticated Ledger/Index fence,
an explicit new source identity/cutover contract, reconciliation of in-flight
transactions, treasury support and certified configuration/client tests. Arbitrary
starting positions, hidden history skipping and fabricated transactions are not
acceptable substitutes. None was implemented.

## Current qualification ledger

| Gate | Result |
| --- | --- |
| Selected source pair | B2Z `d6c2e593e90fd75d64ed8b6d8b4e39da56a35165` + DTR `77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`, preserved research identities |
| DTR publication | BLOCKED: fresh GitHub commit lookup returns 422 No commit found; target review ref absent |
| Local DTR review identity | Clean HEAD 77; tree `068c66829619741b6784306929b51e292cb58bcf`, matching reviewed bundle |
| Immutable B2Z release graph | BLOCKED; E1 pins remain honest and unchanged until 77 is published |
| Final normal release Wasm | NOT BUILT; research `0d86ac6414a8c921f8b1eb0c53890503815b643a0510adeeaa60aeb56d537f7d` remains separate |
| Research paid-v8 64-tick costs | A0 182,308,539,204; A1 105,499,077,279; A2 58,269,955,217 actual local fiduciary cycles; 44.77% incremental / 68.04% aggregate savings |
| Equivalence/recovery | Existing named research cases PASS, including exact A0 upgrade/recovery and controlled timer restart; not automatically final-Git-artifact evidence |
| Genuine v8 browser | Existing research normal-A2 PLAYING/reconnect PASS; separate from sustained gate |
| Sustained delivery | Historical 900-second FAIL remains. Prior matched pair never started. Fresh 65-second resource screen still rejects I/O full pressure >2%; no final artifact exists to test |
| Exact final CI | BLOCKED. The guard's E1 rejection is a provenance failure, not evidence of an A2 runtime regression. No old E1 green run is reused |

The complete historical [qualification matrix and raw evidence](../qualification-20261028/REPORT.md)
remain intact, including population/fragmentation profiles, negative experiments,
instruction peaks and limitations. No expensive exploratory matrix was repeated
against the wrong graph. A2's final-artifact cost/delivery/recovery qualification
must follow publication. The existing strict four-ball, sequential A0/A2 900-second
runner/resource screen remains unchanged. Required host: median idle ≥70%, minimum
≥40%, CPU PSI ≤10%, I/O full PSI ≤2%, ≥2 GiB available memory, no swap/throttle
delta or concurrent compiler/PocketIC/heavy work. No such host or remote test-host
access is provisioned here; no other process was stopped and no assertion relaxed.

## Fresh production and user-owned funding

At **18:02 UTC**, backend liquid **2.077726386860T**, total **2.224584739430T**.
Reserve Protection supports zero ticks and closes admission. Certified v8/epoch-2
head remains **63380**, completed segments **63379**: stationary gameplay, not
healthy active playback. Source maintenance continues; treasury Idle, no new
reported credit, actual Ledger zero. Backend remains exact A0 `7c078fb3…`;
observer/module/controllers remain as recorded in the fresh raw observations.
The total/liquid difference is 0.146858352570T; its reserved/freezing split is not
separately exposed by these read-only queries.

Final-artifact installation cost cannot yet be quoted. For planning only, the
previous local research upgrade debit was 0.055335T. Two such allowances, protected
3T, 24-hour maintenance at the prior short net rate (~0.511T), two hours of
Conserve at the cautious conditional A2 model (2.182T), and 0.25T recovery margin
sum to about **6.054T**. These are not production upper bounds or guaranteed income.

A practical **provisional target of 8T liquid** provides additional margin and
does not require Normal's 40T threshold. At the observation, that means about
**5.922274T additional liquid cycles** to backend
`s34gv-3qaaa-aaaar-qcifa-cai`. Refresh the balance, final-artifact upgrade/recovery
cost and useful operating horizon before giving a final funding instruction.
No observer deployment is planned, so no frontend publication allowance is added;
its liquid balance still needs a fresh pre-release operational check if required.
No future receipts or unexplained balance increases are assumed. No funding action
or transaction command was executed.

## Publication boundary and exact future release sequence

The next required user-owned action is the guarded DTR push in
[FUTURE_RELEASE.md](../qualification-20261028/FUTURE_RELEASE.md):

```sh
cd /home/codexdev/src/dtr-b2z-cost-sync
test "$(git rev-parse HEAD)" = 77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68
test "$(git rev-parse HEAD^{tree})" = 068c66829619741b6784306929b51e292cb58bcf
test -z "$(git status --porcelain)"
test -z "$(git ls-remote origin refs/heads/review/b2z-fiduciary-dtr77)"
git push origin 77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68:refs/heads/review/b2z-fiduciary-dtr77
```

If the ref already matches, do not repush; stop on a mismatch, never force.
After publication, verify remote object/tree/ancestry; deliberately pin the four
B2Z Rust graphs plus separate consumer fixture/anchors. Compare every unrelated
dependency tuple unchanged. Preserve npm 0.14.0 and the guard. Build normally with
`--locked`, without patches/path overrides/URL rewrites; freeze the real new hash.
Run focused A0/A1/final-A2 cost, paid-v8/recovery/stress/compatibility checks and
the strict matched delivery pair on a quiet host. User publishes the exact new
B2Z commit; require six substantive CI passes and separate ignored-test receipts.

Only after these gates pass and **new explicit production approval**:

1. Refresh modules/controllers, 34-node placement, cycles, full authenticated paid
   state/history/source/treasury and independently archive evidence; reconcile
   pending financial work. Verify exact A0 predecessor and final approved hash.
2. Capture run settings; pause autonomous gameplay only for the approved maintenance
   window, preserving source and treasury maintenance. Record the paused commitment.
3. Upgrade the existing backend with the final frozen normal Wasm and empty arguments:

   ```sh
   # FUTURE ONLY: FINAL_WASM must be the separately approved, checksum-verified file.
   dfx --identity codex_local canister install s34gv-3qaaa-aaaar-qcifa-cai --network ic --mode upgrade --wasm "$FINAL_WASM" --argument '()'
   ```

4. Compare paid accounts/credits/receipts/scores, full treasury/source progress and
   all retained bytes; account only for legitimate maintenance progress. Stop on
   discrepancy or ambiguous response; inspect state before retry, never blindly
   downgrade. Upgrade execution changes production code and requires approval.
5. Restore captured gameplay settings; authenticate v8 continuation, source/treasury
   health, actual tier and browser reconnect. Keep the existing observer/frontend.

No historical world transition, reinstall, new principal, controller change or
subnet move is part of Option A. Reinstall would irreversibly erase in-canister
history and financial recovery state, and remains explicitly unapproved.

Raw read-only observations, failed prerequisite calls, complete Index response,
transaction classification and host samples are independently checksummed in
[raw-evidence.json](raw-evidence.json). Remaining blocker is user-owned DTR
publication first; final artifact, delivery/CI and funding remain explicit gates.
