# Rules20 recovery from an obstructed Rules19 journal

## 27 November 2026 disposable reproduction

The exact installed Rules19 Wasm
`b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90`
was installed on a disposable canister with genuine ICP Ledger and Index
fixtures. One ordinary Rules19 interval had committed before the incident.
The grants use real Ledger memo decoding and account-history admission.

The digit-leading account's grant entered at position 2. Its checkpoint
failed with `reserved/noncanonical key`. A later unrelated 1 ICP `NEW 0 1`
payment entered at position 3. The Index cursor advanced to 4. Two inputs
remained pending, and the publication stayed at segment 5. The committed
received total stayed at 108,100,000 e8s. Resuming and upgrading to the
identical installed module both preserved the failure and pending work.

The compatible Rules20 test Wasm
`61c61972452e78caa32195edb14d76a952892ae983b9ea1c83d8e7a7be3fb2d3`
opened the stable journal and preserved its exact publication. After the
upgrade's clean Index reconciliation, ordinary transition preparation
returned `finish existing source reconciliation and recover errors before
cutover`. This gate is a **PASS** for the reproduction and a **BLOCKED**
result for recovering the predecessor. The fixture and runner are in
[the Rules18 cost harness](../../../tools/s09-integration/tests/support/rules18_cost.rs)
and [the Rules20 runner](../../../tools/verify_rules20_installed.py).
Raw exact-source logs and sealed captures are under
`.work/final-qualification/installed-ef5795d1/`.

## Recovery boundary

The normal Rules19 execution cannot retire the failed prefix because the
grant must remain in the authorization registry at publication. Starting
again clears the run error but re-executes the same canonical write. The
pinned DTR coordinator also rejects transition preparation and application
with a staged segment, inbox reservation or pending input, even if B2Z's
run-error precondition were relaxed. A context checkpoint likewise requires
an empty inbox. The Rules20 decoder's ability to read Schema11 and the
healthy-path migration establish compatibility at their respective
boundaries. Neither operation provides a source-preserving transition out
of this state.

The recovery protocol needs a versioned authenticated boundary that can
retain an admitted, unretired suffix. It must bind the last published
manifest, retired source position and anchor, current admitted cursor and
anchor, retained seal and ordered pending input digest. The upgrade must
either carry the sealed work or deterministically replay it from its
unchanged committed predecessor and exact seal. Replaying the failed draft
requires Rules19 command, tariff, clock and motion semantics with a
canonical grant-row representation. A recovery identity must make that
distinction explicit to independent verifiers. A bounded Ledger tip and
Index watermark can fence new work while the retained prefix is consumed.

A release proof must account for every retained input and compare retained
head, source position, receipts, spent and retained amounts, and state,
events and scores in both kernels through a durable interruption. The old
module remains the rollback executable only on the old decoder side of the
new boundary. A separate exact compatible recovery executable is required
after it. Removing inputs, substituting a later Ledger time or treating a
settled admission cursor as a retired game prefix would change paid
history. This was the pre-repair assessment. The later executed result follows.

## 27 November positive recovery continuation

The exact installed Rules19 executable reproduced the obstruction again on
the pinned paid-world fixture. This run's last old publication was segment 4,
with 108,100,000 e8s committed. Grant position 2 and unrelated 1 ICP payment
position 3 were admitted in order; the source cursor reached 4 while the
retired frontier stayed at 0. Retries and identical-module upgrade left both
pending. The failed Rules19 attempt had cleared its uncommitted stage and
reservation, so no durable seal existed to migrate. Ordinary Rules20
preparation still refused this state.

Generic DTR 0.16.0 adds an epoch-v4 recovery obligation version 2 for this
precise unreserved journal shape. It binds the last committed publication,
coordinator revision, retired and admitted source frontiers and anchors, and
the complete ordered pending-input root. The first recovered seal must execute
exactly the admitted prefix. The separate version-1 obligation retains its
original sealed-stage constraints. Ordinary drained epochs are unchanged.
The Rust toy host and JavaScript Life/runtime tests compare exact shared
recovery publication and first-seal bytes. Full DTR Rust, JavaScript and
Clippy gates pass on published source `1c7fa8b3bd2c3973a9dc6525b2fe8bb744f21e2e`.

The B2Z recovery checkpoint changed only the Schema11 authorization map to
canonical rows under the dedicated Rules19-recovery identity. It retained
Rules19 command, tariff, motion and payment policy for the old prefix. The
disposable checkpoint published as segment 5, retained the exact old segment-4
bytes, and committed pending root
`8bb42750340d2cc888674d9efa40f91eafc3592841fb485cd4d93e3651083330`.
The first successor seal in segment 6 used that same root and retired the two
original inputs together. The digit-leading grant appeared in the public
registry; committed received value became 208,100,000 e8s. Identical retry
was idempotent. The old module rejected upgrade after the recovery checkpoint;
the same recovery-capable module restarted and continued.

