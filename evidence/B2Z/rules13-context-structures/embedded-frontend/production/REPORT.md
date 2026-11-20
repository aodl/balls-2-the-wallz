# European embedded frontend migration

**Complete, 20 November 2026.** The existing [European frontend](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/) serves the complete B2Z website from the qualified raw embedded Wasm `b8a2252c59db613379a6cdc09f88f00e4e68758ca612c9b67d8eea7b47b927f7`, 77,062,823 bytes. DFX 0.31.0 used chunked code installation in upgrade mode with empty arguments. There was no asset upload step. A pinned-root IC certificate independently confirmed the installed module hash. [Exact artifact](https://github.com/aodl/balls-2-the-wallz/actions/runs/44707489146/artifacts/14616145972) · [Qualification](../../REPORT.md)

## Preflight and recovery

Fresh production checks verified the legacy frontend module, its controller access, all 80 signed entries and certified bodies, an empty chunk store and sufficient cycles for the operation and recovery. The subnet is a 13-node European application subnet with 38.44 GB reported memory in use. The frontend alone was stopped and restarted from 10:43:44 to 10:43:50 UTC. Its snapshot `0000000000000000000000000240661b0101` remains listed at 83.94 MiB. The full snapshot was downloaded separately from the archived legacy inventory and its 465,172-byte Wasm rehashed to `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`. After restart, the same 80 public assets verified again and the legacy site authenticated Rules12 in Chromium before installation. The upgrade command ran from 10:45:18 to 10:45:49 UTC. The chunk store was empty again after installation. Recovery remains available through the verified frontend snapshot while Rules12 is active. [Operational record and snapshot hashes](canister-operation.json) · [Recovery procedure](../RELEASE_PLAN.md) · [Subnet dashboard](https://dashboard.internetcomputer.org/subnet/bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe)

## Public content and browser acceptance

- Independent IC-v2 checks authenticated every public GET and HEAD, all 84 identity bodies, all six registered gzip bodies, their MIME types and certified headers. The sweep also passed 28 routing probes. Unknown routes returned certified HTTP 404 with the branded HTML. Private manifests and internal gzip storage paths stayed private. Deliberately changed bodies and statuses failed verification. The official ICO returned HTTP 200, `image/x-icon` and exact SHA-256 `e34ccbadc26ea0c6745d275041daea741ebc9fbba1899d59ae14e54fcffccceb`. [Complete HTTP evidence](http-verification.json) · [Actual branded 404](branded-404-320.png)
- At 1440×900, 390×844 and 320×640, Chromium authenticated Rules12 and rendered the official SVG header. Fire with War Cry, Move, Build Cannon and Build Deflector generated the expected quotes. All four legacy diagonal Deflector directions, native Copy with exact external paste, Update and Keep passed. Rules13-only controls stayed gated. At 320×640 the existing 347.15° quantity dock remained reachable, and increment and decrement accepted input. Local interruption and reconnect preserved the active draft and camera and blocked copying until a fresh authenticated session recovered. Narrow viewports used emulation. [Browser outcomes](rules12-browser.json) · [320px quantity](quantity-fire-320.png) · [Desktop reconnect](reconnecting-desktop.png)
- All 61 original audio assets matched their hashes. Chromium decoded 60 FLAC payloads and produced nonzero native music PCM during playback. The 404 also worked with JavaScript disabled and keyboard navigation back to the game. [Audio and 404 browser results](browser-media.json) · [Authenticated live page](desktop-authenticated.png)

## Paid backend preservation

The backend `s5ir5-gqaaa-aaaas-amyna-cai` remained on exact Rules12 normal Wasm `2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13`. The certified rules, configuration, schema and source identity matched before and after, along with the byte-identical source descriptor and the existing Rules12 adapter. The certified chain connected publication 13092 to 13097. Independent replay reproduced state, events and scores byte for byte for all five new publications, with no inputs or new receipts. The source cursor stayed 40180669, total received stayed 100,000,000 e8s, and the receiving balance and treasury conversion totals were unchanged. Trickle remained active at one tick per publication. No payment or funding was issued. [Certified preservation and replay](backend-preservation.json)

## Frontend resource baseline

| Observation | Cycle balance | Memory | Idle cycles/day |
| --- | ---: | ---: | ---: |
| Legacy before snapshot | 1,225,291,869,991 | 88,042,128 B | 3,113,303,884 |
| Legacy with snapshot | 1,223,184,130,735 | 176,063,556 B | 5,362,078,923 |
| Embedded with snapshot, immediately after | 1,038,458,566,494 | 318,648,373 B | 9,004,841,655 |
| Embedded after acceptance | 1,038,412,929,660 | 318,648,373 B | 9,004,841,655 |

The upgrade stage accounted for a net 184.726B cycles and the preceding snapshot stage for 2.108B. Reserved cycles stayed zero. Estimated recurring idle cost with recovery retained is **9.005B cycles/day**, an increase of **5.892B/day** over the original frontend. At the final balance, approximately **768.268B** cycles remained above the estimated 30-day freezing floor. The daily rate comes from the IC status reading and excludes future changes in storage, subnet pricing or frontend workload. [Measured cycle and memory record](canister-operation.json) · [IC cycle costs](https://docs.internetcomputer.org/references/cycle-costs/)
