# Certified operational-root consumer audit

Source: `codex/certified-burn-integration` after the Rules19-compatible frontend prototype was rebased onto master `6d0a30e`. This is a development audit, not backend activation evidence.

The optional operational record changes the canister's certified-data leaf from the direct publication digest to a versioned digest of the publication and operational record. Every **live** consumer of a telemetry-enabled host must bind the record before passing the publication claim to DTR. A missing or altered record must fail authentication. Historical direct-root certificates remain valid at their recorded time.

| Consumer | Scope | Treatment |
|---|---|---|
| `apps/b2z-observer/app.mjs` through `mainnet.mjs` and `bounded-observation.mjs` | Current live browser, atomic and bounded query paths | Binds the optional record before DTR; direct-root Rules19 remains supported. |
| `packages/agents/b2z/observer.mjs` | Maintained authenticated mirror and retained receipt proofs | Binds the optional record before DTR. Saves the exact record with the certificate floor and receipt-tip proof so restart and archived-proof verification can reconstruct the composed root. Existing identity support is narrower than the current game and is a separate agent-capability limit. |
| `tools/observe_europe_prelaunch.mjs` | Current read-only production observer | Uses the enriched observation and verifies both root forms. An old-backend live observation passed on 26 November 2026. |
| `tools/inspect_b2z_player.mjs` | Read-only player inspection | Uses the enriched mainnet observation and verifies both root forms. An old-backend live inspection passed on 26 November 2026. |
| `tools/verify_operational_burn_fixture.mjs` | Disposable feature rehearsal | Verifies the composed root, direct-root recovery, record tamper rejection and wrong-canister rejection. |
| `tools/verify_combined_installed_history.mjs`, `tools/capture_war_cry_installed.mjs`, `tools/boundary_deflector_readonly_mainnet.mjs` | Fixed historical Rules11 or earlier evidence | Their exact historical root format remains direct; they do not qualify a telemetry-enabled host. |
| `tools/verify_million_checkpoint.mjs`, `tools/verify_operation_cache_observation.mjs`, `tools/verify_s14_transport.mjs`, `tools/fixtures/s14-local-deployment.mjs` | Fixed older disposable scenarios and fixtures | Their direct-root assertions remain appropriate to those explicitly older scenarios. A new successor qualification must use the composed-root path. |

The existing production frontend binary predates this root composition. **Do not install a telemetry-enabled backend before a compatible frontend is installed and independently verified.** The exact feature-enabled backend still needs live Trickle/source settlement, browser, incremental cost and all-consumer qualification. The feature remains disabled in ordinary release profiles.
