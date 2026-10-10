use crate::world::{neighbors, Ball, World};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopologyJob {
    pub phase: String, pub defender: u32, pub attacker: u32, pub target: Option<usize>,
    pub queue: Vec<usize>, pub head: usize, pub seen: Vec<bool>, pub scan: usize,
    pub cells: Vec<usize>, pub killed: Vec<u32>, pub survivors: Vec<Ball>, pub eliminated: Vec<u32>,
}
pub fn capture(w: &mut World, target: usize, attacker: u32, optimized: bool) -> Result<TopologyJob> {
    if target >= w.cells.len() || !w.cannons.iter().any(|c| c.id == attacker)
        || w.cells[target] == attacker || w.cannons.iter().any(|c| c.cell == target)
        || !neighbors(target,w.width,w.height).iter().any(|n|w.cells[*n]==attacker) { return Err("invalid capture".into()); }
    let defender = w.cells[target];
    let must_search = defender != 0 && (!optimized || neighbors(target,w.width,w.height).iter().filter(|n|w.cells[**n]==defender).count()>1);
    let mut j = TopologyJob { phase:if must_search {"flood"} else {"balls"}.into(),defender,attacker,target:Some(target),queue:vec![],head:0,
        seen:vec![false;w.cells.len()],scan:0,cells:vec![target],killed:vec![],survivors:vec![],eliminated:vec![] };
    let anchor = if must_search { Some(w.cannons.iter().find(|c|c.id==defender).ok_or("missing defender anchor")?.cell) } else { None };
    w.cells[target] = attacker;
    if let Some(anchor) = anchor { j.queue.push(anchor);j.seen[anchor]=true; }
    Ok(j)
}
pub fn cleanup(w: &mut World, killed: Vec<u32>) -> TopologyJob {
    w.balls.retain(|b|!killed.contains(&b.id));w.pending.retain(|p|!killed.contains(&p.ball));
    let eliminated = w.cannons.iter().filter(|c|!w.balls.iter().any(|b|b.owner==c.id)).map(|c|c.id).collect();
    TopologyJob {phase:"neutral".into(),scan:0,eliminated,killed,cells:vec![],defender:0,attacker:0,target:None,
        queue:vec![],head:0,seen:vec![],survivors:vec![]}
}
pub fn step(w: &mut World,j: &mut TopologyJob) -> Result<bool> {
    match j.phase.as_str() {
        "done" => return Ok(true),
        "flood" => if j.head < j.queue.len() {
            let c=j.queue[j.head];j.head+=1;
            for n in neighbors(c,w.width,w.height) { if w.cells[n]==j.defender && !j.seen[n] {j.seen[n]=true;j.queue.push(n);} }
        } else {j.phase="transfer".into();j.scan=0;},
        "transfer" => if j.scan < w.cells.len() {
            let c=j.scan;j.scan+=1;if w.cells[c]==j.defender && !j.seen[c] {w.cells[c]=j.attacker;j.cells.push(c);}
        } else {j.phase="balls".into();j.scan=0;},
        "balls" => if j.scan < w.balls.len() {
            let b=&w.balls[j.scan];j.scan+=1;if w.cells[b.cell]!=b.owner {j.killed.push(b.id);} else {j.survivors.push(b.clone());}
        } else {
            w.balls=j.survivors.clone();w.pending.retain(|p|w.balls.iter().any(|b|b.id==p.ball));
            j.eliminated=w.cannons.iter().filter(|c|!w.balls.iter().any(|b|b.owner==c.id)).map(|c|c.id).collect();
            j.phase="neutral".into();j.scan=0;
        },
        "neutral" => if j.scan < w.cells.len() {
            let c=j.scan;j.scan+=1;if j.eliminated.contains(&w.cells[c]) {w.cells[c]=0;}
        } else {w.cannons.retain(|c|!j.eliminated.contains(&c.id));j.phase="done".into();},
        _ => return Err("topology phase".into()),
    }
    Ok(j.phase=="done")
}
