/** Bounded worker using the actual pure v6 interpreter, never approximate collision physics. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parentPort } from "node:worker_threads";
import {
  encodeCanonical,
  cloneCanonical,
  decodeCanonical,
} from "@dtr/timeline-runtime/runtime/canonical";
import { B2zCursor, encodePayment } from "../../kernels/b2z/kernel.mjs";
import {
  encodeWorld,
  decodeWorld,
  PLAYABILITY_IDENTITY,
  ownershipCounts,
} from "../../kernels/b2z/world.mjs";
import { expireV6 } from "../../kernels/b2z/lifecycle-v6.mjs";
import { dueFences } from "../../kernels/b2z/playability.mjs";
import { quoteAction, opponentResponse } from "./actions.mjs";
import { ballOutcomes } from "./analysis.mjs";
import { fractionSub } from "./common.mjs";
function payload(account, amount, memo) {
  const bytes = encodePayment(account, amount, { kind: "angle", value: 0 });
  bytes.set(Buffer.from(memo, "hex"), 48);
  return Buffer.from(bytes).toString("hex");
}
const score = (w, a) =>
  w.credits.find((c) => c.account === a)?.units ?? [0n, 1n];
const cells = (w, id) =>
  ownershipCounts(w)
    .filter(
      ([label]) =>
        w.playability.territories.find((t) => t.id === label)?.player === id,
    )
    .reduce((n, [, v]) => n + v, 0);
/** One existing-kernel segment, with the caller's remaining work/time budget. */
function simulateSegment({
  world,
  inputs,
  context,
  elapsed,
  native,
  remainingWork,
  remainingMs,
}) {
  if (native) {
    if (remainingMs < 10) return { status: "bounded_incomplete", used: 0 };
    const request = {
      initial_hex: Buffer.from(encodeWorld(world)).toString("hex"),
      inputs_hex: Buffer.from(encodeCanonical(inputs)).toString("hex"),
      context_hex: Buffer.from(encodeCanonical(context)).toString("hex"),
      observed_ns: String(elapsed),
      max_work: Math.max(1, remainingWork),
    };
    let response;
    try {
      response = JSON.parse(
        execFileSync(native, ["segment-json"], {
          input: JSON.stringify(request),
          encoding: "utf8",
          timeout: Math.floor(remainingMs),
          maxBuffer: 16 * 1024 * 1024,
          env: { PATH: process.env.PATH },
        }),
      );
    } catch (e) {
      if (e.code === "ETIMEDOUT")
        return { status: "bounded_incomplete", used: 0 };
      throw e;
    }
    if (response.status !== "complete")
      return { status: "bounded_incomplete", used: response.used };
    return {
      status: "complete",
      used: response.used,
      output: {
        state: Buffer.from(response.state_hex, "hex"),
        events: Buffer.from(response.events_hex, "hex"),
        scores: Buffer.from(response.scores_hex, "hex"),
      },
    };
  }
  const cursor = new B2zCursor(encodeWorld(world), inputs, context),
    deadline = performance.now() + remainingMs;
  let used = 0;
  for (;;) {
    const result = cursor.step(1);
    used += result.used;
    if (result.complete) break;
    if (used >= remainingWork || performance.now() > deadline)
      return { status: "bounded_incomplete", used };
  }
  cursor.finalizeElapsed(elapsed);
  return { status: "complete", used, output: cursor.result() };
}
parentPort.on(
  "message",
  ({
    snapshot,
    account,
    choices,
    horizon,
    scenarios,
    maxWork,
    maxMs,
    includeStates,
  }) => {
    const started = performance.now(),
      results = [],
      cache = new Map();
    let totalWork = 0;
    const native = process.env.B2Z_AGENT_NATIVE;
    const engine = native
      ? {
          kind: "existing-rust-kernel",
          sha256: createHash("sha256")
            .update(readFileSync(native))
            .digest("hex"),
        }
      : { kind: "existing-js-reference" };
    if (
      native &&
      process.env.B2Z_AGENT_NATIVE_SHA256 &&
      engine.sha256 !== process.env.B2Z_AGENT_NATIVE_SHA256
    )
      throw Error("NATIVE_FORECAST_IDENTITY");
    // Queue cached and fresh rows before continuing with work that may be interrupted.
    function publish(result) {
      results.push(result);
      parentPort.postMessage({
        partial: true,
        result,
        total_work: totalWork,
        worker_ms: performance.now() - started,
      });
    }
    for (const choice of choices)
      for (const scenario of scenarios) {
        const before = snapshot.world;
        const otherPresent = opponentResponse(before, account) !== null,
          hasOwn =
            choice.action.Wait === undefined && scenario.delay_ticks < horizon,
          opTick = Math.min(1, scenario.delay_ticks),
          hasOpponent = scenario.opponent && otherPresent && opTick < horizon,
          key = JSON.stringify({
            horizon,
            own: hasOwn
              ? [
                  choice.quote.memo_hex,
                  String(choice.quote.amount_e8s),
                  scenario.delay_ticks,
                ]
              : null,
            opponent: hasOpponent ? opTick : null,
            tick_ns: String(scenario.tick_ns),
          });
        if (cache.has(key)) {
          publish({
            ...cache.get(key),
            candidate: choice.id,
            scenario: scenario.name,
            planned_transfer_e8s: choice.quote.amount_e8s,
            forecast_cache_hit: true,
          });
          continue;
        }
        const id = before.playability.players.find(
          (p) => p.account === account,
        )?.id;
        let w = cloneCanonical(before),
          elapsed = w.playability.elapsed_ns,
          events = [],
          audits = [],
          receipts = [],
          opponentActions = [],
          ticks = 0,
          idleSlots = 0,
          status = "complete",
          used = 0n,
          position = snapshot.reference.source_cursor + 1n;
        try {
          for (let tick = 0; tick < horizon; tick++) {
            if (performance.now() - started > maxMs || totalWork >= maxWork) {
              status = "bounded_incomplete";
              break;
            }
            const inputs = [],
              ours =
                choice.action.Wait === undefined &&
                tick === scenario.delay_ticks,
              opponent =
                scenario.opponent && tick === Math.min(1, scenario.delay_ticks),
              other = opponent ? opponentResponse(w, account) : null;
            const add = (payer, quote) =>
              inputs.push({
                position: position++,
                payload_hex: payload(payer, quote.amount_e8s, quote.memo_hex),
              });
            if (opponent && other) {
              try {
                const action = {
                    Fire: {
                      cannon: other.id,
                      angle: other.heading ?? 0,
                      quantity: 1,
                    },
                  },
                  quote = quoteAction(
                    { ...snapshot, world: w },
                    other.account,
                    action,
                  );
                add(other.account, quote);
                opponentActions.push({
                  tick,
                  account: other.account,
                  action,
                  amount_e8s: quote.amount_e8s,
                  selection:
                    "nearest active opposing cannon; toroidal squared distance then cannon ID",
                  unknown:
                    "Future intent, funds and payment admission are not known.",
                });
              } catch (e) {
                if (!/CAPACITY|OWNER/.test(e.message)) throw e;
              }
            }
            if (ours) {
              add(account, choice.quote);
              used = choice.quote.amount_e8s;
            }
            elapsed += BigInt(scenario.tick_ns);
            if (!w.balls.length && !inputs.length) {
              idleSlots++;
              const ex = expireV6(w, elapsed, dueFences(w, elapsed));
              if (ex) {
                w = decodeWorld(ex.output.state);
                const audit = decodeCanonical(ex.output.events);
                events.push(...audit.events);
                audits.push({ ...audit, slot: tick, inputs: [] });
              }
              continue;
            }
            const start = w.time[0];
            if (w.time[1] !== 1n) throw Error("INTEGER_FORECAST_BOUNDARY");
            const context = {
              rules_hash: snapshot.reference.rules_hash,
              config_hash: snapshot.reference.config_hash,
              schema_hash: snapshot.reference.schema_hash,
              logical_start: start,
              logical_end: start + 1n,
            };
            const simulated = simulateSegment({
              world: w,
              inputs,
              context,
              elapsed,
              native,
              remainingWork: maxWork - totalWork,
              remainingMs: maxMs - (performance.now() - started),
            });
            totalWork += simulated.used;
            if (simulated.status !== "complete") {
              status = "bounded_incomplete";
              break;
            }
            const output = simulated.output;
            w = decodeWorld(output.state);
            const audit = decodeCanonical(output.events);
            events.push(...audit.events);
            audits.push({ ...audit, slot: tick, inputs });
            receipts.push(...audit.receipts);
            ticks++;
            const expiry = expireV6(w, elapsed, dueFences(w, elapsed));
            if (expiry) {
              w = decodeWorld(expiry.output.state);
              const audit = decodeCanonical(expiry.output.events);
              events.push(...audit.events);
              audits.push({ ...audit, slot: tick, inputs: [] });
            }
          }
          const pid = w.playability.players.find(
              (p) => p.account === account,
            )?.id,
            oursBefore = before.balls.filter((b) => b.owner === id),
            oursAfter = w.balls.filter((b) => b.owner === pid);
          const result = {
            planned_transfer_e8s: choice.quote.amount_e8s,
            candidate: choice.id,
            scenario: scenario.name,
            status,
            assumed_opponent_actions: opponentActions,
            logical_ticks_completed: ticks,
            idle_slots: idleSlots,
            elapsed_window_ns:
              BigInt(ticks + idleSlots) * BigInt(scenario.tick_ns),
            action_admitted_within_horizon:
              choice.action.Wait === undefined &&
              scenario.delay_ticks < horizon,
            assumed_transfer_e8s: used,
            canonical_score_delta: fractionSub(
              score(w, account),
              score(before, account),
            ),
            territory_before: cells(before, id),
            territory_after: cells(w, pid),
            balls_before: oursBefore.length,
            balls_after: oursAfter.length,
            ...ballOutcomes(before, w, audits, account),
            cannons_after: w.cannons.filter((c) => c.account === account)
              .length,
            islands_after: w.playability.territories.filter(
              (t) => t.player === pid,
            ).length,
            dormant_cannons: w.playability.lifecycle.filter(
              (l) => l.player === pid && l.deadline_ns !== undefined,
            ).length,
            capture_annihilations: events.filter((e) =>
              ["capture_annihilation", "annihilation_cleanup"].includes(e.kind),
            ).length,
            receipt_outcomes: receipts.filter((r) => r.account === account),
            ...(includeStates
              ? { next_state_hex: Buffer.from(encodeWorld(w)).toString("hex") }
              : {}),
          };
          if (result.status === "complete") cache.set(key, result);
          publish(result);
        } catch (e) {
          publish({
            candidate: choice.id,
            scenario: scenario.name,
            status: "error",
            error: String(e.message),
          });
        }
      }
    parentPort.postMessage({
      results,
      total_work: totalWork,
      worker_ms: performance.now() - started,
      engine,
    });
  },
);
