//! Rules-7 exact toroidal maximin entry; no flat board scan or ambient randomness.
use crate::{spawn::Placement, territory_topology_v6::Flood, world::World};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
fn distance(a: usize, b: usize, size: usize) -> usize {
    let d = a.abs_diff(b);
    d.min(size - d)
}
fn axis_max(a: usize, b: usize, c: usize, size: usize) -> usize {
    let opposite = (c + size / 2) % size;
    distance(a, c, size)
        .max(distance(b, c, size))
        .max(if a <= opposite && opposite <= b {
            size / 2
        } else {
            0
        })
}
fn minimum(w: &World, r: &[usize; 4]) -> usize {
    r[2] * w.width + r[0]
}
pub fn distance_squared(w: &World, cell: usize) -> usize {
    w.cannons
        .iter()
        .map(|c| {
            distance(cell % w.width, c.cell % w.width, w.width).pow(2)
                + distance(cell / w.width, c.cell / w.width, w.height).pow(2)
        })
        .min()
        .unwrap_or(500001)
}
pub fn rectangle_bound(w: &World, r: &[usize; 4]) -> usize {
    w.cannons
        .iter()
        .map(|c| {
            axis_max(r[0], r[1], c.cell % w.width, w.width).pow(2)
                + axis_max(r[2], r[3], c.cell / w.width, w.height).pow(2)
        })
        .min()
        .unwrap_or(500001)
}
fn has(rs: &[[usize; 2]], cell: usize) -> bool {
    let i = rs.partition_point(|r| r[0] <= cell);
    i > 0 && cell < rs[i - 1][1]
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Choice {
    pub cell: usize,
    pub distance: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Search {
    pub stack: Vec<[usize; 4]>,
    pub best: Option<Choice>,
    candidate: Option<Choice>,
    proposal: Option<World>,
    owners: Vec<u32>,
    seeds: Vec<usize>,
    owner_index: usize,
    flood: Option<Flood>,
    pub visited: usize,
    blocked: Vec<usize>,
}
impl Search {
    pub fn begin(w: &World, blocked: Vec<usize>) -> Self {
        Self {
            stack: vec![[0, w.width - 1, 0, w.height - 1]],
            best: None,
            candidate: None,
            proposal: None,
            owners: vec![],
            seeds: vec![],
            owner_index: 0,
            flood: None,
            visited: 0,
            blocked,
        }
    }
    fn clear(&mut self) {
        self.candidate = None;
        self.proposal = None;
        self.owners.clear();
        self.seeds.clear();
        self.owner_index = 0;
        self.flood = None;
    }
    pub fn placement(&self, w: &World) -> Result<Option<Placement>> {
        self.best
            .as_ref()
            .map(|c| {
                Ok(Placement {
                    cell: c.cell,
                    patch: w.patch(c.cell).ok_or("ENTRY_PATCH")?,
                    kind: 5,
                    other: -1,
                    checked: self.visited,
                })
            })
            .transpose()
    }
    pub fn step(&mut self, w: &World) -> Result<bool> {
        if let Some(candidate) = &self.candidate {
            if self.owner_index == self.owners.len() {
                self.best = self.candidate.clone();
                self.clear();
                return Ok(false);
            }
            let label = self.owners[self.owner_index];
            if self.flood.is_none() {
                let patch = w.patch(candidate.cell).ok_or("ENTRY_PATCH")?;
                let proposal = self.proposal.as_ref().ok_or("ENTRY_PROPOSAL")?;
                self.seeds = patch
                    .iter()
                    .flat_map(|c| w.neighbors(*c))
                    .filter(|c| !patch.contains(c) && proposal.owner(*c) == Some(label))
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect();
                if self.seeds.is_empty() {
                    self.clear();
                    return Ok(false);
                }
                self.flood = Some(Flood::new(label, self.seeds[0]));
            }
            let flood = self.flood.as_mut().unwrap();
            let done = flood.step(self.proposal.as_ref().ok_or("ENTRY_PROPOSAL")?)?;
            if self.seeds.iter().all(|c| has(&flood.ranges, *c)) {
                self.owner_index += 1;
                self.flood = None;
                self.seeds.clear();
            } else if done {
                self.clear();
            }
            return Ok(false);
        }
        let Some(r) = self.stack.pop() else {
            return Ok(true);
        };
        let upper = rectangle_bound(w, &r);
        if self
            .best
            .as_ref()
            .is_some_and(|b| upper < b.distance || upper == b.distance && minimum(w, &r) >= b.cell)
        {
            return Ok(false);
        }
        if r[0] == r[1] && r[2] == r[3] {
            let cell = minimum(w, &r);
            let patch = w.patch(cell).ok_or("ENTRY_PATCH")?;
            self.visited += 1;
            if patch.iter().any(|c| self.blocked.binary_search(c).is_ok()) {
                return Ok(false);
            }
            let candidate = Choice {
                cell,
                distance: distance_squared(w, cell),
            };
            self.owners = patch
                .iter()
                .filter_map(|c| w.owner(*c))
                .filter(|id| *id != 0)
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect();
            if self.owners.is_empty() {
                self.best = Some(candidate);
                return Ok(false);
            }
            self.candidate = Some(candidate);
            let mut proposal = w.clone();
            for c in patch {
                proposal.set_owner(c, 0)?;
            }
            self.proposal = Some(proposal);
            return Ok(false);
        }
        let mut children = if r[1] - r[0] >= r[3] - r[2] {
            let m = (r[0] + r[1]) / 2;
            vec![[r[0], m, r[2], r[3]], [m + 1, r[1], r[2], r[3]]]
        } else {
            let m = (r[2] + r[3]) / 2;
            vec![[r[0], r[1], r[2], m], [r[0], r[1], m + 1, r[3]]]
        };
        children.sort_by(|a, b| {
            rectangle_bound(w, a)
                .cmp(&rectangle_bound(w, b))
                .then(minimum(w, b).cmp(&minimum(w, a)))
        });
        self.stack.extend(children);
        if self.stack.len() > 32 {
            return Err("ENTRY_SEARCH_STACK".into());
        }
        Ok(false)
    }
}
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-entry.bin")
}
pub fn identity() -> Result<serde_json::Value> {
    let mut v = crate::playability::identity()?;
    v["rules_hash"] = serde_json::json!(dtr_wire::hash(b"B2Z_ENTRY_RULES_07"));
    v["config_hash"] = serde_json::json!(dtr_wire::hash(configuration()));
    Ok(v)
}
