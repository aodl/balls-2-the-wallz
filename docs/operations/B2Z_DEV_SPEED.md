# TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH

The separate loopback operator console shows the backend's **Adaptive** or
**Full Speed** mode and remaining time. The toggle calls controller-only
Candid methods through your existing dfx identity. It is independent of the
game, wallet access and the Internet Identity spender. A funding account,
signed game grant or Ledger allowance confers no controller access.

The development Wasm can be built explicitly with `--features developer-speed`.
For disposable qualification only, combine it with `test-hooks` to exercise a
cycle-balance drop. On a disposable canister already running that development
Wasm, run the console from its dfx project:

```bash
DFX_IDENTITY=codex_local python3.11 /path/to/b2z/tools/dev_speed_console.py --canister YOUR_DISPOSABLE_CANISTER
```

Open `http://127.0.0.1:18769/`. Full Speed uses the existing authoritative
driver, one logical tick per interval, with a one-second floor between new
publications. It keeps the existing work budget and source driver. It waits
for a committed checkpoint before enabling so it cannot resize a sealed
segment. Idle arenas stay idle. The starting window is 120 seconds. A caller
can choose 1–300 seconds, or return immediately to Adaptive.

Each window requires 1.350T liquid cycles for restart, compatible software
recovery and contingency, plus 2B per requested second. The latter is an
operating allowance. The driver samples liquid balance before each callback
and ends the override before another tick if recovery headroom is lost. It
also ends on an unsafe execution rate, stopped run or active transition.
The allocation mode and thresholds remain unchanged. The override is heap-only and returns to Adaptive on an upgrade-based
restart. A suspended canister checks the original absolute deadline before
processing more work. Canonical state, instructions, Ledger cursor and
replay inputs stay intact.

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
  reject the two DEV ONLY methods. The console is served separately from the
  certified game inventory.
- Before public launch, remove the whole feature. Remove the two Cargo
  features and their `cfg` branches, endpoint and timer logic, private state,
  Candid overlay, loopback console, tests and this file. Restore standard
  release build flags after removal, and repeat the normal export and
  embedded frontend inventory checks.
