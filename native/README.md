# Native scope after S06

This workspace is authored source, still uncompiled in the recorded environment. S06 updates the publication producer to v6 and makes public outcome plus native-own recovery checks the default. It does not port the new JS typed hot path or implement actual stable-memory storage.

Run `python3 -B tools/verify_portable_native.py` and `python3 -B tools/verify_host_native.py` when real locked dependencies and Cargo are available. `--legacy-cursors` opts into older bidirectional private-cursor fixtures for port diagnostics; it is not a permanent release requirement. Tests still verify final state, audit events, scores, input retirement and native-own snapshots. Missing tooling is BLOCKED.

The current source IC host is `canisters/runtime-lab`. Do not add another host laboratory to avoid compiling this one. See [the current contract](../docs/specs/SIMPLIFICATION_V6.md).
