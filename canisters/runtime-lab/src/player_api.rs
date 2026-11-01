//! Bounded public inspection/preparation. No updates, wallet or controller access.
//! A typed reply is not certified: verify its reference and recompute it from the
//! authenticated state artifact before relying on it for payment preparation.
use super::{number, root, Publication, Root};
use b2z_native::{playability as v6, pricing_v6, purchases_v6, world::World};
use candid::{CandidType, Nat, Principal};
use dtr_wire::{decode, hash, unhex, Int, Rat, Result};
use serde::Deserialize;

#[derive(Clone, CandidType, Deserialize)]
pub struct StateRef {
    publication_hash: String,
    state_hash: String,
    manifest_hash: String,
    segment_id: Option<u64>,
    logical_end: u64,
    source_to_exclusive: u64,
    source_id: String,
    rules_hash: String,
    config_hash: String,
    schema_hash: String,
    epoch_hash: Option<String>,
    certified_reply: bool,
}
#[derive(CandidType, Deserialize)]
pub struct Limits {
    total_cannons: u32,
    total_balls: u32,
    retained_cannons_per_account: u32,
    purchase_balls_per_island: u32,
    maximum_quantity: u8,
}
#[derive(CandidType, Deserialize)]
pub struct Destination {
    network: String,
    ledger: Principal,
    index: Principal,
    owner: Principal,
    receiving_numeric_subaccount: u64,
    icp_account: String,
}
#[derive(CandidType, Deserialize)]
pub struct GameInfo {
    state: StateRef,
    world_version: u32,
    width: u32,
    height: u32,
    limits: Limits,
    destination: Destination,
    configuration: Vec<u8>,
    memo_adapter_version: u8,
    payments_retained: bool,
    wallet_execution_available: bool,
}
#[derive(CandidType, Deserialize)]
pub struct Rational {
    numerator: candid::Int,
    denominator: Nat,
}
impl From<&Rat> for Rational {
    fn from(v: &Rat) -> Self {
        Self {
            numerator: candid::Int(v.0.numer().clone()),
            denominator: Nat(v
                .0
                .denom()
                .to_biguint()
                .expect("positive rational denominator")),
        }
    }
}
#[derive(CandidType, Deserialize)]
pub struct CannonView {
    cannon_id: u32,
    funding_account: String,
    cell: u32,
    heading: Option<u16>,
    player_id: u32,
    island_id: u32,
    island_ball_ids: Vec<u32>,
    owned_island_cells: u32,
    dormant_since_ns: Option<u64>,
    deadline_ns: Option<u64>,
}
#[derive(CandidType, Deserialize)]
pub struct PlayerView {
    state: StateRef,
    funding_account: String,
    player_id: Option<u32>,
    cannons: Vec<CannonView>,
    accrued_area_time: Rational,
    owned_cells: u32,
    active_balls: u32,
}
#[derive(CandidType, Deserialize)]
pub struct CannonReply {
    state: StateRef,
    cannon: Option<CannonView>,
}
#[derive(CandidType, Deserialize)]
pub struct CellView {
    cell: u32,
    island_id: u32,
    player_id: u32,
}
#[derive(CandidType, Deserialize)]
pub struct BallView {
    ball_id: u32,
    player_id: u32,
    cell: u32,
    x_intercept: candid::Int,
    y_intercept: candid::Int,
    velocity_x: i32,
    velocity_y: i32,
}
#[derive(CandidType, Deserialize)]
pub struct Region {
    state: StateRef,
    logical_time: Rational,
    cells: Vec<CellView>,
    cannons: Vec<CannonView>,
    balls: Vec<BallView>,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum QuoteAction {
    Fire {
        cannon: u32,
        angle: u16,
        quantity: u8,
    },
    New {
        angle: u16,
        quantity: u8,
        cell: Option<u32>,
    },
    Move {
        cannon: u32,
        cell: u32,
    },
}
#[derive(CandidType, Deserialize)]
pub struct Quote {
    state: StateRef,
    funding_account: String,
    destination: Destination,
    amount_e8s_excluding_fee: u64,
    per_item_e8s: Vec<u64>,
    requested_quantity: u8,
    maximum_fill_now: u8,
    memo_bytes: Vec<u8>,
    numeric_memo: u64,
    text_memo: Option<String>,
    limits: Limits,
    reservation: bool,
    unused_payment_retained: bool,
}
#[derive(CandidType, Deserialize)]
pub enum ReceiptStatus {
    Pending,
    Applied,
    PartiallyApplied,
    Rejected,
    Duplicate,
    UnknownOrNotRetained,
}
#[derive(CandidType, Deserialize)]
pub struct Receipt {
    state: StateRef,
    ledger_position: u64,
    searched_segment: Option<u64>,
    search_retained: bool,
    status: ReceiptStatus,
    account: Option<String>,
    reason: Option<String>,
    requested_quantity: Option<u8>,
    actual_quantity: Option<u8>,
    amount_used_e8s: Option<u64>,
    retained_remainder_e8s: Option<u64>,
    per_item_e8s: Vec<u64>,
    stop_reason: Option<String>,
    canonical_receipt: Option<Vec<u8>>,
    event_artifact_hash: Option<String>,
}
fn account(value: &str) -> Result<()> {
    if value.len() != 64
        || value
            .bytes()
            .any(|b| !b.is_ascii_digit() && !(b'a'..=b'f').contains(&b))
    {
        return Err("ACCOUNT_FORMAT".into());
    }
    ic_ledger_types::AccountIdentifier::from_hex(value).map_err(|_| "ACCOUNT_CHECKSUM")?;
    Ok(())
}
fn uint(value: &serde_json::Value) -> Result<u64> {
    if let Some(n) = value.as_u64() {
        return Ok(n);
    }
    number(&serde_json::from_value::<Int>(value.clone()).map_err(|_| "RECEIPT_INTEGER")?)
}
fn quantity(value: Option<u64>) -> Result<Option<u8>> {
    value
        .map(|n| {
            u8::try_from(n)
                .ok()
                .filter(|n| *n <= 64)
                .ok_or_else(|| "RECEIPT_QUANTITY".into())
        })
        .transpose()
}
fn reference(r: &Root, p: &Publication) -> Result<StateRef> {
    Ok(StateRef {
        publication_hash: r.publication_hash.clone(),
        state_hash: p.head.state_hash.clone(),
        manifest_hash: p.head.manifest_hash.clone(),
        segment_id: p.head.segment_id.as_ref().map(number).transpose()?,
        logical_end: number(&p.head.logical_end)?,
        source_to_exclusive: number(&p.head.source_to_exclusive)?,
        source_id: p.identity.source_id.clone(),
        rules_hash: p.identity.rules_hash.clone(),
        config_hash: p.identity.config_hash.clone(),
        schema_hash: p.identity.schema_hash.clone(),
        epoch_hash: p.epoch.as_ref().map(|e| e.transition_hash.clone()),
        certified_reply: false,
    })
}
fn artifact(p: &Publication, r: &Root, kind: u8) -> Result<Vec<u8>> {
    let descriptor = p.artifacts.get(kind as usize).ok_or("ARTIFACT_KIND")?;
    if descriptor.length > super::MAX_ARTIFACT {
        return Err("ARTIFACT_BOUNDS".into());
    }
    let mut bytes = Vec::with_capacity(descriptor.length);
    for n in 0..descriptor.chunks.len() {
        bytes.extend(super::artifact_chunk(
            r.publication_hash.clone(),
            kind,
            n as u16,
        )?);
    }
    if hash(&bytes) != descriptor.sha256 {
        return Err("ARTIFACT_INTEGRITY".into());
    }
    Ok(bytes)
}
fn load() -> Result<(Root, Publication, World)> {
    let r = root()?;
    let p = decode(&unhex(&r.publication_hex)?)?;
    let w = World::decode(&artifact(&p, &r, 0)?)?;
    Ok((r, p, w))
}
fn limits(w: &World) -> Limits {
    let six = w.version == 6;
    Limits {
        total_cannons: if six { v6::MAX_CANNONS as u32 } else { 32 },
        total_balls: if six { v6::MAX_BALLS as u32 } else { 64 },
        retained_cannons_per_account: if six {
            v6::MAX_RETAINED_PER_PLAYER as u32
        } else {
            1
        },
        purchase_balls_per_island: if six {
            v6::MAX_PURCHASE_BALLS_PER_ISLAND as u32
        } else {
            32
        },
        maximum_quantity: if six { 64 } else { 1 },
    }
}
fn destination(r: &Root) -> Result<Destination> {
    Ok(Destination {
        network: r.source.network.clone(),
        ledger: Principal::from_text(&r.source.ledger).map_err(|_| "LEDGER_ID")?,
        index: Principal::from_text(&r.source.index).map_err(|_| "INDEX_ID")?,
        owner: ic_cdk::api::canister_self(),
        receiving_numeric_subaccount: r.source.receiving_subaccount,
        icp_account: r.source.recipient_hex.clone(),
    })
}
fn cannon(w: &World, id: u32) -> Result<Option<CannonView>> {
    let Some(c) = w.cannons.iter().find(|c| c.id == id) else {
        return Ok(None);
    };
    let player = w.player_for_cannon(id).ok_or("CANNON_PLAYER")?;
    let island = w.owner(c.cell).ok_or("CANNON_ISLAND")?;
    let life = w.playability.as_ref().and_then(|s| s.life(id));
    Ok(Some(CannonView {
        cannon_id: id,
        funding_account: c.account.clone(),
        cell: c.cell as u32,
        heading: c.heading,
        player_id: player,
        island_id: island,
        island_ball_ids: w
            .balls
            .iter()
            .filter(|b| b.owner == player && (w.version < 6 || w.owner(b.cell) == Some(island)))
            .map(|b| b.id)
            .collect(),
        owned_island_cells: w
            .ownership_counts()
            .iter()
            .find(|(id, _)| *id == island)
            .map_or(0, |(_, n)| *n as u32),
        dormant_since_ns: life
            .and_then(|l| l.dormant_since_ns.as_ref())
            .map(number)
            .transpose()?,
        deadline_ns: life
            .and_then(|l| l.deadline_ns.as_ref())
            .map(number)
            .transpose()?,
    }))
}
pub fn game_info() -> Result<GameInfo> {
    let (r, p, w) = load()?;
    let configuration = match w.version {
        6 => include_bytes!("../../../apps/b2z-observer/configuration-playability.bin").as_slice(),
        5 => include_bytes!("../../../apps/b2z-observer/configuration-million.bin").as_slice(),
        4 => include_bytes!("../../../apps/b2z-observer/configuration-torus.bin").as_slice(),
        _ => include_bytes!("../../../apps/b2z-observer/configuration.bin").as_slice(),
    };
    if hash(configuration) != p.identity.config_hash {
        return Err("CONFIGURATION_UNAVAILABLE".into());
    }
    Ok(GameInfo {
        state: reference(&r, &p)?,
        world_version: w.version,
        width: w.width as u32,
        height: w.height as u32,
        limits: limits(&w),
        destination: destination(&r)?,
        configuration: configuration.to_vec(),
        memo_adapter_version: r.source.memo_adapter_version,
        payments_retained: true,
        wallet_execution_available: false,
    })
}
pub fn player_state(funding_account: String) -> Result<PlayerView> {
    account(&funding_account)?;
    let (r, p, w) = load()?;
    let player = if w.version == 6 {
        purchases_v6::player_by_account(&w, &funding_account)
    } else {
        w.cannons
            .iter()
            .find(|c| c.account == funding_account)
            .map(|c| c.id)
    };
    let cannons = w
        .cannons
        .iter()
        .filter(|c| c.account == funding_account)
        .map(|c| cannon(&w, c.id).map(Option::unwrap))
        .collect::<Result<Vec<_>>>()?;
    let units = w
        .credits
        .iter()
        .find(|s| s.account == funding_account)
        .map(|s| s.units.clone())
        .unwrap_or_else(|| Rat::integer(0));
    let owned = w
        .ownership_counts()
        .iter()
        .filter(|(island, _)| {
            w.account_for_player(if w.version == 6 {
                territory_player(&w, *island)
            } else {
                *island
            }) == Some(funding_account.as_str())
        })
        .map(|(_, n)| *n)
        .sum::<usize>();
    Ok(PlayerView {
        state: reference(&r, &p)?,
        funding_account,
        player_id: player,
        cannons,
        accrued_area_time: Rational::from(&units),
        owned_cells: owned as u32,
        active_balls: w.balls.iter().filter(|b| Some(b.owner) == player).count() as u32,
    })
}
fn territory_player(w: &World, id: u32) -> u32 {
    if w.version == 6 {
        b2z_native::territory_v6::player(w, id).unwrap_or(0)
    } else {
        id
    }
}
pub fn cannon_state(id: u32) -> Result<CannonReply> {
    let (r, p, w) = load()?;
    Ok(CannonReply {
        state: reference(&r, &p)?,
        cannon: cannon(&w, id)?,
    })
}
fn region_cells(w: &World, cell: u32, width: u8, height: u8) -> Result<Vec<CellView>> {
    if cell as usize >= w.cell_count() || width == 0 || height == 0 || width > 16 || height > 16 {
        return Err("REGION_BOUNDS".into());
    }
    if !w.torus()
        && (cell as usize % w.width + width as usize > w.width
            || cell as usize / w.width + height as usize > w.height)
    {
        return Err("REGION_BOUNDS".into());
    }
    let mut cells = Vec::new();
    for y in 0..height as usize {
        for x in 0..width as usize {
            let cx = (cell as usize % w.width + x) % w.width;
            let cy = (cell as usize / w.width + y) % w.height;
            let c = cy * w.width + cx;
            cells.push(CellView {
                cell: c as u32,
                island_id: w.owner(c).ok_or("CELL")?,
                player_id: w.player_at(c).ok_or("PLAYER")?,
            });
        }
    }
    Ok(cells)
}
pub fn nearby_region(cell: u32, width: u8, height: u8) -> Result<Region> {
    if cell >= 1_000_000 || width == 0 || height == 0 || width > 16 || height > 16 {
        return Err("REGION_BOUNDS".into());
    }
    let (r, p, w) = load()?;
    let cells = region_cells(&w, cell, width, height)?;
    let has = |cell: usize| cells.iter().any(|c| c.cell as usize == cell);
    let cannons = w
        .cannons
        .iter()
        .filter(|c| has(c.cell))
        .map(|c| cannon(&w, c.id).map(Option::unwrap))
        .collect::<Result<Vec<_>>>()?;
    let balls = w
        .balls
        .iter()
        .filter(|b| has(b.cell))
        .map(|b| BallView {
            ball_id: b.id,
            player_id: b.owner,
            cell: b.cell as u32,
            x_intercept: candid::Int(b.x0.0.clone()),
            y_intercept: candid::Int(b.y0.0.clone()),
            velocity_x: b.vx,
            velocity_y: b.vy,
        })
        .collect();
    Ok(Region {
        state: reference(&r, &p)?,
        logical_time: Rational::from(&w.time),
        cells,
        cannons,
        balls,
    })
}
fn command(action: &QuoteAction) -> b2z_protocol::v6::Command {
    use b2z_protocol::v6::Command;
    match *action {
        QuoteAction::Fire {
            cannon,
            angle,
            quantity,
        } => Command::Fire {
            cannon,
            angle,
            quantity,
        },
        QuoteAction::New {
            angle,
            quantity,
            cell,
        } => Command::New {
            angle,
            quantity,
            cell,
        },
        QuoteAction::Move { cannon, cell } => Command::Move { cannon, cell },
    }
}
fn quote_items(w: &World, funding_account: &str, action: &QuoteAction) -> Result<Vec<u64>> {
    account(funding_account)?;
    if w.version != 6 {
        return Err("RULES_V6_NOT_ACTIVE".into());
    }
    let memo = b2z_protocol::v6::encode(command(action)).map_err(|_| "COMMAND_BOUNDS")?;
    let plan = purchases_v6::prepare(w, funding_account, u64::MAX, &memo, &[])?;
    let free = v6::MAX_BALLS.saturating_sub(w.balls.len());
    match plan {
        purchases_v6::Plan::Rejected { reason } => Err(reason),
        purchases_v6::Plan::Move { price, .. } => Ok(vec![number(&price)?]),
        purchases_v6::Plan::Fire {
            cannon, quantity, ..
        } => {
            let pool = w.territory_ball_count(cannon);
            let fill = (quantity as usize)
                .min(free)
                .min(v6::MAX_PURCHASE_BALLS_PER_ISLAND.saturating_sub(pool));
            if fill == 0 {
                return Err("BALL_CAPACITY".into());
            }
            (0..fill)
                .map(|i| pricing_v6::ball_price((pool + i) as u32))
                .collect()
        }
        purchases_v6::Plan::New {
            quantity,
            cell,
            player,
            first,
            ..
        } => {
            let mut counts = if first {
                vec![0]
            } else if let Some(cell) = cell {
                vec![purchases_v6::site_pool_count(
                    w,
                    player.ok_or("PLAYER")?,
                    cell,
                )]
            } else {
                let player = player.ok_or("PLAYER")?;
                purchases_v6::adjacent_sites(w, player)?
                    .into_iter()
                    .map(|cell| purchases_v6::site_pool_count(w, player, cell))
                    .filter(|n| *n < v6::MAX_PURCHASE_BALLS_PER_ISLAND)
                    .collect::<Vec<_>>()
            };
            counts.sort_unstable();
            counts.dedup();
            if counts.is_empty() {
                return Err("NO_ADJACENT_SITE".into());
            }
            if quantity > 1 && counts.len() != 1 {
                return Err("CHOOSE_SITE_FOR_EXACT_BATCH".into());
            }
            let pool = counts[0];
            let fill = (quantity as usize)
                .min(free)
                .min(v6::MAX_PURCHASE_BALLS_PER_ISLAND.saturating_sub(pool));
            if fill == 0 {
                return Err("BALL_CAPACITY".into());
            }
            let mut prices = vec![pricing_v6::cannon_price(
                w.cannons
                    .iter()
                    .filter(|c| c.account == funding_account)
                    .count() as u32,
            )?];
            for i in 1..fill {
                prices.push(pricing_v6::ball_price((pool + i) as u32)?);
            }
            Ok(prices)
        }
    }
}
fn text_memo(action: &QuoteAction) -> Option<String> {
    let angle = match action {
        QuoteAction::Fire { angle, .. } | QuoteAction::New { angle, .. } => Some(*angle),
        _ => None,
    };
    let degrees = angle.map(|a| {
        let c = (u32::from(a) * 36000 + 32768) / 65536;
        format!("{}.{:02}", c / 100, c % 100)
    });
    let text = match action {
        QuoteAction::Fire {
            cannon, quantity, ..
        } => format!("FIRE {cannon} {} {quantity}", degrees?),
        QuoteAction::New { quantity, cell, .. } => format!(
            "NEW {} {quantity}{}",
            degrees?,
            cell.map_or_else(String::new, |c| format!(" {c}"))
        ),
        QuoteAction::Move { cannon, cell } => format!("MOVE {cannon} {cell}"),
    };
    (b2z_protocol::v6::parse_text(text.as_bytes()).ok() == Some(command(action))).then_some(text)
}
pub fn action_quote(funding_account: String, action: QuoteAction) -> Result<Quote> {
    account(&funding_account)?;
    let memo = b2z_protocol::v6::encode(command(&action)).map_err(|_| "COMMAND_BOUNDS")?;
    let (r, p, w) = load()?;
    if !r.run.running
        || r.run.last_error.is_some()
        || r.source.last_error.is_some()
        || !r.source.binding_checked
        || super::active_transition(&r)?.is_some()
    {
        return Err("SERVICE_UNAVAILABLE".into());
    }
    if !super::PACE.with(|p| p.borrow().hint().admission_open) {
        return Err("ADMISSION_CLOSED".into());
    }
    let prices = quote_items(&w, &funding_account, &action)?;
    let amount = prices
        .iter()
        .try_fold(0u64, |sum, n| sum.checked_add(*n).ok_or("PRICE_OVERFLOW"))?;
    let requested = match action {
        QuoteAction::Fire { quantity, .. } | QuoteAction::New { quantity, .. } => quantity,
        _ => 1,
    };
    Ok(Quote {
        state: reference(&r, &p)?,
        funding_account,
        destination: destination(&r)?,
        amount_e8s_excluding_fee: amount,
        maximum_fill_now: prices.len() as u8,
        per_item_e8s: prices,
        requested_quantity: requested,
        memo_bytes: memo.to_vec(),
        numeric_memo: u64::from_be_bytes(memo),
        text_memo: text_memo(&action),
        limits: limits(&w),
        reservation: false,
        unused_payment_retained: true,
    })
}
pub fn payment_receipt(position: u64, segment: Option<u64>) -> Result<Receipt> {
    let r = root()?;
    let current: Publication = decode(&unhex(&r.publication_hex)?)?;
    let committed_source = number(&current.head.source_to_exclusive)?;
    let segment = segment.or(current.head.segment_id.as_ref().map(number).transpose()?);
    let search_retained = segment.is_some_and(|id| {
        current
            .head
            .segment_id
            .as_ref()
            .is_some_and(|s| number(s) == Ok(id))
            || r.retention.history.iter().any(|m| m.segment_id == id)
    });
    let mut p = current.clone();
    let mut events = None;
    if let Some(id) = segment.filter(|_| search_retained) {
        p = decode(&super::retained_publication(id)?)?;
        let descriptor = p.artifacts.get(1).ok_or("EVENT_ARTIFACT")?;
        let mut bytes = Vec::with_capacity(descriptor.length);
        if descriptor.length > super::MAX_ARTIFACT {
            return Err("ARTIFACT_BOUNDS".into());
        }
        for n in 0..descriptor.chunks.len() {
            bytes.extend(super::retained_artifact_chunk(
                id,
                hash(&dtr_wire::encode(&p)?),
                1,
                n as u16,
            )?);
        }
        if hash(&bytes) != descriptor.sha256 {
            return Err("EVENT_INTEGRITY".into());
        }
        events = Some(decode::<serde_json::Value>(&bytes)?);
    }
    let row = events
        .as_ref()
        .and_then(|e| e.get("receipts"))
        .and_then(|v| v.as_array())
        .and_then(|rows| {
            rows.iter()
                .find(|v| v.get("position").is_some_and(|n| uint(n) == Ok(position)))
        });
    let text = |key: &str| {
        row.and_then(|v| v.get(key))
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
    };
    let integer =
        |key: &str| -> Result<Option<u64>> { row.and_then(|v| v.get(key)).map(uint).transpose() };
    let status = if row.is_some() {
        match text("status").as_deref() {
            Some("applied") => ReceiptStatus::Applied,
            Some("partially_applied") => ReceiptStatus::PartiallyApplied,
            _ => match text("reason").as_deref() {
                Some("ACCEPTED") => ReceiptStatus::Applied,
                Some("DUPLICATE") => ReceiptStatus::Duplicate,
                _ => ReceiptStatus::Rejected,
            },
        }
    } else {
        let pending = if position >= committed_source && position < r.source.cursor {
            super::host(&r)?
                .record
                .inbox
                .pending
                .iter()
                .any(|i| number(&i.position) == Ok(position))
        } else {
            false
        };
        if pending {
            ReceiptStatus::Pending
        } else {
            ReceiptStatus::UnknownOrNotRetained
        }
    };
    let per_item = row
        .and_then(|v| v.get("per_item_prices"))
        .and_then(|v| v.as_array())
        .map(|rows| rows.iter().map(uint).collect::<Result<Vec<_>>>())
        .transpose()?
        .unwrap_or_default();
    let mut state = reference(&r, if row.is_some() { &p } else { &current })?;
    if row.is_some() {
        state.publication_hash = hash(&dtr_wire::encode(&p)?);
    }
    Ok(Receipt {
        state,
        ledger_position: position,
        searched_segment: segment,
        search_retained,
        status,
        account: text("account"),
        reason: text("reason"),
        requested_quantity: quantity(integer("requested_quantity")?)?,
        actual_quantity: quantity(integer("actual_quantity")?)?,
        amount_used_e8s: integer("amount_used")?,
        retained_remainder_e8s: integer("remainder")?,
        per_item_e8s: per_item,
        stop_reason: text("stop_reason"),
        canonical_receipt: row.map(dtr_wire::encode).transpose()?,
        event_artifact_hash: row
            .and_then(|_| p.artifacts.get(1))
            .map(|a| a.sha256.clone()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};
    fn world(name: &str) -> World {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../../../tests/fixtures/rules-v6.json")).unwrap();
        let mut w =
            World::decode(&unhex(fixture["cases"][name]["state_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        let replacements = (1..=3)
            .map(|i| {
                (
                    format!("{i:02x}").repeat(32),
                    AccountIdentifier::new(
                        &Principal::self_authenticating([i; 32]),
                        &DEFAULT_SUBACCOUNT,
                    )
                    .to_hex(),
                )
            })
            .collect::<std::collections::BTreeMap<_, _>>();
        for c in &mut w.cannons {
            c.account = replacements[&c.account].clone();
        }
        for s in &mut w.credits {
            s.account = replacements[&s.account].clone();
        }
        w.credits.sort_by(|a, b| a.account.cmp(&b.account));
        for p in &mut w.playability.as_mut().unwrap().players {
            p.account = replacements[&p.account].clone();
        }
        w.validate().unwrap();
        w
    }
    #[test]
    fn exact_island_quotes_and_account_authority_match_the_kernel() {
        let w = world("idle");
        let c = &w.cannons[0];
        let action = QuoteAction::Fire {
            cannon: c.id,
            angle: 0,
            quantity: 2,
        };
        assert_eq!(
            quote_items(&w, &c.account, &action).unwrap(),
            [10_000_000, 40_000_000]
        );
        let other = AccountIdentifier::new(&Principal::anonymous(), &DEFAULT_SUBACCOUNT).to_hex();
        assert_eq!(quote_items(&w, &other, &action).unwrap_err(), "NOT_OWNER");
        for q in [0, 65] {
            assert!(quote_items(
                &w,
                &c.account,
                &QuoteAction::Fire {
                    cannon: c.id,
                    angle: 0,
                    quantity: q
                }
            )
            .is_err());
        }
        assert_eq!(cannon(&w, c.id).unwrap().unwrap().island_ball_ids.len(), 1);
    }
    #[test]
    fn first_additional_and_revival_quotes_keep_positive_sequential_prices() {
        let w = world("idle");
        let c = &w.cannons[0];
        let other = AccountIdentifier::new(&Principal::anonymous(), &DEFAULT_SUBACCOUNT).to_hex();
        assert_eq!(
            quote_items(
                &w,
                &other,
                &QuoteAction::New {
                    angle: 0,
                    quantity: 3,
                    cell: None
                }
            )
            .unwrap(),
            [100_000_000, 10_000_000, 40_000_000]
        );
        let cell =
            purchases_v6::adjacent_sites(&w, w.player_for_cannon(c.id).unwrap()).unwrap()[0] as u32;
        assert_eq!(
            quote_items(
                &w,
                &c.account,
                &QuoteAction::New {
                    angle: 0,
                    quantity: 3,
                    cell: Some(cell)
                }
            )
            .unwrap(),
            [400_000_000, 40_000_000, 90_000_000]
        );
        let w = world("revival");
        let c = &w.cannons[0];
        assert_eq!(
            quote_items(
                &w,
                &c.account,
                &QuoteAction::Fire {
                    cannon: c.id,
                    angle: 0,
                    quantity: 1
                }
            )
            .unwrap(),
            [10_000_000]
        );
        assert!(quote_items(
            &w,
            &c.account,
            &QuoteAction::Move {
                cannon: c.id,
                cell: c.cell as u32
            }
        )
        .is_err());
    }
    #[test]
    fn region_bounds_seams_and_canonical_accounts_are_explicit() {
        let w = world("idle");
        assert_eq!(
            region_cells(&w, 999_999, 2, 2)
                .unwrap()
                .iter()
                .map(|c| c.cell)
                .collect::<Vec<_>>(),
            [999_999, 999_000, 999, 0]
        );
        for (cell, width, height) in [(1_000_000, 1, 1), (0, 0, 1), (0, 1, 17)] {
            assert!(region_cells(&w, cell, width, height).is_err());
        }
        assert!(account(&w.cannons[0].account).is_ok());
        for bad in ["01".repeat(32), "AB".repeat(32), "x".repeat(100000)] {
            assert!(account(&bad).is_err());
        }
    }
    #[test]
    fn exact_binary_headings_never_get_a_rounded_text_memo() {
        for angle in [0, 1, 12345, 32768, 65535] {
            let a = QuoteAction::Fire {
                cannon: 1,
                angle,
                quantity: 64,
            };
            let bin = b2z_protocol::v6::encode(command(&a)).unwrap();
            assert_eq!(b2z_protocol::v6::decode(&bin).unwrap(), command(&a));
            if let Some(text) = text_memo(&a) {
                assert_eq!(
                    b2z_protocol::v6::parse_text(text.as_bytes()).unwrap(),
                    command(&a)
                );
            }
        }
        assert!(text_memo(&QuoteAction::Fire {
            cannon: 1,
            angle: 1,
            quantity: 1
        })
        .is_none());
    }
    #[test]
    fn receipt_numbers_preserve_tagged_e8s_and_bounded_quantities() {
        assert_eq!(uint(&serde_json::json!(64)).unwrap(), 64);
        assert_eq!(
            uint(&serde_json::json!({"$integer":"18446744073709551615"})).unwrap(),
            u64::MAX
        );
        for bad in [
            serde_json::json!(-1),
            serde_json::json!(1.5),
            serde_json::json!({"$integer":"18446744073709551616"}),
        ] {
            assert!(uint(&bad).is_err());
        }
        assert_eq!(quantity(Some(64)).unwrap(), Some(64));
        assert_eq!(quantity(Some(0)).unwrap(), Some(0));
        assert!(quantity(Some(256)).is_err());
    }
}
