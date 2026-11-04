/** Explicit disposable integration. No mainnet policy/approval fallback. */
import { PLAYABILITY_IDENTITY } from "../packages/kernels/b2z/world.mjs";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { VerifiedObserver } from "../packages/agents/b2z/observer.mjs";
import {
  GameExecutor,
  policyHash,
  playerProposalInterface,
} from "../packages/agents/b2z/executor.mjs";
import { DfxGameLedger } from "../packages/agents/b2z/ledger-dfx.mjs";
import { parse, stringify } from "../packages/agents/b2z/common.mjs";
const [configPath, out] = process.argv.slice(2),
  config = JSON.parse(await readFile(configPath, "utf8"));
assert.equal(config.network, "pocketic-local");
assert(["localhost", "127.0.0.1"].includes(new URL(config.host).hostname));
const policy = { ...config, rootKey: Buffer.from(config.root_key_hex, "hex") },
  base = JSON.parse(
    await readFile("config/agents/pilot.proposed.json", "utf8"),
  ),
  observer = await VerifiedObserver.connect({
    policy,
    store: out + "/mirror",
    trackAccounts: base.players.map((p) => p.account_identifier),
  }),
  signer = new DfxGameLedger({
    policy,
    players: base.players,
    identityRoot: process.env.B2Z_PLAYER_DFX_ROOT,
  });
const rows = [];
const until = async (fn, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await fn();
    if (r) return r;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw Error("Bounded local Ledger/source/receipt observation timed out");
};
for (let i = 0; i < base.players.length; i++) {
  await observer.refresh();
  for (const key of ["rules_hash", "config_hash", "schema_hash"])
    assert.equal(
      observer.current.reference[key],
      PLAYABILITY_IDENTITY[key],
      "Pinned installed v6 fixture identity",
    );
  const player = base.players[i],
    campaign = {
      ...base,
      id: "b2z-local-" + i,
      network: config.network,
      identity: {
        ...PLAYABILITY_IDENTITY,
        epoch: observer.current.reference.epoch,
      },
      backend: config.canister_id,
      ledger: config.ledger,
      index: config.index,
      recipient: config.recipient,
      bootstrap_player: player.alias,
      controlled_fixture_accounts: config.controlled_fixture_accounts,
    };
  const now = BigInt(Date.now()) * 1000000n,
    approval = {
      campaign: campaign.id,
      limits_hash: policyHash(campaign),
      started_ns: now,
      expires_ns: now + 1800000000000n,
      aftermath: "leave_running",
    };
  let injected = false;
  const ledger = {
    fee: () => signer.fee(),
    find: (p) => signer.find(p),
    async submit(p, options) {
      const r = await signer.submit(p, options);
      if (i === 0 && r.status === "accepted" && !injected) {
        injected = true;
        throw Error(
          "Deliberate lost response after actual signed Ledger acceptance",
        );
      }
      return r;
    },
  };
  let executor = new GameExecutor({
    campaign,
    approval,
    journal: out + "/executor.db",
    observer,
    ledger,
  });
  const before = await signer.balance(player.account_identifier),
    prepared = await playerProposalInterface(
      executor,
      player.alias,
    ).prepare_action({
      action: { New: { angle: i * 16384, quantity: 2, cell: null } },
    });
  console.log("Prepared", player.alias, prepared.plan_id);
  const submission = await executor.submit_player_proposal(
    player.alias,
    prepared.plan_id,
    campaign.id,
  );
  console.log("Submitted", player.alias, submission.status);
  if (i === 0) {
    assert.equal(submission.status, "ambiguous");
    executor.close();
    executor = new GameExecutor({
      campaign,
      approval,
      journal: out + "/executor.db",
      observer,
      ledger,
    });
    await assert.rejects(
      executor.prepare_action(player.alias, {
        New: { angle: 0, quantity: 1, cell: null },
      }),
      /UNRESOLVED/,
    );
  }
  const outcome = await until(async () => {
    const r = await executor.reconcile(prepared.plan_id);
    if (["applied", "partially_applied", "game_rejected"].includes(r.status))
      return r;
    return null;
  }, 100000);
  assert.equal(outcome.status, "applied");
  assert.equal(outcome.receipt.receipt.actual_quantity, 2);
  const after = await signer.balance(player.account_identifier);
  assert.equal(before - after, prepared.plan.full_cost_e8s);
  assert.equal(
    observer.current.world.cannons.filter(
      (c) => c.account === player.account_identifier,
    ).length,
    1,
  );
  const pid = observer.current.world.playability.players.find(
    (p) => p.account === player.account_identifier,
  ).id;
  assert.equal(
    observer.current.world.balls.filter((b) => b.owner === pid).length,
    2,
  );
  if (i === 0) {
    const dup = await signer.submit(prepared.plan, { canDispatch: () => true });
    assert.equal(dup.status, "accepted");
    assert.equal(dup.duplicate, true);
    assert.equal(dup.block_index, outcome.block_index);
    assert.equal(await signer.balance(player.account_identifier), after);
  }
  rows.push({
    player: player.alias,
    status: "PASS",
    plan_id: prepared.plan_id,
    block_index: outcome.block_index,
    full_cost_e8s: before - after,
    created_at_time_ns: prepared.plan.created_at_time_ns,
    receipt: outcome.receipt,
    observer_head: observer.current.reference.head,
    ambiguous_restart_reconciled: i === 0,
    identical_duplicate_did_not_debit: i === 0,
  });
  await writeFile(
    out + "/agent-results.json",
    stringify({ status: "IN_PROGRESS", rows, metrics: observer.metrics }) +
      "\n",
  );
  executor.close();
}
// A new process/mirror restores its monotonic floor and independently re-verifies archived receipt proofs.
const restored = await VerifiedObserver.connect({
  policy,
  store: out + "/mirror",
  trackAccounts: base.players.map((p) => p.account_identifier),
});
assert.equal(restored.receipts.length, 4);
await restored.refresh();
await writeFile(
  out + "/agent-results.json",
  stringify({
    status: "PASS",
    scope:
      "Four separately signed ordinary identities; valueless local Ledger/Index; independent local campaigns for fixture setup, not live startup authorisation",
    rows,
    receipt_proofs_reverified_after_restart: restored.receipts.length,
    metrics: observer.metrics,
  }) + "\n",
);
console.log(
  "PASS: signed transfers, exact-identity ambiguity recovery, duplicate prevention, authoritative receipts and restored receipt proofs.",
);
