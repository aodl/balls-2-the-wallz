//! Portable masked-connectivity admission search. No hash implementation is invented here.
//! The host supplies SHA-256 for `enumerate`; it must be a fixed reviewed implementation.
//! This is NOT the full B2Z command/state/settlement kernel or a stable-memory adapter.
use crate::{neighbors, Error, Fraction, Motion, Q};
use dtr_core::{Progress, ResumableKernel};
use std::cmp::Ordering;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct View {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<u16>,
    pub anchors: Vec<(u16, usize)>,
    /// Exact ball-centre closure mask, NOT a mask of ball.cell alone.
    pub guarded_centres: Vec<bool>,
}
impl View {
    fn validate(&self) -> Result<(), Error> {
        let n = self.width.checked_mul(self.height).ok_or(Error::Overflow)?;
        if self.width == 0
            || self.height == 0
            || self.width > 32
            || self.height > 32
            || n != self.cells.len()
            || n != self.guarded_centres.len()
            || self.anchors.len() > 32
        {
            return Err(Error::Bounds);
        }
        let mut prior = 0;
        for &(owner, cell) in &self.anchors {
            if owner <= prior || cell >= n || self.cells[cell] != owner {
                return Err(Error::Bounds);
            }
            prior = owner;
        }
        if self
            .cells
            .iter()
            .any(|o| *o != 0 && !self.anchors.iter().any(|a| a.0 == *o))
        {
            return Err(Error::Bounds);
        }
        Ok(())
    }
}
/// Closed patch boundaries protect centres lying exactly on a grid edge.
pub fn guarded_centres(
    width: usize,
    height: usize,
    balls: &[Motion],
    now: Fraction,
) -> Result<Vec<bool>, Error> {
    if width == 0 || height == 0 || width > 32 || height > 32 || balls.len() > 64 {
        return Err(Error::Bounds);
    }
    let mut out = vec![false; width * height];
    for (cell, guard) in out.iter_mut().enumerate() {
        if patch(cell, width, height).is_none() {
            continue;
        }
        let x = (cell % width) as i128;
        let y = (cell / width) as i128;
        for b in balls {
            let (bx, by) = b.position(now)?;
            if bx.compare(Fraction::new((x - 1) * Q, 1)?)? != Ordering::Less
                && bx.compare(Fraction::new((x + 2) * Q, 1)?)? != Ordering::Greater
                && by.compare(Fraction::new((y - 1) * Q, 1)?)? != Ordering::Less
                && by.compare(Fraction::new((y + 2) * Q, 1)?)? != Ordering::Greater
            {
                *guard = true;
                break;
            }
        }
    }
    Ok(out)
}
pub fn patch(cell: usize, width: usize, height: usize) -> Option<Vec<usize>> {
    if width == 0 || height == 0 || width > 32 || height > 32 || cell >= width * height {
        return None;
    }
    let x = cell % width;
    let y = cell / width;
    if x == 0 || y == 0 || x + 1 >= width || y + 1 >= height {
        return None;
    }
    let mut out = Vec::with_capacity(9);
    for row in (y - 1)..=(y + 1) {
        for col in (x - 1)..=(x + 1) {
            out.push(row * width + col);
        }
    }
    Some(out)
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Candidate {
    pub kind: u8,
    pub cell: usize,
    pub other: Option<usize>,
    pub rank: [u8; 32],
}
/// Exact typed-JSON-compatible SHA-256 preimage, shared with Python and JavaScript fixtures.
pub fn rank_preimage(seed: &[u8; 32], kind: u8, cell: usize, other: Option<usize>) -> Vec<u8> {
    let hex: String = seed.iter().map(|b| format!("{b:02x}")).collect();
    let other = other.map_or_else(|| "-1".to_owned(), |n| n.to_string());
    format!("{{\"cell\":{cell},\"domain\":\"BTZ-SPAWN-RANK-03\",\"kind\":{kind},\"other\":{other},\"seed\":\"{hex}\"}}").into_bytes()
}
/// Bounded small-board preparation; not an instruction-metered execution slice.
pub fn enumerate(
    view: &View,
    seed: &[u8; 32],
    mut hash: impl FnMut(&[u8]) -> [u8; 32],
) -> Result<Vec<Candidate>, Error> {
    view.validate()?;
    let mut out = Vec::new();
    for cell in 0..view.cells.len() {
        let Some(p) = patch(cell, view.width, view.height) else {
            continue;
        };
        for other in neighbors(cell, view.width, view.height) {
            let a = view.cells[cell];
            let b = view.cells[other];
            if a == b {
                continue;
            }
            let kind = if a != 0 && b != 0 { 0 } else { 1 };
            out.push(Candidate {
                kind,
                cell,
                other: Some(other),
                rank: hash(&rank_preimage(seed, kind, cell, Some(other))),
            });
        }
        let kind = if p.iter().all(|c| view.cells[*c] == 0) {
            2
        } else {
            3
        };
        out.push(Candidate {
            kind,
            cell,
            other: None,
            rank: hash(&rank_preimage(seed, kind, cell, None)),
        });
    }
    Ok(out)
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Placement {
    pub cell: usize,
    pub patch: Vec<usize>,
    pub kind: u8,
    pub other: Option<usize>,
    pub checked: usize,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SpawnSearch {
    view: View,
    candidates: Vec<Candidate>,
    at: usize,
    current: Option<Candidate>,
    patch: Vec<usize>,
    owners: Vec<u16>,
    owner_at: usize,
    queue: Vec<usize>,
    head: usize,
    seen: Vec<bool>,
    scan: usize,
    phase: u8,
    result: Option<Placement>,
}
impl SpawnSearch {
    /// Candidates must come from `enumerate` with the fixed protocol hasher, never a user request.
    pub fn new(view: View, mut candidates: Vec<Candidate>) -> Result<Self, Error> {
        view.validate()?;
        if candidates.len() > 5 * view.cells.len() {
            return Err(Error::Bounds);
        }
        // Check completeness of candidate identities independently of their supplied ranks.
        let expected = enumerate(&view, &[0; 32], |_| [0; 32])?;
        let mut keys: Vec<_> = candidates
            .iter()
            .map(|c| (c.kind, c.cell, c.other))
            .collect();
        let mut want: Vec<_> = expected.iter().map(|c| (c.kind, c.cell, c.other)).collect();
        keys.sort_unstable();
        want.sort_unstable();
        if keys != want {
            return Err(Error::Bounds);
        }
        candidates.sort_by_key(|c| (c.kind, c.rank, c.cell, c.other));
        Ok(Self {
            view,
            candidates,
            at: 0,
            current: None,
            patch: Vec::new(),
            owners: Vec::new(),
            owner_at: 0,
            queue: Vec::new(),
            head: 0,
            seen: Vec::new(),
            scan: 0,
            phase: 0,
            result: None,
        })
    }
    pub fn complete(&self) -> bool {
        self.phase == 4
    }
    pub fn result(&self) -> Result<Option<&Placement>, Error> {
        if self.complete() {
            Ok(self.result.as_ref())
        } else {
            Err(Error::Bounds)
        }
    }
    fn work(&mut self) -> Result<(), Error> {
        match self.phase {
            0 => {
                if self.at == self.candidates.len() {
                    self.phase = 4;
                    return Ok(());
                }
                let c = self.candidates[self.at].clone();
                self.at += 1;
                let p = patch(c.cell, self.view.width, self.view.height).ok_or(Error::Bounds)?;
                if self.view.guarded_centres[c.cell]
                    || self.view.anchors.iter().any(|a| p.contains(&a.1))
                {
                    return Ok(());
                }
                self.owners = p
                    .iter()
                    .map(|cell| self.view.cells[*cell])
                    .filter(|o| *o != 0)
                    .collect();
                self.owners.sort_unstable();
                self.owners.dedup();
                self.owner_at = 0;
                self.patch = p;
                self.current = Some(c);
                self.phase = 1;
            }
            1 => {
                if self.owner_at == self.owners.len() {
                    let c = self.current.as_ref().ok_or(Error::Bounds)?;
                    self.result = Some(Placement {
                        cell: c.cell,
                        patch: self.patch.clone(),
                        kind: c.kind,
                        other: c.other,
                        checked: self.at,
                    });
                    self.phase = 4;
                    return Ok(());
                }
                let owner = self.owners[self.owner_at];
                let anchor = self
                    .view
                    .anchors
                    .iter()
                    .find(|a| a.0 == owner)
                    .ok_or(Error::Bounds)?
                    .1;
                self.queue = vec![anchor];
                self.head = 0;
                self.seen = vec![false; self.view.cells.len()];
                self.seen[anchor] = true;
                self.phase = 2;
            }
            2 => {
                if self.head < self.queue.len() {
                    let cell = self.queue[self.head];
                    self.head += 1;
                    for n in neighbors(cell, self.view.width, self.view.height) {
                        if !self.seen[n]
                            && !self.patch.contains(&n)
                            && self.view.cells[n] == self.owners[self.owner_at]
                        {
                            self.seen[n] = true;
                            self.queue.push(n);
                        }
                    }
                } else {
                    self.scan = 0;
                    self.phase = 3;
                }
            }
            3 => {
                if self.scan < self.view.cells.len() {
                    let cell = self.scan;
                    self.scan += 1;
                    if self.view.cells[cell] == self.owners[self.owner_at]
                        && !self.patch.contains(&cell)
                        && !self.seen[cell]
                    {
                        self.current = None;
                        self.phase = 0;
                    }
                } else {
                    self.owner_at += 1;
                    self.phase = 1;
                }
            }
            4 => {}
            _ => return Err(Error::Bounds),
        }
        Ok(())
    }
}
impl ResumableKernel for SpawnSearch {
    type Error = Error;
    fn step(&mut self, work_units: u32) -> Result<Progress, Error> {
        for _ in 0..work_units {
            if self.complete() {
                break;
            }
            self.work()?;
        }
        Ok(if self.complete() {
            Progress::Complete
        } else {
            Progress::Pending
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn decode_hex(s: &str) -> [u8; 32] {
        let mut out = [0; 32];
        for (i, b) in out.iter_mut().enumerate() {
            *b = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).unwrap();
        }
        out
    }
    #[test]
    fn independent_spawn_fixtures_and_budget_partitions() {
        for line in include_str!("../../../tests/fixtures/spawn-native.tsv")
            .lines()
            .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let cells: Vec<u16> = p[3].split(',').map(|n| n.parse().unwrap()).collect();
            let anchors = if p[4] == "-" {
                Vec::new()
            } else {
                p[4].split(';')
                    .map(|s| {
                        let t: Vec<_> = s.split(':').collect();
                        (t[0].parse().unwrap(), t[1].parse().unwrap())
                    })
                    .collect()
            };
            let mut guards = vec![false; cells.len()];
            if p[5] != "-" {
                for c in p[5].split(',') {
                    guards[c.parse::<usize>().unwrap()] = true;
                }
            }
            let view = View {
                width: p[1].parse().unwrap(),
                height: p[2].parse().unwrap(),
                cells,
                anchors,
                guarded_centres: guards,
            };
            let candidates: Vec<Candidate> = if p[6] == "-" {
                Vec::new()
            } else {
                p[6].split(';')
                    .map(|s| {
                        let t: Vec<_> = s.split(':').collect();
                        Candidate {
                            kind: t[0].parse().unwrap(),
                            cell: t[1].parse().unwrap(),
                            other: if t[2] == "-1" {
                                None
                            } else {
                                Some(t[2].parse().unwrap())
                            },
                            rank: decode_hex(t[3]),
                        }
                    })
                    .collect()
            };
            for budget in [1, 7, 1024] {
                let mut job = SpawnSearch::new(view.clone(), candidates.clone()).unwrap();
                while !job.complete() {
                    job.step(budget).unwrap();
                    job = job.clone();
                }
                let got = job.result().unwrap().map_or_else(
                    || "-".to_owned(),
                    |v| {
                        format!(
                            "{}:{}:{}:{}",
                            v.cell,
                            v.kind,
                            v.other.map_or(-1, |n| n as i32),
                            v.checked
                        )
                    },
                );
                assert_eq!(got, p[7], "{}", p[0]);
            }
        }
    }
    #[test]
    fn closed_ball_boundary_is_guarded() {
        let b = Motion {
            cell: 1,
            x0: 1024,
            y0: 512,
            vx: 1,
            vy: 0,
        };
        let mask = guarded_centres(5, 5, &[b], Fraction::new(0, 1).unwrap()).unwrap();
        assert!(mask[6]);
        assert!(!mask[18]);
    }
    #[test]
    fn rank_preimage_is_canonical() {
        assert_eq!(String::from_utf8(rank_preimage(&[0;32],0,4,Some(5))).unwrap(),
            "{\"cell\":4,\"domain\":\"BTZ-SPAWN-RANK-03\",\"kind\":0,\"other\":5,\"seed\":\"0000000000000000000000000000000000000000000000000000000000000000\"}");
    }
}
