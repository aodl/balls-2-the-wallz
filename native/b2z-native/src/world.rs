use dtr_wire::{decode, encode, Int, Rat, Result};
use num_bigint::BigInt;
use num_traits::Signed;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub const Q: i64 = 1024;
fn read_heading<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> std::result::Result<Option<u16>, D::Error> {
    u16::deserialize(d).map(Some)
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Cannon {
    pub id: u32,
    pub cell: usize,
    pub account: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "read_heading"
    )]
    pub heading: Option<u16>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Ball {
    pub id: u32,
    pub owner: u32,
    pub cell: usize,
    pub x0: Int,
    pub y0: Int,
    pub vx: i32,
    pub vy: i32,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Strike {
    pub id: u32,
    pub from: usize,
    pub to: usize,
    pub axis: String,
    pub ball: u32,
    pub owner: u32,
    pub defender: u32,
    pub born: Rat,
    pub deadline: Rat,
    pub position: Rat,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Credit {
    pub account: String,
    pub units: Rat,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct World {
    pub version: u32,
    pub width: usize,
    pub height: usize,
    pub cells: Vec<u32>,
    pub cannons: Vec<Cannon>,
    pub balls: Vec<Ball>,
    pub time: Rat,
    pub next_cannon_id: u32,
    pub next_ball_id: u32,
    pub pending: Vec<Strike>,
    pub next_strike_id: u32,
    pub received_e8s: Int,
    pub credits: Vec<Credit>,
}
pub fn account_ok(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
pub fn neighbors(cell: usize, width: usize, height: usize) -> Vec<usize> {
    let x = cell % width;
    let y = cell / width;
    let mut out = Vec::with_capacity(4);
    if y > 0 {
        out.push(cell - width);
    }
    if x > 0 {
        out.push(cell - 1);
    }
    if x + 1 < width {
        out.push(cell + 1);
    }
    if y + 1 < height {
        out.push(cell + width);
    }
    out
}
pub fn wrap_cell(x: i64, y: i64, width: usize, height: usize) -> usize {
    b2z_mechanics::wrapped_cell(x, y, width, height).expect("validated world dimensions")
}

pub fn position(b: &Ball, t: &Rat) -> Result<[Rat; 2]> {
    let n = t.0.numer();
    let d = t.0.denom();
    Ok([
        Rat::new(&b.x0.0 * d + BigInt::from(b.vx) * n, d.clone())?,
        Rat::new(&b.y0.0 * d + BigInt::from(b.vy) * n, d.clone())?,
    ])
}
impl World {
    pub fn torus(&self) -> bool {
        self.version == 4
    }
    pub fn neighbors(&self, cell: usize) -> Vec<usize> {
        if !self.torus() {
            return neighbors(cell, self.width, self.height);
        }
        let x = (cell % self.width) as i64;
        let y = (cell / self.width) as i64;
        [(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)]
            .into_iter()
            .map(|(x, y)| wrap_cell(x, y, self.width, self.height))
            .collect()
    }
    pub fn patch(&self, cell: usize) -> Option<Vec<usize>> {
        if !self.torus() {
            return crate::spawn::patch(cell, self.width, self.height);
        }
        let x = (cell % self.width) as i64;
        let y = (cell / self.width) as i64;
        Some(
            (-1..=1)
                .flat_map(|dy| {
                    (-1..=1).map(move |dx| wrap_cell(x + dx, y + dy, self.width, self.height))
                })
                .collect(),
        )
    }

    pub fn decode(bytes: &[u8]) -> Result<Self> {
        let w: Self = decode(bytes)?;
        w.validate()?;
        Ok(w)
    }
    pub fn encode(&self) -> Result<Vec<u8>> {
        self.validate()?;
        encode(self)
    }
    pub fn connected(&self, owner: u32, anchor: usize) -> bool {
        if self.cells.get(anchor) != Some(&owner) {
            return false;
        }
        let mut seen = vec![false; self.cells.len()];
        seen[anchor] = true;
        let mut queue = vec![anchor];
        let mut i = 0;
        while i < queue.len() {
            let c = queue[i];
            i += 1;
            for n in self.neighbors(c) {
                if self.cells[n] == owner && !seen[n] {
                    seen[n] = true;
                    queue.push(n);
                }
            }
        }
        self.cells
            .iter()
            .enumerate()
            .all(|(i, o)| *o != owner || seen[i])
    }
    /// For resolved states only. Topology continuation snapshots may be transiently disconnected.
    pub fn validate(&self) -> Result<()> {
        let fail = |s: &str| -> Result<()> { Err(s.into()) };
        if ![3, 4].contains(&self.version)
            || (self.version == 4 && (self.width != 32 || self.height != 32))
            || !(1..=32).contains(&self.width)
            || !(1..=32).contains(&self.height)
            || self.cells.len() != self.width * self.height
        {
            return fail("world dimensions/version");
        }
        self.time.check()?;
        if self.time < Rat::integer(0) || self.time > Rat::integer(1_000_000_000) {
            return fail("world time");
        }
        if self.cannons.len() > 32 || self.balls.len() > 64 {
            return fail("entity capacity");
        }
        let mut ids = BTreeSet::new();
        let mut accounts = BTreeSet::new();
        let mut anchors = BTreeSet::new();
        let mut last = 0;
        for c in &self.cannons {
            if (self.version == 3 && c.heading.is_some())
                || c.id <= last
                || c.id > 65535
                || c.cell >= self.cells.len()
                || !account_ok(&c.account)
                || !accounts.insert(c.account.clone())
                || !anchors.insert(c.cell)
            {
                return fail("cannon identity");
            }
            ids.insert(c.id);
            last = c.id;
            if !self.connected(c.id, c.cell) {
                return fail("disconnected territory");
            }
        }
        if self.cells.iter().any(|o| *o != 0 && !ids.contains(o)) {
            return fail("unknown cell owner");
        }
        last = 0;
        for b in &self.balls {
            if b.id <= last
                || b.id == u32::MAX
                || b.cell >= self.cells.len()
                || !ids.contains(&b.owner)
                || self.cells[b.cell] != b.owner
                || !(-4096..=4096).contains(&b.vx)
                || !(-4096..=4096).contains(&b.vy)
                || (b.vx == 0 && b.vy == 0)
            {
                return fail("ball bounds/identity");
            }
            last = b.id;
            if b.x0.0.abs() > BigInt::from(100_000_000_000_000i64)
                || b.y0.0.abs() > BigInt::from(100_000_000_000_000i64)
            {
                return fail("motion intercept");
            }
            let [x, y] = position(b, &self.time)?;
            let cx = (b.cell % self.width) as i64;
            let cy = (b.cell / self.width) as i64;
            if x < Rat::integer(cx * Q)
                || x > Rat::integer((cx + 1) * Q)
                || y < Rat::integer(cy * Q)
                || y > Rat::integer((cy + 1) * Q)
            {
                return fail("ball cell/position mismatch");
            }
        }
        for c in &self.cannons {
            let count = self.balls.iter().filter(|b| b.owner == c.id).count();
            if count == 0 || count > 32 {
                return fail("cannon ball invariant");
            }
        }
        if self.next_ball_id <= last
            || self.next_cannon_id <= self.cannons.iter().map(|c| c.id).max().unwrap_or(0)
            || self.next_cannon_id > 65536
        {
            return fail("next entity ID");
        }
        last = 0;
        let mut armed = BTreeSet::new();
        if self.pending.len() > self.balls.len() {
            return fail("pending capacity");
        }
        for p in &self.pending {
            if p.id <= last
                || p.id == u32::MAX
                || !armed.insert(p.ball)
                || !self
                    .balls
                    .iter()
                    .any(|b| b.id == p.ball && b.owner == p.owner)
                || p.from >= self.cells.len()
                || p.to >= self.cells.len()
                || !self.neighbors(p.from).contains(&p.to)
                || p.owner == p.defender
                || p.defender == 0
                || !matches!(p.axis.as_str(), "x" | "y")
            {
                return fail("pending identity");
            }
            last = p.id;
            p.born.check()?;
            p.deadline.check()?;
            p.position.check()?;
            if p.born > self.time || p.deadline < self.time || p.deadline <= p.born {
                return fail("pending clock");
            }
        }
        if self.next_strike_id <= last {
            return fail("next strike ID");
        }
        if self.received_e8s.0.is_negative() || self.received_e8s.0 >= (BigInt::from(1) << 128usize)
        {
            return fail("treasury tally");
        }
        let mut previous = "";
        if self.credits.len() > 1024 {
            return fail("credit capacity");
        }
        for c in &self.credits {
            c.units.check()?;
            if !account_ok(&c.account) || c.account.as_str() <= previous || c.units.0.is_negative()
            {
                return fail("credit identity");
            }
            previous = &c.account;
        }
        Ok(())
    }
    pub fn valid_strike(&self, p: &Strike) -> bool {
        self.balls
            .iter()
            .any(|b| b.id == p.ball && b.owner == p.owner)
            && self.cells.get(p.from) == Some(&p.owner)
            && self.cells.get(p.to) == Some(&p.defender)
            && !self.cannons.iter().any(|c| c.cell == p.to)
    }
    pub fn accrue(&mut self, dt: &Rat, areas: &[(u32, usize)]) -> Result<()> {
        if dt.0.is_negative() {
            return Err("negative score interval".into());
        }
        // Propose all credit changes first: an arithmetic error never partially credits the world.
        let mut credits = self.credits.clone();
        for (id, area) in areas {
            let account = &self
                .cannons
                .iter()
                .find(|c| c.id == *id)
                .ok_or("area owner missing")?
                .account;
            if let Some(c) = credits.iter_mut().find(|c| &c.account == account) {
                c.units = c.units.add(&dt.mul_i(*area as i64)?)?;
            } else {
                credits.push(Credit {
                    account: account.clone(),
                    units: dt.mul_i(*area as i64)?,
                });
            }
        }
        if credits.len() > 1024 {
            return Err("credit capacity".into());
        }
        credits.sort_by(|a, b| a.account.cmp(&b.account));
        self.credits = credits;
        Ok(())
    }
}
