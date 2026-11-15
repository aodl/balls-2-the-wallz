# Implementation boundary (before parser changes)

Starting local and remote source: 84343f0377e49658754470a9549bdd300b147c7e.
The only untracked input was the owner-provided ZIP; it is preserved. The reference
PNG SHA-256 is 988235d66eaab055b11871fead7a28f2adad61754afe4401cd3eb26e9b953eb4.
Fresh signed mainnet inventory and all77 served public bodies/headers match the
corrected78-file rollback. Both production modules/controllers remain unchanged.
The retained rollback is .work/approved-panel-war-cry/rollback/frontend.

Current memo adapter4 accepts at most32 printable ASCII bytes, with fixed command
shapes. BTZPAY02 is56 bytes and cannot retain arbitrary text. Historical paths
remain unchanged. Experimental Rules8 is delegated-payment authorization with a
separate state schema; Rules9 is clearance. Neither is merged/activated here.

Reserve memo adapter6, envelope BTZPAY03, and a distinct Rules10 annotation identity
based on Rules7 gameplay (not Rules9 clearance). State schema remains v6: no cry is
stored per cannon or tick. The new certified configuration explicitly pins the
annotation capability, byte limit32, envelope and adapter. Frontend support must
match that exact rules/config/schema identity, not a caller-supplied boolean.
Future clearance/delegation composition requires separate identities/qualification.

Each normalized input preserves canonical gameplay command and bounded exact cry;
Ledger position remains the independent input position. The full normalized input
is committed by the existing DTR path. New-version spawn-seed projection maps the
new input to its equivalent BTZPAY02 semantic bytes; cry edits cannot reroll any
spawn in the batch. Historical seed derivation is untouched.

Attach one annotation to the first real ball_spawned event per successful purchase,
with exact payment position/account and cannon. No extra per-ball events/capacity
cost; no zero-launch/Move annotation. Persist the pending annotation in the existing
cursor continuation so private-cursor recovery cannot drop or duplicate it.
Presentation consumes it only after real verified event application, using bounded
source/epoch/publication/payment/cannon fences.55s visible +5s fade; hidden age
continues. Source transitions must be drained/authenticated and preserve exact state,
watermark, pending input interpretation and journal. Activation is not authorised.

Text policy: strict UTF-8; no NFC/whitespace rewriting; reject empty suffixed text,
reserved separator, C0/C1 controls, line/paragraph separators, directional overrides/
isolates and lone surrogates. Preserve ordinary Unicode, combining marks and ZWJ.
Frontend uses complete grapheme-prefix budgeting, defers IME edits, and never
resurrects cropped text. Full memo/capability participates in copied-packet identity.

Checkpoint evidence, tests and exact artifacts will be added as executed. This plan
is not a claim of completed backend support or qualification. Production remains
Rules7, so suffixed payment preparation must remain unavailable there.
