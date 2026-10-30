//! Atomic v6 capture proposals. No opposing ball is removed by a topology side
//! effect: one live attacker pairs with one live defender and cancels the entire
//! proposed transfer. The trusted enclosing cursor owns continuation integrity.
use crate::{
    playability::{revive_territory, Fence},
    territory_topology_v6::{row_runs, SplitJob},
    territory_v6,
    world::{position, World},
};
use dtr_wire::{Rat, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pair {
    pub balls: [u32; 2],
    pub positions: [[Rat; 2]; 2],
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Job {
    pub phase: String,
    proposal: World,
    split: Option<SplitJob>,
    ball: Option<u32>,
    target: Option<usize>,
    attacker: u32,
    root: u32,
    affected: Vec<u32>,
    at: usize,
    ranges: Vec<[usize; 2]>,
    row: usize,
    merge_ids: BTreeSet<u32>,
    pub pairs: Vec<Pair>,
    pub fences: Vec<Fence>,
    pub reactivated: Vec<u32>,
    pub operations: Vec<Value>,
    pub cancelled_strikes: Vec<u32>,
}
impl Job {
    fn base(w: &World) -> Result<Self> {
        if w.version != 6 {
            return Err("EXPECTED_V6".into());
        }
        Ok(Self {
            phase: "cleanup".into(),
            proposal: w.clone(),
            split: None,
            ball: None,
            target: None,
            attacker: 0,
            root: 0,
            affected: vec![],
            at: 0,
            ranges: vec![],
            row: 0,
            merge_ids: BTreeSet::new(),
            pairs: vec![],
            fences: vec![],
            reactivated: vec![],
            operations: vec![],
            cancelled_strikes: vec![],
        })
    }
    pub fn capture(w: &World, target: usize, ball: u32) -> Result<Self> {
        let b = w
            .balls
            .iter()
            .find(|b| b.id == ball)
            .ok_or("CAPTURE_BALL")?;
        let root = w.owner(b.cell).ok_or("CAPTURE_ORIGIN")?;
        if target >= w.cell_count()
            || w.player_at(target) == Some(b.owner)
            || w.cannons.iter().any(|c| c.cell == target)
            || !w
                .neighbors(target)
                .iter()
                .any(|c| w.owner(*c) == Some(root))
        {
            return Err("INVALID_CAPTURE".into());
        }
        let mut j = Self::base(w)?;
        j.ball = Some(ball);
        j.target = Some(target);
        j.attacker = b.owner;
        j.root = root;
        if let Some(defender) = w
            .balls
            .iter()
            .filter(|d| d.cell == target && d.owner != b.owner)
            .min_by_key(|d| d.id)
        {
            j.pair(w, &[[ball, defender.id]])?;
            return Ok(j);
        }
        let defender = w.owner(target).ok_or("CAPTURE_TARGET")?;
        j.proposal.set_owner(target, root)?;
        j.operations.push(
            json!({"kind":"set_range","start":target,"end":target+1,"from":defender,"to":root}),
        );
        j.ranges.push([target, target + 1]);
        j.merge_ids.insert(root);
        j.phase = if defender == 0 { "merge_scan" } else { "split" }.into();
        if defender != 0 {
            j.split = Some(SplitJob::for_capture(&j.proposal, defender, target, root)?);
        }
        Ok(j)
    }
    pub fn cleanup(w: &World, pairs: &[[u32; 2]]) -> Result<Self> {
        let mut j = Self::base(w)?;
        j.pair(w, pairs)?;
        Ok(j)
    }
    fn pair(&mut self, w: &World, pairs: &[[u32; 2]]) -> Result<()> {
        let mut killed = BTreeSet::new();
        let mut affected = BTreeSet::new();
        self.proposal = w.clone();
        self.operations.clear();
        self.fences.clear();
        self.reactivated.clear();
        self.pairs.clear();
        for ids in pairs {
            let a = w.balls.iter().find(|b| b.id == ids[0]).ok_or("PAIR_BALL")?;
            let b = w.balls.iter().find(|b| b.id == ids[1]).ok_or("PAIR_BALL")?;
            if a.owner == b.owner || !killed.insert(a.id) || !killed.insert(b.id) {
                return Err("INVALID_DESTRUCTION_PAIR".into());
            }
            affected.insert(w.owner(a.cell).ok_or("PAIR_CELL")?);
            affected.insert(w.owner(b.cell).ok_or("PAIR_CELL")?);
            self.pairs.push(Pair {
                balls: *ids,
                positions: [position(a, &w.time)?, position(b, &w.time)?],
            });
        }
        self.proposal.balls.retain(|b| !killed.contains(&b.id));
        self.proposal.pending.retain(|p| !killed.contains(&p.ball));
        self.cancelled_strikes = w
            .pending
            .iter()
            .filter(|p| killed.contains(&p.ball))
            .map(|p| p.id)
            .collect();
        self.affected = affected.into_iter().collect();
        self.at = 0;
        self.phase = "cleanup".into();
        self.split = None;
        Ok(())
    }
    fn record_pruned(&mut self, id: u32, cells: &[usize]) -> Result<()> {
        self.operations.push(json!({"kind":"clear","owner":id}));
        for c in cells {
            self.operations.push(json!({"kind":"set","cell":c,"owner":self.proposal.owner(*c).ok_or("MARKER_CELL")?}));
        }
        Ok(())
    }
    pub fn step(&mut self, original: &mut World) -> Result<bool> {
        if self.operations.len() > 65536 {
            return Err("CAPTURE_OPERATION_CAPACITY".into());
        }
        match self.phase.as_str() {
            "split" => {
                let j = self.split.as_mut().ok_or("CAPTURE_SPLIT")?;
                // Record the exact compact mutations in their execution order.
                // Private SplitJob indices stay private; the public part labels
                // and phase identify the next mutation without a board scan.
                let done = j.step(&mut self.proposal)?;
                self.operations.extend(j.take_operations());
                if done {
                    if j.phase == "needs_pair" {
                        let defender = *j.unanchored_balls.first().ok_or("MISSING_CAPTURE_PAIR")?;
                        self.pair(original, &[[self.ball.ok_or("CAPTURE_BALL")?, defender]])?;
                    } else {
                        self.fences.extend(j.fences.clone());
                        for p in &j.parts {
                            if p.cannons.is_empty() {
                                self.ranges.extend(p.ranges.clone());
                            }
                        }
                        self.split = None;
                        self.phase = "merge_scan".into();
                    }
                }
            }
            "cleanup" => {
                if self.at == self.affected.len() {
                    self.phase = "commit".into();
                } else {
                    let id = self.affected[self.at];
                    self.at += 1;
                    if territory_v6::player(&self.proposal, id).is_some()
                        && territory_v6::balls(&self.proposal, id) == 0
                    {
                        let cells: Vec<_> = self
                            .proposal
                            .cannons
                            .iter()
                            .filter(|c| self.proposal.owner(c.cell) == Some(id))
                            .map(|c| c.cell)
                            .collect();
                        self.fences
                            .extend(territory_v6::prune_empty(&mut self.proposal, id)?);
                        self.record_pruned(id, &cells)?;
                    }
                }
            }
            "merge_scan" => {
                if self.at == self.ranges.len() {
                    self.root = *self.merge_ids.first().ok_or("CAPTURE_ROOT")?;
                    self.phase = "merge".into();
                } else {
                    let [a, b] = self.ranges[self.at];
                    let start = a.max(self.row);
                    let y = start / self.proposal.width;
                    let end = b.min((y + 1) * self.proposal.width);
                    let x0 = start % self.proposal.width;
                    let x1 = end - y * self.proposal.width;
                    for cell in [
                        y * self.proposal.width
                            + (x0 + self.proposal.width - 1) % self.proposal.width,
                        y * self.proposal.width + x1 % self.proposal.width,
                    ] {
                        let id = self.proposal.owner(cell).ok_or("CAPTURE_EDGE")?;
                        if territory_v6::player(&self.proposal, id) == Some(self.attacker) {
                            self.merge_ids.insert(id);
                        }
                    }
                    for ny in [
                        (y + self.proposal.height - 1) % self.proposal.height,
                        (y + 1) % self.proposal.height,
                    ] {
                        for (c, d, id) in row_runs(&self.proposal, ny)? {
                            if c % self.proposal.width < x1
                                && x0 < d - ny * self.proposal.width
                                && territory_v6::player(&self.proposal, id) == Some(self.attacker)
                            {
                                self.merge_ids.insert(id);
                            }
                        }
                    }
                    if end == b {
                        self.at += 1;
                        self.row = 0;
                    } else {
                        self.row = end;
                    }
                }
            }
            "merge" => {
                if let Some(id) = self.merge_ids.iter().copied().find(|id| *id != self.root) {
                    territory_v6::merge(&mut self.proposal, &[self.root, id])?;
                    self.operations
                        .push(json!({"kind":"relabel","from":id,"to":self.root}));
                    self.merge_ids.remove(&id);
                } else {
                    self.reactivated = revive_territory(&mut self.proposal, self.root)?;
                    self.phase = "commit".into();
                }
            }
            "commit" => {
                let pending = std::mem::take(&mut self.proposal.pending);
                for p in pending {
                    if self.proposal.valid_strike(&p) {
                        self.proposal.pending.push(p);
                    } else {
                        self.cancelled_strikes.push(p.id);
                    }
                }
                self.proposal.validate()?;
                std::mem::swap(original, &mut self.proposal);
                self.phase = "done".into();
            }
            "done" => return Ok(true),
            _ => return Err("CAPTURE_PHASE".into()),
        }
        if self.operations.len() > 65536 {
            return Err("CAPTURE_OPERATION_CAPACITY".into());
        }
        Ok(self.phase == "done")
    }
    pub fn event(&self) -> Result<Value> {
        if self.phase != "done" {
            return Err("INCOMPLETE_CAPTURE".into());
        }
        Ok(
            json!({"kind":if self.target.is_none() { "annihilation_cleanup" } else if self.pairs.is_empty() { "capture" } else { "capture_annihilation" },
            "target":self.target,"ball":self.ball,"attacker":self.attacker,
            "cancelled_capture": self.target.is_some() && !self.pairs.is_empty(),
            "pairs":self.pairs,"ownership_ops":self.operations,"dormant":self.fences,
            "reactivated_cannons":self.reactivated,"cancelled_strikes":self.cancelled_strikes}),
        )
    }
}
