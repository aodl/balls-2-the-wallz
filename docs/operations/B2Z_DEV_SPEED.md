# TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH

The development frontend shows **DEV ONLY · Simulation speed** under
**Game status**. Sign in as owner on
`https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`, then use **Full Speed** or
**Return to Adaptive**. The panel shows the backend's mode and remaining time.
The operator session uses the [permanent Internet Identity origin](../specs/B2Z_RULES18_DELEGATED_PAYMENTS.md#permanent-european-internet-identity-origin).

An existing backend controller binds the owner's verified public Internet
Identity principal through `bind_dev_speed_operator(opt principal)`. Bindings
have no financial rights and do not change the controller set. An unbound
principal cannot read or change the lease, even if it can pay in the game.
Setting `null` revokes operator access and ends an active window. Rebinding to a
different principal also ends the window. Upgrades clear both the binding and
the lease. The existing loopback console remains available to controllers.

The development Wasm can be built explicitly with `--features developer-speed`.
For disposable qualification only, combine it with `test-hooks` to exercise a
cycle-balance drop. On a disposable canister already running that development
Wasm, run the console from its dfx project:

```bash
DFX_IDENTITY=codex_local python3.11 /path/to/b2z/tools/dev_speed_console.py --canister YOUR_DISPOSABLE_CANISTER
```

Open `http://127.0.0.1:18769/` to use the loopback console. Full Speed schedules
one logical tick per second through the authoritative driver. It keeps the
schedule phase through ordinary subnet round jitter and permits at most one
checkpoint per callback. For bounded Rules17/18 seals, the first ordinary
work slice can run in the same callback. Larger seals and unfinished segments
yield through the existing continuation. The work budget, hard action caps and
source driver stay in force. It waits
for a committed checkpoint before enabling so it cannot resize a sealed
segment. Idle arenas stay idle. The starting window is 120 seconds. A caller
can choose 1–300 seconds, or return immediately to Adaptive.

Each window requires 1.350T liquid cycles for restart, compatible software
recovery and contingency, plus 6B per requested second. The operating allowance
includes margin above the measured mainnet cost of about 4.19B per checkpoint.
The driver samples liquid balance before each callback
and ends the override before another tick if recovery headroom is lost. It
also ends on an unsafe execution rate, stopped run or active transition.
The allocation mode and thresholds remain unchanged. The override is heap-only and returns to Adaptive on an upgrade-based
restart. A suspended canister checks the original absolute deadline before
processing more work. The owner-only status records the latest stop reason.
Canonical state, instructions, Ledger cursor and
replay inputs stay intact.

## European rollout

Use only the published development workflow artifacts. The existing Rules18
frontend needs enough liquid cycles for an embedded install, a full compatible
reinstall, temporary chunks and contingency. Keep the established 494B
combined allowance and the exact known-good Rules18 frontend. Retain the
exact normal Rules18 backend as the tested recovery executable. Reserve
backend cycles for the upgrade and compatible recovery, then verify at least
2.070T liquid before starting a 120-second test.

Install the certified development frontend first. Check the pinned sign-in
origin, manual Copy and the existing Rules18 app. Pause the backend, verify
the predecessor and install the development module in upgrade mode. Check the
certified Rules18, Schema10 and Adapter12 state and resume existing Trickle.
This is a same-epoch upgrade. Bind the owner's separately verified public
principal with the existing controller. The owner activates through Game
status. Record certified checkpoint progression, the automatic return to
Adaptive, the unchanged source and financial state, and the cycle use. Use
read-only production observations and measure the test window independently.

## Disposable qualification

Compile the disposable module and run the focused, installed integration test.

```bash
CARGO_TARGET_DIR="$PWD/.work/dev-speed-target" cargo build --manifest-path canisters/runtime-lab/Cargo.toml --release --target wasm32-unknown-unknown --locked --features developer-speed,test-hooks
python3.11 -B tools/verify_s14_local.py --dev-speed-wasm .work/dev-speed-target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm --test-filter dev_speed_installed::dev_speed_switches_authoritative_pace_and_preserves_replay --output .work/dev-speed-verification
```

Set the development build's `CARGO_TARGET_DIR` to an isolated directory
when retaining a normal release executable and pass that path to the runner.
The installed test uses pinned disposable Ledger and Index artifacts. There
is no financial signing, production access or gameplay-payment permission in
the operator console.

## Public-launch checklist

- The normal verification and release builds explicitly select
  `public-launch`. Cargo rejects any build that also selects
  `developer-speed`. Existing normal-Wasm Candid export checks independently
  reject all three DEV ONLY methods. The ordinary frontend build rejects the
  temporary script unless the dedicated developer build is explicitly selected.
- Before public launch, remove the whole feature. Remove the two Cargo
  features and their `cfg` branches, endpoint and timer logic, private state,
  Candid overlay, UI, developer frontend build, dedicated CI, loopback console,
  temporary audit allowances, tests and this file. Restore standard
  release build flags after removal, and repeat the normal export and
  embedded frontend inventory checks.
