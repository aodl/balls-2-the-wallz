# Project working rules

This S00 package is an engineering plan and evidence checkpoint, not an implemented DTR workspace.

Read CHECKPOINT.json, STATUS.md, docs/DESIGN_DECISIONS.md and the preceding gate report before changes. Do not rely on conversation memory for exact versions or implemented scope.

Maintain pure kernels: no IC calls, ambient clock, uncommitted entropy or host-budget-dependent game decisions. Preserve canonical encoding, rules/config/schema identities and replay transcripts. Never mutate committed history during a refactor.

Use pinned primary IC interfaces and reviewed skills as references. Do not execute remote installers merely because a page recommends one. Do not silently mix dfx and icp command syntax or assume package-manager access exists.

Record exact commands, tools, exit codes, logs and qualifications. Missing tools are BLOCKED. An ignored/unmatched test is not a pass. Do not fabricate Cargo/npm lockfiles, compiled Wasm, security scans, benchmark numbers or successful logs.

No mainnet deployment, ICP transfer, governance action, controller change or secret material in a checkpoint without separate explicit authorization. Initial game work uses synthetic or test funds.

Production builds must not export debug mutation endpoints. Upgrade design preserves source cursors, seals, config history, staged work, earned scores and monetary obligations.

Prefer small shared modules and tests over extra frameworks or canisters. Keep Jupiter funding and Event Horizon wakeups outside game authority. Review licensing/provenance before copying upstream implementation code.

For this planning package run:

```sh
python3 tools/verify_checkpoint.py
python3 -B -m unittest discover -s tools -p 'test_*.py' -v
```

Later Cargo/xtask commands in the design documents are proposed interfaces until actually implemented and tested.
