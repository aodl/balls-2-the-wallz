/** Decision provenance only. This module cannot establish campaign authority. */
function scenarioNames(evaluation) {
  const tactical = evaluation.kind === "local-counterplay";
  const declared = tactical
    ? evaluation.responses
    : evaluation.assumptions?.scenarios;
  if (declared !== undefined)
    return Array.isArray(declared)
      ? declared.map((s) => (tactical ? s : s?.name))
      : [null];
  return [...new Set((evaluation.forecasts ?? []).map((r) => r.scenario))];
}

const count = (n) => Number.isSafeInteger(n) && n >= 0;

/** One row-pair assessment used by annotation, ranking and compatibility fields. */
export function assessCandidate(evaluation, candidateId) {
  const tactical = evaluation.kind === "local-counterplay";
  const names = scenarioNames(evaluation);
  const candidates = evaluation.candidates ?? [];
  const selected = candidates.filter((c) => c.id === candidateId);
  const waits = candidates.filter((c) => c.action?.Wait);
  const rows = (tactical ? evaluation.rows : evaluation.forecasts) ?? [];
  const unique = (id, name) => {
    const matches = rows.filter(
      (r) =>
        r.candidate === id && (tactical ? r.response : r.scenario) === name,
    );
    return matches.length === 1 ? matches[0] : null;
  };
  const scored_scenarios = [],
    comparison_bases = [],
    unassessed = [];
  for (const name of names) {
    const row = unique(candidateId, name),
      base = unique(waits[0]?.id, name);
    let reason = null,
      basis = null;
    if (
      typeof name !== "string" ||
      !name ||
      names.filter((n) => n === name).length !== 1
    )
      reason = "INVALID_SCENARIO";
    else if (selected.length !== 1)
      reason = "UNKNOWN_OR_DUPLICATE_SELECTED_ACTION";
    else if (waits.length !== 1 || !row || !base) reason = "MISSING_FORECAST";
    else if (row.status !== "complete" || base.status !== "complete")
      reason = "INCOMPLETE_FORECAST";
    else if (
      [row, base].some(
        (r) =>
          r.casualty_attribution_complete !== true ||
          r.lifecycle_complete !== true,
      )
    )
      reason = "INCOMPLETE_EVENT_ACCOUNTING";
    else if (tactical) {
      // Tactical rows already contain matched canonical increments. Their explicit
      // casualty flag and island-local support count are required independently.
      if (
        [row, base].some(
          (r) =>
            !count(r.defended_island_support) ||
            ("defended_island_active" in r &&
              (typeof r.defended_island_active !== "boolean" ||
                r.defended_island_active !==
                  Boolean(r.defended_island_support))),
        )
      )
        reason = "INVALID_DEFENDED_ISLAND_SUPPORT";
    } else if (
      !selected[0].action?.Wait &&
      row.action_admitted_within_horizon !== true
    )
      reason = "NOT_ADMITTED_WITHIN_HORIZON";
    else {
      const validCounts = [row, base].every(
        (r) =>
          count(r.logical_ticks_completed) &&
          (r.idle_slots === undefined || count(r.idle_slots)),
      );
      const sameTicks =
        row.logical_ticks_completed === base.logical_ticks_completed;
      const validWindow =
        [row, base].every(
          (r) =>
            typeof r.elapsed_window_ns === "bigint" &&
            r.elapsed_window_ns >= 0n,
        ) && row.elapsed_window_ns === base.elapsed_window_ns;
      // Historical normal rows can establish an equal logical horizon without
      // elapsed metadata. Present-but-invalid windows are never ignored.
      const noWindow =
        row.elapsed_window_ns === undefined &&
        base.elapsed_window_ns === undefined;
      const idleWindow =
        validWindow && (row.idle_slots > 0 || base.idle_slots > 0);
      if (
        !validCounts ||
        (!validWindow && !noWindow) ||
        (!sameTicks && !idleWindow)
      )
        reason = "MISSING_MATCHED_WAIT";
      else
        basis = {
          scenario: name,
          basis: sameTicks
            ? "same-logical-horizon"
            : "elapsed-window-with-idle",
          candidate_logical_ticks: row.logical_ticks_completed,
          wait_logical_ticks: base.logical_ticks_completed,
          ...(idleWindow ? { elapsed_window_ns: row.elapsed_window_ns } : {}),
        };
    }
    if (reason) unassessed.push({ scenario: name, reason });
    else {
      scored_scenarios.push(name);
      if (basis) comparison_bases.push(basis);
    }
  }
  return {
    candidate: candidateId,
    scored_scenarios,
    comparison_bases,
    unassessed,
  };
}

export function annotateDecision(evaluation, decision) {
  const coverage = (evaluation.candidates ?? []).map((c) =>
    assessCandidate(evaluation, c.id),
  );
  const selected =
    coverage.find((c) => c.candidate === decision.candidate) ??
    assessCandidate(evaluation, decision.candidate);
  const declared = scenarioNames(evaluation).map((name) => {
    const missing = selected.unassessed.find((r) =>
      Object.is(r.scenario, name),
    );
    return {
      name,
      status: missing ? "UNASSESSED" : "COMPLETE",
      ...(missing ? { reason: missing.reason } : {}),
    };
  });
  const complete =
    evaluation.status !== "paused" &&
    declared.length > 0 &&
    selected.unassessed.length === 0;
  return {
    ...decision,
    ...(decision.forecast_coverage ? { forecast_coverage: coverage } : {}),
    ...(decision.robustness
      ? {
          robustness: {
            ...decision.robustness,
            assessed_all_declared_scenarios: complete,
            robust_against_all_plausible_responses: false,
          },
        }
      : {}),
    assessment: {
      selected_action: decision.candidate,
      declared_scenarios: {
        scope: "SELECTED_ACTION_VS_MATCHED_WAIT",
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
