/** One durable restricted game-payment journal; no arbitrary transfers or controller route. */
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import {
  accountIdentifier,
  canonicalAccount,
} from "../../../apps/b2z-observer/identity.mjs";
import { quoteAction, typedAction, interactionIssue } from "./actions.mjs";
import { requireCertified } from "./observer.mjs";
import { check, freeze, parse, stringify } from "./common.mjs";
export const policyHash = (p) =>
  createHash("sha256").update(stringify(p, 0)).digest("hex");
const terminal = new Set([
  "applied",
  "partially_applied",
  "game_rejected",
  "duplicate",
  "ledger_rejected",
  "cancelled",
]);
const chargeable = (r) => !["ledger_rejected", "cancelled"].includes(r.status);
export class GameExecutor {
  constructor({
    campaign,
    approval = null,
    journal,
    observer,
    ledger,
    clock = () => BigInt(Date.now()) * 1000000n,
    localMock = false,
  }) {
    check(
      campaign.schema === "b2z-campaign/1" &&
        /^[a-z0-9-]{1,64}$/.test(campaign.id),
      "CAMPAIGN_SCHEMA",
    );
    check(campaign.players.length === 4, "FOUR_PLAYERS_REQUIRED");
    check(
      campaign.allowed_actions.every((t) =>
        ["Fire", "New", "Move"].includes(t),
      ) && campaign.max_unresolved_per_player === 1,
      "CAMPAIGN_LIMITS",
    );
    for (const p of campaign.players) {
      check(
        /^b2z-agent-(expander|defender|raider|adaptive)$/.test(p.alias),
        "PLAYER_ALIAS",
      );
      check(
        accountIdentifier(p.principal) ===
          canonicalAccount(p.account_identifier),
        "PLAYER_ACCOUNT_BINDING",
      );
    }
    check(
      new Set(campaign.players.map((p) => p.alias)).size === 4 &&
        new Set(campaign.players.map((p) => p.account_identifier)).size === 4,
      "DISTINCT_PLAYERS_REQUIRED",
    );
    check(
      !localMock || campaign.network === "mock-local",
      "MOCK_CANNOT_SIGN_MAINNET",
    );
    this.campaign = freeze(structuredClone(campaign));
    this.approval = approval ? freeze(structuredClone(approval)) : null;
    this.hash = policyHash(campaign);
    for (const p of campaign.players) this.playerLimit(p.alias);
    this.observer = observer;
    this.ledger = ledger;
    this.clock = clock;
    this.localMock = localMock;
    mkdirSync(dirname(journal), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(journal);
    chmodSync(journal, 0o600);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY, policy_hash TEXT NOT NULL, stopped INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY,campaign TEXT NOT NULL,player TEXT NOT NULL,status TEXT NOT NULL,plan TEXT NOT NULL,liability TEXT NOT NULL,block_index TEXT,receipt TEXT,submitted_ns TEXT,error TEXT); CREATE TABLE IF NOT EXISTS bootstrap(campaign TEXT PRIMARY KEY, evidence TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY,campaign TEXT NOT NULL,plan_id TEXT,at_ns TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL);",
    );
    const row = this.db
      .prepare("SELECT * FROM campaigns WHERE id=?")
      .get(campaign.id);
    if (row) check(row.policy_hash === this.hash, "IMMUTABLE_CAMPAIGN_LIMITS");
    else
      this.db
        .prepare("INSERT INTO campaigns(id,policy_hash) VALUES(?,?)")
        .run(campaign.id, this.hash);
    // A crash after dispatch must reserve the original amount, never create a replacement transfer.
    this.db
      .prepare(
        "UPDATE plans SET status='ambiguous',error='process restart during submission' WHERE campaign=? AND status='submitting'",
      )
      .run(campaign.id);
  }
  tx(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  event(id, kind, data = {}) {
    this.db
      .prepare(
        "INSERT INTO events(campaign,plan_id,at_ns,kind,data) VALUES(?,?,?,?,?)",
      )
      .run(
        this.campaign.id,
        id,
        String(this.clock()),
        kind,
        stringify(data, 0),
      );
  }
  rows() {
    const rows = this.db
      .prepare("SELECT * FROM plans WHERE campaign=? ORDER BY rowid")
      .all(this.campaign.id);
    check(rows.length <= 4096, "JOURNAL_PLAN_BOUND");
    for (const r of rows) {
      const p = parse(r.plan);
      check(
        policyHash(p) === r.id &&
          String(p.full_cost_e8s) === r.liability &&
          p.campaign === this.campaign.id,
        "JOURNAL_INTEGRITY",
      );
    }
    return rows;
  }
  row(id) {
    const r = this.db
      .prepare("SELECT * FROM plans WHERE id=? AND campaign=?")
      .get(id, this.campaign.id);
    check(r, "UNKNOWN_PLAN");
    const plan = parse(r.plan);
    check(policyHash(plan) === id, "PLAN_JOURNAL_TAMPERED");
    return { ...r, immutable: plan };
  }
  isApproved() {
    const a = this.approval,
      n = this.clock();
    return !!(
      a &&
      typeof a.started_ns === "bigint" &&
      typeof a.expires_ns === "bigint" &&
      a.campaign === this.campaign.id &&
      a.limits_hash === this.hash &&
      a.started_ns <= n &&
      n < a.expires_ns &&
      a.expires_ns - a.started_ns <=
        BigInt(this.campaign.duration_seconds) * 1000000000n &&
      ["leave_running", "gameplay_pause_authorized"].includes(a.aftermath)
    );
  }
  stopped() {
    return !!this.db
      .prepare("SELECT stopped FROM campaigns WHERE id=?")
      .get(this.campaign.id).stopped;
  }
  checkSnapshot(s, { freshMs = 30000 } = {}) {
    if (this.localMock)
      check(
        s.trust === "local-synthetic" && this.campaign.network === "mock-local",
        "MOCK_ONLY",
      );
    else requireCertified(s, { nowNs: this.clock(), freshMs });
    check(
      s.reference.network === this.campaign.network &&
        s.reference.canister === this.campaign.backend &&
        s.source.ledger === this.campaign.ledger &&
        s.source.recipient === this.campaign.recipient,
      "VERIFIED_DEPLOYMENT_BINDING",
    );
    for (const k of ["rules_hash", "config_hash", "schema_hash", "epoch"])
      check(
        s.reference[k] === this.campaign.identity[k],
        "CAMPAIGN_RULES_CHANGED",
      );
  }
  checkAdmission(s) {
    if (!this.localMock) check(s.operational, "OPERATIONAL_HEALTH_REQUIRED");
    if (s.operational)
      check(
        s.operational.run.running &&
          s.operational.run.pace?.admission_open &&
          !s.operational.source.last_error.length,
        "GAME_ADMISSION_CLOSED",
      );
  }
  playerLimit(alias) {
    const raw =
      this.campaign.per_player_max_e8s_by_alias?.[alias] ??
      this.campaign.per_player_max_e8s;
    check(
      typeof raw === "string" && /^[0-9]+$/.test(raw),
      "PLAYER_BUDGET_CONFIG",
    );
    return BigInt(raw);
  }
  totals(rows = this.rows()) {
    let total = 0n;
    const by = {};
    for (const r of rows)
      if (chargeable(r)) {
        const n = BigInt(r.liability);
        total += n;
        by[r.player] = (by[r.player] ?? 0n) + n;
      }
    return { total_e8s: total, players: by };
  }
  async prepare_action(player, action) {
    action = typedAction(action);
    const type = Object.keys(action)[0];
    check(this.campaign.allowed_actions.includes(type), "ACTION_NOT_ALLOWED");
    check(!this.stopped(), "EMERGENCY_STOP");
    const payer = this.campaign.players.find((p) => p.alias === player);
    check(
      payer &&
        (!this.campaign.approved_player_aliases ||
          this.campaign.approved_player_aliases.includes(player)),
      "PLAYER_NOT_APPROVED",
    );
    await this.observer.refresh();
    if (this.observer.operational) await this.observer.operational();
    const s = this.observer.current;
    this.checkSnapshot(s);
    this.checkAdmission(s);
    const q = quoteAction(s, payer.account_identifier, action),
      fee = await this.ledger.fee();
    check(
      typeof fee === "bigint" &&
        fee >= 0n &&
        fee <= BigInt(this.campaign.max_fee_e8s),
      "FEE_LIMIT",
    );
    const amount = q.amount_e8s,
      full = amount + fee,
      n = this.clock(),
      own = s.world.playability.players.find(
        (p) => p.account === payer.account_identifier,
      )?.id;
    check(full <= BigInt(this.campaign.per_action_max_e8s), "ACTION_BUDGET");
    check(
      (action[type].quantity ?? 1) <= this.campaign.max_quantity,
      "QUANTITY_LIMIT",
    );
    check(
      s.world.cannons.filter((c) => c.account === payer.account_identifier)
        .length +
        (type === "New" ? 1 : 0) <=
        this.campaign.max_cannons_per_player,
      "PLAYER_CANNON_LIMIT",
    );
    check(
      s.world.balls.filter((b) => b.owner === own).length +
        (type === "Move" ? 0 : (action[type].quantity ?? 1)) <=
        this.campaign.max_balls_per_player,
      "PLAYER_BALL_LIMIT",
    );
    const plan = freeze({
      schema: "b2z-action-plan/1",
      campaign: this.campaign.id,
      policy_hash: this.hash,
      player,
      principal: payer.principal,
      account: payer.account_identifier,
      action,
      network: this.campaign.network,
      backend: this.campaign.backend,
      identity: s.reference,
      ledger: s.source.ledger,
      destination: s.source.recipient,
      amount_e8s: amount,
      fee_e8s: fee,
      full_cost_e8s: full,
      memo_hex: q.memo_hex,
      text_memo: q.text_memo,
      maximum_fill: q.maximum_fill,
      requested_quantity: q.requested_quantity,
      created_at_time_ns: n,
      expires_ns: n + BigInt(this.campaign.proposal_ttl_seconds) * 1000000000n,
      non_reservation: true,
      retained_payment_policy: true,
    });
    const id = policyHash(plan);
    this.tx(() => {
      const rows = this.rows();
      for (const r of rows)
        if (r.status === "prepared" && parse(r.plan).expires_ns < n)
          this.db
            .prepare(
              "UPDATE plans SET status='cancelled',error='unsubmitted proposal expired' WHERE id=? AND status='prepared'",
            )
            .run(r.id);
      const active = this.rows();
      check(
        !active.some((r) => r.player === player && !terminal.has(r.status)),
        "PLAYER_UNRESOLVED_ACTION",
      );
      check(
        active.filter((r) => !terminal.has(r.status)).length <
          this.campaign.max_outstanding,
        "OUTSTANDING_LIMIT",
      );
      const totals = this.totals(active);
      check(
        totals.total_e8s + full <= BigInt(this.campaign.total_max_e8s),
        "CAMPAIGN_BUDGET",
      );
      check(
        (totals.players[player] ?? 0n) + full <= this.playerLimit(player),
        "PLAYER_BUDGET",
      );
      const last = active
        .filter((r) => r.player === player && r.submitted_ns)
        .at(-1);
      if (last)
        check(
          n >=
            BigInt(last.submitted_ns) +
              BigInt(this.campaign.min_action_interval_seconds) * 1000000000n,
          "ACTION_RATE_LIMIT",
        );
      this.db
        .prepare(
          "INSERT INTO plans(id,campaign,player,status,plan,liability) VALUES(?,?,?,?,?,?)",
        )
        .run(
          id,
          this.campaign.id,
          player,
          "prepared",
          stringify(plan, 0),
          String(full),
        );
      this.event(id, "prepared", { state: s.reference, full_cost_e8s: full });
    });
    return {
      plan_id: id,
      plan,
      approval_required: !this.isApproved(),
      remaining_budget_e8s:
        BigInt(this.campaign.total_max_e8s) - this.totals().total_e8s,
    };
  }
  async submit_action(planId, campaignId) {
    check(campaignId === this.campaign.id, "CAMPAIGN_ID");
    check(this.isApproved(), "CAMPAIGN_NOT_APPROVED");
    check(!this.stopped(), "EMERGENCY_STOP");
    const row = this.row(planId),
      plan = row.immutable;
    check(row.status === "prepared", "NO_FRESH_TRANSFER_FOR_EXISTING_PLAN");
    check(this.clock() < plan.expires_ns, "PROPOSAL_EXPIRED");
    check(
      plan.player === this.campaign.bootstrap_player ||
        this.db
          .prepare("SELECT evidence FROM bootstrap WHERE campaign=?")
          .get(this.campaign.id),
      "FIRST_PLAYER_CHAIN_AND_PRESENTATION_REQUIRED",
    );
    await this.observer.refresh();
    if (this.observer.operational) await this.observer.operational();
    this.checkSnapshot(this.observer.current);
    this.checkAdmission(this.observer.current);
    const current = this.observer.current,
      w = current.world,
      type = Object.keys(plan.action)[0],
      pid = w.playability.players.find((p) => p.account === plan.account)?.id;
    check(
      w.cannons.filter((c) => c.account === plan.account).length +
        (type === "New" ? 1 : 0) <=
        this.campaign.max_cannons_per_player,
      "PLAYER_CANNON_LIMIT",
    );
    check(
      w.balls.filter((b) => b.owner === pid).length +
        (type === "Move" ? 0 : (plan.action[type].quantity ?? 1)) <=
        this.campaign.max_balls_per_player,
      "PLAYER_BALL_LIMIT",
    );
    this.checkInteraction(current, plan);
    check(
      quoteAction(current, plan.account, plan.action).amount_e8s ===
        plan.amount_e8s,
      "QUOTE_CHANGED_REPREPARE_UNSUBMITTED_ONLY",
    );
    check(
      (await this.ledger.fee()) === plan.fee_e8s,
      "FEE_CHANGED_REPREPARE_UNSUBMITTED_ONLY",
    );
    this.tx(() => {
      check(
        !this.stopped() && this.isApproved(),
        "CAMPAIGN_STOPPED_OR_EXPIRED",
      );
      check(this.row(planId).status === "prepared", "ALREADY_SUBMITTED");
      this.db
        .prepare(
          "UPDATE plans SET status='submitting',submitted_ns=? WHERE id=?",
        )
        .run(String(this.clock()), planId);
      this.event(planId, "submitting", {
        created_at_time_ns: plan.created_at_time_ns,
      });
    });
    let result;
    try {
      result = await this.ledger.submit(plan, {
        canDispatch: () =>
          this.isApproved() &&
          !this.stopped() &&
          this.clock() < plan.expires_ns,
      });
    } catch {
      result = {
        status: "ambiguous",
        reason: "Submission threw; original transaction identity retained",
      };
    }
    this.tx(() => {
      if (result.status === "accepted") {
        this.db
          .prepare(
            "UPDATE plans SET status='ledger_accepted',block_index=? WHERE id=?",
          )
          .run(String(result.block_index), planId);
        this.event(planId, "ledger_accepted", result);
      } else if (result.status === "rejected") {
        this.db
          .prepare(
            "UPDATE plans SET status='ledger_rejected',error=? WHERE id=?",
          )
          .run(stringify(result.error, 0), planId);
        this.event(planId, "ledger_rejected", result);
      } else {
        this.db
          .prepare("UPDATE plans SET status='ambiguous',error=? WHERE id=?")
          .run(result.reason ?? "ambiguous", planId);
        this.event(planId, "ambiguous", result);
      }
    });
    return this.action_status(planId);
  }
  async reconcile(planId) {
    let row = this.row(planId);
    if (["submitting", "ambiguous"].includes(row.status)) {
      const result = await this.ledger.find(row.immutable);
      if (result.status === "found") {
        this.tx(() => {
          this.db
            .prepare(
              "UPDATE plans SET status='ledger_accepted',block_index=? WHERE id=?",
            )
            .run(String(result.block_index), planId);
          this.event(planId, "ledger_reconciled", result);
        });
        row = this.row(planId);
      } else return this.action_status(planId);
    }
    if (
      ["ledger_accepted", "awaiting_game", "outcome_unavailable"].includes(
        row.status,
      )
    ) {
      await this.observer.refresh();
      this.checkSnapshot(this.observer.current, { freshMs: 300000 });
      const block = BigInt(row.block_index),
        receipt = this.observer.receipts.find(
          (r) =>
            r.receipt.position === block &&
            r.receipt.account === row.immutable.account,
        );
      if (receipt) {
        const rr = receipt.receipt,
          status =
            rr.reason === "DUPLICATE"
              ? "duplicate"
              : rr.status === "rejected"
                ? "game_rejected"
                : rr.status === "partially_applied"
                  ? "partially_applied"
                  : rr.status === "applied" || rr.reason === "ACCEPTED"
                    ? "applied"
                    : null;
        check(status, "UNKNOWN_RECEIPT_STATUS");
        this.tx(() => {
          this.db
            .prepare("UPDATE plans SET status=?,receipt=? WHERE id=?")
            .run(status, stringify(receipt, 0), planId);
          this.event(planId, status, { receipt });
        });
      } else {
        const status =
          this.observer.current.reference.source_cursor > block
            ? "outcome_unavailable"
            : "awaiting_game";
        this.db
          .prepare("UPDATE plans SET status=? WHERE id=?")
          .run(status, planId);
      }
    }
    return this.action_status(planId);
  }
  action_status(id) {
    const r = this.row(id);
    return {
      plan_id: id,
      campaign: r.campaign,
      player: r.player,
      status: r.status,
      block_index: r.block_index === null ? null : BigInt(r.block_index),
      reserved_or_spent_e8s: chargeable(r) ? BigInt(r.liability) : 0n,
      receipt: r.receipt ? parse(r.receipt) : null,
      error: r.error,
      transaction_identity: r.immutable,
      notice:
        "Missing game receipt is not proof of Ledger failure. Ambiguous/unavailable outcomes keep the liability and block this player. Rejected gameplay payments and fees remain spent.",
    };
  }
  checkInteraction(s, plan) {
    const accounts = this.campaign.players.map((p) => p.account_identifier);
    if (this.campaign.network === "pocketic-local")
      accounts.push(...(this.campaign.controlled_fixture_accounts ?? []));
    const issue = interactionIssue(s.world, accounts, plan.action);
    check(!issue, issue);
  }

  // Trusted host-only completion hook; deliberately absent from the player JSON interface.
  confirm_bootstrap_presentation(id, evidence) {
    const r = this.row(id);
    check(
      r.player === this.campaign.bootstrap_player &&
        r.immutable.action.New &&
        ["applied", "partially_applied"].includes(r.status),
      "BOOTSTRAP_PAYMENT_NOT_APPLIED",
    );
    const s = this.observer.current;
    this.checkSnapshot(s);
    const receipt = parse(r.receipt),
      cannon = receipt.receipt.cannon;
    check(
      String(evidence.head) === String(s.reference.head) &&
        evidence.root === s.reference.root &&
        evidence.navigations_after_initial === 0 &&
        evidence.rendered_logical_time >=
          Number(receipt.reference.logical_time) &&
        evidence.visible_cannon_ids.includes(cannon) &&
        s.world.cannons.some(
          (c) => c.id === cannon && c.account === r.immutable.account,
        ),
      "BOOTSTRAP_PRESENTATION_NOT_VERIFIED",
    );
    this.db
      .prepare(
        "INSERT OR REPLACE INTO bootstrap(campaign,evidence) VALUES(?,?)",
      )
      .run(this.campaign.id, stringify(evidence, 0));
    this.event(
      id,
      "bootstrap_receipt_world_and_presentation_complete",
      evidence,
    );
    return { bootstrap_complete: true };
  }
  emergency_stop() {
    this.db
      .prepare("UPDATE campaigns SET stopped=1 WHERE id=?")
      .run(this.campaign.id);
    this.event(null, "emergency_stop");
    return { stopped: true, liabilities: this.totals() };
  }
  close() {
    this.db.close();
  }
}
