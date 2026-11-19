# Production reconnecting root cause

The European browser reproduced six separate sampled episodes on the previous
frontend in a 315-second settled Fire session. They clustered on accepted heads
12252 and 12253. Every sampled episode had zero observation failures, no
delivery diagnostic, no integrity error and healthy operational reply age.
The lean observation and the signed status HTTP requests were successful. The
reconnecting presentation was therefore the certificate-freshness branch, not a
transport retry branch.

| Elapsed trace seconds | Accepted head | Observed condition |
|---|---:|---|
| 209.3 | 12252 | Warning lingered with Copy already live again |
| 218.6–221.4 | 12252 | Same-head witness age jumped above 39–43 s |
| 226.3–228.7 | 12252 | Older witness disabled Copy. Recovery label persisted through a fresh reply |
| 268.1–268.8 | 12253 | Witness crossed 30 s and a later fresh reply re-enabled Copy |
| 277.9–285.5 | 12253 | Witness ages 34–47 s with reliable HTTP and signed operational replies |
| 327.3–327.9 | 12253 | Another 39.6 s certificate on the unchanged head |

There were 19 sampled reconnecting frames and 27 samples with disabled Copy.
The short warning hold could keep the old warning visible after Copy recovered.
The status layer could also display a central spinner and disable the entire
payment fieldset. That disabled inspection and payer reassociation even though
there was already a verified board and valid local draft.

The old observer reset the freshness anchor as soon as each incoming ticket
passed cryptographic verification, before sequence acceptance. Different query
replies provided valid witnesses with different ages. A valid older witness
for an identical accepted root could replace a newer witness. The five-minute
cryptographic window and the 30-second payment window answer different
questions. A success at the former boundary does not imply the latter.

The fix anchors authority to the witness for the fully admitted root, keeps the
highest witness time for that root and still expires it at 30 seconds. A signed
newer head with incomplete artifacts blocks copying until its reference state
is authenticated. The operational limit remains 15 seconds. Sustained
delivery loss has its own warning and retry counter. The observer continues to
reject wrong roots, epoch conflicts and failed verification.

A separate initial navigation visibly received the IC gateway's HTTP 503
“Subnet Upgrade” page. Independent signed backend reads still showed Rules12
running. That upstream availability incident did not produce the six
in-application episodes above. The browser traces establish the differing
valid witness times on the pinned IC query path. They do not identify a
particular replica, establish gateway overload, or justify changing endpoints.

The final frozen candidate then ran against the authenticated live backend
for 324 seconds and through five distinct accepted heads. It produced zero
sampled reconnecting or central spinner frames. Brief verified-new-head
handoff holds were labelled Verification delayed and recovered as soon as
their artifacts were admitted. These holds are separate from the stale
same-head authority oscillation.

After deployment the actual European origin ran for 324.8 seconds through
four distinct accepted publications. There were zero reconnect warnings,
central spinner samples or steady request errors. Two of 547 samples paused
Copy under Verification delayed. Both contained a signed newer head awaiting
artifacts and both recovered after admitting it. Neither was a same-head
witness age drop. Local presentation continued.

[Live observation summary](results/live-observation-summary.json) ·
[Earlier gateway 503 capture](captures/ic-gateway-http503.png)
