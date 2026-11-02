/** Typed planning only. Same legality/price helper and memo codec as the browser. */
import {
  quoteV6,
  legalMove,
  legalAdjacentSites,
} from "../../../apps/b2z-observer/action-quote-v6.mjs";
import { encodeV6Memo } from "../../protocol/memo-v6.mjs";
import { parseTextMemo } from "../../protocol/memo.mjs";
import { canonicalAccount } from "../../../apps/b2z-observer/identity.mjs";
import { territoryBallCount } from "../../kernels/b2z/world.mjs";
import { check, integer, freeze, money } from "./common.mjs";
export function typedAction(action) {
  check(
    action && typeof action === "object" && Object.keys(action).length === 1,
    "TYPED_ACTION_REQUIRED",
  );
  const type = Object.keys(action)[0],
    v = action[type];
  check(v && typeof v === "object" && !Array.isArray(v), "ACTION_FIELDS");
  const fields = {
    Wait: [],
    Fire: ["cannon", "angle", "quantity"],
    New: ["angle", "quantity", "cell"],
    Move: ["cannon", "cell"],
  }[type];
  check(
    fields && Object.keys(v).every((k) => fields.includes(k)),
    "ACTION_FIELDS",
  );
  if (type === "Wait") return { Wait: {} };
  if (type !== "New") integer(v.cannon, 1, 4294967294);
  if (type !== "Move") {
    integer(v.angle, 0, 65535, "HEADING_BOUNDS");
    integer(v.quantity, 1, 64, "QUANTITY_BOUNDS");
  }
  if (type === "Move" || (v.cell !== undefined && v.cell !== null))
    integer(v.cell, 0, 999999, "CELL_BOUNDS");
  return freeze({
    [type]: { ...v, ...(type === "New" ? { cell: v.cell ?? null } : {}) },
  });
}
export function memoCommand(action) {
  const a = typedAction(action),
    type = Object.keys(a)[0],
    v = a[type];
  check(type !== "Wait", "WAIT_IS_NOT_A_PAYMENT");
  return {
    kind: { Fire: "fire", New: "new", Move: "move_cannon" }[type],
    ...v,
  };
}
export function exactDegrees(angle) {
  for (const n of [
    Math.floor((angle * 36000) / 65536) - 1,
    Math.floor((angle * 36000) / 65536),
    Math.floor((angle * 36000) / 65536) + 1,
  ])
    if (n >= 0 && n < 36000) {
      const t = `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
      if (parseTextMemo(new TextEncoder().encode("ANGLE " + t)).value === angle)
        return t;
    }
  return null;
}
export function quoteAction(snapshot, account, action) {
  canonicalAccount(account);
  action = typedAction(action);
  const type = Object.keys(action)[0],
    v = action[type];
  if (type === "Wait")
    return {
      action,
      amount_e8s: 0n,
      memo_hex: null,
      maximum_fill: 0,
      non_reservation: true,
    };
  const kind = { Fire: "fire", New: "new", Move: "move" }[type],
    q = quoteV6(snapshot.world, snapshot.configuration, account, {
      kind,
      ...v,
      angle: "0",
    }),
    memo = encodeV6Memo(memoCommand(action)),
    degrees = type === "Move" ? null : exactDegrees(v.angle),
    text =
      type === "Move"
        ? `MOVE ${v.cannon} ${v.cell}`
        : degrees === null
          ? null
          : type === "Fire"
            ? `FIRE ${v.cannon} ${degrees} ${v.quantity}`
            : `NEW ${degrees} ${v.quantity}${v.cell === null ? "" : " " + v.cell}`;
  return {
    action,
    amount_e8s: q.amount,
    per_item_e8s: q.per_item,
    maximum_fill: q.maximum_fill,
    requested_quantity: v.quantity ?? 1,
    island_pool: q.pool,
    memo_hex: Buffer.from(memo).toString("hex"),
    text_memo: text,
    non_reservation: true,
    notice:
      "Wallet fee is extra. Legality/prices are rechecked at processing. Partial fills, rejected payments and surplus remain retained.",
  };
}
export function candidates(
  board,
  account,
  {
    max = 8,
    budgetE8s = 0n,
    feeE8s = 10000n,
    quantityMax = 2,
    cannonId = null,
    headingOffset = 0,
  } = {},
) {
  integer(headingOffset, 0, 65535);
  if (cannonId !== null) integer(cannonId, 1, 4294967294);
  integer(max, 1, 16);
  integer(quantityMax, 1, 64);
  const s = board.snapshot,
    w = s.world,
    out = [
      {
        id: "wait",
        action: { Wait: {} },
        quote: { amount_e8s: 0n },
        rationale: "No new expenditure; existing trajectories continue.",
      },
    ],
    mine = w.cannons.filter((c) => c.account === account);
  check(cannonId === null || mine.some((c) => c.id === cannonId), "NOT_OWNER");
  const add = (id, action, rationale) => {
    if (out.length >= max) return;
    try {
      const quote = quoteAction(s, account, action);
      if (quote.amount_e8s + feeE8s <= budgetE8s)
        out.push({ id, action, quote, rationale });
    } catch (e) {
      if (
        !/CAPACITY|ILLEGAL|SITE|SPAWN|NOT_OWNER|PLACEMENT|QUANTITY/.test(
          e.message,
        )
      )
        throw e;
    }
  };
  if (!mine.length) {
    for (const angle of [0, 16384, 32768, 49152])
      for (const quantity of [...new Set([1, Math.min(2, quantityMax)])])
        add(
          "new-" + angle + "-" + quantity,
          { New: { angle, quantity, cell: null } },
          "First spawn follows the authenticated entry policy at processing time; location is not reserved.",
        );
  } else {
    const c = cannonId === null ? mine[0] : mine.find((c) => c.id === cannonId);
    check(c, "NOT_OWNER");
    const r = board.islands.get(
      w.ownership
        ? board.rows[Math.floor(c.cell / 1000)].find(
            ([a, b]) => a <= c.cell && c.cell < b,
          )[2]
        : c.id,
    );
    const moveCells = [
      ...new Set(
        r.narrow.concat(
          board.rows
            .flatMap((row) =>
              row
                .filter((x) => x[2] === r.id)
                .slice(0, 1)
                .map((x) => x[0]),
            )
            .slice(0, 4),
        ),
      ),
    ];
    for (const cell of (r.frontier_edges ? moveCells : [])
      .filter((cell) => cell !== c.cell && legalMove(w, account, c.id, cell))
      .slice(0, 2))
      add(
        `move-${c.id}-${cell}`,
        { Move: { cannon: c.id, cell } },
        "Legal owned cell near sampled frontier/connection; final admission may reject a stale destination.",
      );
    const site = legalAdjacentSites(w, account)[0];
    if (site !== undefined)
      add(
        "new-adjacent-" + site,
        { New: { angle: 0, quantity: 1, cell: site } },
        "Additional active adjacent anchor; account-wide scaling and capacity apply.",
      );
    const headings = [
        ...new Set([
          c.heading ?? 0,
          0,
          8192,
          16384,
          24576,
          32768,
          40960,
          49152,
          57344,
        ]),
      ],
      offset = headingOffset % headings.length;
    for (const angle of headings
      .slice(offset)
      .concat(headings.slice(0, offset)))
      for (const quantity of [1, Math.min(2, quantityMax)].filter(
        (n, i, a) => a.indexOf(n) === i,
      ))
        add(
          `fire-${c.id}-${angle}-${quantity}`,
          { Fire: { cannon: c.id, angle, quantity } },
          "Bounded coarse headings; shared-island sequential pricing.",
        );
  }
  return out;
}

/** Public geometry plus local consent list; not on-chain authority or future safety. */
export function interactionIssue(w, accounts, action) {
  if (action.New || action.Wait) return null;
  const v = action.Fire ?? action.Move,
    c = w.cannons.find((c) => c.id === v.cannon);
  if (!c) return "CANNON_DISAPPEARED";
  const approved = new Set(accounts),
    points = [c.cell, ...(action.Move ? [action.Move.cell] : [])],
    near = (cell) =>
      points.some((p) => {
        const dx = Math.abs((p % 1000) - (cell % 1000)),
          dy = Math.abs(Math.floor(p / 1000) - Math.floor(cell / 1000));
        return Math.min(dx, 1000 - dx) <= 128 && Math.min(dy, 1000 - dy) <= 128;
      });
  return w.cannons.some((c) => !approved.has(c.account) && near(c.cell)) ||
    w.balls.some(
      (b) =>
        !approved.has(
          w.playability.players.find((p) => p.id === b.owner)?.account,
        ) && near(b.cell),
    )
    ? "UNKNOWN_PLAYER_INTERACTION_STOP"
    : null;
}
/** Quotes, population caps and affordability share the same authenticated revision. */
export function actionOptions(
  board,
  account,
  {
    budgetE8s = 0n,
    feeE8s = 10000n,
    max = 12,
    cannonId = null,
    headingOffset = 0,
    limits = {},
  } = {},
) {
  canonicalAccount(account);
  integer(max, 1, 16);
  if (cannonId !== null) integer(cannonId, 1, 4294967294);
  check(
    typeof budgetE8s === "bigint" &&
      budgetE8s >= 0n &&
      typeof feeE8s === "bigint" &&
      feeE8s >= 0n,
    "MONEY_BOUNDS",
  );
  const w = board.world,
    pid = w.playability.players.find((p) => p.account === account)?.id,
    mine = w.cannons.filter((c) => c.account === account),
    balls = w.balls.filter((b) => b.owner === pid).length,
    quantityMax = limits.max_quantity ?? 2;
  integer(quantityMax, 1, 64);
  const offered = candidates(board, account, {
      max: 16,
      budgetE8s: 18446744073709551615n,
      feeE8s,
      quantityMax,
      cannonId,
      headingOffset,
    }),
    available = [],
    unavailable = [];
  for (const c of offered) {
    const kind = Object.keys(c.action)[0],
      quantity = c.action[kind].quantity ?? 0,
      full = c.quote.amount_e8s + (kind === "Wait" ? 0n : feeE8s);
    let reason = null;
    if (kind !== "Wait") {
      if (limits.allowed_actions && !limits.allowed_actions.includes(kind))
        reason = "ACTION_NOT_ALLOWED";
      else if (
        kind === "New" &&
        mine.length + 1 > (limits.max_cannons_per_player ?? 128)
      )
        reason = "PLAYER_CANNON_LIMIT";
      else if (balls + quantity > (limits.max_balls_per_player ?? 64))
        reason = "PLAYER_BALL_LIMIT";
      else if (
        limits.per_action_max_e8s !== undefined &&
        full > money(limits.per_action_max_e8s)
      )
        reason = "ACTION_BUDGET";
      else if (full > budgetE8s) reason = "AVAILABLE_BUDGET";
      else if (limits.approved_accounts)
        reason = interactionIssue(w, limits.approved_accounts, c.action);
    }
    const row = { ...c, full_cost_e8s: full };
    if (reason) unavailable.push({ ...row, reason });
    else available.push(row);
  }
  const diverse = [];
  for (const kind of ["Wait", "New", "Fire", "Move"]) {
    const c = available.find((c) => c.action[kind]);
    if (c && diverse.length < max) diverse.push(c);
  }
  for (const c of available)
    if (diverse.length < max && !diverse.includes(c)) diverse.push(c);
  return {
    candidates: diverse,
    unavailable,
    local_constraints: { budget_e8s: budgetE8s, fee_e8s: feeE8s, ...limits },
    selection: {
      owned_cannon_ids: mine.map((c) => c.id),
      selected_cannon: cannonId ?? mine[0]?.id ?? null,
      heading_offset: headingOffset,
      note: "Bounded shortlist, not an exhaustive action set. Supply cannon_id to inspect another owned cannon.",
    },
    affordability:
      "Full transfer plus fee; local limits are not certified game configuration. Quotes are not reservations.",
  };
}

/** Campaign-only prediction guard. Natural wait losses are not attributed to a purchase. */
export function consentEvaluation(evaluation, accounts) {
  const approved = new Set(accounts),
    wait = evaluation.candidates.find((c) => c.action.Wait),
    blocked = [];
  const allowed = evaluation.candidates.filter((c) => {
    if (c === wait) return true;
    const rows = evaluation.forecasts.filter((r) => r.candidate === c.id),
      baseline = evaluation.forecasts.filter((r) => r.candidate === wait.id);
    if (
      rows.length !== 3 ||
      baseline.length !== 3 ||
      [...rows, ...baseline].some(
        (r) =>
          r.status !== "complete" ||
          r.lifecycle_complete !== true ||
          r.casualty_attribution_complete !== true ||
          !Array.isArray(r.opposing_ball_losses),
      )
    ) {
      blocked.push({ candidate: c.id, reason: "INCOMPLETE_CONSENT_FORECAST" });
      return false;
    }
    for (const row of rows) {
      const same = baseline.find((r) => r.scenario === row.scenario);
      if (
        !same ||
        !row.action_admitted_within_horizon ||
        row.elapsed_window_ns !== same.elapsed_window_ns ||
        row.logical_ticks_completed !== same.logical_ticks_completed
      ) {
        blocked.push({
          candidate: c.id,
          reason: "INCOMPLETE_CONSENT_FORECAST",
        });
        return false;
      }
      const identity = (b) =>
          b.counterfactual_key && b.counterfactual_death_key
            ? b.counterfactual_key + ":" + b.counterfactual_death_key
            : null,
        natural = new Set(same.opposing_ball_losses.map(identity)),
        outside = row.opposing_ball_losses.filter(
          (b) =>
            !approved.has(b.account) &&
            (!identity(b) || !natural.has(identity(b))),
        );
      if (outside.length) {
        blocked.push({
          candidate: c.id,
          reason: "PREDICTED_OUTSIDE_PLAYER_LOSS",
          balls: outside,
        });
        return false;
      }
    }
    return true;
  });
  return {
    ...evaluation,
    candidates: allowed,
    consent_screen: {
      blocked,
      note: "Derived bounded forecast compared with Wait, not a proof of future trajectory safety. Public entity proximity is checked separately.",
    },
  };
}

/** A bounded public-response assumption, never a claim about opponent intent/funds. */
export function opponentResponse(w, account) {
  const mine = w.cannons.filter((c) => c.account === account),
    axis = (a, b, size) => {
      const d = Math.abs(a - b);
      return Math.min(d, size - d);
    },
    distance = (c) =>
      mine.length
        ? Math.min(
            ...mine.map(
              (a) =>
                axis(a.cell % w.width, c.cell % w.width, w.width) ** 2 +
                axis(
                  Math.floor(a.cell / w.width),
                  Math.floor(c.cell / w.width),
                  w.height,
                ) **
                  2,
            ),
          )
        : 0;
  return (
    w.cannons
      .filter((c) => c.account !== account && territoryBallCount(w, c.id) > 0)
      .map((c) => ({ ...c, distance_squared: distance(c) }))
      .sort(
        (a, b) => a.distance_squared - b.distance_squared || a.id - b.id,
      )[0] ?? null
  );
}
