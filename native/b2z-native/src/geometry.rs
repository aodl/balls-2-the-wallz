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
        let anchor = target.is_some_and(|t| {
            w.cannons.iter().any(|c| c.cell == t) || crate::deflectors_v12::at(w, t).is_some()
        });
        let defender = target.and_then(|t| w.player_at(t)).unwrap_or(0);
        targets.push(Target {
            axis: axis.into(),
            target,
            pass: target.is_some() && player == Some(defender) && !anchor,
            capturable: target.is_some() && player.is_some() && player != Some(defender) && !anchor,
            defender,
        });
    }
    let attack = targets
        .iter()
        .filter(|t| t.capturable)
        .min_by_key(|t| t.target)
        .cloned();
    let deflector_target = if w.version == 7 && crossing.x != crossing.y {
        targets
            .iter()
            .filter_map(|t| {
                t.target
                    .and_then(|c| crate::deflectors_v12::at(w, c))
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
/// Revalidate frozen crossing intent against current ownership and cannon cells.
/// All cannon anchors remain reflective, including friendly and dormant ones.
pub fn passage(w: &World, b: &Ball, i: &Intent) -> (bool, bool, bool) {
    let player = Some(b.owner);
    let mut x = false;
    let mut y = false;
    for t in &i.targets {
        let pass = t.pass
            && t.target.is_some_and(|c| {
                w.player_at(c) == player
                    && !w.cannons.iter().any(|a| a.cell == c)
                    && crate::deflectors_v12::at(w, c).is_none()
            });
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
        if w.player_at(cell) != player
            || w.cannons.iter().any(|c| c.cell == cell)
            || crate::deflectors_v12::at(w, cell).is_some()
        {
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
