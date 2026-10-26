# Million-cell source promotion — user-owned, fast-forward only

Development qualification has passed. This procedure publishes the new
**documentation/evidence closure**, requires green CI on its exact commit, then
promotes that same commit without rewriting history. It does not authorise a
mainnet upgrade, v5 activation, transfer, controller or financial action.

The previously tested source/harness commit is
`12fe4b6c0395b7e04a8b19b3997cd6fd90c8ffff`, with all six substantive jobs passing
[CI 40193219784](https://github.com/aodl/balls-2-the-wallz/actions/runs/40193219784).
That result must not be attributed to the new closure commit.

## 1. Review and publish the exact candidate

The local annotated tag `rc/b2z-million-cell-v5-20261026` anchors the closure
commit. Record both its tag-object ID and peeled commit ID. Publish it once;
never force-update, move or delete it. Keep
`checkpoint/b2z-million-cell-pace` accessible after promotion.

Run these commands yourself from the existing checkout. They publish the
checkpoint and tag, **not master**. All commands below stop on a failed guard.

```bash
set -eu
cd /home/codexdev/src/b2z
B2Z_RC_TAG=rc/b2z-million-cell-v5-20261026
B2Z_RC_COMMIT=$(git rev-parse --verify "${B2Z_RC_TAG}^{commit}")
B2Z_RC_TAG_OBJECT=$(git rev-parse --verify "${B2Z_RC_TAG}^{tag}")
test -z "$(git status --porcelain)"
test "$(git branch --show-current)" = checkpoint/b2z-million-cell-pace
test "$(git rev-parse HEAD)" = "$B2Z_RC_COMMIT"
git show --stat "$B2Z_RC_COMMIT"
git diff --stat 12fe4b6c0395b7e04a8b19b3997cd6fd90c8ffff "$B2Z_RC_COMMIT"
git push --atomic origin \
  "$B2Z_RC_COMMIT:refs/heads/checkpoint/b2z-million-cell-pace" \
  "refs/tags/$B2Z_RC_TAG:refs/tags/$B2Z_RC_TAG"
```

The closure diff is confined to `STATUS.md`, this procedure, the prepared
[B2Z_MILLION_PREFLIGHT.md](B2Z_MILLION_PREFLIGHT.md), and reviewed files under
`evidence/B2Z/million-cell-release/`. No production, harness, workflow, dependency,
frozen artifact or acceptance implementation changes are included.

## 2. Verify durable evidence

The [evidence index](../../evidence/B2Z/million-cell-release/raw-evidence-index.json)
pins a read-only local snapshot outside the worktree. It includes successful and
failed raw observations, aligned counters/resources, HTTP/wire data, exact
artifacts, original manifests and CI provenance. It is not an off-host backup;
no remote evidence upload has been performed by this closure. Preserve the
whole directory when making a separate backup.

From the checkout, verify the inventory digest against the committed index:

```bash
set -eu
cd /home/codexdev/src/b2z
python3 - <<'PY'
import hashlib, json
from pathlib import Path
index = json.loads(Path('evidence/B2Z/million-cell-release/raw-evidence-index.json').read_text())
root = Path(index['snapshot_root'])
inventory = root / index['inventory']['path']
assert hashlib.sha256(inventory.read_bytes()).hexdigest() == index['inventory']['sha256']
original = root / index['original_frozen_observation_manifest']['snapshot_path']
assert hashlib.sha256(original.read_bytes()).hexdigest() == index['original_frozen_observation_manifest']['sha256']
print('Evidence manifests match the committed index')
PY
B2Z_EVIDENCE_ROOT=/home/codexdev/b2z-release-evidence/million-cell-v5-12fe4b6c-20261026
(
  cd "$B2Z_EVIDENCE_ROOT"
  sha256sum -c --quiet SNAPSHOT.SHA256SUMS
  sha256sum -c --quiet .work/million-frozen-controlled/final-SHA256SUMS
)
```

## 3. Require exact green CI, then recheck and fast-forward

Wait for the new `verification` push run. The following read-only public API
check selects the newest verification run for the tag's **exact commit**, then
requires completion and success of all six substantive jobs. The informational
production-inventory job is not deployment approval. If CI is pending, fails,
is skipped, cannot be fetched, or names another SHA, stop and investigate.
Do not replace this check with the older successful run. The same guarded shell
block then re-fetches and rechecks ancestry immediately before promotion.
Master must still be an ancestor, local master must match remote master, and
the checkpoint and immutable tag must still identify the reviewed candidate.
The ordinary non-forced push is the final remote fast-forward guard.

```bash
set -eu
cd /home/codexdev/src/b2z
B2Z_RC_TAG=rc/b2z-million-cell-v5-20261026
B2Z_RC_COMMIT=$(git rev-parse --verify "${B2Z_RC_TAG}^{commit}")
B2Z_RC_TAG_OBJECT=$(git rev-parse --verify "${B2Z_RC_TAG}^{tag}")
test -z "$(git status --porcelain)"
python3 - "$B2Z_RC_COMMIT" <<'PY'
import json, subprocess, sys, urllib.parse, urllib.request
expected = sys.argv[1]
qualified = '12fe4b6c0395b7e04a8b19b3997cd6fd90c8ffff'
subprocess.run(['git', 'merge-base', '--is-ancestor', qualified, expected], check=True)
allowed = {
    'STATUS.md', 'docs/operations/B2Z_MILLION_PREFLIGHT.md',
    'docs/operations/B2Z_MILLION_PROMOTION.md',
    'evidence/B2Z/million-cell-release/frozen-qualification-closure.json',
    'evidence/B2Z/million-cell-release/raw-evidence-index.json',
    'evidence/B2Z/million-cell-release/frozen-observation.SHA256SUMS',
}
changed = subprocess.check_output(['git', 'diff', '--name-only', qualified, expected], text=True).splitlines()
assert set(changed) <= allowed, 'Candidate contains more than the reviewed documentation/evidence closure'
base = 'https://api.github.com/repos/aodl/balls-2-the-wallz'
def get(path):
    request = urllib.request.Request(base + path, headers={
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'b2z-release-promotion-check',
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)
query = urllib.parse.urlencode({'head_sha': expected, 'event': 'push', 'per_page': 100})
runs = [r for r in get('/actions/runs?' + query)['workflow_runs']
        if r['head_sha'] == expected and r['event'] == 'push'
        and r['path'] == '.github/workflows/verification.yml']
assert runs, 'No verification push run for this exact closure commit'
run = max(runs, key=lambda r: r['id'])
assert run['status'] == 'completed' and run['conclusion'] == 'success', run['html_url']
required = {
    'Source conformance', 'Native conformance', 'Runtime-lab Wasm',
    'Browser HTTP and Web Crypto', 'Packaged DTR and clean consumers',
    'S14 and million-cell installed-IC qualification',
}
jobs = {j['name']: j for j in get('/actions/runs/' + str(run['id']) + '/jobs?filter=latest&per_page=100')['jobs']}
assert required <= jobs.keys(), 'Missing substantive CI jobs'
assert all(jobs[name]['status'] == 'completed' and jobs[name]['conclusion'] == 'success'
           for name in required), 'Substantive CI job failed or was skipped'
print('Exact-commit CI PASS:', expected, run['html_url'])
PY

git fetch --no-tags origin \
  refs/heads/master:refs/remotes/origin/master \
  refs/heads/checkpoint/b2z-million-cell-pace:refs/remotes/origin/checkpoint/b2z-million-cell-pace
test -z "$(git status --porcelain)"
test "$(git rev-parse origin/checkpoint/b2z-million-cell-pace)" = "$B2Z_RC_COMMIT"
test "$(git rev-parse --verify "${B2Z_RC_TAG}^{commit}")" = "$B2Z_RC_COMMIT"
test "$(git ls-remote origin "refs/tags/$B2Z_RC_TAG" | cut -f1)" = "$B2Z_RC_TAG_OBJECT"
git merge-base --is-ancestor origin/master "$B2Z_RC_COMMIT"
B2Z_MASTER_BEFORE=$(git rev-parse origin/master)
git switch master
test "$(git rev-parse HEAD)" = "$B2Z_MASTER_BEFORE"
git merge --ff-only "$B2Z_RC_COMMIT"
test "$(git rev-parse HEAD)" = "$B2Z_RC_COMMIT"
test "$(git ls-remote origin refs/heads/master | cut -f1)" = "$B2Z_MASTER_BEFORE"
git push origin "$B2Z_RC_COMMIT:refs/heads/master"
test "$(git ls-remote origin refs/heads/master | cut -f1)" = "$B2Z_RC_COMMIT"
```

If any guard fails, stop with branches intact. Do not squash, rebase, force-push,
reset master or create a merge commit to bypass the guard. A changed final result
requires its own exact-result CI and any affected qualification. Keep the
checkpoint branch and candidate tag accessible; do not delete or move either.


## 4. Stop at source integration

This procedure ends with source promotion. Mainnet remains on the 32×32 v4
world. Any future state-preserving Wasm upgrade and authenticated v4→v5 activation
require separate authorisation and a fresh
[deployment preflight](B2Z_MILLION_PREFLIGHT.md). Use frozen `7c078fb3…` and the
complete production frontend `3c593c54…`; do not substitute a CI/rebuilt binary
or the local-root adapter. No canister, transfer or controller command is part
of source promotion.
