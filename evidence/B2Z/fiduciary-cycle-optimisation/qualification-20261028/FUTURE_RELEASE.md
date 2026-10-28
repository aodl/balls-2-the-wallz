# Guarded continuation — no deployment authority

The measured research pair is B2Z
`d6c2e593e90fd75d64ed8b6d8b4e39da56a35165` + DTR
`77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68`, normal Wasm
`0d86ac6414a8c921f8b1eb0c53890503815b643a0510adeeaa60aeb56d537f7d`.
The B2Z dependency graph still pins E1. No ordinary Git-pinned **final deployment
artifact** has been frozen. A subsequent graph/build-path change can change Wasm
bytes even when public outputs remain identical.

Only the user may publish the reviewed upstream revision:

```sh
cd /home/codexdev/src/dtr-b2z-cost-sync
test "$(git rev-parse HEAD)" = 77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68
test -z "$(git status --porcelain)"
test -z "$(git ls-remote origin refs/heads/review/b2z-fiduciary-dtr77)"
git push origin 77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68:refs/heads/review/b2z-fiduciary-dtr77
```

An existing matching ref needs no push; an existing mismatched ref requires
inspection, never force. These commands do not merge upstream master, change npm,
or authorize B2Z publication. They have **not** been executed by this qualification.

After that immutable object is actually remotely available, continue locally:

1. Re-read remote refs; verify exact DTR77 source tree and clean consumer using
   ordinary Cargo Git resolution, with no path patch, URL rewrite or development
   override. Update the four intended B2Z Cargo manifests and lockfiles to 77,
   the separate `tools/fixtures/dtr-consumer-rust` manifest/lock, and the Rust
   revision/tree anchors in `tools/verify_dtr_consumers.py` to
   `77ba46cb…` / `068c66829619741b6784306929b51e292cb58bcf`. Preserve npm 0.14.0
   and its archive. Compare every lock tuple `(name,version,source,checksum)`;
   only the DTR workspace packages may change. Stop on unrelated resolution drift.
2. Run `python3 -B tools/check_dtr_provenance.py` against the locks and resolved
   Cargo graph. The new six-job workflow requires 77 and rejects E1/path hybrids.
   Until pinning, that gate is deliberately BLOCKED. Do not use its diagnostic
   `--expected-revision E1` mode as an A2 pass.
3. Commit the intentional pin/consumer changes separately. Freeze reproducible
   **normal**, uninstrumented Wasm from this exact source graph. Verify no test
   exports and record the real new SHA-256. Keep A0/A1/research-A2 untouched.
4. Explicitly run the ignored matched cost and paid-v8 recovery tests against
   that exact new artifact using `tools/verify_operation_cache.py`, including
   `--mode recovery`, exact frozen A0, and A1. Run genuine v8 browser/reconnect
   separately with `--mode v8-browser` against the exact final normal candidate,
   and the unchanged 900-second gate with resource evidence. Existing research
   results remain evidence for their original bytes, not a substitute for these
   new artifact gates. Do not repeat the full successful research matrix merely
   to diagnose delivery; select checks invalidated by the final graph/artifact.
5. Complete relevant local source/native/Rust/clippy/Candid/consumer/browser/IC
   checks. The user may then publish the resulting **new** exact B2Z commit on a
   separate qualification branch. Require all six substantive CI jobs green on
   that exact SHA with 77-resolution evidence; explicitly attach the ignored
   cost/recovery receipts. Do not repush unchanged research `adb0be6…` or treat
   its E1 CI artifact as A2. No master merge or frontend redeployment is needed
   for this bounded qualification.

Deployment remains NO-GO until delivery, immutable provenance, exact bytes, CI and
production funding all pass. Do not supply an executable production-upgrade
command while these gates are open. A separately authorized future procedure must:

- Authenticate and independently back up then-current paid v8 state, all retained
  artifacts, source/Index progress, credits/receipts/accounts and treasury, including
  any in-flight financial operation. Recheck predecessor `7c078fb3…`, canister
  `s34gv-3qaaa-aaaar-qcifa-cai`, controllers, subnet and exact candidate bytes.
- Refresh an entire release/recovery/maintenance allowance **in addition to** the
  protected 3T reserve, with an independently funded maintenance/recovery margin.
  Do not infer funding from hypothetical receipts or maintenance-only runway.
- Use the reviewed state-preserving upgrade plan on the existing backend with
  empty upgrade arguments. No reset/reinstall/world transition/controller change.
  The paid world is already v5; do not invoke either historical transition.
- Compare authenticated pre/post paid state and complete retained bytes, allowing
  only reconciled legitimate source/treasury progress. Verify live certified v8
  observation and ongoing source/treasury service. Stop on any integrity, reserve
  or ambiguous-response discrepancy; inspect before retry and never downgrade
  without qualification. Frontend and DTR wire formats remain unchanged.

Timer-trap operational note: `running=true` with a stationary authenticated head
does not establish progress. Compare supported tier, head/tick counters, work
phase and timer errors over time; Reserve Protection intentionally supports zero
ticks. In the matched forced-memory-trap rehearsal, normal A0 and A2 both preserve
state but need an explicit local pause/start to re-arm the one-shot timer. Any
production recovery action requires fresh explicit authority and paid/source/
treasury inspection first. No automatic watchdog was added.
