use crate::world::{Ball, World};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CellRange {
    pub start: usize,
    pub end: usize,
}
fn contains(ranges: &[CellRange], cell: usize) -> bool {
    ranges
        .binary_search_by(|r| {
            if cell < r.start {
                std::cmp::Ordering::Greater
            } else if cell >= r.end {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Equal
            }
        })
        .is_ok()
}
fn insert(ranges: &mut Vec<CellRange>, cell: usize) {
    let at = ranges.partition_point(|range| range.end <= cell);
    if at < ranges.len() && ranges[at].start <= cell && cell < ranges[at].end {
        return;
    }
    let left = at > 0 && ranges[at - 1].end == cell;
    let right = at < ranges.len() && ranges[at].start == cell + 1;
    match (left, right) {
        (true, true) => {
            let end = ranges[at].end;
            ranges[at - 1].end = end;
            ranges.remove(at);
        }
        (true, false) => ranges[at - 1].end += 1,
        (false, true) => ranges[at].start = cell,
        (false, false) => ranges.insert(
            at,
            CellRange {
                start: cell,
                end: cell + 1,
            },
        ),
    }
}
fn insert_range(ranges: &mut Vec<CellRange>, mut change: CellRange) {
    let at = ranges.partition_point(|range| range.end < change.start);
    while at < ranges.len() && ranges[at].start <= change.end {
        change.start = change.start.min(ranges[at].start);
        change.end = change.end.max(ranges[at].end);
        ranges.remove(at);
    }
    ranges.insert(at, change);
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopologyJob {
    pub phase: String,
    pub defender: u32,
    pub attacker: u32,
    pub target: Option<usize>,
    pub queue: Vec<usize>,
    pub head: usize,
    pub seen: Vec<bool>,
    pub scan: usize,
    pub cells: Vec<usize>,
    pub killed: Vec<u32>,
    pub survivors: Vec<Ball>,
    pub eliminated: Vec<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub seeds: Vec<usize>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub visited_ranges: Vec<CellRange>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub pending_ranges: Vec<CellRange>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub component_ranges: Vec<CellRange>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub changed_ranges: Vec<CellRange>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defender_anchor: Option<usize>,
}
pub fn capture(
    w: &mut World,
    target: usize,
    attacker: u32,
    optimized: bool,
) -> Result<TopologyJob> {
    if target >= w.cell_count()
        || !w.cannons.iter().any(|c| c.id == attacker)
        || w.owner(target) == Some(attacker)
        || w.cannons.iter().any(|c| c.cell == target)
        || !w
            .neighbors(target)
            .iter()
            .any(|n| w.owner(*n) == Some(attacker))
    {
        return Err("invalid capture".into());
    }
    let defender = w.owner(target).ok_or("capture target")?;
    let defender_neighbors: Vec<_> = w
        .neighbors(target)
        .into_iter()
        .filter(|n| w.owner(*n) == Some(defender))
        .collect();
    let must_search = defender != 0 && (!optimized || defender_neighbors.len() > 1);
    let v5 = w.version == 5;
    let mut j = TopologyJob {
        phase: if must_search {
            if v5 {
                "v5_component"
            } else {
                "flood"
            }
        } else {
            "balls"
        }
        .into(),
        defender,
        attacker,
        target: Some(target),
        queue: vec![],
        head: 0,
        seen: if v5 {
            vec![]
        } else {
            vec![false; w.cell_count()]
        },
        scan: 0,
        cells: vec![target],
        killed: vec![],
        survivors: vec![],
        eliminated: vec![],
        seeds: if v5 { defender_neighbors } else { vec![] },
        visited_ranges: vec![],
        pending_ranges: vec![],
        component_ranges: vec![],
        changed_ranges: if v5 {
            vec![CellRange {
                start: target,
                end: target + 1,
            }]
        } else {
            vec![]
        },
        defender_anchor: None,
    };
    let anchor = if must_search {
        Some(
            w.cannons
                .iter()
                .find(|c| c.id == defender)
                .ok_or("missing defender anchor")?
                .cell,
        )
    } else {
        None
    };
    w.set_owner(target, attacker)?;
    if let Some(anchor) = anchor {
        if v5 {
            j.defender_anchor = Some(anchor);
        } else {
            j.queue.push(anchor);
            j.seen[anchor] = true;
        }
    }
    Ok(j)
}
pub fn cleanup(w: &mut World, killed: Vec<u32>) -> TopologyJob {
    w.balls.retain(|b| !killed.contains(&b.id));
    w.pending.retain(|p| !killed.contains(&p.ball));
    let eliminated = w
        .cannons
        .iter()
        .filter(|c| !w.balls.iter().any(|b| b.owner == c.id))
        .map(|c| c.id)
        .collect();
    TopologyJob {
        phase: "neutral".into(),
        scan: 0,
        eliminated,
        killed,
        cells: vec![],
        defender: 0,
        attacker: 0,
        target: None,
        queue: vec![],
        head: 0,
        seen: vec![],
        survivors: vec![],
        seeds: vec![],
        visited_ranges: vec![],
        pending_ranges: vec![],
        component_ranges: vec![],
        changed_ranges: vec![],
        defender_anchor: None,
    }
}
pub fn step(w: &mut World, j: &mut TopologyJob) -> Result<bool> {
    match j.phase.as_str() {
        "done" => return Ok(true),
        "v5_component" => {
            let seed = j
                .seeds
                .iter()
                .copied()
                .find(|cell| !contains(&j.visited_ranges, *cell));
            if let Some(seed) = seed {
                j.component_ranges.clear();
                insert(&mut j.visited_ranges, seed);
                insert(&mut j.component_ranges, seed);
                j.queue.clear();
                j.queue.push(seed);
                j.head = 0;
                j.phase = "v5_flood".into();
            } else {
                j.phase = "balls".into();
                j.scan = 0;
            }
        }
        "v5_flood" => {
            if j.head < j.queue.len() {
                let cell = j.queue[j.head];
                j.head += 1;
                for neighbor in w.neighbors(cell) {
                    if w.owner(neighbor) == Some(j.defender)
                        && !contains(&j.visited_ranges, neighbor)
                    {
                        insert(&mut j.visited_ranges, neighbor);
                        insert(&mut j.component_ranges, neighbor);
                        j.queue.push(neighbor);
                    }
                }
                if j.seeds
                    .iter()
                    .all(|seed| contains(&j.component_ranges, *seed))
                {
                    j.queue.clear();
                    j.head = 0;
                    j.component_ranges.clear();
                    j.phase = "balls".into();
                    j.scan = 0;
                } else if j.head >= 4096 {
                    j.queue.drain(..j.head);
                    j.head = 0;
                }
            } else if j
                .defender_anchor
                .is_some_and(|anchor| contains(&j.component_ranges, anchor))
            {
                j.component_ranges.clear();
                j.phase = "v5_component".into();
            } else {
                j.phase = "v5_transfer".into();
            }
        }
        "v5_transfer" => {
            if !j.component_ranges.is_empty() {
                let range = j.component_ranges.remove(0);
                w.set_owner_range(range.start, range.end, j.defender, j.attacker)?;
                insert_range(&mut j.changed_ranges, range);
            } else {
                j.phase = "v5_component".into();
            }
        }
        "flood" => {
            if j.head < j.queue.len() {
                let c = j.queue[j.head];
                j.head += 1;
                for n in w.neighbors(c) {
                    if w.owner(n) == Some(j.defender) && !j.seen[n] {
                        j.seen[n] = true;
                        j.queue.push(n);
                    }
                }
            } else {
                j.phase = "transfer".into();
                j.scan = 0;
            }
        }
        "transfer" => {
            if j.scan < w.cell_count() {
                let c = j.scan;
                j.scan += 1;
                if w.owner(c) == Some(j.defender) && !j.seen[c] {
                    w.set_owner(c, j.attacker)?;
                    j.cells.push(c);
                }
            } else {
                j.phase = "balls".into();
                j.scan = 0;
            }
        }
        "balls" => {
            if j.scan < w.balls.len() {
                let b = &w.balls[j.scan];
                j.scan += 1;
                if w.owner(b.cell) != Some(b.owner) {
                    j.killed.push(b.id);
                } else {
                    j.survivors.push(b.clone());
                }
            } else {
                w.balls = j.survivors.clone();
                w.pending.retain(|p| w.balls.iter().any(|b| b.id == p.ball));
                j.eliminated = w
                    .cannons
                    .iter()
                    .filter(|c| !w.balls.iter().any(|b| b.owner == c.id))
                    .map(|c| c.id)
                    .collect();
                j.phase = "neutral".into();
                j.scan = 0;
            }
        }
        "neutral" => {
            if w.version == 5 {
                if j.scan < j.eliminated.len() {
                    w.clear_owner(j.eliminated[j.scan])?;
                    j.scan += 1;
                } else {
                    w.cannons.retain(|c| !j.eliminated.contains(&c.id));
                    j.phase = "done".into();
                }
                return Ok(j.phase == "done");
            }
            if j.scan < w.cell_count() {
                let c = j.scan;
                j.scan += 1;
                if w.owner(c)
                    .is_some_and(|owner| j.eliminated.contains(&owner))
                {
                    w.set_owner(c, 0)?;
                }
            } else {
                w.cannons.retain(|c| !j.eliminated.contains(&c.id));
                j.phase = "done".into();
            }
        }
        _ => return Err("topology phase".into()),
    }
    Ok(j.phase == "done")
}
