//! S04 SOURCE-ONLY integration laboratory: no ledger, payouts, timer or certification.
//! Every mutating endpoint is controller-only. Do not fund this test canister.
#![forbid(unsafe_code)]
use btz_native::{world::World, Cursor, Input};
use candid::CandidType;
use dtr_wire::{decode, encode, hash, Int, Result};
use ic_stable_structures::{memory_manager::{MemoryId, MemoryManager, VirtualMemory}, DefaultMemoryImpl, StableBTreeMap, StableCell};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cell::RefCell;

const CHUNK: usize = 16384;
const MAX_ARTIFACT: usize = 1024 * 1024;
const SLOTS: u64 = 4;
const CHUNKS: u64 = (MAX_ARTIFACT / CHUNK) as u64;
const MAX_REVISION: u64 = (1 << 53) - 1;
type Memory = VirtualMemory<DefaultMemoryImpl>;
thread_local! {
    static MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    // Region IDs are permanent. Empty defaults are rejected outside init, never treated as genesis.
    static ROOT: RefCell<StableCell<Vec<u8>, Memory>> = RefCell::new(StableCell::init(memory(0), Vec::new()));
    static BLOBS: RefCell<StableBTreeMap<u64, Vec<u8>, Memory>> = RefCell::new(StableBTreeMap::init(memory(1)));
}
fn memory(id:u8)->Memory {MANAGER.with(|m|m.borrow().get(MemoryId::new(id)))}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Artifact {length:u32,sha256:String}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Root {version:u32,revision:u64,identity:Value,world:Artifact,cursor:Option<Artifact>,ready:bool,events:Option<Artifact>,scores:Option<Artifact>}
#[derive(CandidType,Deserialize)]
struct LabStatus {version:u32,revision:u64,state_hash:String,cursor_hash:Option<String>,ready:bool,certified:bool,synthetic_inputs_only:bool}
fn status(r:&Root)->LabStatus {LabStatus{version:4,revision:r.revision,state_hash:r.world.sha256.clone(),cursor_hash:r.cursor.as_ref().map(|c|c.sha256.clone()),ready:r.ready,certified:false,synthetic_inputs_only:true}}
fn authorized()->Result<()> {
    if !ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()){return Err("controller-only laboratory".into());} Ok(())
}
fn root()->Result<Root>{
    let bytes=ROOT.with(|c|c.borrow().get().clone());
    if bytes.is_empty(){return Err("missing durable root; automatic reinitialization forbidden".into());}
    let r:Root=decode(&bytes)?;
    if r.version!=4||r.revision>MAX_REVISION||r.identity!=btz_native::identity()?||r.ready&&r.cursor.is_none(){return Err("incompatible durable root".into());}
    Ok(r)
}
fn describe(bytes:&[u8])->Result<Artifact>{
    if bytes.len()>MAX_ARTIFACT{return Err("laboratory artifact capacity; old root retained".into());}
    Ok(Artifact{length:bytes.len() as u32,sha256:hash(bytes)})
}
fn read_blob(slot:u64,a:&Artifact)->Result<Vec<u8>>{
    if slot>=SLOTS||a.length as usize>MAX_ARTIFACT{return Err("blob bounds".into());}
    let count=(a.length as usize).div_ceil(CHUNK);let mut out=Vec::with_capacity(a.length as usize);
    BLOBS.with(|m|->Result<()>{let m=m.borrow();for i in 0..count{
        let part=m.get(&(slot*CHUNKS+i as u64)).ok_or("missing stable chunk")?;
        if part.len()!=CHUNK.min(a.length as usize-i*CHUNK){return Err("stable chunk length".into());}out.extend(part);
    } Ok(())})?;
    if hash(&out)!=a.sha256{return Err("stable artifact corruption".into());}Ok(out)
}
/// Validate ALL fallible input, encodings and capacity before entering the write phase.
/// After writes begin, panic/trap is required on failure; returning Err would NOT roll them back.
fn persist(r:&Root,artifacts:Vec<(u64,Vec<u8>)>)->Result<()> {
    let root_bytes=encode(r)?;if root_bytes.len()>16384{return Err("root capacity".into());}
    let mut seen=std::collections::BTreeSet::new();
    for(slot,bytes)in &artifacts{if *slot>=SLOTS||!seen.insert(*slot){return Err("write slot".into());}describe(bytes)?;}
    // No await, external call or Result-returning operation after this boundary.
    BLOBS.with(|m|{let mut m=m.borrow_mut();for(slot,bytes)in artifacts{
        for i in 0..CHUNKS{let key=slot*CHUNKS+i;let start=i as usize*CHUNK;
            if start<bytes.len(){m.insert(key,bytes[start..bytes.len().min(start+CHUNK)].to_vec());}else{m.remove(&key);}
        }
    }});
    ROOT.with(|c|{c.borrow_mut().set(root_bytes);});Ok(())
}
fn next(r:&mut Root,expected:u64)->Result<()> {
    if r.revision!=expected||r.revision>=MAX_REVISION{return Err("stale/exhausted revision".into());}r.revision+=1;Ok(())
}
#[ic_cdk::init]
fn init(initial_world:Vec<u8>){
    let initialized=ROOT.with(|c|!c.borrow().get().is_empty());if initialized{ic_cdk::trap("refusing initialization over existing root");}
    let initialize=||->Result<()>{let w=World::decode(&initial_world)?;
        if w.encode()?!=initial_world{return Err("world roundtrip".into());}
        let r=Root{version:4,revision:0,identity:btz_native::identity()?,world:describe(&initial_world)?,cursor:None,ready:false,events:None,scores:None};
        persist(&r,vec![(0,initial_world)])
    };
    if let Err(e)=initialize(){ic_cdk::trap(&e);}
}
#[ic_cdk::post_upgrade]
fn post_upgrade(){
    // No pre_upgrade snapshot and no supplied replacement state. Unknown schema traps closed.
    let verify=||->Result<()>{let r=root()?;World::decode(&read_blob(0,&r.world)?)?;
        if let Some(c)=r.cursor{let cur=Cursor::restore(&read_blob(1,&c)?,&c.sha256)?;
            if r.ready{cur.result()?;}}
        if let Some(a)=r.events{read_blob(2,&a)?;}if let Some(a)=r.scores{read_blob(3,&a)?;}Ok(())
    };
    if let Err(e)=verify(){ic_cdk::trap(&e);}
}
#[ic_cdk::query]
fn lab_status()->std::result::Result<LabStatus,String>{Ok(status(&root()?))}
#[ic_cdk::query]
fn committed_chunk(slot:u8,index:u16)->std::result::Result<Vec<u8>,String>{
    let r=root()?;let a=match slot{0=>r.world,2=>r.events.ok_or("no events")?,3=>r.scores.ok_or("no scores")?,_=>return Err("pending cursor not public".into())};
    if index as usize>=(a.length as usize).div_ceil(CHUNK){return Err("chunk index".into());}
    // Bounded chunk query; hash commitment is advisory, NOT an IC certificate.
    BLOBS.with(|m|m.borrow().get(&(slot as u64*CHUNKS+index as u64))).ok_or_else(||"missing chunk".into())
}
#[ic_cdk::update]
fn prepare(expected_revision:u64,logical_end:u64,canonical_inputs:Vec<u8>)->std::result::Result<LabStatus,String>{
    authorized()?;let mut r=root()?;next(&mut r,expected_revision)?;
    if r.cursor.is_some(){return Err("stage already reserved".into());}
    if canonical_inputs.len()>65536||logical_end>1_000_000_000{return Err("input bounds".into());}
    let w=World::decode(&read_blob(0,&r.world)?)?;let inputs:Vec<Input>=decode(&canonical_inputs)?;
    if inputs.len()>4096||!w.time.0.is_integer(){return Err("checkpoint bounds".into());}
    let mut ctx=r.identity.clone();
    ctx["logical_start"]=serde_json::to_value(Int(w.time.0.numer().clone())).map_err(|e|e.to_string())?;
    ctx["logical_end"]=serde_json::to_value(Int::from(logical_end as i64)).map_err(|e|e.to_string())?;
    let cur=Cursor::begin(&w.encode()?,inputs,&ctx)?;let bytes=cur.snapshot()?;r.cursor=Some(describe(&bytes)?);r.ready=false;
    persist(&r,vec![(1,bytes)])?;Ok(status(&r))
}
#[ic_cdk::update]
fn advance(expected_revision:u64,budget:u32)->std::result::Result<LabStatus,String>{
    authorized()?;if budget==0||budget>100000{return Err("work budget".into());}
    let mut r=root()?;next(&mut r,expected_revision)?;if r.ready{return Err("already ready".into());}
    let a=r.cursor.as_ref().ok_or("no stage")?;let mut cur=Cursor::restore(&read_blob(1,a)?,&a.sha256)?;
    let(_,complete)=cur.step(budget as usize)?;let bytes=cur.snapshot()?;r.cursor=Some(describe(&bytes)?);r.ready=complete;
    persist(&r,vec![(1,bytes)])?;Ok(status(&r))
}
#[ic_cdk::update]
fn publish(expected_revision:u64,expected_cursor_hash:String)->std::result::Result<LabStatus,String>{
    authorized()?;let mut r=root()?;next(&mut r,expected_revision)?;
    let a=r.cursor.as_ref().ok_or("no ready stage")?;
    if !r.ready||a.sha256!=expected_cursor_hash{return Err("not ready/stale cursor".into());}
    let output=Cursor::restore(&read_blob(1,a)?,&a.sha256)?.result()?;
    let state=output.state;let events=output.events;let scores=output.scores;
    r.world=describe(&state)?;r.events=Some(describe(&events)?);r.scores=Some(describe(&scores)?);r.cursor=None;r.ready=false;
    persist(&r,vec![(0,state),(1,Vec::new()),(2,events),(3,scores)])?;Ok(status(&r))
}
ic_cdk::export_candid!();