After the old prefix and measured source cutoff drained, an ordinary Rules20
checkpoint published at segment 7. A new 3 ICP payment at position 4, sent
after the recovery cutoff, stayed out of the Rules19 prefix and was applied
under Rules20 at segment 9. Segment 8 was an intervening empty input segment.
Received value then became 508,100,000 e8s. Independent JavaScript replay
matched exact state, event and score bytes for segments 6, 8 and 9 and
verified both checkpoints and the complete consecutive history. The official
disposable Index supplied all three input payloads. Raw execution and captures
are under `.work/rules19-recovery/installed-10/`; the exact executable test is
`rules19_digit_leading_grant_wire_boundary`.

The tested candidate `9c6335037c138a471109b5363d3630a092e2b3fa8333ff8de78f25a8c4dfa515`
used the explicit development override at DTR `8e3c463a`, before its version
bump. B2Z now pins published DTR 0.16.0 and the cleanly reproduced JavaScript
package. The exact pinned B2Z executable
`61637db4671b665d7dd3293aa9a74786e083c0a9ef1eeb2dca525a36a661bd38`
also passed the same positive installed case and independent replay without a
development override; raw results are under `.work/rules19-recovery/installed-pinned/`.
The broader adversarial recovery matrix still requires qualification. This is
a positive recovery proof for the documented obstruction, not yet a Rules20
production release.

## Longer ordered prefix, 27 November

The exact installed Rules19 executable was exercised again with four genuine
pending Ledger/Index inputs after the obstruction: a digit-leading grant,
an unrelated 1 ICP `NEW 0 1`, a later replacement grant for the same
digit-leading funding account, and a 2 ICP `NEW 0 1` from a third funding
account. Their disposable Ledger positions were 3, 4, 5 and 6. Old retry and
identical-module upgrade left all four pending while the admitted cursor
advanced. The recovery checkpoint retained pending count 4; its first seal
retired the exact four-input root with source interval 0–7. Every input has
one ordered receipt in the resulting public event artifact. Both paid
commands used the original Rules19 multiplier 1 and 1,000,000 e8s first
Cannon price. The later grant replaced the earlier grant without erasing
either receipt. Committed received value was 408,100,000 e8s after the old
prefix and 708,100,000 e8s after a separate post-cutoff 3 ICP successor
payment at position 7. Independent JavaScript replay matched the complete
consecutive public state, event and score bytes through both transitions and
the successor payment. The executed result and raw captures are under
`.work/rules19-recovery/multi-installed-1/`.

This strengthens the ordered-prefix and historical-tariff result. Expiry,
a reserved old stage, resource protection and a recovery cutoff
crossing UTC remain separate acceptance cases.

An additional installed case retained six inputs: the same two digit-leading
grants, an unrelated 1 ICP purchase, a grant followed by a revoke from a
second funding account, and a 2 ICP purchase from a third account. The old
module stayed obstructed with all six inputs pending. The recovery checkpoint
bound six inputs and the first resumed seal retired them in Ledger order,
from source interval 0–9. Each received one receipt. The revoked account's
grant was absent from the final authorization rows; the later digit-leading
grant remained. Both purchases used the original Rules19 multiplier and
1,000,000 e8s first-Cannon price. Received value reached 408,100,000 e8s
after recovery and 708,100,000 e8s after an independent post-cutoff payment.
JavaScript replay matched complete public state, event and score bytes through
the ordinary Rules20 activation. Raw results are under
`.work/rules19-recovery/revoke-installed-1/`.

Expiry, the reserved-stage application boundary and resource protection
remain open. Two UTC-crossing attempts published the six-input recovery
segment but could not prepare Rules20 after restart. The second attempt
established that signed source reconciliation had settled. A third diagnostic
run captured `lifecycle_barrier: null` and a durable lifecycle error,
`lifecycle waits for halted game work: reserved/noncanonical key`. The timer
had recorded the predecessor's publication failure during the midnight
crossing and retained it after the original work was repaired. Raw failures
are under `.work/rules19-recovery/utc-installed-{1,2,3}/`. A narrowly scoped
change clears only this exact predecessor error after the recovery-finish
checks prove the entire old prefix has retired; it rearms lifecycle maintenance.
The failed attempts remain failed evidence.

