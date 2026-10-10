use crate::geometry::{classify, next_crossing, reflect, Crossing, Intent};
use crate::spawn::SpawnJob;
use crate::topology::{self, TopologyJob};
use crate::world::{position, Ball, Cannon, Credit, Strike, World, Q};
use btz_protocol::Command;
use dtr_wire::{decode, encode, hash, hex, unhex, Int, Rat, Result};
use num_bigint::BigInt;
use num_traits::{One, ToPrimitive};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Input {pub position:Int,pub payload_hex:String}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct PaymentSaved {account:String,amount:Int}
struct Payment {saved:PaymentSaved,memo:Vec<u8>}
pub struct Output {pub state:Vec<u8>,pub events:Vec<u8>,pub scores:Vec<u8>}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields,rename_all="camelCase")]
pub struct Cursor {
    pub world:World,pub inputs:Vec<Input>,pub input_index:usize,pub moved:Vec<u32>,
    pub start:Rat,pub end:Rat,pub seed_base:String,pub initial_credits:Vec<Credit>,
    pub phase:String,pub events:Vec<Value>,pub receipts:Vec<Value>,pub scan:usize,
    pub candidates:Vec<Crossing>,pub intents:Vec<Intent>,pub next_time:Rat,
    pub areas:Vec<(u32,usize)>,pub area_dirty:bool,pub cache_areas:bool,pub fast_topology:bool,
    pub resolving:usize,pub claimed:Vec<usize>,pub job:Option<TopologyJob>,pub job_meta:Option<Value>,pub after_topology:String,
    pub spawn_job:Option<SpawnJob>,spawn_payment:Option<PaymentSaved>,pub spawn_angle:u16,pub spawn_searches:usize,
}
#[derive(Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Snapshot {version:u32,cursor:Cursor}
fn rejection(s:&str)->Value {json!({"reason":s})}
fn merge(mut a:Value,b:Value)->Value {
    if let (Some(a),Some(b))=(a.as_object_mut(),b.as_object()){for(k,v)in b{a.insert(k.clone(),v.clone());}}
    a
}
fn read_payment(s:&str)->Result<Payment>{
    let b=unhex(s)?;
    if b.len()!=56 || &b[..8]!=b"BTZPAY02" {return Err("unreadable normalized payment".into());}
    let amount=u64::from_be_bytes(b[40..48].try_into().map_err(|_|"payment amount")?);
    Ok(Payment{saved:PaymentSaved{account:hex(&b[8..40]),amount:Int(BigInt::from(amount))},memo:b[48..].to_vec()})
}
fn context_int(v:&Value,key:&str)->Result<i64>{
    let n: Int=serde_json::from_value(v.get(key).ok_or("context key")?.clone()).map_err(|e|e.to_string())?;
    n.0.to_i64().filter(|n|*n>=0).ok_or_else(||"context integer".into())
}
pub fn identity()->Result<Value>{
    let config=json!({"version":3,"max_cells":1024,"max_width":32,"max_balls":64,"max_cannons":32,"max_per_cannon":32,
        "max_segment_ticks":64,"speed":1024,"ball_base_e8s":Int::from(10000000),"move_e8s":Int::from(10000),
        "annihilation_distance":64,"annihilation_time_window":Rat::new(1.into(),16.into())?,"join_e8s":Int::from(1000000000),"max_spawn_searches_per_segment":8});
    Ok(json!({"rules_hash":hash(b"BTZ_SMALL_BOARD_RULES_03"),"config_hash":hash(&encode(&config)?),"schema_hash":hash(b"BTZ_STATE_03_TYPED_JSON")}))
}
fn launch(w:&mut World,c:&Cannon,angle:u16)->Result<Ball>{
    if w.time.0.denom()!=&BigInt::one(){return Err("integer launch checkpoint".into());}
    let(vx,vy)=btz_mechanics::heading(angle,1024).map_err(|e|format!("heading: {e:?}"))?;
    let x=(c.cell%w.width)as i64*Q+Q/2;let y=(c.cell/w.width)as i64*Q+Q/2;
    let b=Ball{id:w.next_ball_id,owner:c.id,cell:c.cell,x0:Int(BigInt::from(x)-BigInt::from(vx)*w.time.0.numer()),
        y0:Int(BigInt::from(y)-BigInt::from(vy)*w.time.0.numer()),vx,vy};
    w.next_ball_id=w.next_ball_id.checked_add(1).ok_or("ball ID overflow")?;w.balls.push(b.clone());Ok(b)
}
fn mutation(w:&mut World,p:&Payment,moved:&mut Vec<u32>)->Result<Value>{
    let tally=&w.received_e8s.0+&p.saved.amount.0;
    if tally>=(BigInt::from(1)<<128usize){return Err("treasury overflow".into());}
    w.received_e8s.0=tally;
    let command=match btz_protocol::decode(&p.memo){Ok(c)=>c,Err(_)=>return Ok(rejection("MALFORMED_MEMO"))};
    let c=w.cannons.iter().find(|c|c.account==p.saved.account).cloned();
    let Some(c)=c else{
        let Command::Angle(angle)=command else{return Ok(rejection("NO_CANNON"));};
        if p.saved.amount.0<BigInt::from(1000000000){return Ok(rejection("UNDERFUNDED"));}
        if w.cannons.len()>=32{return Ok(rejection("CANNON_CAPACITY"));}
        if w.next_cannon_id>65535{return Ok(rejection("CANNON_ID_EXHAUSTED"));}
        if w.balls.len()>=64||w.next_ball_id==u32::MAX{return Ok(rejection("BALL_CAPACITY"));}
        let accounts:BTreeSet<_>=w.credits.iter().map(|s|s.account.as_str()).chain(w.cannons.iter().map(|c|c.account.as_str())).collect();
        if !accounts.contains(p.saved.account.as_str())&&accounts.len()>=1024{return Ok(rejection("ACCOUNTING_CAPACITY"));}
        return Ok(json!({"reason":"PENDING_SPAWN","angle":angle}));
    };
    match command{
        Command::Move(cell)=>{
            if p.saved.amount.0<BigInt::from(10000){return Ok(rejection("UNDERFUNDED"));}
            if moved.contains(&c.id){return Ok(rejection("MOVE_LIMIT"));}
            if w.cells.get(cell as usize)!=Some(&c.id){return Ok(rejection("NOT_OWN_TERRITORY"));}
            w.cannons.iter_mut().find(|x|x.id==c.id).ok_or("cannon missing")?.cell=cell as usize;moved.push(c.id);
            Ok(json!({"reason":"ACCEPTED","kind":"cannon_moved","cannon":c.id,"before":c.cell,"after":cell}))
        },
        Command::Angle(angle)=>{
            let count=w.balls.iter().filter(|b|b.owner==c.id).count();
            if count==0||count>32{return Err("price count".into());}
            let price=BigInt::from(10000000)*BigInt::from(count*count);
            if p.saved.amount.0<price{return Ok(rejection("UNDERFUNDED"));}
            if count>=32||w.balls.len()>=64||w.next_ball_id==u32::MAX{return Ok(rejection("BALL_CAPACITY"));}
            Ok(json!({"reason":"ACCEPTED","kind":"ball_spawned","cannon":c.id,"ball":launch(w,&c,angle)?}))
        }
    }
}
fn incoming(w:&World,i:&Intent)->Result<Option<Strike>>{
    let Some(t)=i.attack.as_ref()else{return Ok(None);};
    if t.defender==0||w.pending.iter().any(|p|p.ball==i.crossing.ball){return Ok(None);}
    let b=w.balls.iter().find(|b|b.id==i.crossing.ball).ok_or("incoming ball")?;
    Ok(Some(Strike{id:0,from:i.cell,to:t.target.ok_or("incoming target")?,axis:t.axis.clone(),ball:b.id,owner:i.owner,defender:t.defender,
        born:w.time.clone(),deadline:w.time.add(&Rat::new(1.into(),16.into())?)?,position:position(b,&w.time)?[usize::from(t.axis=="x")].clone()}))
}
fn match_strikes(w:&World,incoming:Vec<Strike>)->Result<Vec<[u32;2]>>{
    let mut edges:Vec<_>=w.pending.iter().filter(|p|w.valid_strike(p)).cloned().chain(incoming).collect();
    edges.sort_by_key(|p|(p.from.min(p.to),p.from.max(p.to),p.ball));
    let mut used=BTreeSet::new();let mut pairs=Vec::new();
    for(i,a)in edges.iter().enumerate(){
        if used.contains(&a.ball){continue;}
        for b in edges.iter().skip(i+1){
            if used.contains(&b.ball)||a.ball==b.ball{continue;}
            if a.from==b.to&&a.to==b.from&&a.owner==b.defender&&b.owner==a.defender&&w.time<=a.deadline&&w.time<=b.deadline
                &&a.position.sub(&b.position)?.abs()<=Rat::integer(64){
                used.insert(a.ball);used.insert(b.ball);pairs.push([a.ball,b.ball]);break;
            }
        }
    }
    Ok(pairs)
}
impl Cursor{
    pub fn begin(state:&[u8],inputs:Vec<Input>,context:&Value)->Result<Self>{
        let expected=identity()?;
        for key in ["rules_hash","config_hash","schema_hash"]{if context.get(key)!=expected.get(key){return Err("rule/config/schema identity".into());}}
        let world=World::decode(state)?;let start=Rat::integer(context_int(context,"logical_start")?);let end=Rat::integer(context_int(context,"logical_end")?);
        if world.time!=start||end<=start||end.sub(&start)?>Rat::integer(64)||end>Rat::integer(1000000000)||inputs.len()>4096{return Err("segment context".into());}
        let mut prior=None;
        for input in &inputs{
            let p=input.position.0.to_u64().ok_or("input position")?;
            if prior.is_some_and(|q|p<=q)||unhex(&input.payload_hex)?.len()>1024{return Err("unordered/oversize input".into());}prior=Some(p);
        }
        let seed_base=hash(&encode(&json!({"domain":"BTZ-SPAWN-INPUT-03","state":hash(state),"inputs":hash(&encode(&inputs)?),"logical_start":start}))?);
        let initial_credits=world.credits.clone();let next_time=start.clone();
        Ok(Self{world,inputs,input_index:0,moved:vec![],start,end,seed_base,initial_credits,phase:"commands".into(),events:vec![],receipts:vec![],
            scan:0,candidates:vec![],intents:vec![],next_time,areas:vec![],area_dirty:true,cache_areas:true,fast_topology:true,resolving:0,claimed:vec![],
            job:None,job_meta:None,after_topology:"resolve".into(),spawn_job:None,spawn_payment:None,spawn_angle:0,spawn_searches:0})
    }
    fn emit(&mut self,event:Value)->Result<()>{
        if self.events.len()>=131072{return Err("event capacity".into());}
        self.events.push(merge(json!({"sequence":self.events.len(),"time":self.world.time}),event));Ok(())
    }
    fn receipt(&mut self,p:&PaymentSaved,outcome:Value)->Result<()>{
        let pos=self.inputs.get(self.input_index).ok_or("receipt input")?.position.clone();self.input_index+=1;
        self.receipts.push(merge(json!({"position":pos,"account":p.account,"amount":p.amount}),outcome.clone()));
        if outcome.get("reason").and_then(Value::as_str)==Some("ACCEPTED"){self.emit(outcome)?;}Ok(())
    }
    fn restart_search(&mut self)->Result<()>{
        self.phase="search".into();self.scan=0;self.candidates.clear();self.intents.clear();self.claimed.clear();self.resolving=0;self.job=None;self.job_meta=None;
        let pending=std::mem::take(&mut self.world.pending);
        for p in pending{if self.world.valid_strike(&p){self.world.pending.push(p);}else{self.emit(json!({"kind":"strike_cancelled","strike":p.id,"reason":"INVALIDATED"}))?;}}
        Ok(())
    }
    pub fn work(&mut self)->Result<()>{
        match self.phase.as_str(){
            "commands"=>{
                if self.input_index>=self.inputs.len(){return self.restart_search();}
                let payment=read_payment(&self.inputs[self.input_index].payload_hex)?;
                let outcome=mutation(&mut self.world,&payment,&mut self.moved)?;
                if outcome.get("reason").and_then(Value::as_str)==Some("PENDING_SPAWN"){
                    if self.spawn_searches>=8{self.receipt(&payment.saved,rejection("SPAWN_SEARCH_CAPACITY"))?;}
                    else{
                        self.spawn_searches+=1;
                        let seed=hash(&encode(&json!({"base":self.seed_base,"position":self.inputs[self.input_index].position,"cannon":self.world.next_cannon_id}))?);
                        self.spawn_job=Some(SpawnJob::begin(seed));self.spawn_payment=Some(payment.saved);
                        self.spawn_angle=outcome["angle"].as_u64().ok_or("spawn angle")? as u16;self.phase="spawn".into();
                    }
                }else{self.receipt(&payment.saved,outcome)?;}
            },
            "spawn"=>{
                let done=self.spawn_job.as_mut().ok_or("missing spawn job")?.step(&self.world)?;
                if done{
                    let job=self.spawn_job.take().ok_or("missing spawn job")?;let payment=self.spawn_payment.take().ok_or("missing spawn payment")?;
                    let outcome=if let Some(r)=job.result{
                        let cannon=Cannon{id:self.world.next_cannon_id,cell:r.cell,account:payment.account.clone()};self.world.next_cannon_id+=1;
                        let previous:Vec<_>=r.patch.iter().map(|c|self.world.cells[*c]).collect();for c in &r.patch{self.world.cells[*c]=cannon.id;}
                        self.world.cannons.push(cannon.clone());let b=launch(&mut self.world,&cannon,self.spawn_angle)?;self.area_dirty=true;
                        json!({"reason":"ACCEPTED","kind":"cannon_spawned","cannon":cannon,"patch":r.patch,"previous_owners":previous,
                            "placement_class":r.kind,"frontier_other":r.other,"ball":b})
                    }else{json!({"reason":"NO_ELIGIBLE_SPAWN","checked":job.checked})};
                    self.receipt(&payment,outcome)?;self.phase="commands".into();
                }
            },
            "search"=>{
                if self.scan<self.world.balls.len(){
                    let crossing=next_crossing(&self.world.balls[self.scan],self.world.width,&self.world.time)?;self.scan+=1;
                    if crossing.time<self.end{self.candidates.push(crossing);}
                }else{
                    self.next_time=self.end.clone();
                    for t in self.candidates.iter().map(|c|&c.time).chain(self.world.pending.iter().map(|p|&p.deadline)){
                        if t<&self.next_time{self.next_time=t.clone();}
                    }
                    self.candidates.retain(|c|c.time==self.next_time);
                    if !self.cache_areas||self.area_dirty{self.areas=self.world.cannons.iter().map(|c|(c.id,0)).collect();self.scan=0;}
                    else{self.scan=self.world.cells.len();}self.phase="area".into();
                }
            },
            "area"=>{
                if self.scan<self.world.cells.len(){
                    let owner=self.world.cells[self.scan];self.scan+=1;if let Some(a)=self.areas.iter_mut().find(|a|a.0==owner){a.1+=1;}
                }else{
                    let dt=self.next_time.sub(&self.world.time)?;self.world.accrue(&dt,&self.areas)?;self.area_dirty=false;self.world.time=self.next_time.clone();
                    if self.world.time==self.end{self.world.validate()?;self.phase="done".into();}else{self.phase="batch".into();}
                }
            },
            "batch"=>{
                self.intents=self.candidates.iter().map(|c|{
                    let b=self.world.balls.iter().find(|b|b.id==c.ball).ok_or("batch ball missing")?;
                    Ok(classify(&self.world,b,c.clone()))
                }).collect::<Result<Vec<_>>>()?;
                self.intents.sort_by_key(|i|(i.owner,i.crossing.ball));
                let mut arrivals=Vec::new();for i in &self.intents{if let Some(p)=incoming(&self.world,i)?{arrivals.push(p);}}
                let pairs=match_strikes(&self.world,arrivals)?;
                if !pairs.is_empty(){
                    self.emit(json!({"kind":"annihilation","pairs":pairs}))?;
                    self.job=Some(topology::cleanup(&mut self.world,pairs.iter().flatten().copied().collect()));
                    self.job_meta=Some(json!({"kind":"annihilation_cleanup"}));self.after_topology="resolve".into();self.phase="topology".into();
                }else{self.phase="resolve".into();}
            },
            "resolve"=>self.resolve_one()?,
            "expire"=>{
                let mut due:Vec<_>=self.world.pending.iter().filter(|p|p.deadline<=self.world.time).cloned().collect();due.sort_by_key(|p|(p.owner,p.ball,p.id));
                if due.is_empty(){self.world.validate()?;return self.restart_search();}
                let p=&due[0];self.world.pending.retain(|s|s.id!=p.id);
                if self.world.valid_strike(p){
                    self.job=Some(topology::capture(&mut self.world,p.to,p.owner,self.fast_topology)?);
                    self.job_meta=Some(json!({"kind":"capture","attacker":p.owner,"ball":p.ball,"target":p.to,"strike":p.id}));
                    self.after_topology="expire".into();self.phase="topology".into();
                }else{self.emit(json!({"kind":"strike_cancelled","strike":p.id,"reason":"INVALIDATED"}))?;}
            },
            "topology"=>{
                let done=topology::step(&mut self.world,self.job.as_mut().ok_or("missing topology job")?)?;
                if done{
                    let mut j=self.job.take().ok_or("missing topology job")?;j.cells.sort_unstable();
                    let meta=self.job_meta.take().ok_or("missing topology event")?;
                    self.emit(merge(meta,json!({"cells":j.cells,"destroyed_balls":j.killed,"eliminated_cannons":j.eliminated})))?;
                    self.area_dirty=true;self.phase=self.after_topology.clone();
                }
            },
            "done"=>{},
            _=>return Err("unknown cursor phase".into()),
        }
        Ok(())
    }
    fn resolve_one(&mut self)->Result<()>{
        if self.resolving>=self.intents.len(){self.phase="expire".into();return Ok(());}
        let i=self.intents[self.resolving].clone();self.resolving+=1;
        let Some(index)=self.world.balls.iter().position(|b|b.id==i.crossing.ball)else{return Ok(());};
        let mut b=self.world.balls[index].clone();let mut pass_x=false;let mut pass_y=false;
        for t in &i.targets{
            let pass=t.pass&&t.target.is_some_and(|c|self.world.cells[c]==b.owner&&!self.world.cannons.iter().any(|a|a.cell==c));
            if t.axis=="x"{pass_x=pass;}else{pass_y=pass;}
        }
        let sx=b.vx.signum()as i64;let sy=b.vy.signum()as i64;let mut vertex_blocked=false;
        if i.crossing.x&&i.crossing.y&&pass_x&&pass_y{
            let diagonal=(b.cell as i64+sx+sy*self.world.width as i64)as usize;
            if self.world.cells.get(diagonal)!=Some(&b.owner)||self.world.cannons.iter().any(|c|c.cell==diagonal){pass_x=false;pass_y=false;vertex_blocked=true;}
        }
        let xy=position(&b,&self.world.time)?;
        if i.crossing.x&&!pass_x{reflect(&mut b,"x",i.crossing.xwall);}
        if i.crossing.y&&!pass_y{reflect(&mut b,"y",i.crossing.ywall);}
        let old_cell=b.cell;b.cell=(b.cell as i64+(if pass_x{sx}else{0})+(if pass_y{sy*self.world.width as i64}else{0}))as usize;
        self.world.balls[index]=b.clone();self.emit(json!({"kind":"motion","ball":b.id,"from_cell":old_cell,"ball_state":b,"vertex_blocked":vertex_blocked}))?;
        let attack=i.attack.filter(|t|!vertex_blocked&&t.target.is_some_and(|target|!self.claimed.contains(&target)&&self.world.cells[target]==t.defender
            &&!self.world.cannons.iter().any(|c|c.cell==target))&&!self.world.pending.iter().any(|p|p.ball==b.id));
        if let Some(t)=attack{
            let target=t.target.ok_or("attack target")?;
            if t.defender!=0{
                if self.world.next_strike_id==u32::MAX{return Err("strike ID exhausted".into());}
                let p=Strike{id:self.world.next_strike_id,from:old_cell,to:target,axis:t.axis.clone(),ball:b.id,owner:b.owner,defender:t.defender,
                    born:self.world.time.clone(),deadline:self.world.time.add(&Rat::new(1.into(),16.into())?)?,position:xy[usize::from(t.axis=="x")].clone()};
                self.world.next_strike_id+=1;self.world.pending.push(p.clone());self.emit(json!({"kind":"strike_armed","strike":p}))?;
            }else{
                self.claimed.push(target);self.job=Some(topology::capture(&mut self.world,target,b.owner,self.fast_topology)?);
                self.job_meta=Some(json!({"kind":"capture","attacker":b.owner,"ball":b.id,"target":target}));self.after_topology="resolve".into();self.phase="topology".into();
            }
        }
        Ok(())
    }
    pub fn step(&mut self,budget:usize)->Result<(usize,bool)>{
        if budget==0||budget>1_000_000{return Err("work budget".into());}
        let mut used=0;while self.phase!="done"&&used<budget{self.work()?;used+=1;}Ok((used,self.phase=="done"))
    }
    pub fn result(&self)->Result<Output>{
        if self.phase!="done"{return Err("incomplete segment".into());}
        let mut scores=Vec::new();
        for s in &self.world.credits{
            let initial=self.initial_credits.iter().find(|c|c.account==s.account).map(|c|c.units.clone()).unwrap_or_else(||Rat::integer(0));
            scores.push(Credit{account:s.account.clone(),units:s.units.sub(&initial)?});
        }
        Ok(Output{state:self.world.encode()?,events:encode(&json!({"version":3,"receipts":self.receipts,"events":self.events}))?,scores:encode(&json!({"version":3,"area_time":scores}))?})
    }
    pub fn snapshot(&self)->Result<Vec<u8>>{encode(&Snapshot{version:3,cursor:self.clone()})}
    /// The digest must come from trusted durable metadata, NOT an untrusted caller's own checksum.
    pub fn restore(bytes:&[u8],trusted_hash:&str)->Result<Self>{
        if hash(bytes)!=trusted_hash{return Err("cursor integrity".into());}
        let p:Snapshot=decode(bytes)?;let c=p.cursor;
        if p.version!=3||!matches!(c.phase.as_str(),"commands"|"spawn"|"search"|"area"|"batch"|"resolve"|"expire"|"topology"|"done")
            ||c.world.time<c.start||c.world.time>c.end||c.input_index>c.inputs.len()||c.receipts.len()!=c.input_index
            ||c.world.cells.len()>1024||c.events.len()>131072||c.world.balls.len()>64||c.intents.len()>64||c.world.pending.len()>64
            ||c.spawn_job.as_ref().is_some_and(|j|j.candidates.len()>5120){return Err("cursor bounds".into());}
        if matches!(c.phase.as_str(),"done"|"commands"|"spawn"|"search"|"area"){c.world.validate()?;}
        // Detect dropped fields or type changes in nested continuations as well as outer records.
        if c.snapshot()?!=bytes{return Err("cursor schema roundtrip".into());}
        Ok(c)
    }
}
