> Historical checkpoint contract. Conflicting S06 requirements are superseded by [the current simplification contract](SIMPLIFICATION_V6.md).

# Committed publication and observation v5

Status: executed producer, browser-compatible content verifier and playout tests; native producer and IC certification endpoint source authored but uncompiled. No real IC certificate or BLS-verification test has executed.

## Small initial representation

A canonical typed-JSON publication includes host revision, source/rules/config/schema identity, ingest head, committed head and a fixed ordered artifact catalog: state, events, scores. It never contains the staged cursor or uncommitted board. Each artifact is <=1 MiB and is split into 16,384-byte chunks. The catalog lists total length, SHA-256 of the whole artifact, and ordered SHA-256 hashes of each chunk. Publication bytes are <=64 KiB.

The root is SHA-256(publication bytes). In the IC laboratory this root is the value supplied to `certified_data_set`. A flat catalog is intentional: at these bounded sizes it avoids an unnecessary Merkle-witness implementation. A future larger protocol can introduce a separately versioned tree without changing game rules. A full-object digest and the ordered chunk list bind artifact type, position, length and contents through the publication root.

An empty artifact has zero chunks and the standard SHA-256 digest of empty bytes. The state digest must match the committed head. Non-genesis manifests must reproduce `DTRMANI1` over the seal digest and three artifact digests. The inherited seal encoding is shared between server and browser as a pure codec.

## Authentication is not a hash comparison

There are two explicit client entry points:

- `verifyPinnedPublication`: offline content integrity against an independently acquired root. Its ticket is labelled `offline-pinned-content`; a root bundled by an attacker is not authentication.
- `verifyCertificatePublication`: requires a trusted certificate-verification dependency. The dependency must verify the BLS signature, delegation/canister ranges, pinned network root key and exact canister certified-data path. No default implementation or replica-fetched root key is supplied in S05. Missing dependency is an error.

The wrapper additionally enforces expected canister/network, certificate freshness/future skew, publication digest, schema, bounds, identity and manifest consistency. Tests use explicitly labelled verifier stubs to exercise this boundary, **not to claim cryptographic certificate verification**.

Certificate bytes and publication bytes are copied before awaits. Otherwise mutable transport memory could change between hashing/verification and decoding. Verified catalogs are recursively frozen and branded within the module; arbitrary object copies are not accepted as verified tickets.

## Retrieval and replay

Chunk queries require the expected publication root. A new revision can produce a stale-response error; the client refreshes the catalog rather than mixing versions. The assembler accepts out-of-order and duplicate valid chunks but refuses incomplete, mis-sized, out-of-range or corrupt data. It verifies the whole artifact before returning bytes. It never returns a partially checked board as a verified artifact.

`PublicationSequence` rejects rollback, differing roots at one revision, same-height conflicting game heads, source/rule changes and broken predecessor links. Missing segments produce an explicit snapshot-resynchronization requirement. The initial implementation retains only the latest canister catalog; it is not yet a historical event CDN. A client can explicitly restart from a newly authenticated complete snapshot, but must not interpolate missing history.

## Presentation

`PlayoutClock` is a separate presentation-only module. Only verified, completely downloaded contiguous ranges may extend its available head. It waits for initial headroom, slews speed inside a small envelope, slows as the buffer drains, and clamps exactly at exhaustion. It never invents authoritative future frames. Long tab suspensions have a bounded per-frame catch-up delta. Gaps require deliberate resynchronization.

It neither schedules checkpoint commands nor changes physics/accounting time. This is a tested browser-compatible module, not yet a rendered BTZ browser application. HTTPS/localhost WebCrypto and a production certificate SDK integration remain browser/integration gates.

## IC laboratory

The new runtime laboratory stores a compact root and chunked coordinator image plus public artifacts. Mutations are controller-only; no live source verification or funds are present. Its query path reads the small root and requested output chunk, not the private whole cursor. All fallible preparation happens before a no-await write phase. Upgrade must verify existing image/output identities and re-establish certified data; no genesis fallback exists.

Reading official API documentation is not proof that this source builds or that its certificate/delegation/upgrade behavior works. Generated Candid, Wasm, PocketIC traps/upgrades and actual certificate verification remain mandatory gates.
