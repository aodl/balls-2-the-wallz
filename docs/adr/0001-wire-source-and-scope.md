# ADR 0001 — S01 wire/source boundaries and scope

Status: accepted for the source checkpoint; live deployment gates remain open.

## Decisions

One compact 8-byte B2Z memo supports two transports without ambiguous precedence. Numeric memo values remain strings/BigInt in JavaScript. A blob plus nonzero legacy memo rejects against the pinned ICP contract.

Participant identity is the canonical ledger funding account, not an inferred principal. Non-null spenders do not carry cannon-command authority in v1. This deliberately does not support ICRC-2 command payments.

Full contiguous source scanning is the initial correctness baseline. Index responses and Event Horizon only accelerate discovery. Completeness optimizations require separate evidence and cannot silently advance the cursor.

The root workspace is registry-dependency-free; the disposable IC probe is isolated. This exception to “one workspace” prevents unavailable IC dependencies from blocking all pure tests. It is not a decision to split production repositories.

A thin resumable Life implementation is included now to make this a substantial checkpoint and test the shared interface. Its successful JS/Python tests do not promote uncompiled Rust or undeployed IC code.

## Consequences

The numeric memo is long and requires integer-safe wallet handling. Named-wallet compatibility remains unverified. Full-ledger cost may be unacceptable; optimize only after measuring and defining an index completeness watermark. A probe is disposable and must not become a production canister by accretion.

No third framework or metrics service is introduced. Operational observability remains an optional host module outside game hashes. No fabricated cycle-burn readings or ETH-equivalent denominator is added to this checkpoint.
