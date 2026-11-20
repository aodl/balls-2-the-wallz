# Rules14 Shout candidate

This development candidate retains schema7 and uses the Rules13 directive and price tables. Rules identifier `6c3aaaddf76cd4b167143a78b7c9d78900b6398d651bf2dfe191881f999ac38c`. Configuration identifier `907d00e310f4f4128a53bc0adb964e4f05dbbb9a7c60d745703aeb3c9ec48eab`. Adapter9 uses `BTZPAY06`. Sha256 over the canonical JS configuration matches the retained configuration bytes read by the native kernel.

The Ledger memo keeps the exact Rules13 directive and may append one vertical bar followed by nonempty, validated UTF-8 text. The complete memo fits in 32 bytes. Fire, Join, Build Cannon, Cannon Move, Build Diverter, Reorient and Move Diverter qualify. Text normalization preserves the account, amount, and eight-byte directive. Text is stored after the length byte and removed from the semantic seed projection, which uses the established `BTZPAY02` prefix. The previous adapters keep their existing decoders. Delegated transfers still normalize as invalid paid directives.

Successful launches keep `launch_annotation` version 1. A successful nonlaunch event can carry `action_annotation` version 1 with input position, funding account, text, target kind, structure ID and committed destination cell. It uses the same ordering as the associated accepted action. The receipt stays byte-identical to the same payment's bare form. A rejected action has no successful-event annotation. Text occupies the existing bounded pending-annotation cursor slot until emission or receipt settlement. The successor flag is omitted in older cursors and present explicitly in the candidate cursor.

The development observer gates the editor on exact configuration bytes and checks receipt and structure binding before painting. The shared JS/Rust text vectors include multi-byte text, trailing empty suffix, wrong historical compass suffix, duplicate delimiter, invalid actions and memo length failures. Candidate kernel tests compare exact receipts and final state with Rules13 and exercise JS cursor recovery after each work unit. Observer binding tests reject forged destinations, repeated annotations and attempts to present them under Rules13.

## Release status

This branch is a development candidate. It lacks a qualified installed-canister epoch transition, disposable Ledger/Index and browser qualification. A paid rollout still needs the exact predecessor-bound drain/commit protocol, interruption and compatible recovery proof, authenticated independent replay and the complete hosted qualification. Production still requires a separate activation decision.

Local checks passed for JS and Rust parsing, Rust source classification, an exact JS/native state, event and score comparison, and rejection of forged action annotations. The installed epoch and official Ledger paths remain outside that evidence.

The native conformance runner also restores the canonical cursor between
31-work-unit slices. The mixed accepted and rejected action scenario completed
after native restores and matched the independently restored JS state's event,
score and state bytes. This fixture exercises continuation serialization. It
does not cover installed storage, Ledger delivery or epoch recovery.

The native source adapter now persists adapter9 through an interrupted page
read. The source test normalizes a valueless annotated transaction fixture,
serializes and decodes the source state, revalidates it, and admits the original
source position exactly once with the original UTF-8 text. This test exercises
the Rust source state and normalized payload. Official Ledger/Index and epoch
qualification are still required.
