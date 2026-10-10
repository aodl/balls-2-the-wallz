//! S06 source-only runtime/certification laboratory. Controller-supplied SYNTHETIC inputs only.
//! No ledger/archive calls, transfers, payout, timers, or production admission authority.
#![forbid(unsafe_code)]
use btz_native::{host::BtzHostKernel,world::World};
use candid::CandidType;
use dtr_host::{Action,Coordinator,Identity};
use dtr_host::observation::{publication,Publication,CHUNK,MAX_ARTIFACT};
use dtr_wire::{decode,encode,hash,hex,unhex,Int,Result};
use ic_stable_structures::{memory_manager::{MemoryId,MemoryManager,VirtualMemory},DefaultMemoryImpl,StableBTreeMap,StableCell};
use serde::{Deserialize,Serialize};
use std::cell::RefCell;
const ROOT_LIMIT:usize=65536;
const CHUNKS:u64=(MAX_ARTIFACT/CHUNK)as u64;
type Memory=VirtualMemory<DefaultMemoryImpl>;
thread_local!{
    static MANAGER:RefCell<MemoryManager<DefaultMemoryImpl>>=RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    // This is a NEW laboratory schema, not an in-place migration of arena-lab v4.
    static ROOT:RefCell<StableCell<Vec<u8>,Memory>>=RefCell::new(StableCell::init(memory(0),Vec::new()));
    static BLOBS:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(1)));
}
fn memory(id:u8)->Memory{MANAGER.with(|m|m.borrow().get(MemoryId::new(id)))}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Blob{length:usize,sha256:String}
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Root{version:u32,revision:u64,image:Blob,publication_hex:String,publication_hash:String}
#[derive(CandidType,Deserialize)]
struct Status{version:u32,revision:u64,publication_hash:String,synthetic_inputs_only:bool}
#[derive(CandidType,Deserialize)]
struct Observation{publication:Vec<u8>,certificate:Option<Vec<u8>>}
fn authorized()->Result<()>{
    if !ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()){return Err("controller-only synthetic laboratory".into());}Ok(())
}
fn describe(bytes:&[u8])->Result<Blob>{if bytes.len()>MAX_ARTIFACT{return Err("laboratory artifact capacity".into());}Ok(Blob{length:bytes.len(),sha256:hash(bytes)})}
fn root()->Result<Root>{
    let bytes=ROOT.with(|c|c.borrow().get().clone());
    if bytes.is_empty()||bytes.len()>ROOT_LIMIT{return Err("missing/oversize root; no genesis fallback".into());}
    let r:Root=decode(&bytes)?;
    if r.version!=6||r.revision>(1u64<<53)-1||r.image.length>MAX_ARTIFACT{return Err("incompatible laboratory schema".into());}
    let pb=unhex(&r.publication_hex)?;let p:Publication=decode(&pb)?;
    if hash(&pb)!=r.publication_hash||p.version!=6||p.render_format.is_some()||p.chunk_bytes!=CHUNK||p.artifacts.len()!=3{return Err("publication root mismatch".into());}
    Ok(r)
}
fn read_blob(slot:u64,b:&Blob)->Result<Vec<u8>>{
    if slot>=4||b.length>MAX_ARTIFACT{return Err("blob bounds".into());}
    let mut out=Vec::with_capacity(b.length);
    BLOBS.with(|m|->Result<()>{let m=m.borrow();for index in 0..b.length.div_ceil(CHUNK){
        let bytes=m.get(&(slot*CHUNKS+index as u64)).ok_or("missing stable chunk")?;
        if bytes.len()!=CHUNK.min(b.length-index*CHUNK){return Err("stable chunk length".into());}out.extend(bytes);
    }Ok(())})?;
    if hash(&out)!=b.sha256{return Err("stable blob integrity".into());}Ok(out)
}
fn status(r:&Root)->Status{Status{version:6,revision:r.revision,publication_hash:r.publication_hash.clone(),synthetic_inputs_only:true}}
fn host(r:&Root)->Result<Coordinator<BtzHostKernel>>{Coordinator::restore(&read_blob(0,&r.image)?,&r.image.sha256,BtzHostKernel)}
fn persist(h:&Coordinator<BtzHostKernel>,old:Option<&Root>)->Result<Root>{
    let image=h.snapshot()?;let image_descriptor=describe(&image)?;let view=publication(&h.record)?;
    let r=Root{version:6,revision:h.record.revision,image:image_descriptor,publication_hex:hex(&view.bytes),publication_hash:view.sha256};
    let root_bytes=encode(&r)?;if root_bytes.len()>ROOT_LIMIT{return Err("root capacity".into());}
    let certified_root=unhex(&r.publication_hash)?;
    if certified_root.len()!=32{return Err("certified root shape".into());}
    let old_descriptors=old.map(|r|decode::<Publication>(&unhex(&r.publication_hex)?)).transpose()?.map(|p|p.artifacts);
    let mut writes=vec![(0u64,image)];
    for(index,bytes)in view.artifacts.into_iter().enumerate(){
        describe(&bytes)?;
        let changed=old_descriptors.as_ref().is_none_or(|a|a[index].sha256!=view.data.artifacts[index].sha256);
        if changed{writes.push((index as u64+1,bytes));}
    }
    // All Result-returning preparation above. No await after writes begin.
    // Stable-write/chunk allocations below must trap on failure, never return an error reply.
    // Any failure here must trap so the whole message, including certified_data, rolls back.
    BLOBS.with(|m|{let mut m=m.borrow_mut();for(slot,bytes)in writes{
        for i in 0..CHUNKS{let key=slot*CHUNKS+i;let at=i as usize*CHUNK;
            if at<bytes.len(){m.insert(key,bytes[at..bytes.len().min(at+CHUNK)].to_vec());}else{m.remove(&key);}
        }
    }});
    ROOT.with(|c|{c.borrow_mut().set(root_bytes);});
    ic_cdk::api::certified_data_set(certified_root);
    Ok(r)
}
#[ic_cdk::init]
fn init(initial_world:Vec<u8>,source_id:String,source_from:u64,logical_start:u64){
    if ROOT.with(|c|!c.borrow().get().is_empty()){ic_cdk::trap("refusing initialization over durable root");}
    let initialize=||->Result<()>{
        let w=World::decode(&initial_world)?;
        if !w.time.0.is_integer()||w.time.0.to_integer()!=Int(logical_start.into()).0{return Err("genesis logical time".into());}
        let mut identity=btz_native::identity()?;identity["source_id"]=serde_json::Value::String(source_id);
        let identity:Identity=serde_json::from_value(identity).map_err(|e|e.to_string())?;
        let h=Coordinator::create(&initial_world,identity,logical_start,source_from,"00".repeat(32),BtzHostKernel)?;
        persist(&h,None)?;Ok(())
    };if let Err(e)=initialize(){ic_cdk::trap(&e);}
}
#[ic_cdk::post_upgrade]
fn post_upgrade(){
    let verify=||->Result<()>{
        let r=root()?;let h=host(&r)?;let view=publication(&h.record)?;
        if view.sha256!=r.publication_hash{return Err("durable host/publication divergence".into());}
        for(index,a)in view.data.artifacts.iter().enumerate(){read_blob(index as u64+1,&Blob{length:a.length,sha256:a.sha256.clone()})?;}
        ic_cdk::api::certified_data_set(unhex(&r.publication_hash)?);Ok(())
    };if let Err(e)=verify(){ic_cdk::trap(&e);}
}
#[ic_cdk::query]
fn lab_status()->std::result::Result<Status,String>{Ok(status(&root()?))}
#[ic_cdk::query]
fn observation()->std::result::Result<Observation,String>{let r=root()?;Ok(Observation{publication:unhex(&r.publication_hex)?,certificate:ic_cdk::api::data_certificate()})}
#[ic_cdk::query]
fn artifact_chunk(expected_publication:String,kind:u8,index:u16)->std::result::Result<Vec<u8>,String>{
    let r=root()?;if expected_publication!=r.publication_hash{return Err("stale observation publication".into());}
    let p:Publication=decode(&unhex(&r.publication_hex)?)?;
    let a=p.artifacts.get(kind as usize).ok_or("public artifact kind")?;
    if index as usize>=a.chunks.len(){return Err("chunk bounds".into());}
    // O(root + one chunk), never deserialize the hidden simulation cursor in a public chunk query.
    let bytes=BLOBS.with(|m|m.borrow().get(&((kind as u64+1)*CHUNKS+index as u64))).ok_or("missing public chunk")?;
    if bytes.len()!=CHUNK.min(a.length-index as usize*CHUNK)||hash(&bytes)!=a.chunks[index as usize]{return Err("public chunk integrity".into());}Ok(bytes)
}
#[ic_cdk::update]
fn apply(expected_revision:u64,canonical_action:Vec<u8>)->std::result::Result<Status,String>{
    authorized()?;
    if canonical_action.len()>65536{return Err("laboratory action capacity".into());}
    let r=root()?;if expected_revision!=r.revision{return Err("stale laboratory revision".into());}
    let a:Action=decode(&canonical_action)?;
    if matches!(&a,Action::Step{budget}if *budget>100000){return Err("laboratory step capacity".into());}
    let mut h=host(&r)?;h.apply(a)?;
    if h.record.revision==r.revision{return Ok(status(&r));}
    let next=persist(&h,Some(&r))?;Ok(status(&next))
}
ic_cdk::export_candid!();