The next installed run on executable
`a40589a203c86ab2d66ec60fc28fa140f074394e977d4815297b416729e36c9a`
passed recovery finish, Rules20 preparation and the ordinary successor drain.
Its final independent browser-model replay failed at the recovered segment:
the authenticated daily `economy_snapshot` was emitted at the final logical
time immediately before `lifecycle_time`, while the observer admitted only
the latter at that endpoint. The event stream itself matched native and
JavaScript kernel outputs. The observer now admits precisely that terminal
pair and rejects other final-time events. Replay of the retained genuine
installed capture matches the complete public state, event and score bytes
for the six-input Rules19 segment and post-cutoff Rules20 payment. A focused
economy regression passed. The prior run at
`.work/rules19-recovery/utc-installed-5/` remains a failure.

The complete fresh installed rerun **passed** under
`.work/rules19-recovery/utc-installed-6/`. Recovery preparation occurred on
UTC day 20781 and commitment on day 20782. The exact old committed manifest
`03c02cf44ad0c2dc7b1d923d38da7c3a024cf1523493bc1f877753bedddc44da`
remained unchanged. The authenticated recovery checkpoint committed manifest
`4bbc0718bc440e16fd882093b40026ec0341469e102e4e7237ad5e3005f69fe7`.
Its first resumed segment retired the six retained inputs from source interval
0–9, under Rules19 command and tariff semantics. The subsequent ordinary
Rules20 path accounted for a separate payment at position 9, advancing the source
interval to 10. Received value was 408,100,000 e8s after old-prefix
recovery and 708,100,000 e8s after the later payment. The installed case
sent that later official payment after the recovery checkpoint while the
old-prefix segment was still pending; the authenticated source fence kept it
out of Rules19 execution and admitted it only after ordinary Rules20 cutover.
It therefore also exercises an additional source record arriving during
recovery. The installed case
included same-ID restart, exact predecessor rejection after recovery, and
independent JavaScript replay of all state, event and score bytes through
both checkpoints and both paid segments. The corrected executable SHA-256 is
`a40589a203c86ab2d66ec60fc28fa140f074394e977d4815297b416729e36c9a`.
This closes the specific UTC-crossing case; expiry and the reserved-stage
application boundary remain separate gates.

## Resource protection, 27 November

The exact Rules20 recovery-profile executable
`a40589a203c86ab2d66ec60fc28fa140f074394e977d4815297b416729e36c9a`
passed a further installed case using the original two genuine pending
inputs. A separate same-source disposable test-hook module
`0f3cb0fd5dddbf7d7b8c5fc16671baa76b3ca900a407f49d1689b4d0be48bb26`
lowered liquid cycles to 400B before each protected operation, then the
exact recovery executable was reinstalled before the controller call.
Preparation and commitment each refused with `insufficient liquid cycles for
safe recovery`; the old committed publication and pending-input count stayed
unchanged. Disposable headroom was restored between calls. The same queue
then recovered normally, retired once, activated Rules20 and passed
independent JavaScript replay. Raw execution is under
`.work/rules19-recovery/protection-installed-2/`. The initial attempt used
the release executable to invoke the test-only balance hook and was stopped
as an invalid fixture; it is not counted as a qualification result.

Expiry and the reserved-stage application boundary remain open.

## Valid successor payment after the obstructed recovery, 27 November

The six-input installed fixture was rerun with the same exact installed
Rules19 module and recovery executable. A genuine 3 ICP payment at source
position 9 arrived after the recovery checkpoint while the old six-input
prefix remained pending. Its `FIRE 3 0 1` instruction targeted the Cannon
that the retained Rules19 purchase created for the payer. The authenticated
source fence excluded it from old-prefix execution. After the prefix retired
once and ordinary Rules20 activated, the payment published as **applied**:
one Ball, 40,000 e8s used, 299,960,000 e8s retained. Received value moved
from 408,100,000 to 708,100,000 e8s. The complete source interval ended at
10, and independent JavaScript replay matched public state, events and
scores through the recovered and successor segments. This replaces the
earlier post-cutover `NEW` example, whose value was accounted for but whose
gameplay instruction was rejected by the successor's explicit-site rule.
The fresh case passed in 153.61 seconds; raw evidence is under
`.work/rules19-recovery/valid-successor-payment-1/`.

Expiry and an application-level reserved-stage interruption remain release
gates. The generic DTR reserved-stage operation has separate independent
qualification; this result exercises the actual unreserved obstructed
Rules19 journal shape.

## Prepared recovery restart before commitment, 27 November

The six-input UTC-crossing fixture now restarts the exact recovery-capable
Wasm after the authenticated Ledger/Index fence reaches `ready` but before
controller commitment. The prepared operation remained `ready` after the
same-ID upgrade, the original committed publication bytes were unchanged,
and the controller then committed the same predecessor manifest hash.
Ordered Rules19 prefix retirement, ordinary Rules20 activation and independent
JavaScript public replay still passed. The installed case completed in
178.79 seconds; raw evidence is under
`.work/rules19-recovery/precommit-restart-1/`. This covers a durable
precommit interruption; an application-level reserved execution stage
remains open.
