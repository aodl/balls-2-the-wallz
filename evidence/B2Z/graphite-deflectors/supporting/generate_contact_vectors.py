#!/usr/bin/env python3
"""Reproduce illustrative unit-cell contact vectors, not production game fixtures.

Uses exact fractions to expose contact timing and post-turn intercepts. Velocities
are algebraic examples, not B2Z's canonical heading table. Run from any directory.
"""
from __future__ import annotations
import json
from fractions import Fraction as F
from pathlib import Path


def pair(values: tuple[F, F]) -> list[str]:
    return [str(v) for v in values]


def vector(name: str, p: tuple[F, F], v: tuple[F, F], out: tuple[F, F],
           entry: F = F(0)) -> dict:
    if v == (F(0), F(0)) or out == (F(0), F(0)):
        raise ValueError("Velocity must be nonzero")
    times = []
    for pos, speed in zip(p, v):
        if not F(0) <= pos <= F(1):
            raise ValueError("Entry point outside unit cell")
        if speed:
            times.append(((F(1) if speed > 0 else F(0)) - pos) / speed)
    dt = min(times)
    if dt <= 0:
        raise ValueError("Not a positive-duration interior traversal")
    tc = entry + dt / 2
    contact = (p[0] + v[0]*dt/2, p[1] + v[1]*dt/2)
    intercept = (contact[0] - out[0]*tc, contact[1] - out[1]*tc)
    assert all(F(0) < x < F(1) for x in contact), (name, contact)
    return {
        "id": name, "entry_time": str(entry), "entry_position": pair(p),
        "incoming_velocity": pair(v), "geometric_exit_time": str(entry + dt),
        "contact_time": str(tc), "contact_position": pair(contact),
        "outgoing_velocity": pair(out), "outgoing_global_intercept": pair(intercept),
        "intercept_x_1024": str(intercept[0] * 1024),
        "intercept_y_1024": str(intercept[1] * 1024),
        "scope": "Exact illustrative geometry; not canonical B2Z speed or authenticated input"
    }


def main() -> None:
    specs = [
        ("left-low", (F(0), F(1,4)), (F(1), F(0)), (F(1), F(1))),
        ("left-high", (F(0), F(3,4)), (F(1), F(0)), (F(1), F(1))),
        ("right-low", (F(1), F(1,4)), (F(-1), F(0)), (F(1), F(1))),
        ("bottom-left", (F(1,4), F(0)), (F(0), F(1)), (F(1), F(1))),
        ("top-right", (F(3,4), F(1)), (F(0), F(-1)), (F(1), F(1))),
        ("oblique-left", (F(0), F(1,4)), (F(3), F(1)), (F(1), F(1))),
        ("oblique-bottom", (F(1,4), F(0)), (F(1), F(3)), (F(1), F(1))),
        ("diagonal-corner-entry", (F(0), F(0)), (F(1), F(1)), (F(1), F(1))),
        ("near-corner-positive", (F(0), F(1023,1024)), (F(1), F(1)), (F(1), F(1))),
        ("integer-intercept-counterexample", (F(0), F(1,2)), (F(5), F(12)), (F(13), F(0))),
    ]
    rows = [vector(*s) for s in specs]
    rows.append(vector("nonzero-entry-time", (F(0), F(1,2)),
                       (F(5), F(12)), (F(13), F(0)), F(3,7)))
    counter = next(row for row in rows if row["id"] == "integer-intercept-counterexample")
    assert counter["contact_time"] == "1/48"
    assert counter["outgoing_global_intercept"] == ["-1/6", "3/4"]
    assert counter["intercept_x_1024"] == "-512/3"
    result = {
        "status": "illustrative exact-geometry examples only",
        "policy": "proposed incoming-chord-midpoint; not owner-approved production physics",
        "units": "unit cell, abstract time, exact fraction strings; y increases with abstract coordinate",
        "speed_warning": "Most vectors test position/timing, not equal-speed normalization. The counterexample has equal Euclidean speeds of 13.",
        "vectors": rows,
        "excluded_cases": [
            "zero-duration corner/tangent contact is not an interior entry",
            "negative crossing time is invalid; do not clamp it",
            "arithmetic/resource proof and old-world migration are outside these examples"
        ]
    }
    Path(__file__).with_name("CONTACT_VECTORS.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
