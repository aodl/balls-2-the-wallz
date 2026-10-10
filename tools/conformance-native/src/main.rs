//! Native byte-vector emitter. Tooling compares these lines with independently generated fixtures.
mod spawn_vectors;
use btz_protocol::{Command,encode,numeric};use dtr_core::{ResumableKernel,Seal};use life_conformance::{Board,Cursor};
fn hex(b:&[u8])->String{b.iter().map(|x|format!("{x:02x}")).collect()}
fn main(){
 emit_btz();
 spawn_vectors::emit();
 for line in include_str!("../../../tests/fixtures/memos.tsv").lines().filter(|l|!l.starts_with('#')&&!l.is_empty()){
  let p:Vec<_>=line.split('\t').collect();let n:u32=p[1].parse().unwrap();let c=if p[0]=="angle"{Command::Angle(u16::try_from(n).unwrap())}else{Command::Move(n)};
  println!("memo\t{}\t{}\t{}\t{}",p[0],n,hex(&encode(c)),numeric(c));
 }
 let s=Seal{segment_id:0,logical_start:0,logical_end:10,source_from:100,source_to_exclusive:110,input_count:2,source_id:[1;32],source_anchor:[2;32],rules_hash:[3;32],config_hash:[4;32],schema_hash:[5;32],previous_state:[6;32],previous_manifest:[7;32],input_root:[8;32]};println!("seal\t{}",hex(&s.encode().unwrap()));
 for line in include_str!("../../../tests/fixtures/life.tsv").lines().filter(|l|!l.starts_with('#')&&!l.is_empty()){
  let p:Vec<_>=line.split('\t').collect();let state=Board::new(p[1].parse().unwrap(),p[2].parse().unwrap(),p[3].parse().unwrap(),p[5].split(',').map(|n|n.parse().unwrap()).collect()).unwrap();let mut c=Cursor::new(state,p[4].parse().unwrap()).unwrap();
  while !c.complete(){c.step(7).unwrap();c=Cursor::restore(&c.snapshot()).unwrap();}
  println!("life\t{}\t{}\t{}\t{}",p[0],hex(&c.state.encode()),hex(&c.event_bytes()),hex(&c.score_bytes()));
 }
}

fn emit_btz() {
 use btz_mechanics::{CutSearch, Fraction, Motion};
 for (index,line) in include_str!("../../../tests/fixtures/btz-geometry.tsv").lines().filter(|l| !l.starts_with('#') && !l.is_empty()).enumerate() {
  let p:Vec<_>=line.split('\t').collect();
  let motion=Motion{cell:p[2].parse().unwrap(),x0:p[4].parse().unwrap(),y0:p[5].parse().unwrap(),vx:p[6].parse().unwrap(),vy:p[7].parse().unwrap()};
  let hit=motion.next_crossing(p[0].parse().unwrap(),p[1].parse().unwrap(),Fraction::new(p[3].parse().unwrap(),1).unwrap()).unwrap();
  println!("btz-geometry\t{}\t{}\t{}\t{}\t{}",index,hit.time.numerator(),hit.time.denominator(),u8::from(hit.x),u8::from(hit.y));
 }
 for (index,line) in include_str!("../../../tests/fixtures/btz-connectivity.tsv").lines().filter(|l| !l.starts_with('#') && !l.is_empty()).enumerate() {
  let p:Vec<_>=line.split('\t').collect();
  let mut c=CutSearch::new(p[0].parse().unwrap(),p[1].parse().unwrap(),p[5].split(',').map(|n|n.parse().unwrap()).collect(),p[2].parse().unwrap(),p[3].parse().unwrap(),p[4].parse().unwrap()).unwrap();
  while !c.complete(){c.step(7).unwrap();c=CutSearch::restore(&c.snapshot()).unwrap();}
  let values=c.orphaned().unwrap().iter().map(|n|n.to_string()).collect::<Vec<_>>().join(",");
  println!("btz-cut\t{}\t{}",index,if values.is_empty(){"-"}else{&values});
 }
}
