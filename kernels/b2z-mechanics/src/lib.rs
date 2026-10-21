//! Portable B2Z exact grid geometry and resumable connectivity primitives.
//! The complete S02 game orchestration is an executed JS reference, NOT yet this Rust crate.
#![forbid(unsafe_code)]

pub mod spawn;
pub mod strikes;

use dtr_core::{Progress, Reader, ResumableKernel};
use std::cmp::Ordering;

pub const Q: i128 = 1024;
const MAX_CELLS: usize = 1024;
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    Bounds,
    Overflow,
    Fraction,
    Trajectory,
    Snapshot,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Fraction {
    numerator: i128,
    denominator: i128,
}
impl Fraction {
    pub fn new(mut n: i128, mut d: i128) -> Result<Self, Error> {
        if d == 0 {
            return Err(Error::Fraction);
        }
        if d < 0 {
            n = n.checked_neg().ok_or(Error::Overflow)?;
            d = d.checked_neg().ok_or(Error::Overflow)?;
        }
        let mut a = n.checked_abs().ok_or(Error::Overflow)?;
        let mut b = d;
        while b != 0 {
            (a, b) = (b, a % b);
        }
        Ok(Self {
            numerator: n / a,
            denominator: d / a,
        })
    }
    pub fn numerator(self) -> i128 {
        self.numerator
    }
    pub fn denominator(self) -> i128 {
        self.denominator
    }
    // This is intentionally fallible checked arithmetic, unlike std::ops::Add.
    #[allow(clippy::should_implement_trait)]
    pub fn add(self, other: Self) -> Result<Self, Error> {
        let a = self
            .numerator
            .checked_mul(other.denominator)
            .ok_or(Error::Overflow)?;
        let b = other
            .numerator
            .checked_mul(self.denominator)
            .ok_or(Error::Overflow)?;
        Self::new(
            a.checked_add(b).ok_or(Error::Overflow)?,
            self.denominator
                .checked_mul(other.denominator)
                .ok_or(Error::Overflow)?,
        )
    }
    pub fn subtract(self, other: Self) -> Result<Self, Error> {
        self.add(Self::new(
            other.numerator.checked_neg().ok_or(Error::Overflow)?,
            other.denominator,
        )?)
    }
    pub fn scale(self, n: i128) -> Result<Self, Error> {
        Self::new(
            self.numerator.checked_mul(n).ok_or(Error::Overflow)?,
            self.denominator,
        )
    }
    pub fn compare(self, other: Self) -> Result<Ordering, Error> {
        let a = self
            .numerator
            .checked_mul(other.denominator)
            .ok_or(Error::Overflow)?;
        let b = other
            .numerator
            .checked_mul(self.denominator)
            .ok_or(Error::Overflow)?;
        Ok(a.cmp(&b))
    }
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Motion {
    pub cell: usize,
    pub x0: i128,
    pub y0: i128,
    pub vx: i32,
    pub vy: i32,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Crossing {
    pub time: Fraction,
    pub x: bool,
    pub y: bool,
    pub xwall: i128,
    pub ywall: i128,
}
impl Motion {
    pub fn position(&self, time: Fraction) -> Result<(Fraction, Fraction), Error> {
        Ok((
            Fraction::new(self.x0, 1)?.add(time.scale(i128::from(self.vx))?)?,
            Fraction::new(self.y0, 1)?.add(time.scale(i128::from(self.vy))?)?,
        ))
    }
    pub fn next_crossing(
        &self,
        width: usize,
        height: usize,
        now: Fraction,
    ) -> Result<Crossing, Error> {
        if width == 0
            || height == 0
            || width > 32
            || height > 32
            || self.cell >= width * height
            || !(-4096..=4096).contains(&self.vx)
            || !(-4096..=4096).contains(&self.vy)
            || (self.vx == 0 && self.vy == 0)
            || !(-100_000_000_000_000..=100_000_000_000_000).contains(&self.x0)
            || !(-100_000_000_000_000..=100_000_000_000_000).contains(&self.y0)
        {
            return Err(Error::Bounds);
        }
        let xwall = ((self.cell % width) as i128 + i128::from(self.vx > 0)) * Q;
        let ywall = ((self.cell / width) as i128 + i128::from(self.vy > 0)) * Q;
        let tx = if self.vx == 0 {
            None
        } else {
            Some(Fraction::new(xwall - self.x0, i128::from(self.vx))?)
        };
        let ty = if self.vy == 0 {
            None
        } else {
            Some(Fraction::new(ywall - self.y0, i128::from(self.vy))?)
        };
        for t in [tx, ty].into_iter().flatten() {
            if t.compare(now)? == Ordering::Less {
                return Err(Error::Trajectory);
            }
        }
        let time = match (tx, ty) {
            (Some(a), Some(b)) => {
                if a.compare(b)? == Ordering::Greater {
                    b
                } else {
                    a
                }
            }
            (Some(a), None) | (None, Some(a)) => a,
            _ => return Err(Error::Trajectory),
        };
        Ok(Crossing {
            time,
            x: tx == Some(time),
            y: ty == Some(time),
            xwall,
            ywall,
        })
    }
    pub fn reflect_x(&mut self, wall: i128) -> Result<(), Error> {
        let x0 = wall
            .checked_mul(2)
            .and_then(|w| w.checked_sub(self.x0))
            .ok_or(Error::Overflow)?;
        let vx = self.vx.checked_neg().ok_or(Error::Overflow)?;
        self.x0 = x0;
        self.vx = vx;
        Ok(())
    }
    pub fn reflect_y(&mut self, wall: i128) -> Result<(), Error> {
        let y0 = wall
            .checked_mul(2)
            .and_then(|w| w.checked_sub(self.y0))
            .ok_or(Error::Overflow)?;
        let vy = self.vy.checked_neg().ok_or(Error::Overflow)?;
        self.y0 = y0;
        self.vy = vy;
        Ok(())
    }
}

const ATAN: [i64; 24] = [
    536870912, 316933406, 167458907, 85004756, 42667331, 21354465, 10679838, 5340245, 2670163,
    1335087, 667544, 333772, 166886, 83443, 41722, 20861, 10430, 5215, 2608, 1304, 652, 326, 163,
    81,
];
/// Fixed integer CORDIC. Constants and rounding are protocol data.
pub fn heading(angle: u16, speed: u16) -> Result<(i32, i32), Error> {
    if speed == 0 || speed > 4096 {
        return Err(Error::Bounds);
    }
    let q = angle / 16384;
    let a = angle % 16384;
    let (x, y) = if a == 0 {
        (i64::from(speed), 0)
    } else {
        let (mut xx, mut yy, mut z) = (652032874_i64, 0_i64, i64::from(a) << 16);
        for (i, atan) in ATAN.iter().enumerate() {
            let sign = if z >= 0 { 1 } else { -1 };
            (xx, yy) = (xx - sign * (yy >> i), yy + sign * (xx >> i));
            z -= sign * atan;
        }
        let nearest = |n: i64| {
            if n < 0 {
                -((-n + (1 << 29)) / (1 << 30))
            } else {
                (n + (1 << 29)) / (1 << 30)
            }
        };
        (
            nearest(xx * i64::from(speed)),
            nearest(yy * i64::from(speed)),
        )
    };
    let (x, y) = match q {
        0 => (x, y),
        1 => (-y, x),
        2 => (-x, -y),
        _ => (y, -x),
    };
    Ok((
        i32::try_from(x).map_err(|_| Error::Overflow)?,
        i32::try_from(y).map_err(|_| Error::Overflow)?,
    ))
}

fn neighbors(cell: usize, width: usize, height: usize) -> Vec<usize> {
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
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CutSearch {
    width: usize,
    height: usize,
    owner: u16,
    anchor: usize,
    removed: usize,
    cells: Vec<u16>,
    queue: Vec<usize>,
    head: usize,
    seen: Vec<bool>,
    scan: usize,
    orphaned: Vec<usize>,
    phase: u8,
}
impl CutSearch {
    /// Caller guarantees original owner connectivity. The removed cell is excluded without mutating source cells.
    pub fn new(
        width: usize,
        height: usize,
        cells: Vec<u16>,
        owner: u16,
        anchor: usize,
        removed: usize,
    ) -> Result<Self, Error> {
        if width == 0
            || height == 0
            || width > 32
            || height > 32
            || cells.len() != width * height
            || cells.len() > MAX_CELLS
            || anchor >= cells.len()
            || removed >= cells.len()
            || anchor == removed
            || owner == 0
            || cells[anchor] != owner
            || cells[removed] != owner
        {
            return Err(Error::Bounds);
        }
        let mut seen = vec![false; cells.len()];
        seen[anchor] = true;
        Ok(Self {
            width,
            height,
            owner,
            anchor,
            removed,
            cells,
            queue: vec![anchor],
            head: 0,
            seen,
            scan: 0,
            orphaned: Vec::new(),
            phase: 0,
        })
    }
    pub fn complete(&self) -> bool {
        self.phase == 2
    }
    pub fn orphaned(&self) -> Result<&[usize], Error> {
        if self.complete() {
            Ok(&self.orphaned)
        } else {
            Err(Error::Bounds)
        }
    }
    pub fn snapshot(&self) -> Vec<u8> {
        let mut out = b"BTZCUT02".to_vec();
        for n in [self.width as u16, self.height as u16, self.owner] {
            out.extend(n.to_be_bytes());
        }
        for n in [
            self.anchor,
            self.removed,
            self.head,
            self.scan,
            self.queue.len(),
            self.orphaned.len(),
        ] {
            out.extend((n as u32).to_be_bytes());
        }
        out.push(self.phase);
        for n in &self.cells {
            out.extend(n.to_be_bytes());
        }
        for b in &self.seen {
            out.push(u8::from(*b));
        }
        for n in self.queue.iter().chain(self.orphaned.iter()) {
            out.extend((*n as u32).to_be_bytes());
        }
        out
    }
    /// Integrity/authenticity of a stored snapshot must be checked by the host before this structural decoder.
    pub fn restore(bytes: &[u8]) -> Result<Self, Error> {
        if bytes.len() > 16_384 {
            return Err(Error::Snapshot);
        }
        let mut r = Reader::new(bytes);
        if r.take(8).map_err(|_| Error::Snapshot)? != b"BTZCUT02" {
            return Err(Error::Snapshot);
        }
        let width = usize::from(r.u16().map_err(|_| Error::Snapshot)?);
        let height = usize::from(r.u16().map_err(|_| Error::Snapshot)?);
        let owner = r.u16().map_err(|_| Error::Snapshot)?;
        let mut fields = [0_usize; 6];
        for n in &mut fields {
            *n = r.u32().map_err(|_| Error::Snapshot)? as usize;
        }
        let [anchor, removed, head, scan, queue_count, orphan_count] = fields;
        let phase = r.take(1).map_err(|_| Error::Snapshot)?[0];
        if width == 0
            || height == 0
            || width > 32
            || height > 32
            || queue_count > MAX_CELLS
            || orphan_count > MAX_CELLS
            || phase > 2
            || scan > width * height
            || head > queue_count
        {
            return Err(Error::Snapshot);
        }
        let mut cells = Vec::with_capacity(width * height);
        for _ in 0..width * height {
            cells.push(r.u16().map_err(|_| Error::Snapshot)?);
        }
        let mut seen = Vec::with_capacity(width * height);
        for _ in 0..width * height {
            match r.take(1).map_err(|_| Error::Snapshot)?[0] {
                0 => seen.push(false),
                1 => seen.push(true),
                _ => return Err(Error::Snapshot),
            }
        }
        let mut queue = Vec::with_capacity(queue_count);
        for _ in 0..queue_count {
            queue.push(r.u32().map_err(|_| Error::Snapshot)? as usize);
        }
        let mut orphaned = Vec::with_capacity(orphan_count);
        for _ in 0..orphan_count {
            orphaned.push(r.u32().map_err(|_| Error::Snapshot)? as usize);
        }
        r.end().map_err(|_| Error::Snapshot)?;
        Self::new(width, height, cells.clone(), owner, anchor, removed)?;
        let mut visited = vec![false; cells.len()];
        for &cell in &queue {
            if cell >= cells.len() || cell == removed || cells[cell] != owner || visited[cell] {
                return Err(Error::Snapshot);
            }
            visited[cell] = true;
        }
        if visited != seen
            || queue.first() != Some(&anchor)
            || (phase == 0 && (scan != 0 || !orphaned.is_empty()))
            || (phase > 0 && head != queue.len())
            || (phase == 2 && scan != cells.len())
        {
            return Err(Error::Snapshot);
        }
        let mut prior = None;
        for &cell in &orphaned {
            if cell >= scan
                || cell == removed
                || cells[cell] != owner
                || seen[cell]
                || prior.is_some_and(|p| p >= cell)
            {
                return Err(Error::Snapshot);
            }
            prior = Some(cell);
        }
        Ok(Self {
            width,
            height,
            owner,
            anchor,
            removed,
            cells,
            queue,
            head,
            seen,
            scan,
            orphaned,
            phase,
        })
    }
}
impl ResumableKernel for CutSearch {
    type Error = Error;
    fn step(&mut self, work_units: u32) -> Result<Progress, Error> {
        for _ in 0..work_units {
            match self.phase {
                0 => {
                    if self.head < self.queue.len() {
                        let cell = self.queue[self.head];
                        self.head += 1;
                        for n in neighbors(cell, self.width, self.height) {
                            if n != self.removed && self.cells[n] == self.owner && !self.seen[n] {
                                self.seen[n] = true;
                                self.queue.push(n);
                            }
                        }
                    } else {
                        self.phase = 1;
                    }
                }
                1 => {
                    if self.scan < self.cells.len() {
                        let cell = self.scan;
                        self.scan += 1;
                        if cell != self.removed
                            && self.cells[cell] == self.owner
                            && !self.seen[cell]
                        {
                            self.orphaned.push(cell);
                        }
                    } else {
                        self.phase = 2;
                    }
                }
                2 => break,
                _ => return Err(Error::Snapshot),
            }
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
    #[test]
    fn exact_fraction_and_overflow_checks() {
        assert_eq!(Fraction::new(6, -8).unwrap(), Fraction::new(-3, 4).unwrap());
        assert_eq!(Fraction::new(0, 4).unwrap().denominator(), 1);
        assert!(Fraction::new(1, 0).is_err());
        assert!(Fraction::new(i128::MIN, 1).is_err());
        assert!(Fraction::new(i128::MAX, 1)
            .unwrap()
            .compare(Fraction::new(1, i128::MAX).unwrap())
            .is_err());
    }
    #[test]
    fn shared_geometry_fixtures() {
        for line in include_str!("../../../tests/fixtures/b2z-geometry.tsv")
            .lines()
            .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let b = Motion {
                cell: p[2].parse().unwrap(),
                x0: p[4].parse().unwrap(),
                y0: p[5].parse().unwrap(),
                vx: p[6].parse().unwrap(),
                vy: p[7].parse().unwrap(),
            };
            let now = Fraction::new(p[3].parse().unwrap(), 1).unwrap();
            let hit = b
                .next_crossing(p[0].parse().unwrap(), p[1].parse().unwrap(), now)
                .unwrap();
            assert_eq!(
                hit.time,
                Fraction::new(p[8].parse().unwrap(), p[9].parse().unwrap()).unwrap()
            );
            assert_eq!(hit.x, p[10] == "1");
            assert_eq!(hit.y, p[11] == "1");
        }
    }
    #[test]
    fn shared_cut_fixtures_and_every_safe_point_resume() {
        for line in include_str!("../../../tests/fixtures/b2z-connectivity.tsv")
            .lines()
            .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let expected: Vec<usize> = if p[6] == "-" {
                Vec::new()
            } else {
                p[6].split(',').map(|n| n.parse().unwrap()).collect()
            };
            for budget in [1, 7, 1024] {
                let mut c = CutSearch::new(
                    p[0].parse().unwrap(),
                    p[1].parse().unwrap(),
                    p[5].split(',').map(|n| n.parse().unwrap()).collect(),
                    p[2].parse().unwrap(),
                    p[3].parse().unwrap(),
                    p[4].parse().unwrap(),
                )
                .unwrap();
                while !c.complete() {
                    c.step(budget).unwrap();
                    c = CutSearch::restore(&c.snapshot()).unwrap();
                }
                assert_eq!(c.orphaned().unwrap(), expected);
            }
        }
    }
    #[test]
    fn heading_symmetry_for_all_u16_values() {
        assert_eq!(heading(0, 1024).unwrap(), (1024, 0));
        assert_eq!(heading(16384, 1024).unwrap(), (0, 1024));
        for angle in 0..16384_u16 {
            let (x, y) = heading(angle, 1024).unwrap();
            assert_eq!(heading(angle + 16384, 1024).unwrap(), (-y, x));
            assert_eq!(heading(angle + 32768, 1024).unwrap(), (-x, -y));
            assert_eq!(heading(angle + 49152, 1024).unwrap(), (y, -x));
        }
    }
    #[test]
    fn snapshot_rejects_truncation_and_trailing() {
        let c = CutSearch::new(3, 1, vec![1, 1, 1], 1, 0, 1).unwrap();
        let bytes = c.snapshot();
        for n in 0..bytes.len() {
            assert!(CutSearch::restore(&bytes[..n]).is_err());
        }
        let mut more = bytes;
        more.push(0);
        assert!(CutSearch::restore(&more).is_err());
    }
}

/// Cell lookup for the explicitly versioned B2Z torus; bounded-board APIs stay unchanged.
pub fn wrapped_cell(x: i64, y: i64, width: usize, height: usize) -> Result<usize, Error> {
    if width == 0 || height == 0 || width > 32 || height > 32 || width * height > MAX_CELLS {
        return Err(Error::Bounds);
    }
    Ok(y.rem_euclid(height as i64) as usize * width + x.rem_euclid(width as i64) as usize)
}
#[cfg(test)]
mod wrapping_tests {
    use super::*;
    #[test]
    fn horizontal_vertical_corner_and_bounds() {
        assert_eq!(wrapped_cell(-1, 0, 32, 32), Ok(31));
        assert_eq!(wrapped_cell(32, 0, 32, 32), Ok(0));
        assert_eq!(wrapped_cell(0, -1, 32, 32), Ok(992));
        assert_eq!(wrapped_cell(0, 32, 32, 32), Ok(0));
        assert_eq!(wrapped_cell(-1, -1, 32, 32), Ok(1023));
        assert_eq!(wrapped_cell(32, 32, 32, 32), Ok(0));
        assert_eq!(wrapped_cell(0, 0, 64, 64), Err(Error::Bounds));
        assert_eq!(wrapped_cell(0, 0, 0, 32), Err(Error::Bounds));
    }
}
