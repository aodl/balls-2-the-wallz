# Secure controller preflight for European Rules20

The owner can run these checks in a local terminal with their existing
approved secure DFX identity. Use the usual hardware signer or protected
identity unlock on that device. The identity must already map to a
controller on both canisters. These are the two verified controller principals.

- `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`
- `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`

Set `B2Z_CONTROLLER_IDENTITY` to the existing secure DFX identity name
and run this from the B2Z checkout. The first command returns only its
public principal. The following commands read both management statuses
and the controller-only application state.

```sh
env -u DFX_WARNING dfx --identity "$B2Z_CONTROLLER_IDENTITY" identity get-principal
env -u DFX_WARNING dfx --identity "$B2Z_CONTROLLER_IDENTITY" canister status s2jxj-liaaa-aaaas-amynq-cai --network ic
env -u DFX_WARNING dfx --identity "$B2Z_CONTROLLER_IDENTITY" canister status s5ir5-gqaaa-aaaas-amyna-cai --network ic
for method in controller_work controller_runtime controller_funding; do
  env -u DFX_WARNING dfx --identity "$B2Z_CONTROLLER_IDENTITY" canister call \
    s5ir5-gqaaa-aaaas-amyna-cai "$method" '()' --network ic --query \
    --candid canisters/runtime-lab/runtime-lab-prelaunch.did
done
```

Proceed only after the principal matches an existing controller and these
checks succeed under DFX's normal security policy. For a supervised signing
session, share the configured identity name or approved terminal location
and keep signer interaction local. A signed status result alone does not
provide access for later upgrade messages.

The production frontend and backend retain the original canister IDs.
Release selection, chunk storage, capacity and recovery allowances, the
fresh controller journal and source cut, and the absence of competing
maintenance all remain part of the production preflight. The authenticated
journal determines the ordinary or exceptional path. Use the existing
Rules19 backend only before an incompatible successor boundary. Use the
qualified successor executable for recovery after that boundary.

The 27 November installation log confirms a successful same-ID frontend
upgrade. It contains no signer identification. The adjacent historical
European controller script identifies `codex_local` and suppresses the
DFX plaintext warning. The current CLI rejects that plaintext identity
before sending the controller query. Public principals from all 15 configured DFX identities were checked.
Only `codex_local` matched either controller. The final authenticated
management status attempt also failed before submission. No approved
secure controller session has been identified in this workspace. If neither
registered principal has an available approved secure signer, the
controller gate remains blocked.
