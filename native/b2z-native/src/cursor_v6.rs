//! Versioned command/capture continuation. Historical cursors omit this state.
//! Elapsed IC time is supplied explicitly by the host after logical completion.
use crate::{
    capture_v6,
    cursor::PaymentSaved,
    playability::{self, Fence},
    purchases_v6::{self, Batch, Plan},
    spawn::{Placement, SpawnJob},
    Cursor,
};
use dtr_wire::{encode, hash, Int, Result};
use num_bigint::BigInt;
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EconomyPredecessor {
    pub state_hash: String,
    pub population: u32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct State {
    #[serde(default, skip_serializing_if = "is_false")]
    pub entry_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub clearance_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub war_cry_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub deflector_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub context_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub shout_rules: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub spacing_rules: bool,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub reservoir_rules: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub economy_predecessor: Option<EconomyPredecessor>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_cry: Option<String>,
    pub plan: Option<Plan>,
    pub payment: Option<PaymentSaved>,
    pub batch: Option<Batch>,
    pub capture: Option<capture_v6::Job>,
    pub births: Vec<Fence>,
    pub finalized: bool,
}
fn is_false(v: &bool) -> bool {
    !*v
}
impl Cursor {
    pub(crate) fn validate_v6(&self) -> Result<()> {
        let s = self.v6.as_ref().ok_or("V6_CURSOR")?;
        if s.reservoir_rules != (self.world.version >= 8)
            || s.economy_predecessor.is_some() != (self.world.version >= 9)
            || s.reservoir_rules && !s.spacing_rules
            || s.spacing_rules && !s.shout_rules
            || s.shout_rules && !s.context_rules
            || s.context_rules && !s.deflector_rules
            || s.deflector_rules != (self.world.version >= 7)
            || s.finalized && self.phase != "done"
            || self.world.version < 9 && s.births.len() > playability::MAX_CANNONS
            || s.births
                .iter()
                .map(|f| f.cannon)
                .collect::<std::collections::BTreeSet<_>>()
                .len()
                != s.births.len()
            || s.capture.is_some() != (self.phase == "v6_topology")
            || s.batch.is_some() != (self.phase == "v6_purchase")
            || s.plan.is_some() != (self.phase == "v6_spawn")
            || s.payment.is_some() != matches!(self.phase.as_str(), "v6_spawn" | "v6_purchase")
            || self.phase == "v6_spawn" && self.spawn_job.is_none()
            || matches!(self.phase.as_str(), "spawn" | "topology")
        {
            return Err("V6_CURSOR_PHASE".into());
        }
        if let Some(batch) = &s.batch {
            batch.validate(&self.world)?;
            if batch.economy_multiplier
                != s.payment
                    .as_ref()
                    .and_then(|p| p.tariff.as_ref())
                    .map(|p| p.multiplier)
            {
                return Err("ECONOMY_PURCHASE_CONTINUATION".into());
            }
        }
        if let Some(plan) = &s.plan {
            if !matches!(plan, Plan::New { first: true, .. }) {
                return Err("V6_SPAWN_PLAN".into());
            }
        }
        Ok(())
    }
    pub(crate) fn v6_work(&mut self) -> Result<bool> {
        match self.phase.as_str() {
            "commands" => {
                if self.input_index == self.inputs.len() {
                    self.restart_search()?;
                    return Ok(true);
                }
                let context = self.v6.as_ref().unwrap().context_rules;
                let reservoir = self.v6.as_ref().unwrap().reservoir_rules;
                let mut recorded_ns = None;
                let mut authorization_transfer = None;
                let mut delegated_envelope = None;
                if self.world.version == 10 {
                    use crate::delegation_v18::{receipt_transfer, transfer, Decision};
                    let (payment, position) = transfer(&self.inputs[self.input_index])?;
                    let saved = PaymentSaved {
                        account: dtr_wire::hex(&payment.from),
                        amount: Int(payment.amount.into()),
                        tariff: None,
                        authorization_transfer: Some(receipt_transfer(&payment)),
                    };
                    let registry = self.world.authorization.as_mut().ok_or("AUTH_REGISTRY")?;
                    let decision = registry.apply(&payment, position)?;
                    if decision != Decision::Gameplay {
                        let tally = &self.world.received_e8s.0 + &saved.amount.0;
                        if tally >= BigInt::from(1) << 128usize {
                            return Err("treasury overflow".into());
                        }
                        self.world.received_e8s.0 = tally;
                        match decision {
                            Decision::Granted => self.receipt(&saved, json!({
                                "reason":"DELEGATION_GRANTED","status":"configured","kind":"game_access_granted",
                                "amount_used":Int(0.into()),"remainder":saved.amount,
                            }))?,
                            Decision::Revoked => self.receipt(&saved, json!({
                                "reason":"DELEGATION_REVOKED","status":"configured","kind":"game_access_revoked",
                                "amount_used":Int(0.into()),"remainder":saved.amount,
                            }))?,
                            Decision::Rejected(reason) => self.v6_reject(&saved, reason)?,
                            Decision::Gameplay => unreachable!(),
                        }
                        return Ok(true);
                    }
                    authorization_transfer = saved.authorization_transfer;
                    delegated_envelope = Some(payment.pricing_envelope()?);
                }
                let mut payment = if reservoir {
                    let mut bytes = match delegated_envelope {
                        Some(bytes) => bytes,
                        None => dtr_wire::unhex(&self.inputs[self.input_index].payload_hex)?,
                    };
                    if self.world.version >= 9 {
                        let (previous, time) = b2z_protocol::economy17::untimed(&bytes)
                            .map_err(|_| "adapter11 payment envelope")?;
                        bytes = previous;
                        recorded_ns = Some(time);
                    }
                    let legacy = b2z_protocol::reservoir::predecessor_envelope(&bytes)
                        .map_err(|_| "adapter10 payment envelope")?;
                    crate::cursor::read_payment_shout(&dtr_wire::hex(&legacy))?
                } else if self.v6.as_ref().unwrap().shout_rules {
                    crate::cursor::read_payment_shout(&self.inputs[self.input_index].payload_hex)?
                } else if context {
                    crate::cursor::read_payment_context(&self.inputs[self.input_index].payload_hex)?
                } else if self.v6.as_ref().unwrap().deflector_rules {
                    crate::cursor::read_payment_deflectors(
                        &self.inputs[self.input_index].payload_hex,
                    )?
                } else {
                    crate::cursor::read_payment_with_annotations(
                        &self.inputs[self.input_index].payload_hex,
                        self.v6.as_ref().unwrap().war_cry_rules,
                    )?
                };
                if self.v6.as_ref().unwrap().war_cry_rules {
                    self.v6.as_mut().unwrap().pending_cry = payment.cry.clone();
                }
                payment.saved.authorization_transfer = authorization_transfer;
                let amount = payment.saved.amount.0.to_u64().ok_or("PAYMENT_AMOUNT")?;
                let tally = &self.world.received_e8s.0 + &payment.saved.amount.0;
                if tally >= BigInt::from(1) << 128usize {
                    return Err("treasury overflow".into());
                }
                let site = if reservoir {
                    b2z_protocol::reservoir::cell(&payment.memo).map_err(|_| "RESERVOIR_MEMO")?
                } else {
                    None
                };
                let plan = if let Some(time) = recorded_ns {
                    let (plan, paid_at) = crate::economy17::prepare(
                        &self.world,
                        &payment.saved.account,
                        amount,
                        &payment.memo,
                        &self.moved,
                        time,
                    )?;
                    payment.saved.tariff = Some(paid_at);
                    plan
                } else if let Some(cell) = site {
                    crate::reservoirs::prepare(&self.world, &payment.saved.account, amount, cell)?
                } else if context {
                    crate::context_structures::prepare(
                        &self.world,
                        &payment.saved.account,
                        amount,
                        &payment.memo,
                        &self.moved,
                        self.v6.as_ref().unwrap().spacing_rules,
                    )?
                } else {
                    purchases_v6::prepare_with_clearance(
                        &self.world,
                        &payment.saved.account,
                        amount,
                        &payment.memo,
                        &self.moved,
                        self.v6.as_ref().unwrap().clearance_rules,
                    )?
                };
                self.world.received_e8s.0 = tally;
                match &plan {
                    Plan::Rejected { reason } => self.v6_reject(&payment.saved, reason)?,
                    Plan::Reservoir { cell, price } => {
                        crate::reservoirs::place(&mut self.world, *cell)?;
                        self.receipt(&payment.saved,json!({"kind":"reservoir_built","cell":cell,"reason":"ACCEPTED","status":"applied","amount_used":price,"remainder":Int(&payment.saved.amount.0-&price.0)}))?;
                    }
                    Plan::Deflect {
                        owner,
                        cell,
                        orientation,
                        price,
                    } => {
                        let id = self.world.next_deflector_id.ok_or("structure counter")?;
                        let d = crate::world::Deflector {
                            id,
                            owner: *owner,
                            cell: *cell,
                            orientation: orientation.clone(),
                        };
                        self.world.next_deflector_id =
                            Some(id.checked_add(1).ok_or("structure counter")?);
                        let ds = self.world.deflectors.as_mut().ok_or("structure state")?;
                        ds.push(d.clone());
                        ds.sort_by_key(|d| d.cell);
                        self.receipt(&payment.saved,json!({"reason":"ACCEPTED","kind":"deflector_built","structure":d,"status":"applied","amount_used":price,"remainder":Int(&payment.saved.amount.0-&price.0)}))?;
                    }
                    Plan::DeflectorMove { id, cell, price } => {
                        let ds = self.world.deflectors.as_mut().ok_or("structure state")?;
                        let d = ds.iter_mut().find(|d| d.id == *id).ok_or("NO_DEFLECTOR")?;
                        let before = d.clone();
                        d.cell = *cell;
                        let after = d.clone();
                        ds.sort_by_key(|d| d.cell);
                        self.receipt(&payment.saved,json!({"reason":"ACCEPTED","kind":"deflector_moved","before":before,"structure":after,"status":"applied","amount_used":price,"remainder":Int(&payment.saved.amount.0-&price.0)}))?;
                    }
                    Plan::DeflectorReorient {
                        id,
                        orientation,
                        price,
                    } => {
                        let ds = self.world.deflectors.as_mut().ok_or("structure state")?;
                        let d = ds.iter_mut().find(|d| d.id == *id).ok_or("NO_DEFLECTOR")?;
                        let before = d.clone();
                        d.orientation = orientation.clone();
                        let after = d.clone();
                        self.receipt(&payment.saved,json!({"reason":"ACCEPTED","kind":"deflector_reoriented","before":before,"structure":after,"status":"applied","amount_used":price,"remainder":Int(&payment.saved.amount.0-&price.0)}))?;
                    }
                    Plan::Move {
                        cannon,
                        cell,
                        price,
                    } => {
                        let c = self
                            .world
                            .cannons
                            .iter_mut()
                            .find(|c| c.id == *cannon)
                            .ok_or("UNKNOWN_CANNON")?;
                        let before = c.cell;
                        c.cell = *cell;
                        self.moved.push(*cannon);
                        self.receipt(&payment.saved,json!({"reason":"ACCEPTED","kind":"cannon_moved","status":"applied","cannon":cannon,"before":before,"after":cell,"amount_used":price,"remainder":Int(&payment.saved.amount.0-&price.0)}))?;
                    }
                    Plan::Fire { .. } => {
                        let mut batch = Batch::fire(payment.saved.account.clone(), amount, &plan)?;
                        batch.economy_multiplier =
                            payment.saved.tariff.as_ref().map(|p| p.multiplier);
                        self.v6.as_mut().unwrap().batch = Some(batch);
                        self.v6.as_mut().unwrap().payment = Some(payment.saved);
                        self.phase = "v6_purchase".into();
                    }
                    Plan::New {
                        first,
                        angle,
                        player,
                        cell,
                        ..
                    } => {
                        if self.spawn_searches >= 8 {
                            self.v6_reject(&payment.saved, "SPAWN_SEARCH_CAPACITY")?;
                        } else {
                            self.spawn_searches += 1;
                            let seed = hash(&encode(
                                &json!({"base":self.seed_base,"position":self.inputs[self.input_index].position,"cannon":self.world.next_cannon_id}),
                            )?);
                            if *first {
                                self.spawn_job = Some(if self.v6.as_ref().unwrap().entry_rules {
                                    SpawnJob::begin_entry(
                                        &self.world,
                                        seed,
                                        self.v6.as_ref().unwrap().spacing_rules,
                                    )?
                                } else {
                                    SpawnJob::begin(seed)
                                });
                                self.spawn_angle = *angle;
                                let state = self.v6.as_mut().unwrap();
                                state.payment = Some(payment.saved);
                                state.plan = Some(plan);
                                self.phase = "v6_spawn".into();
                            } else {
                                let site = match cell {
                                    Some(c) => Some(*c),
                                    None => purchases_v6::choose_adjacent_with_clearance(
                                        &self.world,
                                        player.ok_or("UNKNOWN_PLAYER")?,
                                        &seed,
                                        self.v6.as_ref().unwrap().clearance_rules,
                                    )?,
                                };
                                if let Some(cell) = site {
                                    self.v6_place(
                                        &payment.saved,
                                        &plan,
                                        &Placement {
                                            cell,
                                            patch: vec![cell],
                                            kind: 4,
                                            other: -1,
                                            checked: 1,
                                        },
                                    )?;
                                } else {
                                    self.v6_reject(&payment.saved, "NO_ADJACENT_SITE")?;
                                }
                            }
                        }
                    }
                }
            }
            "v6_spawn" => {
                if self
                    .spawn_job
                    .as_mut()
                    .ok_or("SPAWN_JOB")?
                    .step_with_spacing(&self.world, self.v6.as_ref().unwrap().spacing_rules)?
                {
                    let job = self.spawn_job.take().unwrap();
                    let state = self.v6.as_mut().unwrap();
                    let payment = state.payment.take().ok_or("SPAWN_PAYMENT")?;
                    let plan = state.plan.take().ok_or("SPAWN_PLAN")?;
                    if let Some(placement) = job.result {
                        self.v6_place(&payment, &plan, &placement)?;
                    } else {
                        self.v6_reject(&payment, "NO_ELIGIBLE_SPAWN")?;
                        self.phase = "commands".into();
                    }
                }
            }
            "v6_purchase" => {
                let state = self.v6.as_mut().unwrap();
                let batch = state.batch.as_mut().ok_or("PURCHASE_BATCH")?;
                let cannon = batch.cannon;
                let angle = batch.angle;
                let launch = batch.step(&mut self.world)?;
                let done = batch.stop_reason.is_some();
                if let Some(l) = launch {
                    self.emit(json!({"kind":"ball_spawned","cannon":cannon,"ball":l.ball,"heading":angle,"revived":l.revived,"reactivated_cannons":l.reactivated,"metadata_delta":l.metadata_delta}))?;
                    self.area_dirty = true;
                }
                if done {
                    let state = self.v6.as_mut().unwrap();
                    let batch = state.batch.take().unwrap();
                    let payment = state.payment.take().ok_or("PURCHASE_PAYMENT")?;
                    self.receipt(&payment, batch.receipt()?)?;
                    self.phase = "commands".into();
                }
            }
            "v6_topology" => {
                let state = self.v6.as_mut().unwrap();
                if state
                    .capture
                    .as_mut()
                    .ok_or("CAPTURE_JOB")?
                    .step(&mut self.world)?
                {
                    let job = state.capture.take().unwrap();
                    for fence in &job.fences {
                        state.births.retain(|f| f.cannon != fence.cannon);
                        state.births.push(fence.clone());
                    }
                    let mut event = job.event()?;
                    if let Some(meta) = self.job_meta.take() {
                        if let Some(strike) = meta.get("strike") {
                            event["strike"] = strike.clone();
                        }
                    }
                    self.emit(event)?;
                    self.area_dirty = true;
                    self.phase = self.after_topology.clone();
                }
            }
            _ => return Ok(false),
        }
        Ok(true)
    }
    fn v6_reject(&mut self, payment: &PaymentSaved, reason: &str) -> Result<()> {
        self.receipt(payment,json!({"reason":reason,"status":"rejected","amount_used":Int(0.into()),"remainder":payment.amount}))
    }
    fn v6_place(
        &mut self,
        payment: &PaymentSaved,
        plan: &Plan,
        placement: &Placement,
    ) -> Result<()> {
        let amount = payment.amount.0.to_u64().ok_or("PAYMENT_AMOUNT")?;
        let rules = self.v6.as_ref().unwrap();
        let policy = if rules.spacing_rules {
            purchases_v6::SitePolicy::Separation
        } else if rules.context_rules {
            purchases_v6::SitePolicy::Proximity
        } else {
            purchases_v6::SitePolicy::Legacy
        };
        let created = purchases_v6::place_new_with_context(
            &self.world,
            &payment.account,
            purchases_v6::PurchaseTerms {
                amount,
                multiplier: payment.tariff.as_ref().map(|p| p.multiplier),
            },
            plan,
            placement,
            rules.entry_rules,
            policy,
        )?;
        let mut batch = Batch::after_new(payment.account.clone(), amount, created.cannon.id, plan)?;
        batch.economy_multiplier = payment.tariff.as_ref().map(|p| p.multiplier);
        self.world = created.world;
        self.emit(created.event)?;
        self.area_dirty = true;
        let state = self.v6.as_mut().unwrap();
        state.plan = None;
        state.payment = Some(payment.clone());
        state.batch = Some(batch);
        self.phase = "v6_purchase".into();
        Ok(())
    }
    pub(crate) fn v6_capture(
        &mut self,
        target: usize,
        ball: u32,
        after: &str,
        meta: Value,
    ) -> Result<()> {
        self.v6.as_mut().ok_or("V6_CURSOR")?.capture =
            Some(capture_v6::Job::capture(&self.world, target, ball)?);
        self.after_topology = after.into();
        self.job_meta = Some(meta);
        self.phase = "v6_topology".into();
        Ok(())
    }
    pub(crate) fn v6_cleanup(&mut self, pairs: &[[u32; 2]]) -> Result<()> {
        self.v6.as_mut().ok_or("V6_CURSOR")?.capture =
            Some(capture_v6::Job::cleanup(&self.world, pairs)?);
        self.after_topology = "resolve".into();
        self.phase = "v6_topology".into();
        Ok(())
    }
    pub fn needs_elapsed(&self) -> bool {
        self.world.version >= 6
            && self.phase == "done"
            && self.v6.as_ref().is_none_or(|s| !s.finalized)
    }
    /// Seal the explicit consensus-observed completion fact before result/hash.
    /// Replay supplies this same authenticated event fact; no ambient clock.
    pub fn finalize_elapsed(&mut self, observed_ns: u64) -> Result<()> {
        if !self.needs_elapsed() {
            return Err("LIFECYCLE_FINALIZATION_STATE".into());
        }
        let state = self.v6.as_ref().ok_or("V6_CURSOR")?;
        let previous = self.world.playability.as_ref().unwrap().elapsed_ns.clone();
        let snapshot = if let Some(anchor) = &state.economy_predecessor {
            self.world
                .economy
                .as_mut()
                .ok_or("ECONOMY_SCHEMA")?
                .observe(
                    playability::elapsed(&previous)?,
                    observed_ns,
                    anchor.population,
                    anchor.state_hash.clone(),
                )?
        } else {
            None
        };
        let stamped = playability::finalize_elapsed(&mut self.world, observed_ns, &state.births)?;
        let deadline = observed_ns
            .checked_add(playability::DORMANCY_GRACE_NS)
            .ok_or("LIFECYCLE_TIME_OVERFLOW")?;
        // Even a birth followed by revival in this segment gets the same explicit
        // completion time in its historical event, never the prior observation.
        for event in &mut self.events {
            let births = event
                .get("dormant")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            if let Some(rows) = event
                .get_mut("metadata_delta")
                .and_then(|d| d.get_mut("lifecycle"))
                .and_then(Value::as_array_mut)
            {
                for row in rows {
                    if births.iter().any(|f| {
                        f.get("cannon") == row.get("cannon")
                            && f.get("generation") == row.get("generation")
                    }) {
                        row["dormant_since_ns"] = json!(Int(observed_ns.into()));
                        row["deadline_ns"] = json!(Int(deadline.into()));
                    }
                }
            }
            if let Some(fences) = event.get_mut("dormant").and_then(Value::as_array_mut) {
                for f in fences {
                    f["deadline_ns"] = json!(Int(deadline.into()));
                }
            }
        }
        if let Some(snapshot) = snapshot {
            self.emit(json!({"kind":"economy_snapshot","snapshot":snapshot}))?;
        }
        self.emit(json!({"kind":"lifecycle_time","previous_elapsed_ns":previous,"observed_ns":Int(observed_ns.into()),"stamped":stamped}))?;
        self.v6.as_mut().unwrap().finalized = true;
        self.world.validate()?;
        Ok(())
    }
}
