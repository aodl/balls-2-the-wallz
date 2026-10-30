# Prepared frontend asset-only release — NOT AUTHORISED TO EXECUTE

Target only observer `s45ab-wiaaa-aaaar-qcifq-cai`, identity `codex_local`.
Backend `s34gv-3qaaa-aaaar-qcifa-cai` continues running v5 throughout. No gameplay
pause, backend deployment, world transition, controller/settings change, transfer
or dependency rebuild belongs in this release.

Before requesting deployment approval, require the correction's **exact commit**
to have successful CI, and verify the independent frozen snapshot's SHA256SUMS,
FREEZE.json and all ten production asset manifest entries. Run 40381316962 only
qualifies parent cefa6983 and cannot qualify the correction. Remote publication
remains user-owned unless separately authorised. Never repush the unchanged parent.

The independent frozen directory is reported with the final commit. Set
`B2Z_FROZEN` to that directory and `B2Z_CI_RUN` to the successful correction run.
These preparation checks are read-only:

```bash
export DFX_IDENTITY=codex_local
cd /home/codexdev/src/b2z
(cd "$B2Z_FROZEN" && sha256sum --check SHA256SUMS)
python3.11 - "$B2Z_FROZEN" "$B2Z_CI_RUN" <<'PY'
import hashlib,json,sys,urllib.request
from pathlib import Path
p=Path(sys.argv[1]);freeze=json.loads((p/'FREEZE.json').read_text());m=json.loads((p/'frontend/build-manifest.json').read_text())
assert m['source_commit']==freeze['source_commit'] and not m['source_dirty'] and not m['local_test_only']
assert m['deployment']=={'network':'ic','host':'https://icp-api.io','canister_id':'s34gv-3qaaa-aaaar-qcifa-cai'}
assert len(m['files'])==10
for name,v in m['files'].items():
 b=(p/'frontend'/name).read_bytes();assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256'],name
assert m['files']['app.mjs']['sha256']=='95a1dc6252207ba364909f27455bebf113db3f4bb7f386d9f73a6be38e82bcb0'
assert not any('s14-local-deployment' in x for x in m['inputs'])
u='https://api.github.com/repos/aodl/balls-2-the-wallz/actions/runs/'+sys.argv[2]
r=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'B2Z-release-verification'})))
assert r['head_sha']==m['source_commit'] and r['status']=='completed' and r['conclusion']=='success'
j=json.load(urllib.request.urlopen(urllib.request.Request(u+'/jobs?per_page=100',headers={'User-Agent':'B2Z-release-verification'})))
required={'Source conformance','Native conformance','Packaged DTR and clean consumers','Runtime-lab Wasm','Browser HTTP and Web Crypto','S14 and million-cell installed-IC qualification'}
assert required<={x['name'] for x in j['jobs'] if x['conclusion']=='success'}
PY
dfx --version
dfx identity whoami
dfx --identity codex_local canister id observer --network ic
dfx --identity codex_local canister status observer --network ic
dfx --identity codex_local canister status b2z --network ic
```

Require DFX 0.31.0 reviewed `--no-asset-upgrade` semantics, exact IDs, unchanged
controllers and modules: backend `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`,
observer `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
Expected controllers for each are
`amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae` and
`zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe`.
Verify fresh frontend liquid cycles cover the upload plus its operating reserve;
stop on any changed module/controller, inadequate funding or authenticated-state
failure. Record fresh IC-root v8 publication/paid-state/source/treasury evidence
using the existing read-only capture procedure; preserve legitimate gameplay progress.
Confirm current public app remains the reviewed predecessor
`3c593c54fe09997eabada19d3aee02f2cc7c39d1d5a0baea59b3e3516f61b732`.

Prepare an isolated DFX workspace under `.work/` containing only the observer
asset canister stanza, `networks.ic.providers=["https://icp-api.io"]` and
`canister_ids.json={"observer":{"ic":"s45ab-wiaaa-aaaar-qcifq-cai"}}`.
Copy the ten frozen files byte-for-byte into its local `assets/` source directory,
including `.ic-assets.json5`, and reverify against the frozen manifest. The build
manifest stays evidence, outside uploaded `assets/`. Do not point DFX at an
external-workspace path, invoke the application asset builder again, or add a
backend stanza. Require the isolated observer alias to resolve to the same ID.

**STOP: separate explicit frontend deployment approval is required before this
first mainnet mutation.** After approval, from that prepared workspace only:

```bash
test "$(dfx --identity codex_local canister id observer --network ic)" = s45ab-wiaaa-aaaar-qcifq-cai
NPM_CONFIG_IF_PRESENT=true dfx --identity codex_local deploy observer --network ic --mode upgrade --no-asset-upgrade --no-wallet
```

Then verify every public file's decoded bytes against the manifest, CSP/security
headers and the asset inventory. `.ic-assets.json5` is upload policy, not an
assumed public URL. Require unchanged observer/backend modules and controllers.
Run the sandboxed read-only PLAYING browser check against production on desktop
and mobile, including fresh IC-root v8 authentication, genuine cell/cannon/ball/tail
geometry, minimap, picking, payment-text preparation and reconnect. Do not submit
a payment. Reconcile continuing certified/source/treasury progress with the
pre-upload capture; no paid state is replaced. Retain checksummed upload and
post-release evidence. Stop on ambiguity or failed verification; do not repair it
by changing backend state or performing an unqualified downgrade.
