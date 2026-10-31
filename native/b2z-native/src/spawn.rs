use crate::world::{position, World, Q};
use dtr_wire::{encode, hash, Rat, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Candidate {
    pub kind: u32,
    pub cell: usize,
    pub other: i64,
    pub rank: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Placement {
    pub cell: usize,
    pub patch: Vec<usize>,
    pub kind: u32,
    pub other: i64,
    pub checked: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SpawnJob {
    pub version: u32,
    pub seed: String,
    pub phase: String,
    pub scan: usize,
    pub candidates: Vec<Candidate>,
    pub candidate: usize,
    pub current: Option<Candidate>,
    pub patch: Vec<usize>,
    pub owners: Vec<u32>,
    #[serde(rename = "ownerIndex")]
    pub owner_index: usize,
    pub queue: Vec<usize>,
    pub head: usize,
    pub seen: Vec<bool>,
    pub checked: usize,
    pub rejection_counts: BTreeMap<String, usize>,
    pub result: Option<Placement>,
}
pub fn patch(cell: usize, width: usize, height: usize) -> Option<Vec<usize>> {
    let x = cell % width;
    let y = cell / width;
    if x < 1 || y < 1 || x + 1 >= width || y + 1 >= height {
        return None;
    }
    let mut cells = Vec::new();
    for dy in -1i64..=1 {
        for dx in -1i64..=1 {
            cells.push((cell as i64 + dy * width as i64 + dx) as usize);
        }
    }
    Some(cells)
}
pub fn rank(seed: &str, kind: u32, cell: usize, other: i64) -> Result<String> {
    if !crate::world::account_ok(seed) {
        return Err("spawn seed".into());
    }
    Ok(hash(&encode(
        &json!({"domain":"BTZ-SPAWN-RANK-03","seed":seed,"kind":kind,"cell":cell,"other":other}),
    )?))
}
impl SpawnJob {
    pub fn begin(seed: String) -> Self {
        Self {
            version: 3,
            seed,
            phase: "enumerate".into(),
            scan: 0,
            candidates: vec![],
            candidate: 0,
            current: None,
            patch: vec![],
            owners: vec![],
            owner_index: 0,
            queue: vec![],
            head: 0,
            seen: vec![],
            checked: 0,
            rejection_counts: BTreeMap::new(),
            result: None,
        }
    }
    fn reject(&mut self, reason: &str) {
        *self.rejection_counts.entry(reason.into()).or_insert(0) += 1;
        self.phase = "candidate".into();
        self.current = None;
    }
    pub fn step(&mut self, w: &World) -> Result<bool> {
        match self.phase.as_str() {
            "done" => return Ok(true),
            "enumerate" => {
                let limit = if w.version >= 5 { 1024 } else { w.cell_count() };
                if self.scan < limit {
                    let probe = self.scan;
                    self.scan += 1;
                    let cell = if w.version >= 5 {
                        let digest = rank(&self.seed, 4, probe, -2)?;
                        let ranked =
                            u64::from_str_radix(&digest[..15], 16).map_err(|_| "spawn probe")?;
                        // Preserve the actual Wasm32 probe for v6 on native
                        // hosts too, without changing historical v5 behavior.
                        let ranked = if w.version == 6 {
                            u64::from(ranked as u32)
                        } else {
                            ranked
                        };
                        ranked as usize % w.cell_count()
                    } else {
                        probe
                    };
                    let Some(p) = w.patch(cell) else {
                        return Ok(false);
                    };
                    if w.version >= 5 {
                        if p.iter().all(|c| w.owner(*c) == Some(0)) {
                            self.candidates.push(Candidate {
                                kind: 2,
                                cell,
                                other: -1,
                                rank: rank(&self.seed, 2, cell, -1)?,
                            });
                        }
                        return Ok(false);
                    }
                    for other in w.neighbors(cell) {
                        let a = w.owner(cell).ok_or("spawn cell")?;
                        let b = w.owner(other).ok_or("spawn neighbor")?;
                        if a != b {
                            let kind = if a != 0 && b != 0 { 0 } else { 1 };
                            self.candidates.push(Candidate {
                                kind,
                                cell,
                                other: other as i64,
                                rank: rank(&self.seed, kind, cell, other as i64)?,
                            });
                        }
                    }
                    let kind = if p.iter().all(|c| w.owner(*c) == Some(0)) {
                        2
                    } else {
                        3
                    };
                    self.candidates.push(Candidate {
                        kind,
                        cell,
                        other: -1,
                        rank: rank(&self.seed, kind, cell, -1)?,
                    });
                } else {
                    self.candidates.sort_by(|a, b| {
                        a.kind
                            .cmp(&b.kind)
                            .then(a.rank.cmp(&b.rank))
                            .then(a.cell.cmp(&b.cell))
                            .then(a.other.cmp(&b.other))
                    });
                    self.phase = "candidate".into();
                }
            }
            "candidate" => {
                if self.candidate >= self.candidates.len() {
                    self.phase = "done".into();
                    return Ok(true);
                }
                let c = self.candidates[self.candidate].clone();
                self.candidate += 1;
                self.checked += 1;
                self.patch = w.patch(c.cell).ok_or("candidate bounds")?;
                self.current = Some(c.clone());
                if w.cannons.iter().any(|c| self.patch.contains(&c.cell)) {
                    self.reject("ANCHOR");
                    return Ok(false);
                }
                let cx = (c.cell % w.width) as i64;
                let cy = (c.cell / w.width) as i64;
                for b in &w.balls {
                    let [x, y] = position(b, &w.time)?;
                    let inside = |v: &Rat, c: i64, size: usize| -> bool {
                        let offsets: Vec<i64> = if w.torus() {
                            vec![-(size as i64) * Q, 0, size as i64 * Q]
                        } else {
                            vec![0]
                        };
                        offsets.into_iter().any(|offset| {
                            *v >= Rat::integer((c - 1) * Q + offset)
                                && *v <= Rat::integer((c + 2) * Q + offset)
                        })
                    };
                    if inside(&x, cx, w.width) && inside(&y, cy, w.height) {
                        self.reject("BALL");
                        return Ok(false);
                    }
                }
                self.owners = self
                    .patch
                    .iter()
                    .map(|c| w.owner(*c).ok_or_else(|| "spawn patch".into()))
                    .collect::<Result<Vec<_>>>()?
                    .into_iter()
                    .filter(|o| *o != 0)
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect();
                self.owner_index = 0;
                self.phase = "owner".into();
            }
            "owner" => {
                if self.owner_index >= self.owners.len() {
                    let c = self.current.as_ref().ok_or("spawn current")?;
                    self.result = Some(Placement {
                        cell: c.cell,
                        patch: self.patch.clone(),
                        kind: c.kind,
                        other: c.other,
                        checked: self.checked,
                    });
                    self.phase = "done".into();
                    return Ok(true);
                }
                let anchor = w
                    .cannons
                    .iter()
                    .find(|c| c.id == self.owners[self.owner_index])
                    .ok_or("spawn anchor")?
                    .cell;
                self.queue = vec![anchor];
                self.head = 0;
                self.seen = vec![false; w.cell_count()];
                self.seen[anchor] = true;
                self.phase = "flood".into();
            }
            "flood" => {
                if self.head < self.queue.len() {
                    let c = self.queue[self.head];
                    self.head += 1;
                    let owner = self.owners[self.owner_index];
                    for n in w.neighbors(c) {
                        if w.owner(n) == Some(owner) && !self.seen[n] && !self.patch.contains(&n) {
                            self.seen[n] = true;
                            self.queue.push(n);
                        }
                    }
                } else {
                    self.scan = 0;
                    self.phase = "verify".into();
                }
            }
            "verify" => {
                if self.scan < w.cell_count() {
                    let c = self.scan;
                    self.scan += 1;
                    if w.owner(c) == Some(self.owners[self.owner_index])
                        && !self.patch.contains(&c)
                        && !self.seen[c]
                    {
                        self.reject("SPLIT");
                    }
                } else {
                    self.owner_index += 1;
                    self.phase = "owner".into();
                }
            }
            _ => return Err("spawn phase".into()),
        }
        Ok(self.phase == "done")
    }
}
