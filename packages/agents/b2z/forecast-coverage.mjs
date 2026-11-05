/** Decision provenance only. This module cannot establish campaign authority. */
export function annotateDecision(evaluation, decision) {
  const tactical = evaluation.kind === "local-counterplay";
  const names = tactical
    ? (evaluation.responses ?? [])
    : (evaluation.assumptions?.scenarios?.map((s) => s.name) ?? []);
  const rows = tactical
    ? (evaluation.rows ?? [])
    : (evaluation.forecasts ?? []);
  const wait = evaluation.candidates?.find((c) => c.action.Wait);
  const selected = evaluation.candidates?.find(
    (c) => c.id === decision.candidate,
  );
  const find = (candidate, name) => {
    const matches = rows.filter(
      (r) =>
        r.candidate === candidate &&
        (tactical ? r.response : r.scenario) === name,
    );
    return matches.length === 1 ? matches[0] : null;
  };
  const declared = names.map((name) => {
    const row = find(decision.candidate, name),
      base = find(wait?.id, name);
    let reason = null;
    if (!selected) reason = "UNKNOWN_SELECTED_ACTION";
    else if (!row || !base) reason = "MISSING_SELECTED_OR_WAIT_ROW";
    else if (row.status !== "complete" || base.status !== "complete")
      reason = "INCOMPLETE_SELECTED_OR_WAIT_ROW";
    else if (
      !tactical &&
      !selected?.action.Wait &&
      !row.action_admitted_within_horizon
    )
      reason = "ACTION_BEYOND_HORIZON";
    else if (!tactical) {
      const sameTicks =
        Number.isSafeInteger(row.logical_ticks_completed) &&
        row.logical_ticks_completed === base.logical_ticks_completed &&
        row.elapsed_window_ns === base.elapsed_window_ns;
      const sameIdleWindow =
        typeof row.elapsed_window_ns === "bigint" &&
        row.elapsed_window_ns === base.elapsed_window_ns &&
        (row.idle_slots > 0 || base.idle_slots > 0);
      if (!sameTicks && !sameIdleWindow) reason = "UNMATCHED_WAIT_WINDOW";
      else if (
        row.lifecycle_complete === false ||
        row.casualty_attribution_complete === false ||
        base.lifecycle_complete === false ||
        base.casualty_attribution_complete === false
      )
        reason = "INCOMPLETE_EVENT_ACCOUNTING";
    }
    return {
      name,
      status: reason ? "UNASSESSED" : "COMPLETE",
      ...(reason ? { reason } : {}),
    };
  });
  const complete =
    evaluation.status !== "paused" &&
    declared.length > 0 &&
    declared.every((r) => r.status === "COMPLETE");
  return {
    ...decision,
    assessment: {
      selected_action: decision.candidate,
      declared_scenarios: {
        status: complete ? "COMPLETE" : "UNASSESSED",
        rows: declared,
        ...(evaluation.status === "paused"
          ? { reason: "GAMEPLAY_OR_ADMISSION_PAUSED" }
          : {}),
      },
      known_omitted_schedules:
        evaluation.assumptions?.known_unassessed_schedules ?? [],
      omitted_candidates: evaluation.omitted_candidates ?? [],
      unenumerated_legal_actions: "UNKNOWN",
      beyond_horizon: {
        status: "UNKNOWN",
        horizon_ticks: evaluation.bounds?.horizon ?? null,
        reason:
          "Later inputs and outcomes are not established by this bounded comparison.",
      },
      robust_against_all_plausible_responses: false,
      campaign_eligibility: {
        status: "NOT_ESTABLISHED",
        eligible: null,
        spending_authorized: false,
        reason:
          "Planning has no trusted campaign state. The restricted executor must independently check consent, expiry, approved accounts, snapshot authenticity, population, budget and source health.",
      },
    },
  };
}
