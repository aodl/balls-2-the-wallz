# Balls 2 The Wallz

[Balls 2 The Wallz](https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io) is a persistent
territory game played on a 1,000 × 1,000 torus. Cannons launch Balls that capture
territory. Diverters redirect Balls, Reservoirs affect local play, and players
accrue area-time scores. The live European game is a controlled prelaunch.
[Installed release and current observations](STATUS.md)

The Rust authority in `canisters/runtime-lab` reads one receiving account
through the official ICP Ledger Index. It orders inputs by Ledger position,
executes the deterministic game and certifies its publications. An independent
JavaScript interpreter checks replay and drives verified browser playback.
Historical rules, payment adapters, state decoders and migrations remain
reproducibility inputs alongside the Life second-kernel conformance tests.

Production runs **Rules19 / Schema11 / Adapter12 (BTZPAY09)** with compact
Reservoir state and capped ordinary Trickle (0.01 ticks/s, one tick per
checkpoint). Temporary controller-bound owner Full Speed has separate
authorization and resource safeguards. The permanent player and Internet
Identity origin is the European URL above.

Players can prepare exact instructions for compatible external wallets or opt
in to individual **Pay** clicks with Internet Identity, an official Ledger
allowance and a separate gameplay grant. The funding account owns the game
assets. Optional Pay requires a player's signature on each operation.
The backend reconciles receipts and separately operates the configured
treasury route. Payments and unused amounts are retained under the payment
contract. Automatic refunds and player payouts are unavailable.

## Develop and verify

Use Rust 1.94.1, Node ≥22.16 and Python ≥3.11. Use the committed locks and
[Linux setup](docs/operations/LINUX_SETUP.md) for Cargo, PocketIC and supported
Chromium prerequisites.

```sh
npm ci --ignore-scripts
python3.11 -B tools/check.py source --output .work/source
python3.11 -B tools/check.py native --output .work/native
python3.11 -B tools/verify_s14_local.py --output .work/installed
```

The [standard](.github/workflows/verification.yml),
[financial](.github/workflows/delegated-payments.yml) and
[developer / prelaunch](.github/workflows/developer-speed.yml) workflows define
exact-source qualification. Production and recovery use separately approved,
byte-verified artifacts through the [operator procedure](docs/operations/S14_OPERATOR.md).

## Hand over a source review

```sh
python3.11 -B tools/package_review.py .work/b2z-review.zip
```

The review ZIP identifies the exact commit and lists included and omitted
files. Full builds and qualification use a complete Git checkout.
[Review packaging and evidence policy](docs/operations/REPOSITORY_MAINTENANCE.md)

## Contracts and records

- [Application and specification hierarchy](docs/specs/B2Z_APPLICATION.md)
- [Human experience](docs/specs/B2Z_HUMAN_EXPERIENCE.md) and [visual system](docs/specs/B2Z_VISUAL_SYSTEM.md)
- [Daily economy](docs/specs/B2Z_DAILY_ECONOMY_17.md), [delegated payments](docs/specs/B2Z_RULES18_DELEGATED_PAYMENTS.md) and [compact Reservoirs](docs/specs/B2Z_COMPACT_RESERVOIRS_19.md)
- [Production acceptance](evidence/B2Z/prelaunch-trickle/PRODUCTION.md), [release retrieval](docs/operations/PRODUCTION_RELEASES.md), [historical evidence](evidence/B2Z/repository-consolidation/ARCHIVE.md) and [outstanding work](ROADMAP.md)
