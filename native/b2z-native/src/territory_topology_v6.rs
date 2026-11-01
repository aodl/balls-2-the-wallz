//! Resumable island discovery after a cell is removed from a connected label.
//! Work expands compact row spans, not individual million-cell board entries.
use crate::{
    playability::{revive_territory, Fence},
    territory_v6,
    world::World,
};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;
const MAX_SCRATCH: usize = 65536;
fn has(rs: &[[usize; 2]], cell: usize) -> bool {
    let at = rs.partition_point(|r| r[0] <= cell);
    at > 0 && cell < rs[at - 1][1]
}
fn add(rs: &mut Vec<[usize; 2]>, mut r: [usize; 2]) {
    let at = rs.partition_point(|p| p[1] < r[0]);
    while at < rs.len() && rs[at][0] <= r[1] {
        let old = rs.remove(at);
        r = [r[0].min(old[0]), r[1].max(old[1])]
    }
    rs.insert(at, r);
}
/// Each row has at most width spans. No flat cell array is allocated.
pub fn row_runs(w: &World, y: usize) -> Result<Vec<(usize, usize, u32)>> {
    if y >= w.height || w.version != 6 {
        return Err("ISLAND_ROW".into());
    }
    let o = w.ownership.as_ref().ok_or("ownership")?;
    let start = y * w.width;
    let end = start + w.width;
    let mut at = start;
    let mut change = o.overrides.partition_point(|r| r.end <= start);
    let mut out: Vec<(usize, usize, u32)> = vec![];
    while at < end {
        while change < o.overrides.len() && o.overrides[change].end <= at {
            change += 1;
        }
        let (next, owner) = if let Some(r) = o.overrides.get(change).filter(|r| r.start <= at) {
            (r.end.min(end), r.owner)
        } else {
            let sx = (at % w.width) * 32 / w.width;
            let sy = y * 32 / w.height;
            let base_end = start + ((sx + 1) * w.width).div_ceil(32);
            (
                base_end
                    .min(end)
                    .min(o.overrides.get(change).map_or(end, |r| r.start)),
                o.base[sy * 32 + sx],
            )
        };
        if next <= at {
            return Err("ISLAND_ROW_PROGRESS".into());
        }
        if let Some(last) = out.last_mut().filter(|r| r.1 == at && r.2 == owner) {
            last.1 = next
        } else {
            out.push((at, next, owner))
        }
        at = next;
    }
    Ok(out)
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Flood {
    label: u32,
    queue: Vec<usize>,
    head: usize,
    pending: BTreeSet<usize>,
    pub ranges: Vec<[usize; 2]>,
}
impl Flood {
    pub fn new(label: u32, seed: usize) -> Self {
        Self {
            label,
            queue: vec![seed],
            head: 0,
            pending: BTreeSet::from([seed]),
            ranges: vec![],
        }
    }
    fn enqueue(&mut self, cell: usize) {
        if !has(&self.ranges, cell) && self.pending.insert(cell) {
            self.queue.push(cell)
        }
    }
    pub fn step(&mut self, w: &World) -> Result<bool> {
        if self.head == self.queue.len() {
            return Ok(true);
        }
        let cell = self.queue[self.head];
        self.head += 1;
        self.pending.remove(&cell);
        if has(&self.ranges, cell) {
            return Ok(false);
        }
        let y = cell / w.width;
        let rows = row_runs(w, y)?;
        let Some(&(a, b, _)) = rows
            .iter()
            .find(|(a, b, id)| *a <= cell && cell < *b && *id == self.label)
        else {
            return Err("ISLAND_FLOOD_CHANGED".into());
        };
        add(&mut self.ranges, [a, b]);
        let x0 = a % w.width;
        let x1 = b - y * w.width;
        for ny in [(y + w.height - 1) % w.height, (y + 1) % w.height] {
            for (c, d, id) in row_runs(w, ny)? {
                let c0 = c % w.width;
                let d1 = d - ny * w.width;
                if id == self.label && c0 < x1 && x0 < d1 {
                    self.enqueue(ny * w.width + c0.max(x0));
                }
            }
        }
        if x0 == 0 && w.owner(y * w.width + w.width - 1) == Some(self.label) {
            self.enqueue(y * w.width + w.width - 1)
        }
        if x1 == w.width && w.owner(y * w.width) == Some(self.label) {
            self.enqueue(y * w.width)
        }
        if self.head >= 1024 {
            self.queue.drain(..self.head);
            self.head = 0;
        }
        if self.ranges.len() > MAX_SCRATCH || self.queue.len() > MAX_SCRATCH {
            return Err("ISLAND_SCRATCH_CAPACITY".into());
        }
        Ok(false)
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Part {
    pub ranges: Vec<[usize; 2]>,
    pub cannons: Vec<u32>,
    pub balls: Vec<u32>,
    label: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SplitJob {
    label: u32,
    fill: u32,
    seeds: Vec<usize>,
    flood: Option<Flood>,
    pub parts: Vec<Part>,
    pub phase: String,
    part: usize,
    range: usize,
    pub fences: Vec<Fence>,
    pub unanchored_balls: Vec<u32>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    connected_shortcut: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    operations: Vec<Value>,
}
impl SplitJob {
    pub fn new(w: &World, label: u32, removed: usize, fill: u32) -> Result<Self> {
        if w.owner(removed) == Some(label)
            || territory_v6::player(w, label).is_none()
            || label == fill
            || (fill != 0 && territory_v6::player(w, fill).is_none())
        {
            return Err("ISLAND_SPLIT_CONTEXT".into());
        }
        let mut seeds: Vec<_> = w
            .neighbors(removed)
            .into_iter()
            .filter(|c| w.owner(*c) == Some(label))
            .collect();
        seeds.sort();
        seeds.dedup();
        Ok(Self {
            label,
            fill,
            seeds,
            flood: None,
            parts: vec![],
            phase: "discover".into(),
            part: 0,
            range: 0,
            fences: vec![],
            unanchored_balls: vec![],
            connected_shortcut: false,
            operations: vec![],
        })
    }
    /// For an actual capture, the predecessor label is connected and the
    /// captured cell has no cannon or ball. Reaching every adjacent seed proves
    /// no split without traversing the remainder of a large unchanged island.
    pub fn for_capture(w: &World, label: u32, removed: usize, fill: u32) -> Result<Self> {
        let mut j = Self::new(w, label, removed, fill)?;
        j.connected_shortcut = true;
        if j.seeds.len() <= 1 {
            j.phase = "done".into();
        }
        Ok(j)
    }
    pub fn take_operations(&mut self) -> Vec<Value> {
        std::mem::take(&mut self.operations)
    }
    /// Caller keeps the original capture state separately; this mutates only its
    /// private proposal. needs_pair forbids commit and reports the live occupants.
    pub fn step(&mut self, w: &mut World) -> Result<bool> {
        match self.phase.as_str() {
            "discover" => {
                if let Some(f) = self.flood.as_mut() {
                    let done = f.step(w)?;
                    if self.connected_shortcut && self.seeds.iter().all(|s| has(&f.ranges, *s)) {
                        self.phase = "done".into();
                    } else if done {
                        let f = self.flood.take().unwrap();
                        let cannons = w
                            .cannons
                            .iter()
                            .filter(|c| has(&f.ranges, c.cell))
                            .map(|c| c.id)
                            .collect();
                        let balls = w
                            .balls
                            .iter()
                            .filter(|b| has(&f.ranges, b.cell))
                            .map(|b| b.id)
                            .collect();
                        self.parts.push(Part {
                            ranges: f.ranges,
                            cannons,
                            balls,
                            label: 0,
                        });
                    }
                } else if let Some(seed) = self
                    .seeds
                    .iter()
                    .find(|s| !self.parts.iter().any(|p| has(&p.ranges, **s)))
                {
                    self.flood = Some(Flood::new(self.label, *seed));
                } else {
                    self.parts.sort_by_key(|p| {
                        (
                            p.cannons.first().copied().unwrap_or(u32::MAX),
                            p.ranges.first().map_or(usize::MAX, |r| r[0]),
                        )
                    });
                    self.unanchored_balls = self
                        .parts
                        .iter()
                        .filter(|p| p.cannons.is_empty())
                        .flat_map(|p| p.balls.iter().copied())
                        .collect();
                    self.unanchored_balls.sort();
                    self.phase = if self.unanchored_balls.is_empty() {
                        "assign"
                    } else {
                        "needs_pair"
                    }
                    .into();
                }
            }
            "assign" => {
                let player = territory_v6::player(w, self.label).ok_or("UNKNOWN_TERRITORY")?;
                let mut kept = false;
                let extra = self
                    .parts
                    .iter()
                    .filter(|p| !p.cannons.is_empty())
                    .count()
                    .saturating_sub(1) as u32;
                w.playability
                    .as_ref()
                    .unwrap()
                    .next_territory_id
                    .checked_add(extra)
                    .ok_or("TERRITORY_ID_EXHAUSTED")?;
                for p in &mut self.parts {
                    p.label = if p.cannons.is_empty() {
                        self.fill
                    } else if !kept {
                        kept = true;
                        self.label
                    } else {
                        territory_v6::allocate(w, player)?
                    };
                }
                if !kept {
                    return Err("ISLAND_WITHOUT_CANNON".into());
                }
                self.phase = "label".into();
            }
            "label" => {
                if self.part == self.parts.len() {
                    self.phase = "reconcile".into();
                    self.part = 0;
                } else {
                    let p = &self.parts[self.part];
                    if self.range == p.ranges.len() {
                        self.range = 0;
                        self.part += 1;
                    } else {
                        let [a, b] = p.ranges[self.range];
                        if p.label != self.label {
                            w.set_owner_range(a, b, self.label, p.label)?;
                            self.operations.push(json!({"kind":"set_range","start":a,"end":b,"from":self.label,"to":p.label}));
                        }
                        self.range += 1;
                    }
                }
            }
            "reconcile" => {
                if self.part == self.parts.len() {
                    w.validate()?;
                    self.phase = "done".into();
                } else {
                    let p = &self.parts[self.part];
                    if !p.cannons.is_empty() {
                        if p.balls.is_empty() {
                            let cells: Vec<_> = w
                                .cannons
                                .iter()
                                .filter(|c| w.owner(c.cell) == Some(p.label))
                                .map(|c| c.cell)
                                .collect();
                            self.fences.extend(territory_v6::prune_empty(w, p.label)?);
                            self.operations
                                .push(json!({"kind":"clear","owner":p.label}));
                            for c in cells {
                                self.operations.push(json!({"kind":"set","cell":c,"owner":w.owner(c).ok_or("MARKER_CELL")?}));
                            }
                        } else {
                            revive_territory(w, p.label)?;
                        }
                    }
                    self.part += 1;
                }
            }
            "done" | "needs_pair" => return Ok(true),
            _ => return Err("ISLAND_SPLIT_PHASE".into()),
        }
        Ok(matches!(self.phase.as_str(), "done" | "needs_pair"))
    }
}
