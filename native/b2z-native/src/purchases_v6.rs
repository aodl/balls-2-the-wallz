//! Rules-v6 payment planning and one-item purchase continuations. No IC or
//! Ledger calls. The enclosing cursor owns exactly-once accounting and receipts.
use crate::{
    playability::*,
    pricing_v6,
    world::{position, Ball, World, Q},
};
use b2z_protocol::{v6::Command, Command as Legacy};
use dtr_wire::{encode, hash, Int, Rat, Result};
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Plan {
    Rejected {
        reason: String,
    },
    Fire {
        cannon: u32,
        angle: u16,
        quantity: u8,
        explicit: bool,
    },
    New {
        angle: u16,
        quantity: u8,
        explicit: bool,
        cell: Option<usize>,
        price: Int,
        player: Option<u32>,
        first: bool,
    },
    Move {
        cannon: u32,
        cell: usize,
        price: Int,
    },
}
fn reject(reason: &str) -> Plan {
    Plan::Rejected {
        reason: reason.into(),
    }
}
pub fn player_by_account(world: &World, account: &str) -> Option<u32> {
    world
        .playability
        .as_ref()?
        .players
        .iter()
        .find(|p| p.account == account)
        .map(|p| p.id)
}

/// Closed-cell occupancy also excludes a ball exactly on an adjacent/seam wall.
/// Work is bounded by entity counts, never by the million-cell board area.
pub fn adjacent_sites(world: &World, player: u32) -> Result<Vec<usize>> {
    if world.version != 6 {
        return Err("EXPECTED_V6".into());
    }
    let mut candidates = BTreeSet::new();
    for c in world
        .cannons
        .iter()
        .filter(|c| world.player_for_cannon(c.id) == Some(player) && world.active_cannon(c.id))
    {
        candidates.extend(world.neighbors(c.cell));
    }
    let mut blocked: BTreeSet<_> = world.cannons.iter().map(|c| c.cell).collect();
    for b in &world.balls {
        let [x, y] = position(b, &world.time)?;
        let cx = (b.cell % world.width) as i64;
        let cy = (b.cell / world.width) as i64;
        let mut xs = vec![cx];
        let mut ys = vec![cy];
        if x == Rat::integer(cx * Q) {
            xs.push(cx - 1);
        } else if x == Rat::integer((cx + 1) * Q) {
            xs.push(cx + 1);
        }
        if y == Rat::integer(cy * Q) {
            ys.push(cy - 1);
        } else if y == Rat::integer((cy + 1) * Q) {
            ys.push(cy + 1);
        }
        for x in &xs {
            for y in &ys {
                blocked.insert(crate::world::wrap_cell(*x, *y, world.width, world.height));
            }
        }
    }
    Ok(candidates
        .into_iter()
        .filter(|c| {
            !blocked.contains(c) && matches!(world.owner(*c), Some(0))
                || !blocked.contains(c) && world.owner(*c) == Some(player)
        })
        .collect())
}
pub fn choose_adjacent(world: &World, player: u32, seed: &str) -> Result<Option<usize>> {
    if !crate::world::account_ok(seed) {
        return Err("spawn seed".into());
    }
    let mut ranked = Vec::new();
    for cell in adjacent_sites(world, player)? {
        ranked.push((
            hash(&encode(
                &json!({"domain":"B2Z-ADJACENT-SPAWN-06","seed":seed,"cell":cell}),
            )?),
            cell,
        ));
    }
    ranked.sort();
    Ok(ranked.first().map(|(_, cell)| *cell))
}
pub fn prepare(
    world: &World,
    account: &str,
    amount: u64,
    memo: &[u8],
    moved: &[u32],
) -> Result<Plan> {
    if world.version != 6 {
        return Err("EXPECTED_V6".into());
    }
    let command = match b2z_protocol::v6::decode(memo) {
        Ok(c) => c,
        Err(_) => return Ok(reject("MALFORMED_MEMO")),
    };
    let mine: Vec<_> = world
        .cannons
        .iter()
        .filter(|c| c.account == account)
        .collect();
    let (command, explicit) = match command {
        Command::Legacy(Legacy::Angle(angle)) => (
            match mine.first() {
                Some(c) => Command::Fire {
                    cannon: c.id,
                    angle,
                    quantity: b2z_protocol::v6::MAX_QUANTITY,
                },
                None => Command::New {
                    angle,
                    quantity: b2z_protocol::v6::MAX_QUANTITY,
                    cell: None,
                },
            },
            false,
        ),
        Command::Legacy(Legacy::Move(cell)) => {
            let Some(c) = mine.first() else {
                return Ok(reject("NO_CANNON"));
            };
            (Command::Move { cannon: c.id, cell }, false)
        }
        c => (c, true),
    };
    match command {
        Command::New {
            angle,
            quantity,
            cell,
        } => {
            if mine.len() >= MAX_RETAINED_PER_PLAYER {
                return Ok(reject("PLAYER_CANNON_CAPACITY"));
            }
            if world.cannons.len() >= MAX_CANNONS {
                return Ok(reject("CANNON_CAPACITY"));
            }
            if world.next_cannon_id == u32::MAX {
                return Ok(reject("CANNON_ID_EXHAUSTED"));
            }
            if world.balls.len() >= MAX_BALLS || world.next_ball_id == u32::MAX {
                return Ok(reject("BALL_CAPACITY"));
            }
            let player = player_by_account(world, account);
            let state = world.playability.as_ref().ok_or("EXPECTED_V6")?;
            if player.is_none()
                && (state.players.len() >= MAX_PLAYERS
                    || state.next_player_id == u32::MAX
                    || (!world.credits.iter().any(|c| c.account == account)
                        && world.credits.len() >= MAX_PLAYERS))
            {
                return Ok(reject("ACCOUNTING_CAPACITY"));
            }
            let price = pricing_v6::cannon_price(mine.len() as u32)?;
            if amount < price {
                return Ok(reject("UNDERFUNDED"));
            }
            if mine.is_empty() {
                if cell.is_some() {
                    return Ok(reject("FIRST_PLACEMENT_AUTOMATIC"));
                }
            } else {
                let player = player.ok_or("UNKNOWN_PLAYER")?;
                if !mine.iter().any(|c| world.active_cannon(c.id)) {
                    return Ok(reject("NO_ACTIVE_ANCHOR"));
                }
                let sites = adjacent_sites(world, player)?;
                if sites.is_empty() {
                    return Ok(reject("NO_ADJACENT_SITE"));
                }
                if cell.is_some_and(|c| !sites.contains(&(c as usize))) {
                    return Ok(reject("ILLEGAL_ADJACENT_SITE"));
                }
            }
            Ok(Plan::New {
                angle,
                quantity,
                explicit,
                cell: cell.map(|c| c as usize),
                price: Int(price.into()),
                player,
                first: mine.is_empty(),
            })
        }
        Command::Fire {
            cannon,
            angle,
            quantity,
        } => {
            let Some(c) = world.cannons.iter().find(|c| c.id == cannon) else {
                return Ok(reject("NO_CANNON"));
            };
            if c.account != account {
                return Ok(reject("NOT_OWNER"));
            }
            let attached = world.balls.iter().filter(|b| b.owner == cannon).count();
            if amount < pricing_v6::ball_price(attached as u32)? {
                return Ok(reject("UNDERFUNDED"));
            }
            if attached >= MAX_PER_CANNON
                || world.balls.len() >= MAX_BALLS
                || world.next_ball_id == u32::MAX
            {
                return Ok(reject("BALL_CAPACITY"));
            }
            Ok(Plan::Fire {
                cannon,
                angle,
                quantity,
                explicit,
            })
        }
        Command::Move { cannon, cell } => {
            let Some(c) = world.cannons.iter().find(|c| c.id == cannon) else {
                return Ok(reject("NO_CANNON"));
            };
            if c.account != account {
                return Ok(reject("NOT_OWNER"));
            }
            if !world.active_cannon(cannon) {
                return Ok(reject("DORMANT_REVIVAL_REQUIRED"));
            }
            let price = crate::economics_generated::MOVE_E8S;
            if amount < price {
                return Ok(reject("UNDERFUNDED"));
            }
            if moved.contains(&cannon) {
                return Ok(reject("MOVE_LIMIT"));
            }
            if world.owner(cell as usize) != world.player_for_cannon(cannon) {
                return Ok(reject("NOT_OWN_TERRITORY"));
            }
            if world
                .cannons
                .iter()
                .any(|c| c.id != cannon && c.cell == cell as usize)
            {
                return Ok(reject("CANNON_OCCUPIED"));
            }
            // The enclosing topology continuation must validate retained active
            // anchor connectivity before applying this immutable move proposal.
            Ok(Plan::Move {
                cannon,
                cell: cell as usize,
                price: Int(price.into()),
            })
        }
        Command::Legacy(_) => Err("unresolved legacy command".into()),
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Batch {
    pub account: String,
    pub amount: Int,
    pub cannon: u32,
    pub angle: u16,
    pub requested: u8,
    pub explicit: bool,
    pub new_cannon: bool,
    pub prices: Vec<Int>,
    pub used: Int,
    pub remainder: Int,
    pub stop_reason: Option<String>,
}
pub struct Launch {
    pub ball: Ball,
    pub revived: bool,
}
impl Batch {
    pub fn fire(account: String, amount: u64, plan: &Plan) -> Result<Self> {
        let Plan::Fire {
            cannon,
            angle,
            quantity,
            explicit,
        } = plan
        else {
            return Err("fire plan".into());
        };
        Ok(Self {
            account,
            amount: Int(amount.into()),
            cannon: *cannon,
            angle: *angle,
            requested: *quantity,
            explicit: *explicit,
            new_cannon: false,
            prices: vec![],
            used: Int(0.into()),
            remainder: Int(amount.into()),
            stop_reason: None,
        })
    }
    pub fn after_new(account: String, amount: u64, cannon: u32, plan: &Plan) -> Result<Self> {
        let Plan::New {
            angle,
            quantity,
            explicit,
            price,
            ..
        } = plan
        else {
            return Err("new cannon plan".into());
        };
        if price.0 > amount.into() {
            return Err("new cannon underfunded".into());
        }
        Ok(Self {
            account,
            amount: Int(amount.into()),
            cannon,
            angle: *angle,
            requested: *quantity,
            explicit: *explicit,
            new_cannon: true,
            prices: vec![price.clone()],
            used: price.clone(),
            remainder: Int(num_bigint::BigInt::from(amount) - &price.0),
            stop_reason: (*quantity == 1).then(|| "quantity_limit".into()),
        })
    }
    pub fn validate(&self, world: &World) -> Result<()> {
        if world.version != 6
            || !(1..=b2z_protocol::v6::MAX_QUANTITY).contains(&self.requested)
            || self.prices.len() > usize::from(self.requested)
            || !world
                .cannons
                .iter()
                .any(|c| c.id == self.cannon && c.account == self.account)
            || self.amount.0.to_u64().is_none()
            || self.used.0.to_u64().is_none()
            || self.remainder.0.to_u64().is_none()
            || &self.used.0 + &self.remainder.0 != self.amount.0
            || self
                .prices
                .iter()
                .any(|p| p.0.to_u64().is_none_or(|p| p == 0))
            || self
                .prices
                .iter()
                .fold(num_bigint::BigInt::from(0), |sum, p| sum + &p.0)
                != self.used.0
            || self.stop_reason.as_deref().is_some_and(|s| {
                !matches!(
                    s,
                    "quantity_limit" | "capacity" | "insufficient_payment" | "ball_id_exhausted"
                )
            })
        {
            return Err("PURCHASE_CONTINUATION".into());
        }
        Ok(())
    }
    /// One launch per invocation; the caller yields/persists between invocations.
    pub fn step(&mut self, world: &mut World) -> Result<Option<Launch>> {
        self.validate(world)?;
        if self.stop_reason.is_some() {
            return Ok(None);
        }
        if self.prices.len() >= usize::from(self.requested) {
            self.stop_reason = Some("quantity_limit".into());
            return Ok(None);
        }
        let attached = world
            .balls
            .iter()
            .filter(|b| b.owner == self.cannon)
            .count();
        if attached >= MAX_PER_CANNON || world.balls.len() >= MAX_BALLS {
            self.stop_reason = Some("capacity".into());
            return Ok(None);
        }
        if world.next_ball_id == u32::MAX {
            self.stop_reason = Some("ball_id_exhausted".into());
            return Ok(None);
        }
        let price = Int(pricing_v6::ball_price(attached as u32)?.into());
        if price.0 > self.remainder.0 {
            self.stop_reason = Some("insufficient_payment".into());
            return Ok(None);
        }
        let c = world
            .cannons
            .iter()
            .find(|c| c.id == self.cannon)
            .cloned()
            .ok_or("UNKNOWN_CANNON")?;
        let ball = crate::cursor::launch(world, &c, self.angle)?;
        let revived = revive(world, self.cannon)?;
        self.prices.push(price.clone());
        self.used.0 += &price.0;
        self.remainder.0 -= &price.0;
        if self.prices.len() == usize::from(self.requested) {
            self.stop_reason = Some("quantity_limit".into());
        }
        Ok(Some(Launch { ball, revived }))
    }
    pub fn receipt(&self) -> Result<Value> {
        let stop = self.stop_reason.as_deref().ok_or("incomplete purchase")?;
        let actual = self.prices.len();
        Ok(
            json!({"reason":if actual==0{"REJECTED"}else{"ACCEPTED"},"kind":"purchase_completed","status":if actual==0{"rejected"}else if actual<usize::from(self.requested)&&(self.explicit||stop!="insufficient_payment"){"partially_applied"}else{"applied"},
            "cannon":self.cannon,"new_cannon":self.new_cannon,"requested_quantity":self.requested,"quantity_explicit":self.explicit,"actual_quantity":actual,"per_item_prices":self.prices,"amount_used":self.used,"remainder":self.remainder,"stop_reason":stop}),
        )
    }
}
