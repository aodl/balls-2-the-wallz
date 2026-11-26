#!/usr/bin/env python3
"""Compare two retained, settled read-only production observations offline.

This computes net balance movement. It never queries a canister and does not
claim that a decline equals gross execution expenditure.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

DAY_NS = 86_400_000_000_000
TRILLION = 1_000_000_000_000
DEFAULT_RESERVE_PROTECTION = TRILLION
DEFAULT_FULL_SPEED_FLOOR = 2_070_000_000_000


def _record(path: Path) -> dict:
    data = json.loads(path.read_text())
    if "health" in data:
        if data.get("settlement", {}).get("settled") is not True:
            raise ValueError(f"unsettled or unverified observation: {path}")
        ns = int(data["health"]["observed_at_ns"])
        liquid = int(data["health"]["liquid_cycles"])
    else:
        if data.get("settled") is not True:
            raise ValueError(f"unsettled or unverified observation: {path}")
        timestamp = datetime.fromisoformat(data["observation_utc"].replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            raise ValueError(f"observation time lacks a UTC offset: {path}")
        delta = timestamp - datetime(1970, 1, 1, tzinfo=timezone.utc)
        ns = ((delta.days * 86_400 + delta.seconds) * 1_000_000_000
              + delta.microseconds * 1_000)
        liquid = int(data["backend"]["settled_liquid_cycles"])
    if ns <= 0 or liquid < 0:
        raise ValueError(f"invalid settled observation: {path}")
    return {"time_ns": ns, "liquid_cycles": liquid, "head": int(data["publication"]["head"])}


def compare(first: dict, last: dict, reserve: int, full_speed_floor: int) -> dict:
    elapsed = last["time_ns"] - first["time_ns"]
    if elapsed <= 0 or last["head"] < first["head"]:
        raise ValueError("observations must be ordered by time and publication")
    decline = first["liquid_cycles"] - last["liquid_cycles"]
    result = {
        "measurement_kind": "settled net balance movement, not gross execution cost",
        "elapsed_ns": str(elapsed),
        "publication_delta": last["head"] - first["head"],
        "first_liquid_cycles": str(first["liquid_cycles"]),
        "last_liquid_cycles": str(last["liquid_cycles"]),
        "net_decline_cycles": str(decline),
        "known_limitations": [
            "This offline calculator does not authenticate its input files; use approved signed observations.",
            "Unobserved treasury credits or external top-ups can hide gross expenditure.",
            "A temporary inter-canister reservation must be excluded by using settled samples.",
            "A workload-specific trend is not a guaranteed future rate.",
        ],
    }
    if decline <= 0:
        result["rate_status"] = "unavailable: no positive settled net decline"
        return result
    # Integer arithmetic keeps cycle balances exact and uses the actual elapsed time.
    daily_numerator = decline * DAY_NS
    result["rate_status"] = "observed"
    result["net_cycles_per_day_floor"] = str(daily_numerator // elapsed)
    unit_denominator = elapsed * TRILLION
    millionths, remainder = divmod(daily_numerator * 1_000_000, unit_denominator)
    if 2 * remainder >= unit_denominator:
        millionths += 1
    result["net_T_cycles_per_day"] = f"{millionths // 1_000_000}.{millionths % 1_000_000:06d}"
    for name, floor in (("reserve_protection", reserve), ("full_speed_cycle", full_speed_floor)):
        margin = last["liquid_cycles"] - floor
        result[f"{name}_floor_cycles"] = str(floor)
        result[f"{name}_margin_cycles"] = str(margin)
        result[f"{name}_seconds_at_observed_rate"] = (
            str(max(0, margin) * elapsed // (decline * 1_000_000_000))
            if margin > 0
            else "0"
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first", type=Path, help="earlier retained settled observation JSON")
    parser.add_argument("last", type=Path, help="later retained settled observation JSON")
    parser.add_argument("--reserve-protection-cycles", type=int, default=DEFAULT_RESERVE_PROTECTION)
    parser.add_argument("--full-speed-floor-cycles", type=int, default=DEFAULT_FULL_SPEED_FLOOR)
    parser.add_argument("--output", type=Path, help="write JSON here; otherwise print it")
    args = parser.parse_args()
    if args.reserve_protection_cycles < 0 or args.full_speed_floor_cycles < 0:
        parser.error("cycle floors must be nonnegative")
    result = compare(_record(args.first), _record(args.last), args.reserve_protection_cycles, args.full_speed_floor_cycles)
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
