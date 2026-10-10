//! Deterministic opposite-strike pairing. Lifecycle/capture application belongs to the kernel.
use crate::{Error, Fraction};
use std::cmp::Ordering;
use std::collections::BTreeSet;
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Strike {
    pub ball: u32, pub owner: u16, pub defender: u16, pub from: usize, pub to: usize,
    pub position: Fraction, pub born: Fraction, pub deadline: Fraction,
}
pub struct Frontier<'a> {
    pub cells: &'a [u16], pub cannon_cells: &'a [usize], pub balls: &'a [(u32, u16)],
}
impl Frontier<'_> {
    fn live(&self, s: &Strike) -> bool {
        s.owner != 0 && s.defender != 0 && s.owner != s.defender
            && self.cells.get(s.from) == Some(&s.owner) && self.cells.get(s.to) == Some(&s.defender)
            && !self.cannon_cells.contains(&s.to) && self.balls.contains(&(s.ball,s.owner))
    }
}
/// `records` is the frozen union of current pending effects and this timestamp's arrivals.
/// Invalidated records are excluded, and deadline equality remains eligible.
pub fn match_strikes(now: Fraction, max_distance: u32, frontier: &Frontier<'_>, records: &[Strike]) -> Result<Vec<(u32,u32)>, Error> {
    if records.len() > 128 || frontier.cells.len() > 1024 || frontier.balls.len() > 64 || max_distance > 1024 { return Err(Error::Bounds); }
    let mut all = Vec::new(); let mut ids = BTreeSet::new();
    for s in records {
        if !ids.insert(s.ball) || s.born.compare(s.deadline)? == Ordering::Greater { return Err(Error::Bounds); }
        if frontier.live(s) && s.born.compare(now)? != Ordering::Greater && now.compare(s.deadline)? != Ordering::Greater { all.push(s); }
    }
    all.sort_by_key(|s| (s.from.min(s.to),s.from.max(s.to),s.ball));
    let mut used = BTreeSet::new(); let mut pairs = Vec::new();
    for (i,a) in all.iter().enumerate() {
        if used.contains(&a.ball) { continue; }
        for b in all.iter().skip(i+1) {
            if used.contains(&b.ball) || a.ball == b.ball { continue; }
            let d = a.position.subtract(b.position)?;
            let abs = d.numerator().checked_abs().ok_or(Error::Overflow)?;
            let limit = i128::from(max_distance).checked_mul(d.denominator()).ok_or(Error::Overflow)?;
            if a.from == b.to && a.to == b.from && a.owner == b.defender && b.owner == a.defender && abs <= limit {
                used.insert(a.ball); used.insert(b.ball); pairs.push((a.ball,b.ball)); break;
            }
        }
    }
    Ok(pairs)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn inclusive_window_and_no_retroactive_pairing() {
        let t=Fraction::new(9,16).unwrap();
        let a=Strike{ball:1,owner:1,defender:2,from:0,to:1,position:Fraction::new(100,1).unwrap(),born:Fraction::new(1,2).unwrap(),deadline:t};
        let b=Strike{ball:2,owner:2,defender:1,from:1,to:0,position:Fraction::new(164,1).unwrap(),born:t,deadline:Fraction::new(10,16).unwrap()};
        let f=Frontier{cells:&[1,2],cannon_cells:&[],balls:&[(1,1),(2,2)]};
        assert_eq!(match_strikes(t,64,&f,&[a.clone(),b.clone()]).unwrap(),vec![(1,2)]);
        assert!(match_strikes(Fraction::new(577,1024).unwrap(),64,&f,&[a,b]).unwrap().is_empty());
    }
    #[test]
    fn anchor_and_changed_ownership_cancel() {
        let t=Fraction::new(0,1).unwrap();let end=Fraction::new(1,16).unwrap();
        let a=Strike{ball:1,owner:1,defender:2,from:0,to:1,position:t,born:t,deadline:end};
        let b=Strike{ball:2,owner:2,defender:1,from:1,to:0,position:t,born:t,deadline:end};
        let f=Frontier{cells:&[1,2],cannon_cells:&[1],balls:&[(1,1),(2,2)]};
        assert!(match_strikes(t,64,&f,&[a,b]).unwrap().is_empty());
    }
}
