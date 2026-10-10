# S02 evidence

`verification/verification.json` is the complete required-gate report; its overall result is BLOCKED when tools or integration harnesses are unavailable. Source checks can all pass while promotion remains blocked.

The initial BTZ log retains a failed test expectation that produced JavaScript negative zero when checking a cardinal rotation. The implementation returned canonical positive zero; the test oracle was normalized, then the full 65,536-heading sweep passed. Keeping that first log records what actually happened rather than erasing intermediate evidence.

`local-workload.json` is one actual Node run including snapshot encoding cost. Abstract work units, payload bytes and local elapsed milliseconds are not IC instructions, cycles, mainnet capacity, p99 latency or an Ethereum-equivalent metric. Null values explicitly mean unmeasured.

Subprocess recovery is exercised by the Python tool suite in the full gate logs. Source integrity and final archive reproduction are verified after packaging; the archive-side SHA-256 file identifies the delivered bytes, not its publisher or software safety.
