use crate::world::{Ball, World, Q};
use dtr_wire::{Rat, Result};
use num_bigint::BigInt;
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Crossing {
    pub ball: u32,
    pub time: Rat,
    pub x: bool,
    pub y: bool,
    pub xwall: i64,
    pub ywall: i64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target {
    pub axis: String,
    pub target: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from: Option<usize>,
    pub pass: bool,
    pub capturable: bool,
    pub defender: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Intent {
    #[serde(flatten)]
    pub crossing: Crossing,
    pub owner: u32,
    pub cell: usize,
    pub targets: Vec<Target>,
    pub attack: Option<Target>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deflector_target: Option<u32>,
}
fn blocks_ball(w: &World, b: &Ball, cell: usize) -> bool {
    use crate::passage_v20::{exempts, Kind};
    w.cannons
        .iter()
        .any(|c| c.cell == cell && !exempts(w, b.id, Kind::Cannon, c.id, cell))
        || crate::deflectors_v12::at(w, cell)
            .is_some_and(|d| !exempts(w, b.id, Kind::Deflector, d.id, cell))
}
pub fn next_crossing(b: &Ball, width: usize, now: &Rat) -> Result<Crossing> {
    let d = b
        .den
        .as_ref()
        .map(|n| n.0.to_u32().ok_or("trajectory denominator"))
        .transpose()?
        .unwrap_or(1);
    next_crossing_rational(b, width, now, d)
}
/// Shared exact crossing calculation. Historical callers retain denominator one;
/// world/cursor validation selects schema7 rational trajectories.
pub fn next_crossing_rational(
    b: &Ball,
    width: usize,
    now: &Rat,
    denominator: u32,
) -> Result<Crossing> {
    if denominator == 0 || denominator > 65536 {
        return Err("trajectory denominator".into());
    }
    let d = BigInt::from(denominator);
    let xwall = (b.cell % width + usize::from(b.vx > 0)) as i64 * Q;
    let ywall = (b.cell / width + usize::from(b.vy > 0)) as i64 * Q;
    let tx = if b.vx == 0 {
        None
    } else {
        Some(Rat::new(
            (if denominator == 1 {
                BigInt::from(xwall)
            } else {
                BigInt::from(xwall) * &d
            }) - &b.x0.0,
            if denominator == 1 {
                BigInt::from(b.vx)
            } else {
                BigInt::from(b.vx) * &d
            },
        )?)
    };
    let ty = if b.vy == 0 {
        None
    } else {
        Some(Rat::new(
            (if denominator == 1 {
                BigInt::from(ywall)
            } else {
                BigInt::from(ywall) * &d
            }) - &b.y0.0,
            if denominator == 1 {
                BigInt::from(b.vy)
            } else {
                BigInt::from(b.vy) * &d
            },
        )?)
    };
    if tx.as_ref().is_some_and(|t| t < now) || ty.as_ref().is_some_and(|t| t < now) {
        return Err("invalid sided trajectory".into());
    }
    let time = match (&tx, &ty) {
        (Some(x), Some(y)) => x.min(y).clone(),
        (Some(x), None) => x.clone(),
        (None, Some(y)) => y.clone(),
        _ => return Err("stationary trajectory".into()),
    };
    Ok(Crossing {
        ball: b.id,
        x: tx.as_ref() == Some(&time),
        y: ty.as_ref() == Some(&time),
        time,
        xwall,
        ywall,
    })
}
pub fn classify(w: &World, b: &Ball, crossing: Crossing) -> Intent {
    let player = Some(b.owner);
    let mut targets = Vec::new();
    for (axis, active) in [("x", crossing.x), ("y", crossing.y)] {
        if !active {
            continue;
        }
        let x = (b.cell % w.width) as i64 + if axis == "x" { b.vx.signum() as i64 } else { 0 };
        let y = (b.cell / w.width) as i64 + if axis == "y" { b.vy.signum() as i64 } else { 0 };
        let target = if w.torus() {
            Some(crate::world::wrap_cell(x, y, w.width, w.height))
        } else if x < 0 || y < 0 || x >= w.width as i64 || y >= w.height as i64 {
            None
        } else {
            Some(y as usize * w.width + x as usize)
        };
        let anchor = target.is_some_and(|t| blocks_ball(w, b, t));
        let defender = target.and_then(|t| w.player_at(t)).unwrap_or(0);
        targets.push(Target {
            axis: axis.into(),
            target,
            from: None,
            pass: target.is_some() && player == Some(defender) && !anchor,
            capturable: target.is_some() && player.is_some() && player != Some(defender) && !anchor,
            defender,
        });
    }
    // Rules20 resolves an exact vertex as a single face contact. The source
    // tile, not the linear cell ID or camera, supplies the checkerboard bias.
    let preferred = corner_preferred_axis(w, b, &crossing);
    let side_attacks: Vec<_> = targets.iter().filter(|t| t.capturable).collect();
    let mut attack = if w.version >= 12 && crossing.x && crossing.y && side_attacks.len() == 2 {
        side_attacks
            .iter()
            .find(|t| t.axis == preferred)
            .copied()
            .cloned()
    } else {
        side_attacks
            .iter()
            .min_by_key(|t| t.target)
            .copied()
            .cloned()
    };
    // With two clear friendly side cells, the diagonal foreign cell is the
    // next single-face contact at this exact time. The other face reflects;
    // the Ball stays in the friendly side cell rather than entering foreign
    // terrain. Genuine structure corners keep the historical solid response.
    if w.version >= 12
        && crossing.x
        && crossing.y
        && attack.is_none()
        && targets.len() == 2
        && targets.iter().all(|t| t.pass)
    {
        let sx = b.vx.signum() as i64;
        let sy = b.vy.signum() as i64;
        let diagonal = crate::world::wrap_cell(
            (b.cell % w.width) as i64 + sx,
            (b.cell / w.width) as i64 + sy,
            w.width,
            w.height,
        );
        let defender = w.player_at(diagonal).unwrap_or(0);
        if defender != b.owner
            && !w.cannons.iter().any(|c| c.cell == diagonal)
            && crate::deflectors_v12::at(w, diagonal).is_none()
        {
            attack = Some(Target {
                axis: if preferred == "x" { "y" } else { "x" }.into(),
                target: Some(diagonal),
                from: targets
                    .iter()
                    .find(|t| t.axis == preferred)
                    .and_then(|t| t.target),
                pass: false,
                capturable: true,
                defender,
            });
        }
    }
    let deflector_target = if w.version >= 7 && crossing.x != crossing.y {
        targets
            .iter()
            .filter_map(|t| {
                t.target
                    .and_then(|c| crate::deflectors_v12::at(w, c))
                    .filter(|d| {
                        !crate::passage_v20::exempts(
                            w,
                            b.id,
                            crate::passage_v20::Kind::Deflector,
                            d.id,
                            d.cell,
                        )
                    })
                    .map(|d| d.id)
            })
            .next()
    } else {
        None
    };
    Intent {
        crossing,
        owner: b.owner,
        cell: b.cell,
        targets,
        attack,
        deflector_target,
    }
}
fn corner_preferred_axis(w: &World, b: &Ball, crossing: &Crossing) -> &'static str {
    if !(crossing.x && crossing.y) {
        return "x";
    }
    let parity = ((b.cell % w.width) + (b.cell / w.width)) & 1;
    let x_is_left = b.vx.signum() == b.vy.signum();
    if (parity == 0) == x_is_left {
        "x"
    } else {
        "y"
    }
}
/// Revalidate frozen crossing intent against current ownership and cannon cells.
/// All cannon anchors remain reflective, including friendly and dormant ones.
pub fn passage(w: &World, b: &Ball, i: &Intent) -> (bool, bool, bool) {
    let player = Some(b.owner);
    let mut x = false;
    let mut y = false;
    for t in &i.targets {
        let pass = t.pass
            && t.target
                .is_some_and(|c| w.player_at(c) == player && !blocks_ball(w, b, c));
        if t.axis == "x" {
            x = pass;
        } else {
            y = pass;
        }
    }
    if i.crossing.x && i.crossing.y && x && y {
        let sx = b.vx.signum() as i64;
        let sy = b.vy.signum() as i64;
        let cell = if w.torus() {
            crate::world::wrap_cell(
                (b.cell % w.width) as i64 + sx,
                (b.cell / w.width) as i64 + sy,
                w.width,
                w.height,
            )
        } else {
            (b.cell as i64 + sx + sy * w.width as i64) as usize
        };
        if w.player_at(cell) != player || blocks_ball(w, b, cell) {
            if w.version >= 12
                && i.attack.as_ref().is_some_and(|a| a.target == Some(cell))
                && !w.cannons.iter().any(|c| c.cell == cell)
                && crate::deflectors_v12::at(w, cell).is_none()
            {
                let preferred = corner_preferred_axis(w, b, &i.crossing);
                return if preferred == "x" {
                    (true, false, false)
                } else {
                    (false, true, false)
                };
            }
            return (false, false, true);
        }
    }
    (x, y, false)
}

pub fn reflect(b: &mut Ball, axis: &str, wall: i64) {
    let d = b
        .den
        .as_ref()
        .map(|d| d.0.clone())
        .unwrap_or_else(|| BigInt::from(1));
    if axis == "x" {
        b.x0.0 = BigInt::from(2 * wall) * &d - &b.x0.0;
        b.vx = -b.vx;
    } else {
        b.y0.0 = BigInt::from(2 * wall) * &d - &b.y0.0;
        b.vy = -b.vy;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use dtr_wire::unhex;

    fn fixture() -> World {
        let rows: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/context-structures-v13.json"
        ))
        .unwrap();
        let mut world =
            World::decode(&unhex(rows["rows"][0]["initial_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        world.version = 12; // Isolate the successor contact law from migration wiring.
        world
    }

    fn contact(
        world: &mut World,
        x: usize,
        y: usize,
        sx: i32,
        sy: i32,
    ) -> (Ball, Crossing, usize, usize, usize) {
        let source = y * world.width + x;
        let side_x = y * world.width + (x as i32 + sx) as usize;
        let side_y = (y as i32 + sy) as usize * world.width + x;
        let diagonal = (y as i32 + sy) as usize * world.width + (x as i32 + sx) as usize;
        let mut ball = world.balls[0].clone();
        ball.cell = source;
        ball.vx = sx * 32_000;
        ball.vy = sy * 32_000;
        let crossing = Crossing {
            ball: ball.id,
            time: Rat::new(0.into(), 1.into()).unwrap(),
            x: true,
            y: true,
            xwall: 0,
            ywall: 0,
        };
        (ball, crossing, side_x, side_y, diagonal)
    }

    #[test]
    fn checkerboard_selects_one_side_for_all_diagonals_and_both_parities() {
        for (sx, sy) in [(1, 1), (1, -1), (-1, 1), (-1, -1)] {
            for x in [500, 501] {
                let mut w = fixture();
                let (b, crossing, side_x, side_y, _) = contact(&mut w, x, 500, sx, sy);
                w.set_owner(side_x, 0).unwrap();
                w.set_owner(side_y, 0).unwrap();
                let intent = classify(&w, &b, crossing);
                let x_is_left = sx == sy;
                let expected_x = (((x + 500) & 1) == 0) == x_is_left;
                assert_eq!(
                    intent.attack.as_ref().unwrap().target,
                    Some(if expected_x { side_x } else { side_y })
                );
                assert_eq!(passage(&w, &b, &intent), (false, false, false));
            }
        }
    }

    #[test]
    fn mixed_side_ownership_selects_one_foreign_contact_for_each_diagonal() {
        for (sx, sy) in [(1, 1), (1, -1), (-1, 1), (-1, -1)] {
            for x in [500, 501] {
                for (owner_x, owner_y) in [
                    (0, 0),
                    (2, 2),
                    (0, 2),
                    (2, 0),
                    (1, 0),
                    (1, 2),
                    (0, 1),
                    (2, 1),
                ] {
                    let mut w = fixture();
                    let (b, crossing, side_x, side_y, diagonal) = contact(&mut w, x, 500, sx, sy);
                    w.set_owner(side_x, owner_x).unwrap();
                    w.set_owner(side_y, owner_y).unwrap();
                    w.set_owner(diagonal, 1).unwrap();
                    let preferred_x = (((x + 500) & 1) == 0) == (sx == sy);
                    let expected = if owner_x == 1 {
                        side_y
                    } else if owner_y == 1 || preferred_x {
                        side_x
                    } else {
                        side_y
                    };
                    let intent = classify(&w, &b, crossing);
                    assert_eq!(
                        intent.attack.as_ref().and_then(|attack| attack.target),
                        Some(expected),
                        "direction {sx},{sy}, source {x}, owners {owner_x}/{owner_y}"
                    );
                    assert_eq!(
                        intent
                            .targets
                            .iter()
                            .filter(|target| target.capturable)
                            .count(),
                        usize::from(owner_x != 1) + usize::from(owner_y != 1)
                    );
                }
            }
        }
    }

    #[test]
    fn friendly_sides_claim_the_diagonal_through_one_face_but_solid_corner_blocks() {
        for x in [500, 501] {
            let mut w = fixture();
            let (b, crossing, _, _, diagonal) = contact(&mut w, x, 500, 1, 1);
            w.set_owner(diagonal, 0).unwrap();
            let intent = classify(&w, &b, crossing.clone());
            assert_eq!(intent.attack.as_ref().unwrap().target, Some(diagonal));
            assert_eq!(
                passage(&w, &b, &intent),
                if x & 1 == 0 {
                    (true, false, false)
                } else {
                    (false, true, false)
                }
            );
            w.cannons[0].cell = diagonal;
            let solid = classify(&w, &b, crossing);
            assert!(solid.attack.is_none());
            assert_eq!(passage(&w, &b, &solid), (false, false, true));
        }
    }

    #[test]
    fn diagonal_enemy_strike_starts_in_the_passed_friendly_neighbor() {
        for x in [500, 501] {
            let mut w = fixture();
            let (b, crossing, side_x, side_y, diagonal) = contact(&mut w, x, 500, 1, 1);
            w.set_owner(diagonal, 2).unwrap();
            let intent = classify(&w, &b, crossing);
            let attack = intent.attack.as_ref().unwrap();
            let expected = if x & 1 == 0 { side_x } else { side_y };
            assert_eq!(attack.from, Some(expected));
            assert!(w.neighbors(expected).contains(&diagonal));
            assert_eq!(
                passage(&w, &b, &intent),
                if x & 1 == 0 {
                    (true, false, false)
                } else {
                    (false, true, false)
                }
            );
        }
    }
}
