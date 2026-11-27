# Rules20 successor progress — 27 November 2026

This is a development-branch record. Rules19 remains installed in Europe. No
production operation was performed. Master `6d0a30e` is the starting baseline;
draft PR #25 carries the successor. This branch is **not a release candidate**.

## Established facts

- A valid digit-leading funding account can stop the exact installed Rules19
  module from publishing a genuine disposable authorization grant. Source
  admission continues, while later paid gameplay remains unapplied. Ordinary
  retry and an identical-Wasm upgrade do not repair it. All received payments
  remain accounted for. See [the incident](AUTHORIZATION_REGISTRY_INCIDENT.md).
- Sorted Schema12 grant rows store canonical account identifiers as values.
  Rust and independent JavaScript accept all 16 leading hexadecimal digits;
  old Schema10/11 decoding and historical bytes remain unchanged. Direct row
  operations avoid a complete map conversion on every payment.
- The Rules20/Schema12 host now supports an authenticated zero-time epoch
  transition from the exact installed Rules19/Schema11 predecessor. The
  successor observer checks the identity and source fence. Adapter12 and the
  existing payment grammar remain unchanged. A disposable same-ID rehearsal
  preserved predecessor publication and paid state, rejected old-module
  recovery after the durable epoch, and recovered with the same successor
  executable.
- That rehearsal applied one genuine indexed Ledger Join, published a valid
  digit-leading authorization grant, then published an unrelated later
  payment. Independent JavaScript replay matched exact public state, event
  and score output for all three paid successor segments. Raw captures and
  results are under `.work/rules20-installed-9497894e/` in the rehearsal
  worktree; the executable test and verifier are committed to PR #25.
- A separate same-ID rehearsal paid for a Cannon on existing Ball 1's tile
  `98008` and a Diverter on existing Ball 2's tile `42022`. Both payments were
  admitted while gameplay was paused, then applied together after resuming.
  The exact installed Rules19 predecessor and the same successor Wasm were
  used. Independent JavaScript replay matched the one successor segment's
  state, event and score bytes with both genuine Ledger/Index inputs. Raw
  evidence is under `.work/rules20-construction-final/` in the rehearsal
  worktree.
- Runtime-input source `9497894e` built the capped-Trickle backend with raw SHA-256
  `fffa5e3e2e61096b62266e30cb34e7f97d84a5f7f711ed79296b3c5dd3f7a24d`.
  This equals the executable used in the passing rehearsal. Candid/export
  validation passed locally. Exact-source hosted standard and financial runs
  for `859ac38b` remain in progress. Its developer run failed at a verifier
  export allowlist that still expected only the Rules18 speed and Rules19
  compact-reservoir additions. The downloaded hosted candidate had exactly
  the three reviewed Rules20 transition methods in addition to those allowed
  methods, with no removed predecessor exports. The strict allowlist has been
  corrected and needs exact-source hosted requalification.
- Explicit new Cannon and Diverter planning under Schema12 ignores Ball-only
  occupancy, while relocation and first Join retain the old policy. Canonical
  per-Ball, per-new-structure passage rows survive encoding and retire on exit
  or structure removal. Rust and independent JavaScript focused tests cover
  entry, tangency, unrelated arrivals, later return and Cannon birth. Two new
  public-output vectors show an initially overlapping Ball crossing a new
  Diverter unchanged while a later Ball is deflected, then the same first Ball
  being deflected after its row has retired. Independent Rust and JavaScript
  state, event and score bytes match with interrupted native cursor restores.
  The second vector deliberately repositions the saved Ball for a controlled
  return; it is a synthetic later-contact regression, not a continuous natural
  orbit or an additional paid construction acceptance.
- The exact corner classifier uses canonical source-tile checkerboard parity.
  Focused Rust and JavaScript tests cover four diagonal directions, both
  parities, seams, mixed ownership and historical Rules19 behavior. Eight
  exact diagonal simulations across both parities now compare independent
  Rust and JavaScript **public state, event and score bytes** after native
  cursor interruption; each captures exactly one tile. The new fixture is
  checked by the ordinary portable-native gate. Mixed structure contacts,
  protection and equal-time public-output cases remain open.
- Symbolic population tariffs are integrated through the successor payment
  cursor, batch continuation, receipts, public quotes and browser capability
  gating. Focused independent tests cover exact prices, overflow, partial
  affordability and linear-grace comparison. Historical linear tariffs retain
  their own identity and immutable Ledger block-time selection.

## Release gates still open

1. Complete the corner ownership/structure output matrix with independent
   replay, including interrupted checkpoint/restart across an in-progress
   exception. The paid construction admission and the initial/later passage
   public bytes have focused evidence, but the full acceptance matrix is open.
2. Qualify interrupted transition preparation and commit, restart, recovery,
   a retained compatible executable and source publication after interruption.
3. Freeze the final exact-source release artifacts and require all eleven
   substantive hosted jobs on that source. The informational production
   inventory guard is separate.
4. Complete certified-burn operational sampling, consumer compatibility,
   browser and incremental cost checks on its separate draft branch before
   deciding whether to include it in the eventual backend release.

The P0 registry repair requires a versioned paid-state transition and
compatible recovery even if separated from the rest of Rules20. The combined
successor is currently the narrower reviewed transition path. Do not merge
unqualified runtime code into master or install it on production.
