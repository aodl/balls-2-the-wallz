# Matched renderer measurements

A is original316593f renderer, B is final indexed0e2740c renderer. The order is A/B/B/A at identical populated poses;80 measured draw samples after20 warm-up frames each. Both have audio absent and no game simulation. These are synthetic render-only desktop Chromium/software-host observations, not physical-device, audio P09 or Deflector backend cost qualification.

|Viewport|Requested/visible cannons|Scale|A draw p50 pair ms|B draw p50 pair ms|A draw p95 pair ms|B draw p95 pair ms|A/B calls|A/B triangles|
|---|---|---:|---|---|---|---|---|---|
|[1440, 900]|1/1|64|1.40/1.40|1.40/1.30|3.20/3.40|2.90/2.90|7/4|318/278|
|[1440, 900]|32/32|20|1.80/1.70|1.40/1.40|3.80/3.30|3.60/3.50|7/4|10114/8834|
|[1440, 900]|128/128|8|2.70/2.50|1.80/1.70|5.40/4.90|3.70/3.80|7/4|40450/35330|
|[1440, 900]|128/128|2|2.60/2.50|2.20/2.10|4.80/4.80|4.60/3.40|7/5|40458/36362|
|[390, 844]|1/1|64|1.80/1.30|1.50/1.30|3.30/3.20|2.80/2.40|7/4|318/278|
|[390, 844]|32/27|20|1.60/1.50|1.40/1.30|3.30/4.10|2.80/2.60|7/4|8534/7454|
|[390, 844]|128/128|8|2.60/2.40|1.70/1.50|4.60/3.50|3.50/3.00|7/4|40450/35330|
|[390, 844]|128/128|2|2.50/2.30|2.00/1.70|4.00/3.70|3.80/3.30|7/5|40450/36354|
|[320, 640]|1/1|64|1.40/1.20|1.20/1.10|3.00/2.80|2.10/2.50|7/4|318/278|
|[320, 640]|32/25|20|1.70/1.60|1.50/1.40|3.00/2.50|3.20/3.00|7/4|7902/6902|
|[320, 640]|128/128|8|2.40/2.30|1.60/1.60|4.10/3.20|2.90/4.20|7/4|40450/35330|
|[320, 640]|128/128|2|2.40/2.30|1.90/1.90|3.80/4.10|3.60/2.70|7/5|40450/36354|

All B samples report unchanged body instances not uploaded. Actual RAF p95 remains slow/variable (e.g. desktop128 at scale8: A116.6/100ms, B100/100ms); draw CPU is not the frame period. A new32-cannon desktop repetition has a22.4ms draw p99 tail while its other repetition is3.9ms: do not infer a universal tail improvement. Raw p99, RAF samples, geometry/texture counts, estimated requested upload bytes and GPU-timer availability are in [the raw results](results/bench-abba/results.json). No hardware GPU timing was measured.

The earlier unindexed graphite run observed desktop128/scale8 draw p50 29.7ms against old8ms in that run. It is retained as an observed regression, not hidden by the later matched comparison. Indexing reduced cannon vertices780→369 (same260triangles), bounded hue caching removed repeated contrast searches, and unchanged structure bodies no longer upload on animation-only frames. The result supports the recorded renderer scope; audio P09 remains FAIL/unqualified.
