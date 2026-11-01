use crate::world::{Ball, World, Q};
use dtr_wire::{Rat, Result};
use num_bigint::BigInt;
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
}
pub fn next_crossing(b: &Ball, width: usize, now: &Rat) -> Result<Crossing> {
    let xwall = (b.cell % width + usize::from(b.vx > 0)) as i64 * Q;
    let ywall = (b.cell / width + usize::from(b.vy > 0)) as i64 * Q;
    let tx = if b.vx == 0 {
        None
    } else {
        Some(Rat::new(BigInt::from(xwall) - &b.x0.0, b.vx.into())?)
    };
    let ty = if b.vy == 0 {
        None
    } else {
        Some(Rat::new(BigInt::from(ywall) - &b.y0.0, b.vy.into())?)
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
        let anchor = target.is_some_and(|t| w.cannons.iter().any(|c| c.cell == t));
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
    Intent {
        crossing,
        owner: b.owner,
        cell: b.cell,
        targets,
        attack,
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
                w.player_at(c) == player && !w.cannons.iter().any(|a| a.cell == c)
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
        if w.player_at(cell) != player || w.cannons.iter().any(|c| c.cell == cell) {
            return (false, false, true);
        }
    }
    (x, y, false)
}

pub fn reflect(b: &mut Ball, axis: &str, wall: i64) {
    if axis == "x" {
        b.x0.0 = BigInt::from(2 * wall) - &b.x0.0;
        b.vx = -b.vx;
    } else {
        b.y0.0 = BigInt::from(2 * wall) - &b.y0.0;
        b.vy = -b.vy;
    }
}
