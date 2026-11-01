use dtr_wire::{decode, encode, Int, Rat, Result};
use num_bigint::BigInt;
use num_traits::Signed;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const Q: i64 = 1024;
fn read_heading<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> std::result::Result<Option<u16>, D::Error> {
    u16::deserialize(d).map(Some)
}
fn read_playability<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> std::result::Result<Option<crate::playability::State>, D::Error> {
    crate::playability::State::deserialize(d).map(Some)
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
/// Compact v5 ownership.  The authenticated v4 32x32 ownership grid is the
/// compact base; each base cell expands to its exact proportional rectangle in
/// the million-cell arena. Gameplay writes are a sorted last-value map, while
/// owner elimination may compact the base itself.
/// This makes every v5 cell independently mutable without putting a million
/// JSON integers in every DTR state artifact.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct CellOverride {
    pub start: usize,
    pub end: usize,
    pub owner: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct OwnerCount {
    pub owner: u32,
    pub cells: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ScaledOwnership {
    pub format: String,
    pub source_width: usize,
    pub source_height: usize,
    pub base: Vec<u32>,
    pub overrides: Vec<CellOverride>,
    pub counts: Vec<OwnerCount>,
}
impl ScaledOwnership {
    pub fn from_32x32(base: Vec<u32>, width: usize, height: usize) -> Result<Self> {
        if base.len() != 1024 || width != 1000 || height != 1000 {
            return Err("v5 ownership base".into());
        }
        let mut counts = BTreeMap::new();
        for sy in 0..32 {
            let y0 = (sy * height).div_ceil(32);
            let y1 = ((sy + 1) * height).div_ceil(32);
            for sx in 0..32 {
                let owner = base[sy * 32 + sx];
                if owner != 0 {
                    let x0 = (sx * width).div_ceil(32);
                    let x1 = ((sx + 1) * width).div_ceil(32);
                    *counts.entry(owner).or_insert(0usize) += (x1 - x0) * (y1 - y0);
                }
            }
        }
        Ok(Self {
            format: "scaled32-v1".into(),
            source_width: 32,
            source_height: 32,
            base,
            overrides: vec![],
            counts: counts
                .into_iter()
                .map(|(owner, cells)| OwnerCount { owner, cells })
                .collect(),
        })
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct World {
    pub version: u32,
    pub width: usize,
    pub height: usize,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub cells: Vec<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ownership: Option<ScaledOwnership>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "read_playability"
    )]
    pub playability: Option<crate::playability::State>,
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
    if width <= 32 && height <= 32 {
        return b2z_mechanics::wrapped_cell(x, y, width, height)
            .expect("validated world dimensions");
    }
    debug_assert!(width <= 1000 && height <= 1000 && width > 0 && height > 0);
    y.rem_euclid(height as i64) as usize * width + x.rem_euclid(width as i64) as usize
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
    pub fn player_for_cannon(&self, id: u32) -> Option<u32> {
        if self.version == 6 {
            self.playability.as_ref()?.life(id).map(|c| c.player)
        } else {
            self.cannons.iter().find(|c| c.id == id).map(|c| c.id)
        }
    }
    pub fn account_for_player(&self, id: u32) -> Option<&str> {
        if self.version == 6 {
            self.playability
                .as_ref()?
                .player(id)
                .map(|p| p.account.as_str())
        } else {
            self.cannons
                .iter()
                .find(|c| c.id == id)
                .map(|c| c.account.as_str())
        }
    }
    pub fn player_at(&self, cell: usize) -> Option<u32> {
        let id = self.owner(cell)?;
        if self.version == 6 {
            crate::territory_v6::player(self, id)
        } else {
            Some(id)
        }
    }
    pub fn territory_ball_count(&self, cannon: u32) -> usize {
        crate::territory_v6::for_cannon(self, cannon)
            .map_or(0, |r| crate::territory_v6::balls(self, r))
    }
    pub fn active_cannon(&self, id: u32) -> bool {
        if self.version == 6 {
            self.territory_ball_count(id) > 0
        } else {
            self.balls.iter().any(|b| b.owner == id)
        }
    }
    pub fn score_areas(&self) -> Result<Vec<(u32, usize)>> {
        if self.version < 6 {
            return Ok(self.ownership_counts());
        }
        let mut out = BTreeMap::new();
        for (id, n) in self.ownership_counts() {
            if crate::territory_v6::balls(self, id) > 0 {
                let p = crate::territory_v6::player(self, id).ok_or("UNKNOWN_TERRITORY")?;
                *out.entry(p).or_insert(0usize) += n;
            }
        }
        Ok(out.into_iter().collect())
    }
    pub fn torus(&self) -> bool {
        self.version >= 4
    }
    pub fn cell_count(&self) -> usize {
        self.width.saturating_mul(self.height)
    }
    fn scaled_base_cell(&self, cell: usize) -> Option<usize> {
        let ownership = self.ownership.as_ref()?;
        if cell >= self.cell_count() {
            return None;
        }
        let x = cell % self.width;
        let y = cell / self.width;
        Some(
            (y * ownership.source_height / self.height) * ownership.source_width
                + x * ownership.source_width / self.width,
        )
    }
    pub fn owner(&self, cell: usize) -> Option<u32> {
        if self.version < 5 {
            return self.cells.get(cell).copied();
        }
        let ownership = self.ownership.as_ref()?;
        let base = self.scaled_base_cell(cell)?;
        let at = ownership
            .overrides
            .partition_point(|change| change.start <= cell);
        if at > 0 && cell < ownership.overrides[at - 1].end {
            Some(ownership.overrides[at - 1].owner)
        } else {
            ownership.base.get(base).copied()
        }
    }
    pub fn set_owner(&mut self, cell: usize, owner: u32) -> Result<u32> {
        let previous = self.owner(cell).ok_or("cell bounds")?;
        if previous == owner {
            return Ok(previous);
        }
        if self.version < 5 {
            self.cells[cell] = owner;
            return Ok(previous);
        }
        self.set_owner_range(cell, cell + 1, previous, owner)?;
        Ok(previous)
    }
    pub fn set_owner_range(
        &mut self,
        start: usize,
        end: usize,
        previous: u32,
        owner: u32,
    ) -> Result<()> {
        if self.version < 5 || start >= end || end > self.cell_count() {
            return Err("ownership range".into());
        }
        let base_cell = self.scaled_base_cell(start).ok_or("cell bounds")?;
        let ownership = self.ownership.as_mut().ok_or("v5 ownership")?;
        let mut next = Vec::with_capacity(ownership.overrides.len() + 1);
        for change in &ownership.overrides {
            if change.end <= start || change.start >= end {
                next.push(change.clone());
                continue;
            }
            if change.start < start {
                next.push(CellOverride {
                    start: change.start,
                    end: start,
                    owner: change.owner,
                });
            }
            if change.end > end {
                next.push(CellOverride {
                    start: end,
                    end: change.end,
                    owner: change.owner,
                });
            }
        }
        if end != start + 1 || ownership.base[base_cell] != owner {
            next.push(CellOverride { start, end, owner });
        }
        next.sort_by_key(|change| change.start);
        let mut compacted: Vec<CellOverride> = Vec::with_capacity(next.len());
        for change in next {
            if let Some(last) = compacted
                .last_mut()
                .filter(|last| last.end == change.start && last.owner == change.owner)
            {
                last.end = change.end;
            } else {
                compacted.push(change);
            }
        }
        ownership.overrides = compacted;
        let adjust = |counts: &mut Vec<OwnerCount>, id: u32, delta: i64| -> Result<()> {
            if id == 0 {
                return Ok(());
            }
            match counts.binary_search_by_key(&id, |c| c.owner) {
                Ok(at) => {
                    let next = (counts[at].cells as i64)
                        .checked_add(delta)
                        .filter(|n| *n >= 0)
                        .ok_or("ownership count")? as usize;
                    if next == 0 {
                        counts.remove(at);
                    } else {
                        counts[at].cells = next;
                    }
                }
                Err(at) if delta > 0 => counts.insert(
                    at,
                    OwnerCount {
                        owner: id,
                        cells: delta as usize,
                    },
                ),
                Err(_) => return Err("ownership count".into()),
            }
            Ok(())
        };
        let length = i64::try_from(end - start).map_err(|_| "ownership range")?;
        adjust(&mut ownership.counts, previous, -length)?;
        adjust(&mut ownership.counts, owner, length)?;
        Ok(())
    }
    pub fn ownership_counts(&self) -> Vec<(u32, usize)> {
        if let Some(ownership) = &self.ownership {
            return ownership
                .counts
                .iter()
                .map(|c| (c.owner, c.cells))
                .collect();
        }
        let mut counts = BTreeMap::new();
        for owner in &self.cells {
            if *owner != 0 {
                *counts.entry(*owner).or_insert(0usize) += 1;
            }
        }
        counts.into_iter().collect()
    }
    pub fn clear_owner(&mut self, owner: u32) -> Result<()> {
        if owner == 0 {
            return Err("cannot clear neutral owner".into());
        }
        if self.version < 5 {
            for cell in &mut self.cells {
                if *cell == owner {
                    *cell = 0;
                }
            }
            return Ok(());
        }
        let ownership = self.ownership.as_mut().ok_or("v5 ownership")?;
        for base in &mut ownership.base {
            if *base == owner {
                *base = 0;
            }
        }
        for change in &mut ownership.overrides {
            if change.owner == owner {
                change.owner = 0;
            }
        }
        ownership.counts.retain(|count| count.owner != owner);
        Ok(())
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
        if self.owner(anchor) != Some(owner) {
            return false;
        }
        let mut seen = vec![false; self.cell_count()];
        seen[anchor] = true;
        let mut queue = vec![anchor];
        let mut i = 0;
        while i < queue.len() {
            let c = queue[i];
            i += 1;
            for n in self.neighbors(c) {
                if self.owner(n) == Some(owner) && !seen[n] {
                    seen[n] = true;
                    queue.push(n);
                }
            }
        }
        (0..self.cell_count()).all(|i| self.owner(i) != Some(owner) || seen[i])
    }
    /// For resolved states only. Topology continuation snapshots may be transiently disconnected.
    pub fn validate(&self) -> Result<()> {
        let fail = |s: &str| -> Result<()> { Err(s.into()) };
        if ![3, 4, 5, 6].contains(&self.version)
            || (self.version == 4 && (self.width != 32 || self.height != 32))
            || (self.version >= 5 && (self.width != 1000 || self.height != 1000))
            || !(1..=1000).contains(&self.width)
            || !(1..=1000).contains(&self.height)
            || (self.version < 5
                && (self.cells.len() != self.cell_count() || self.ownership.is_some()))
            || (self.version >= 5 && (!self.cells.is_empty() || self.ownership.is_none()))
            || (self.version == 6) != self.playability.is_some()
        {
            return fail("world dimensions/version");
        }
        if self.version >= 5 {
            let o = self.ownership.as_ref().unwrap();
            if o.format != "scaled32-v1"
                || o.source_width != 32
                || o.source_height != 32
                || o.base.len() != 1024
                || o.overrides.len() > self.cell_count()
                || o.overrides.windows(2).any(|p| p[0].end > p[1].start)
                || o.overrides
                    .iter()
                    .any(|p| p.start >= p.end || p.end > self.cell_count())
            {
                return fail("v5 ownership encoding");
            }
            let mut expected: BTreeMap<u32, usize> = BTreeMap::new();
            for sy in 0..o.source_height {
                let y0 = (sy * self.height).div_ceil(o.source_height);
                let y1 = ((sy + 1) * self.height).div_ceil(o.source_height);
                for sx in 0..o.source_width {
                    let owner = o.base[sy * o.source_width + sx];
                    if owner != 0 {
                        let x0 = (sx * self.width).div_ceil(o.source_width);
                        let x1 = ((sx + 1) * self.width).div_ceil(o.source_width);
                        *expected.entry(owner).or_insert(0) += (x1 - x0) * (y1 - y0);
                    }
                }
            }
            for change in &o.overrides {
                let mut cell = change.start;
                while cell < change.end {
                    let x = cell % self.width;
                    let y = cell / self.width;
                    let sx = x * o.source_width / self.width;
                    let sy = y * o.source_height / self.height;
                    let x_end = ((sx + 1) * self.width)
                        .div_ceil(o.source_width)
                        .min(self.width);
                    let length = (x_end - x).min(change.end - cell);
                    let base = o.base[sy * o.source_width + sx];
                    if base != 0 {
                        let count = expected.get_mut(&base).ok_or("ownership count")?;
                        *count = count.checked_sub(length).ok_or("ownership count")?;
                    }
                    cell += length;
                }
                if change.owner != 0 {
                    *expected.entry(change.owner).or_insert(0) += change.end - change.start;
                }
            }
            expected.retain(|_, n| *n != 0);
            if o.counts
                != expected
                    .into_iter()
                    .map(|(owner, cells)| OwnerCount { owner, cells })
                    .collect::<Vec<_>>()
            {
                return fail("v5 ownership counts");
            }
        }
        self.time.check()?;
        if self.time < Rat::integer(0) || self.time > Rat::integer(1_000_000_000) {
            return fail("world time");
        }
        if self.cannons.len()
            > if self.version == 6 {
                crate::playability::MAX_CANNONS
            } else {
                32
            }
            || self.balls.len()
                > if self.version == 6 {
                    crate::playability::MAX_BALLS
                } else {
                    64
                }
        {
            return fail("entity capacity");
        }
        let mut ids = BTreeSet::new();
        let mut accounts = BTreeSet::new();
        let mut anchors = BTreeSet::new();
        let mut last = 0;
        for c in &self.cannons {
            if (self.version == 3 && c.heading.is_some())
                || c.id <= last
                || c.id
                    > if self.version == 6 {
                        u32::MAX - 1
                    } else {
                        65535
                    }
                || c.cell >= self.cell_count()
                || !account_ok(&c.account)
                || (self.version < 6 && !accounts.insert(c.account.clone()))
                || !anchors.insert(c.cell)
            {
                return fail("cannon identity");
            }
            ids.insert(if self.version == 6 {
                self.owner(c.cell).ok_or("unknown cannon territory")?
            } else {
                c.id
            });
            last = c.id;
            // v5 states are authenticated successors of a fully checked migration.
            // Connectivity is maintained by the resumable topology operation; a
            // million-cell rescan here would put it back on every ordinary tick.
            if self.version < 5 && !self.connected(c.id, c.cell) {
                return fail("disconnected territory");
            }
        }
        if self
            .ownership_counts()
            .iter()
            .any(|(owner, _)| !ids.contains(owner))
            || self.ownership.as_ref().is_some_and(|o| {
                o.base
                    .iter()
                    .chain(o.overrides.iter().map(|p| &p.owner))
                    .any(|owner| *owner != 0 && !ids.contains(owner))
            })
        {
            return fail("unknown cell owner");
        }
        last = 0;
        for b in &self.balls {
            let player = if self.version == 6 {
                self.playability
                    .as_ref()
                    .and_then(|s| s.player(b.owner))
                    .map(|p| p.id)
            } else {
                Some(b.owner)
            };
            if b.id <= last
                || b.id == u32::MAX
                || b.cell >= self.cell_count()
                || (self.version < 6 && !ids.contains(&b.owner))
                || player.is_none()
                || self.player_at(b.cell) != player
                || !(-65536..=65536).contains(&b.vx)
                || !(-65536..=65536).contains(&b.vy)
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
            if self.version < 6 && (count == 0 || count > 32) {
                return fail("cannon ball invariant");
            }
        }
        if self.next_ball_id <= last
            || self.next_cannon_id <= self.cannons.iter().map(|c| c.id).max().unwrap_or(0)
            || (self.version < 6 && self.next_cannon_id > 65536)
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
                || p.from >= self.cell_count()
                || p.to >= self.cell_count()
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
        if let Some(state) = &self.playability {
            state.validate(self)?;
        }
        Ok(())
    }
    pub fn valid_strike(&self, p: &Strike) -> bool {
        self.balls
            .iter()
            .any(|b| b.id == p.ball && b.owner == p.owner)
            && self.player_at(p.from) == Some(p.owner)
            && self.player_at(p.to) == Some(p.defender)
            && !self.cannons.iter().any(|c| c.cell == p.to)
    }
    pub fn accrue(&mut self, dt: &Rat, areas: &[(u32, usize)]) -> Result<()> {
        if dt.0.is_negative() {
            return Err("negative score interval".into());
        }
        // Propose all credit changes first: an arithmetic error never partially credits the world.
        let mut credits = self.credits.clone();
        for (id, area) in areas {
            let account = self.account_for_player(*id).ok_or("area owner missing")?;
            // v5 retains the historic score scale: a full arena is worth 1024
            // area-time units per tick even though it now has 1,000,000 cells.
            let delta = if self.version >= 5 {
                Rat::new(
                    dt.0.numer() * BigInt::from(*area) * BigInt::from(1024),
                    dt.0.denom() * BigInt::from(1_000_000),
                )?
            } else {
                dt.mul_i(*area as i64)?
            };
            if let Some(c) = credits.iter_mut().find(|c| c.account == account) {
                c.units = c.units.add(&delta)?;
            } else {
                credits.push(Credit {
                    account: account.to_owned(),
                    units: delta,
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
