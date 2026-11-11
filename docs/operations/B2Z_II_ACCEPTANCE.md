# Genuine Internet Identity acceptance — prepared, not executed

The ordinary European frontend is an anonymous observer/manual-wallet composer.
Its deployed sixteen-file set contains no signing SDK, sign-in or Pay controls.
The optional feature is source-qualified on `38987fe84813ddb6b8cceef293dd42a98fd64985`;
the [consolidated qualification snapshot](../../evidence/B2Z/fluid-player-experience/production/financial-qualification/provenance.json)
preserves the exact local `bc06b15` evidence. Actual Internet Identity ceremony
and stable-principal acceptance are still **NOT_RUN**. Disposable SDK signatures
and mocked browser authentication are separate evidence.

## Separate scope needed before execution

No acceptance route, origin metadata or auth-capable frontend publication is
authorized by the completed ordinary-frontend deployment. A concrete next scope
for review is an **auth-only `/ii-acceptance/` route on the existing frontend**
`s2jxj-liaaa-aaaas-amynq-cai`, with its own source review, complete asset manifest,
security-header review and bounded asset-only rollback. This is a proposal, not a
created/published route. It must not replace the ordinary game with the experimental
payment build, add a canister, activate backend rules, or expose payment controls.

Reuse the qualified [session implementation](https://github.com/aodl/balls-2-the-wallz/blob/38987fe84813ddb6b8cceef293dd42a98fd64985/apps/b2z-observer/delegated-payments/auth.mjs)
and pinned `@icp-sdk/auth` **11.2.0** / `@icp-sdk/core` **6.1.0**, locally bundled.
The acceptance surface must have no approve/transfer/transfer_from action, owner
grant/revoke execution, backend update call, key import or arbitrary JavaScript
playground. A fee query is sufficient for signed-query wiring; no ICP is needed.
Any source adaptation must be reviewed and tested; it is not covered by the
existing frozen frontend's qualification.

Do not silently change CSP, COOP/popup/redirect policy, trusted origins or CORS to
make a ceremony succeed. Review the pinned transport against the actual headers.
If an additional `/.well-known/ii-alternative-origins` or `ii-app-metadata` asset is
needed, obtain separate scope for its exact content, origins, certified delivery,
headers and publication. Do not add localhost, a temporary host or a wildcard to
the production identity relationship. No such asset was published in this release.

## Exact identity inputs to retain

- Client and configured derivation origin:
  `https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io`.
- Pinned SDK default provider: `https://id.ai/authorize`, canister
  `rdmx6-jaaaa-aaaaa-aaadq-cai` (verified in the installed 11.2.0 source).
- Requested session TTL: 3,600 seconds; idle limit: 900 seconds; credential and
  state stores are memory-only. Root-key fetching is disabled on mainnet and
  query signatures remain enabled.
- Funding account **A** stays separate from authenticated spender **S**. Game
  receiver **G** remains `s5ir5-gqaaa-aaaas-amyna-cai`, default account
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.

The provider may normalize IC gateway domains. Record both configured and provider-
reported origin; do not infer an identity change or rewrite the pinned origin from
an alias alone. The [II specification](https://docs.internetcomputer.org/references/internet-identity-spec/)
defines origin derivation, certified alternative-origin metadata and CORS rules.
The [SDK guide](https://js.icp.build/auth/latest/quick-start/) describes obtaining
the session identity; the installed pinned implementation governs this candidate.

## No-spending acceptance journey after that scope is approved

1. In an ordinary rendered browser with normal security/lifecycle settings, visit
   the exact approved HTTPS route. Record browser/OS, URL, source, served hashes,
   security headers and actual provider origin. Verify observation remains anonymous
   and the original game still works without signing in.
2. The owner performs the genuine II/passkey ceremony in the trusted provider UI.
   Do not automate credentials, request a seed/private key, or use simulated II.
   Exercise cancellation/popup denial first; these must leave observation usable.
3. After deliberate sign-in, compare `AuthClient.getPrincipal()` with the returned
   identity's `getPrincipal()` and the public sender of an optional signed
   `icrc1_fee` **query** to official Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`. Verify
   `assertSpender(identity, S, ledger)` succeeds and S is a canonical non-anonymous
   user principal accepted by the existing grant codec. A public fee response
   alone is not proof of who signed; retain the principal/delegation checks too.
4. Record actual expiry and whether delegation targets are absent or restricted;
   confirm the Ledger is supported. Do not claim a Ledger-only signing scope when
   the provider returned broader scope. Never widen it automatically after failure.
   Do not dump the identity object, session keys, authentication responses/codes,
   passkeys or credential storage into logs/evidence.
5. Sign out, then complete a fresh ceremony with the same II identity on the same
   origin. S must remain stable although session keys rotate. Reload/repeat: memory
   stores may require signing in again; they must not falsely claim persistence.
   Try another II identity: old S/context must disappear. Confirm sign-out is not
   described as revocation of either on-chain permission.
6. Test genuine session/idle expiry when feasible under the reviewed policy. Label
   any controlled-clock expiry separately. Observe tab return without disabling
   throttling/freezing and preserve observer/camera state where valid; record an
   unsupported device/browser capability as a coverage limit, not a pass.
7. Verify no allowance, owner grant/revoke, transfer or B2Z update was submitted.
   Keep the backend module/settings/source authority unchanged. Save only public
   principal/origin/target/expiry metadata, sanitized query-method evidence, user-
   visible outcomes and coverage limitations. Remove any temporary route using its
   separately approved asset-only plan, not a backend operation.

## Acceptance does not activate payments

A stable authenticated S is not funding-account ownership or gameplay permission.
No allowance is granted, no owner setup transaction is sent and no ICP is spent
in this acceptance. Existing Ledger allowances are not destination-restricted.
The ordinary production backend remains rules 7/schema 6. Later financial
activation still requires separate state-preserving upgrade/cutover/recovery
review and explicit backend/financial authority. Keep the versioned `B2ZPAY05`,
owner proof, expiry/order, immutable-intent, deduplication and retained-payment
contracts intact. Passing the ceremony is necessary coverage, not that approval.
