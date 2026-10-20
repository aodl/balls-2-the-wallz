//! Test-fixture parsing only. The production kernel must derive ranks, never trust caller ranks.
use b2z_mechanics::spawn::{Candidate, SpawnSearch, View};
use dtr_core::ResumableKernel;
fn hex32(s: &str) -> [u8; 32] {
    let mut a = [0; 32];
    for (i, b) in a.iter_mut().enumerate() {
        *b = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).unwrap();
    }
    a
}
pub fn emit() {
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
                    let v: Vec<_> = s.split(':').collect();
                    (v[0].parse().unwrap(), v[1].parse().unwrap())
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
        let candidates = if p[6] == "-" {
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
                        rank: hex32(t[3]),
                    }
                })
                .collect()
        };
        let mut c = SpawnSearch::new(view, candidates).unwrap();
        while !c.complete() {
            c.step(7).unwrap();
        }
        let value = c.result().unwrap().map_or_else(
            || "-".to_owned(),
            |r| {
                format!(
                    "{}:{}:{}:{}",
                    r.cell,
                    r.kind,
                    r.other.map_or(-1, |n| n as i32),
                    r.checked
                )
            },
        );
        println!("b2z-spawn\t{}\t{}", p[0], value);
    }
}
