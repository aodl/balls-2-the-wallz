//! ICP account-index adapter v3 (B2Z text/3, binary/numeric compatibility). Trusts the configured index for account history
//! contents and completeness. Rules17 can look up an identified incoming block for its timestamp.
use candid::{CandidType, Deserialize, Nat, Principal};
use dtr_host::Input;
use dtr_wire::{hash, hex, unhex, Int, Result};
use ic_ledger_types::{AccountIdentifier, Subaccount};
use serde::Serialize;

const INVALID_MEMO: [u8; 8] = [0; 8];
fn legacy_memo_adapter() -> u8 {
    b2z_protocol::MEMO_ADAPTER_VERSION
}
fn is_legacy_memo_adapter(version: &u8) -> bool {
    *version == legacy_memo_adapter()
}
pub const PAGE: u64 = 64;
// Rolling OLDEST window, not a limit on unseen account history. Newer rows
// outside this window are re-downloaded after the oldest window is admitted.
pub const MAX_PENDING: usize = 256;
pub const FALLBACK_SECONDS: u64 = 60;
pub const INDEX_ID: &str = "qhbym-qaaaa-aaaaa-aaafq-cai";
pub const LEDGER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

#[derive(Clone, CandidType, Deserialize)]
pub enum StartingPolicy {
    FromBeginning,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct IndexConfig {
    pub network: String,
    pub ledger: Principal,
    pub index: Principal,
    pub receiving_subaccount: u64,
    pub event_horizon: Option<Principal>,
    /// Explicitly process existing history too; never silently skip a funded account.
    pub starting_policy: StartingPolicy,
}
// Private durable counters/positions are decimal strings, so every nat64 value
// survives the canonical JSON codec's safe-number restriction without rounding.
mod u64_string {
    pub fn serialize<S: serde::Serializer>(
        value: &u64,
        serializer: S,
    ) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&value.to_string())
    }
    pub fn deserialize<'de, D: serde::Deserializer<'de>>(
        deserializer: D,
    ) -> std::result::Result<u64, D::Error> {
        let text = <String as serde::Deserialize>::deserialize(deserializer)?;
        let value = text.parse::<u64>().map_err(serde::de::Error::custom)?;
        if value.to_string() != text {
            return Err(serde::de::Error::custom("noncanonical durable u64"));
        }
        Ok(value)
    }
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Row {
    #[serde(with = "u64_string")]
    pub id: u64,
    pub payload: Option<String>,
    pub digest: String,
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pending {
    #[serde(with = "u64_string")]
    pub high: u64, // frozen high for the whole reconciliation, including rescan windows
    #[serde(with = "u64_string")]
    pub oldest: u64,
    #[serde(with = "u64_string")]
    pub before: u64,
    pub complete: bool,
    pub rows: Vec<Row>, // descending until atomically admitted oldest first
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceState {
    pub network: String,
    /// Activated only at the drained, authenticated rules-v6 cutover. Existing
    /// durable normalized rows are never reinterpreted or downloaded anew.
    #[serde(
        default = "legacy_memo_adapter",
        skip_serializing_if = "is_legacy_memo_adapter"
    )]
    pub memo_adapter_version: u8,
    pub ledger: String,
    pub index: String,
    #[serde(with = "u64_string")]
    pub receiving_subaccount: u64,
    pub recipient_hex: String,
    pub event_horizon: Option<String>,
    #[serde(with = "u64_string")]
    pub cursor: u64, // exclusive admitted global transaction position, never index tip
    pub binding_checked: bool,
    pub pending: Option<Pending>,
    #[serde(with = "u64_string")]
    pub nonce: u64,
    pub in_flight: bool,
    #[serde(with = "u64_string")]
    pub started_at: u64,
    pub requested: bool,
    pub wake_scheduled: bool,
    #[serde(with = "u64_string")]
    pub retry_until: u64,
    #[serde(with = "u64_string")]
    pub index_calls: u64,
    pub last_error: Option<String>,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct SourceStatus {
    pub network: String,
    pub ledger: Principal,
    pub index: Principal,
    pub recipient_account: Vec<u8>,
    pub receiving_subaccount: u64,
    pub event_horizon: Option<Principal>,
    pub admitted_to_exclusive: u64,
    pub binding_checked: bool,
    pub pending_records: u32,
    pub scan_in_flight: bool,
    pub reconciliation_requested: bool,
    pub index_calls: u64,
    pub last_error: Option<String>,
}
pub fn receiving_account(owner: Principal, n: u64) -> AccountIdentifier {
    let mut bytes = [0; 32];
    bytes[24..].copy_from_slice(&n.to_be_bytes());
    AccountIdentifier::new(&owner, &Subaccount(bytes))
}
pub fn identity_bytes(
    network: &str,
    ledger: Principal,
    index: Principal,
    owner: Principal,
    subaccount: u64,
    recipient: &str,
) -> Result<Vec<u8>> {
    candid::encode_args((
        "BTZ-ICP-INDEX-01",
        network,
        ledger,
        index,
        owner,
        subaccount,
        recipient,
    ))
    .map_err(|e| e.to_string())
}
impl SourceState {
    pub fn configured(config: IndexConfig, owner: Principal) -> Result<(Self, String)> {
        if !matches!(config.network.as_str(), "ic" | "pocketic-local")
            || config.index == Principal::anonymous()
            || config.ledger == Principal::anonymous()
            || config.event_horizon == Some(Principal::anonymous())
        {
            return Err("index configuration".into());
        }
        if config.network == "ic"
            && (config.index.to_text() != INDEX_ID || config.ledger.to_text() != LEDGER_ID)
        {
            return Err("mainnet requires reviewed official ICP ledger and index".into());
        }
        let recipient = receiving_account(owner, config.receiving_subaccount);
        let identity = identity_bytes(
            &config.network,
            config.ledger,
            config.index,
            owner,
            config.receiving_subaccount,
            &recipient.to_string(),
        )?;
        Ok((
            Self {
                network: config.network,
                memo_adapter_version: legacy_memo_adapter(),
                ledger: config.ledger.to_text(),
                index: config.index.to_text(),
                receiving_subaccount: config.receiving_subaccount,
                recipient_hex: recipient.to_string(),
                event_horizon: config.event_horizon.map(|p| p.to_text()),
                cursor: 0,
                binding_checked: false,
                pending: None,
                nonce: 0,
                in_flight: false,
                started_at: 0,
                requested: true,
                wake_scheduled: false,
                retry_until: 0,
                index_calls: 0,
                last_error: None,
            },
            hash(&identity),
        ))
    }
    pub fn validate(&self) -> Result<()> {
        if ![
            legacy_memo_adapter(),
            b2z_protocol::v6::MEMO_ADAPTER_VERSION,
            b2z_protocol::war_cry::MEMO_ADAPTER_VERSION,
            b2z_protocol::deflector::MEMO_ADAPTER_VERSION,
            b2z_protocol::context_structures::MEMO_ADAPTER_VERSION,
            b2z_protocol::shout::MEMO_ADAPTER_VERSION,
            b2z_protocol::reservoir::MEMO_ADAPTER_VERSION,
            b2z_protocol::economy17::MEMO_ADAPTER_VERSION,
            b2z_protocol::delegation::ADAPTER_VERSION,
        ]
        .contains(&self.memo_adapter_version)
        {
            return Err("source memo adapter".into());
        }
        if !matches!(self.network.as_str(), "ic" | "pocketic-local") {
            return Err("source network".into());
        }
        for p in [&self.ledger, &self.index] {
            if Principal::from_text(p).map_err(|e| e.to_string())? == Principal::anonymous() {
                return Err("source principal".into());
            }
        }
        account(&self.recipient_hex)?;
        if let Some(p) = &self.event_horizon {
            Principal::from_text(p).map_err(|e| e.to_string())?;
        }
        if let Some(p) = &self.pending {
            let empty_restart =
                p.rows.is_empty() && !p.complete && p.high.checked_add(1) == Some(p.before);
            if p.rows.len() > MAX_PENDING
                || p.high < self.cursor
                || p.oldest > p.high
                || p.before < self.cursor
                || (!empty_restart
                    && (p.rows.is_empty()
                        || p.high < p.rows[0].id
                        || p.before != p.rows.last().unwrap().id
                        || p.oldest > p.before))
            {
                return Err("pending range bounds".into());
            }
            let mut prior = None;
            for row in &p.rows {
                if prior.is_some_and(|id| row.id >= id) || row.id < self.cursor {
                    return Err("pending order".into());
                }
                prior = Some(row.id);
                unhex(&row.digest)?;
            }
        }
        Ok(())
    }
    pub fn status(&self) -> Result<SourceStatus> {
        Ok(SourceStatus {
            network: self.network.clone(),
            ledger: Principal::from_text(&self.ledger).map_err(|e| e.to_string())?,
            index: Principal::from_text(&self.index).map_err(|e| e.to_string())?,
            recipient_account: account(&self.recipient_hex)?.as_bytes().to_vec(),
            receiving_subaccount: self.receiving_subaccount,
            event_horizon: self
                .event_horizon
                .as_ref()
                .map(Principal::from_text)
                .transpose()
                .map_err(|e| e.to_string())?,
            admitted_to_exclusive: self.cursor,
            binding_checked: self.binding_checked,
            pending_records: self.pending.as_ref().map_or(0, |p| p.rows.len() as u32),
            scan_in_flight: self.in_flight,
            reconciliation_requested: self.requested || self.wake_scheduled,
            index_calls: self.index_calls,
            last_error: self.last_error.clone(),
        })
    }
    /// Called on a clone. Failure leaves the durable download cursor unchanged.
    pub fn page(&mut self, response: History) -> Result<()> {
        if ![
            legacy_memo_adapter(),
            b2z_protocol::v6::MEMO_ADAPTER_VERSION,
            b2z_protocol::war_cry::MEMO_ADAPTER_VERSION,
            b2z_protocol::deflector::MEMO_ADAPTER_VERSION,
            b2z_protocol::context_structures::MEMO_ADAPTER_VERSION,
            b2z_protocol::shout::MEMO_ADAPTER_VERSION,
            b2z_protocol::reservoir::MEMO_ADAPTER_VERSION,
            b2z_protocol::economy17::MEMO_ADAPTER_VERSION,
            b2z_protocol::delegation::ADAPTER_VERSION,
        ]
        .contains(&self.memo_adapter_version)
        {
            return Err("source memo adapter".into());
        }
        if response.transactions.len() > PAGE as usize {
            return Err("oversize index page".into());
        }
        let prior_pending = self.pending.as_ref();
        let before = prior_pending.map(|p| p.before);
        let mut prior = before;
        for row in &response.transactions {
            if prior.is_some_and(|id| row.id >= id) || row.id == u64::MAX {
                return Err("non-descending index page / position overflow".into());
            }
            prior = Some(row.id);
        }
        let Some(oldest) = response.oldest_tx_id else {
            if !response.transactions.is_empty() || self.pending.is_some() || self.cursor != 0 {
                return Err("inconsistent empty history".into());
            }
            return Ok(());
        };
        if self.pending.as_ref().is_some_and(|p| p.oldest != oldest) {
            return Err("index oldest changed during pass".into());
        }
        if response.transactions.is_empty() {
            return Err("index omitted expected history".into());
        }
        if response.transactions.last().unwrap().id < oldest {
            return Err("history below oldest".into());
        }
        if self
            .pending
            .as_ref()
            .is_some_and(|p| p.rows.is_empty() && response.transactions[0].id != p.high)
        {
            return Err("index omitted frozen high on window restart".into());
        }
        let recipient = account(&self.recipient_hex)?;
        let mut pending = self.pending.clone();
        for tx in response.transactions {
            if tx.id < self.cursor {
                if let Some(p) = &mut pending {
                    p.complete = true;
                }
                break;
            }
            let row = Row {
                id: tx.id,
                payload: if self.memo_adapter_version == legacy_memo_adapter() {
                    classify(&tx.transaction, &recipient)?
                } else if self.memo_adapter_version == b2z_protocol::delegation::ADAPTER_VERSION {
                    classify_delegation(&tx, &recipient)?
                } else {
                    classify_with(&tx.transaction, &recipient, self.memo_adapter_version)?
                },
                digest: hash(&candid::encode_one(&tx).map_err(|e| e.to_string())?),
            };
            let p = pending.get_or_insert_with(|| Pending {
                high: row.id,
                oldest,
                before: row.id,
                complete: false,
                rows: Vec::new(),
            });
            if p.rows.len() == MAX_PENDING {
                // Keep the oldest bounded window seen so far. These newer rows
                // remain unadmitted and will be fetched again below frozen high.
                p.rows.remove(0);
            }
            p.before = row.id;
            p.rows.push(row);
            if tx.id == oldest {
                p.complete = true;
                break;
            }
        }
        self.pending = pending;
        Ok(())
    }
    pub fn admission(&self, previous_anchor: &str) -> Result<(u64, Vec<Input>, String)> {
        let p = self
            .pending
            .as_ref()
            .filter(|p| p.complete)
            .ok_or("range not complete")?;
        let end = p
            .rows
            .first()
            .ok_or("empty admission window")?
            .id
            .checked_add(1)
            .ok_or("position overflow")?;
        let mut bytes = b"BTZ-ICP-INDEX-ANCHOR-01".to_vec();
        bytes.extend(unhex(previous_anchor)?);
        let mut inputs = Vec::new();
        for row in p.rows.iter().rev() {
            bytes.extend(row.id.to_be_bytes());
            bytes.extend(unhex(&row.digest)?);
            if let Some(payload) = &row.payload {
                inputs.push(Input {
                    position: Int(row.id.into()),
                    payload_hex: payload.clone(),
                });
            }
        }
        Ok((end, inputs, hash(&bytes)))
    }
    /// Call only in the same atomic persistence as successful DTR admission.
    pub fn admitted(&mut self, end: u64) -> Result<()> {
        let p = self
            .pending
            .as_ref()
            .filter(|p| p.complete)
            .ok_or("incomplete admission")?;
        if p.rows.first().and_then(|r| r.id.checked_add(1)) != Some(end) || end <= self.cursor {
            return Err("admitted window bounds".into());
        }
        self.pending = if end <= p.high {
            Some(Pending {
                high: p.high,
                oldest: p.oldest,
                before: p.high.checked_add(1).ok_or("position overflow")?,
                complete: false,
                rows: Vec::new(),
            })
        } else {
            None
        };
        self.cursor = end;
        Ok(())
    }
}

// Exact official ICP index types; pinned upstream DID is retained in interfaces/.
#[derive(Clone, CandidType, Deserialize)]
pub struct HistoryArgs {
    pub account_identifier: String,
    pub start: Option<u64>,
    pub max_results: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Tokens {
    pub e8s: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Timestamp {
    pub timestamp_nanos: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum Operation {
    Approve {
        fee: Tokens,
        from: String,
        allowance: Tokens,
        expires_at: Option<Timestamp>,
        spender: String,
        expected_allowance: Option<Tokens>,
    },
    Burn {
        from: String,
        amount: Tokens,
        spender: Option<String>,
    },
    Mint {
        to: String,
        amount: Tokens,
    },
    Transfer {
        to: String,
        fee: Tokens,
        from: String,
        amount: Tokens,
        spender: Option<String>,
    },
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Transaction {
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Operation,
    pub created_at_time: Option<Timestamp>,
    pub timestamp: Option<Timestamp>,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct TransactionWithId {
    pub id: u64,
    pub transaction: Transaction,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct History {
    pub balance: u64,
    pub transactions: Vec<TransactionWithId>,
    pub oldest_tx_id: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct IndexError {
    pub message: String,
}
pub type HistoryResult = std::result::Result<History, IndexError>;

#[allow(non_camel_case_types)]
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum PokeTarget {
    subaccount(u64),
    neuron_nonce(u64),
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PokeMatch {
    pub target: PokeTarget,
    pub max_amount: Nat,
}
pub fn matching_poke(matches: &[PokeMatch], target: u64) -> bool {
    matches.len() <= 256
        && matches.iter().any(|p| {
            matches!(p.target,PokeTarget::subaccount(n) if n==target) && p.max_amount > 0u8
        })
}
fn account(text: &str) -> Result<AccountIdentifier> {
    AccountIdentifier::from_hex(text).map_err(|e| format!("index account: {e}"))
}
fn classify(tx: &Transaction, recipient: &AccountIdentifier) -> Result<Option<String>> {
    classify_with(tx, recipient, legacy_memo_adapter())
}
#[cfg(test)]
fn classify_v6(tx: &Transaction, recipient: &AccountIdentifier) -> Result<Option<String>> {
    classify_with(tx, recipient, b2z_protocol::v6::MEMO_ADAPTER_VERSION)
}
fn classify_with(
    tx: &Transaction,
    recipient: &AccountIdentifier,
    adapter: u8,
) -> Result<Option<String>> {
    match &tx.operation {
        Operation::Transfer {
            from,
            to,
            amount,
            spender,
            ..
        } => {
            let from = account(from)?;
            let to = account(to)?;
            if let Some(s) = spender {
                account(s)?;
            }
            if &to != recipient || &from == recipient {
                return Ok(None);
            }
            let timestamped = adapter == b2z_protocol::economy17::MEMO_ADAPTER_VERSION;
            if timestamped || adapter == b2z_protocol::reservoir::MEMO_ADAPTER_VERSION {
                let parsed = if spender.is_none() {
                    b2z_protocol::reservoir::decode_ledger(tx.memo, tx.icrc1_memo.as_deref()).ok()
                } else {
                    None
                };
                let (memo, cry) = parsed.unwrap_or_else(|| (INVALID_MEMO, String::new()));
                let mut payload = b2z_protocol::reservoir::NORMALIZED_PAYMENT.to_vec();
                payload.extend(from.as_bytes());
                payload.extend(amount.e8s.to_be_bytes());
                payload.extend(memo);
                payload.push(cry.len() as u8);
                payload.extend(cry.as_bytes());
                if timestamped {
                    let ns = tx
                        .timestamp
                        .as_ref()
                        .ok_or("missing Ledger block timestamp")?
                        .timestamp_nanos;
                    payload = b2z_protocol::economy17::timestamped(&payload, ns)
                        .map_err(|_| "invalid Ledger block timestamp or payment envelope")?;
                }
                return Ok(Some(hex(&payload)));
            }
            let shout = adapter == b2z_protocol::shout::MEMO_ADAPTER_VERSION;
            if shout || adapter == b2z_protocol::context_structures::MEMO_ADAPTER_VERSION {
                use b2z_protocol::context_structures as codec;
                let parsed = if spender.is_some() {
                    None
                } else if shout {
                    b2z_protocol::shout::decode_ledger(tx.memo, tx.icrc1_memo.as_deref()).ok()
                } else {
                    codec::decode_ledger(tx.memo, tx.icrc1_memo.as_deref()).ok()
                };
                let memo = parsed
                    .as_ref()
                    .and_then(|a| codec::encode(a.command).ok())
                    .unwrap_or(INVALID_MEMO);
                let cry = parsed.as_ref().map(|a| a.cry.as_bytes()).unwrap_or(&[]);
                let mut payload = if shout {
                    b2z_protocol::shout::NORMALIZED_PAYMENT
                } else {
                    codec::NORMALIZED_PAYMENT
                }
                .to_vec();
                payload.extend(from.as_bytes());
                payload.extend(amount.e8s.to_be_bytes());
                payload.extend(memo);
                payload.push(cry.len() as u8);
                payload.extend(cry);
                return Ok(Some(hex(&payload)));
            }
            if adapter == b2z_protocol::deflector::MEMO_ADAPTER_VERSION {
                let parsed = if spender.is_none() {
                    b2z_protocol::deflector::decode_ledger(tx.memo, tx.icrc1_memo.as_deref()).ok()
                } else {
                    None
                };
                let memo = parsed
                    .as_ref()
                    .and_then(|a| b2z_protocol::deflector::encode(a.command).ok())
                    .unwrap_or(INVALID_MEMO);
                let cry = parsed.as_ref().map(|a| a.cry.as_bytes()).unwrap_or(&[]);
                let mut payload = b"BTZPAY04".to_vec();
                payload.extend(from.as_bytes());
                payload.extend(amount.e8s.to_be_bytes());
                payload.extend(memo);
                payload.push(cry.len() as u8);
                payload.extend(cry);
                return Ok(Some(hex(&payload)));
            }
            if adapter == b2z_protocol::war_cry::MEMO_ADAPTER_VERSION {
                let parsed = if spender.is_none() {
                    b2z_protocol::war_cry::decode_ledger(tx.memo, tx.icrc1_memo.as_deref()).ok()
                } else {
                    None
                };
                let memo = parsed
                    .as_ref()
                    .and_then(|a| b2z_protocol::v6::encode(a.command).ok())
                    .unwrap_or(INVALID_MEMO);
                let cry = parsed.as_ref().map(|a| a.cry.as_bytes()).unwrap_or(&[]);
                let mut payload = b"BTZPAY03".to_vec();
                payload.extend(from.as_bytes());
                payload.extend(amount.e8s.to_be_bytes());
                payload.extend(memo);
                payload.push(cry.len() as u8);
                payload.extend(cry);
                return Ok(Some(hex(&payload)));
            }
            let memo = if spender.is_some() {
                [0; 8]
            } else {
                if adapter == legacy_memo_adapter() {
                    normalized_memo(tx.memo, tx.icrc1_memo.as_deref())
                } else {
                    b2z_protocol::v6::decode_ledger(tx.memo, tx.icrc1_memo.as_deref())
                        .and_then(b2z_protocol::v6::encode)
                        .unwrap_or(INVALID_MEMO)
                }
            };
            let mut payload = b"BTZPAY02".to_vec();
            payload.extend(from.as_bytes());
            payload.extend(amount.e8s.to_be_bytes());
            payload.extend(memo);
            Ok(Some(hex(&payload)))
        }
        Operation::Mint { to, .. } => {
            account(to)?;
            Ok(None)
        }
        Operation::Burn { from, spender, .. } => {
            account(from)?;
            if let Some(s) = spender {
                account(s)?;
            }
            Ok(None)
        }
        Operation::Approve { from, spender, .. } => {
            account(from)?;
            account(spender)?;
            Ok(None)
        }
    }
}
/// Preserve the exact authenticated Index fields. Old classifiers stay unchanged.
fn classify_delegation(
    row: &TransactionWithId,
    recipient: &AccountIdentifier,
) -> Result<Option<String>> {
    use b2z_protocol::delegation::Payment;
    let tx = &row.transaction;
    if let Operation::Transfer {
        from,
        to,
        amount,
        fee,
        spender,
    } = &tx.operation
    {
        let from = account(from)?;
        let to = account(to)?;
        let spender = spender.as_ref().map(|s| account(s)).transpose()?;
        if &to != recipient || &from == recipient {
            return Ok(None);
        }
        let timestamp = tx
            .timestamp
            .as_ref()
            .ok_or("AUTH_INDEX_LEDGER_TIMESTAMP_REQUIRED")?
            .timestamp_nanos;
        let digest = unhex(&hash(&candid::encode_one(row).map_err(|e| e.to_string())?))?;
        let p = Payment {
            from: *from.as_bytes(),
            spender: spender.map(|s| *s.as_bytes()),
            to: *to.as_bytes(),
            amount: amount.e8s,
            fee: fee.e8s,
            position: row.id,
            ledger_time_ns: timestamp,
            created_at_ns: tx.created_at_time.as_ref().map(|t| t.timestamp_nanos),
            legacy_memo: tx.memo,
            memo: tx.icrc1_memo.clone(),
            raw_digest: digest.try_into().map_err(|_| "AUTH_DIGEST")?,
        };
        return Ok(Some(hex(&p.encode()?)));
    }
    // Validate all known non-transfer account fields through the existing parser.
    classify_with(tx, recipient, b2z_protocol::v6::MEMO_ADAPTER_VERSION)
}

fn normalized_memo(legacy: u64, blob: Option<&[u8]>) -> [u8; 8] {
    b2z_protocol::decode_ledger(legacy, blob)
        .map(b2z_protocol::encode)
        .unwrap_or(INVALID_MEMO)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn owner() -> Principal {
        Principal::from_slice(&[7])
    }
    fn fresh() -> SourceState {
        SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::from_slice(&[1]),
                index: Principal::from_slice(&[2]),
                receiving_subaccount: 0,
                event_horizon: Some(Principal::from_slice(&[3])),
                starting_policy: StartingPolicy::FromBeginning,
            },
            owner(),
        )
        .unwrap()
        .0
    }
    fn tx(id: u64) -> TransactionWithId {
        TransactionWithId {
            id,
            transaction: Transaction {
                memo: u64::from_be_bytes(*b"BTZ\x11\0\0\0\0"),
                icrc1_memo: None,
                operation: Operation::Transfer {
                    to: fresh().recipient_hex,
                    from: receiving_account(Principal::from_slice(&[8]), 0).to_string(),
                    amount: Tokens { e8s: 100_000_000 },
                    fee: Tokens { e8s: 10_000 },
                    spender: None,
                },
                created_at_time: None,
                timestamp: None,
            },
        }
    }
    fn page(ids: &[u64], oldest: Option<u64>) -> History {
        History {
            balance: 0,
            transactions: ids.iter().map(|id| tx(*id)).collect(),
            oldest_tx_id: oldest,
        }
    }
    #[test]
    fn annotated_adapter_retains_exact_utf8_but_old_adapter_and_spenders_never_gain_it() {
        let mut row = tx(100);
        let recipient = account(&fresh().recipient_hex).unwrap();
        row.transaction.icrc1_memo = Some("FIRE 1 0 1|é😀".as_bytes().to_vec());
        let old = classify_v6(&row.transaction, &recipient).unwrap().unwrap();
        assert!(old.ends_with("0000000000000000"));
        let raw = unhex(
            &classify_with(&row.transaction, &recipient, 6)
                .unwrap()
                .unwrap(),
        )
        .unwrap();
        assert_eq!(&raw[..8], b"BTZPAY03");
        assert_eq!(&raw[57..], "é😀".as_bytes());
        assert_eq!(usize::from(raw[56]), raw.len() - 57);
        if let Operation::Transfer { spender, .. } = &mut row.transaction.operation {
            *spender = Some(receiving_account(owner(), 2).to_string());
        }
        let blocked = unhex(
            &classify_with(&row.transaction, &recipient, 6)
                .unwrap()
                .unwrap(),
        )
        .unwrap();
        assert_eq!(blocked.len(), 57);
        assert_eq!(&blocked[48..56], &[0; 8]);
    }
    #[test]
    fn shout_source_normalizes_exact_text_only_in_successor() {
        let mut row = tx(100);
        let recipient = account(&fresh().recipient_hex).unwrap();
        row.transaction.icrc1_memo = Some("DROT 1 W|🛡️".as_bytes().to_vec());
        let normalized = |row: &TransactionWithId, adapter| {
            unhex(
                &classify_with(&row.transaction, &recipient, adapter)
                    .unwrap()
                    .unwrap(),
            )
            .unwrap()
        };
        let old = normalized(&row, 8);
        assert_eq!(&old[..8], b"BTZPAY05");
        assert_eq!(&old[48..], &[0; 9]);
        let shout = normalized(&row, 9);
        assert_eq!(&shout[..8], b"BTZPAY06");
        assert_eq!(&shout[8..48], &old[8..48]);
        assert_eq!(b2z_protocol::shout::annotation(&shout).unwrap(), "🛡️");
        if let Operation::Transfer { spender, .. } = &mut row.transaction.operation {
            *spender = Some(receiving_account(owner(), 2).to_string());
        }
        assert_eq!(&normalized(&row, 9)[48..], &[0; 9]);
    }
    #[test]
    fn shout_adapter_survives_source_page_serialization() {
        let mut state = fresh();
        state.memo_adapter_version = b2z_protocol::shout::MEMO_ADAPTER_VERSION;
        let mut row = tx(100);
        row.transaction.icrc1_memo = Some("DROT 1 W|🛡️".as_bytes().to_vec());
        let mut response = page(&[100], Some(100));
        response.transactions[0] = row;
        state.page(response).unwrap();

        let bytes = dtr_wire::encode(&state).unwrap();
        let restored: SourceState = dtr_wire::decode(&bytes).unwrap();
        restored.validate().unwrap();
        let (cursor, inputs, _) = restored.admission(&"00".repeat(32)).unwrap();
        assert_eq!(cursor, 101);
        assert_eq!(inputs.len(), 1);
        let payment = unhex(&inputs[0].payload_hex).unwrap();
        assert_eq!(b2z_protocol::shout::annotation(&payment).unwrap(), "🛡️");
    }
    #[test]
    fn sparse_pages_frozen_high_and_oldest_first() {
        let mut s = fresh();
        s.page(page(&[800, 109], Some(100))).unwrap();
        assert!(!s.pending.as_ref().unwrap().complete);
        assert!(s.admission(&"00".repeat(32)).is_err());
        // New arrival 900 belongs to next pass. Exclusive continuation is 109.
        s.page(page(&[100], Some(100))).unwrap();
        let (end, inputs, _) = s.admission(&"00".repeat(32)).unwrap();
        assert_eq!(end, 801);
        assert_eq!(
            inputs
                .iter()
                .map(|i| i.position.0.to_string())
                .collect::<Vec<_>>(),
            ["100", "109", "800"]
        );
        s.cursor = end;
        s.pending = None;
        s.page(page(&[900, 800, 109], Some(100))).unwrap();
        assert_eq!(s.admission(&"00".repeat(32)).unwrap().0, 901);
    }
    #[test]
    fn duplicate_nonadvancing_inconsistent_and_overflow_pages_rejected() {
        let mut s = fresh();
        for bad in [
            page(&[2, 2], Some(2)),
            page(&[1, 2], Some(1)),
            page(&[u64::MAX], Some(u64::MAX)),
            page(&[1], None),
            page(&[], Some(1)),
            page(&[1], Some(2)),
        ] {
            assert!(s.page(bad).is_err());
            assert!(s.pending.is_none());
            assert_eq!(s.cursor, 0);
        }
        s.page(page(&[800], Some(1))).unwrap();
        let before = serde_json::to_vec(&s).unwrap();
        for bad in [
            page(&[800], Some(1)),
            page(&[900], Some(1)),
            page(&[], Some(1)),
            page(&[799], Some(2)),
        ] {
            assert!(s.page(bad).is_err());
            assert_eq!(serde_json::to_vec(&s).unwrap(), before);
        }
    }
    #[test]
    fn durable_pending_and_capacity_never_advance_admission() {
        let mut s = fresh();
        for n in 0..4 {
            s.page(page(
                &(1..=64).rev().map(|i| i + 256 - n * 64).collect::<Vec<_>>(),
                Some(0),
            ))
            .unwrap();
        }
        let bytes = serde_json::to_vec(&s).unwrap();
        let mut restored: SourceState = serde_json::from_slice(&bytes).unwrap();
        restored.validate().unwrap();
        restored.page(page(&[64, 0], Some(0))).unwrap();
        assert_eq!(restored.cursor, 0);
        assert_eq!(restored.pending.as_ref().unwrap().rows.len(), MAX_PENDING);
        assert!(restored.pending.as_ref().unwrap().complete);
    }
    #[test]
    fn bounded_windows_drain_256_257_and_1025_sparse_records_across_restore() {
        for count in [256u64, 257, 1025] {
            let mut s = fresh();
            let mut ids = (0..count).map(|n| 100 + n * 7).collect::<Vec<_>>();
            let frozen = *ids.last().unwrap();
            let mut assigned = Vec::new();
            let mut high_water = 0;
            let mut inserted = false;
            let mut anchor = "00".repeat(32);
            for _ in 0..200 {
                let before = s.pending.as_ref().map(|p| p.before);
                let page_ids = ids
                    .iter()
                    .rev()
                    .copied()
                    .filter(|id| before.is_none_or(|b| *id < b))
                    .take(PAGE as usize)
                    .collect::<Vec<_>>();
                s.page(page(&page_ids, Some(100))).unwrap();
                if !inserted {
                    ids.push(frozen + 100);
                    inserted = true;
                }
                high_water = high_water.max(s.pending.as_ref().map_or(0, |p| p.rows.len()));
                s = serde_json::from_slice(&serde_json::to_vec(&s).unwrap()).unwrap();
                s.validate().unwrap();
                if s.pending.as_ref().is_some_and(|p| p.complete) {
                    let (end, inputs, next_anchor) = s.admission(&anchor).unwrap();
                    assert!(inputs.len() <= MAX_PENDING);
                    assigned.extend(
                        inputs
                            .into_iter()
                            .map(|i| i.position.0.to_string().parse::<u64>().unwrap()),
                    );
                    s.admitted(end).unwrap();
                    anchor = next_anchor;
                    s = serde_json::from_slice(&serde_json::to_vec(&s).unwrap()).unwrap();
                    s.validate().unwrap();
                    if s.pending.is_none() {
                        break;
                    }
                }
            }
            assert_eq!(s.cursor, frozen + 1);
            assert!(s.pending.is_none());
            assert_eq!(assigned, ids[..count as usize]);
            assert!(high_water <= MAX_PENDING);
            // Arrival after frozen high is handled only in a subsequent pass.
            s.page(page(&[frozen + 100, frozen], Some(100))).unwrap();
            assert_eq!(s.admission(&anchor).unwrap().1.len(), 1);
        }
    }
    #[test]
    fn empty_history_and_unchanged_account_are_safe() {
        let mut s = fresh();
        s.page(page(&[], None)).unwrap();
        assert!(s.pending.is_none());
        s.page(page(&[100], Some(100))).unwrap();
        s.cursor = 101;
        s.pending = None;
        s.page(page(&[100], Some(100))).unwrap();
        assert!(s.pending.is_none());
        assert_eq!(s.cursor, 101);
        assert!(s.page(page(&[], None)).is_err());
    }
    #[test]
    fn invalid_text_then_valid_payment_preserves_ids_digests_and_pending() {
        let mut s = fresh();
        let mut first = tx(41);
        first.transaction.icrc1_memo = Some(b"ANGLE NaN".to_vec());
        let mut second = tx(83);
        second.transaction.memo = u64::MAX;
        second.transaction.icrc1_memo = Some(b"ANGLE 37.5".to_vec());
        let first_digest = hash(&candid::encode_one(&first).unwrap());
        let second_digest = hash(&candid::encode_one(&second).unwrap());
        s.page(History {
            balance: 0,
            transactions: vec![second, first],
            oldest_tx_id: Some(41),
        })
        .unwrap();
        let pending = s.pending.as_ref().unwrap();
        assert_eq!(pending.rows[0].digest, second_digest);
        assert_eq!(pending.rows[1].digest, first_digest);
        // Normalized rows, including an old rejection, are durable bytes, never decoded again.
        let before = serde_json::to_vec(&s).unwrap();
        s = serde_json::from_slice(&before).unwrap();
        assert_eq!(serde_json::to_vec(&s).unwrap(), before);
        let (end, inputs, _) = s.admission(&"00".repeat(32)).unwrap();
        assert_eq!(end, 84);
        assert_eq!(inputs[0].position, Int(41.into()));
        assert!(inputs[0].payload_hex.ends_with("0000000000000000"));
        assert_eq!(inputs[1].position, Int(83.into()));
        assert!(inputs[1].payload_hex.ends_with("42545a1100001aab"));
        s.admitted(end).unwrap();
        s.page(page(&[83, 41], Some(41))).unwrap();
        assert!(s.pending.is_none());
        assert_eq!(b2z_protocol::MEMO_ADAPTER_VERSION, 3);
    }
    #[test]
    fn classification_preserves_memo_and_delegation_rules() {
        let recipient = receiving_account(owner(), 0);
        let mut t = tx(1).transaction;
        assert_eq!(
            unhex(&classify(&t, &recipient).unwrap().unwrap())
                .unwrap()
                .len(),
            56
        );
        t.icrc1_memo = Some(b"BTZ\x12\0\0\0\x01".to_vec());
        t.memo = 0;
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("42545a1200000001"));
        t.memo = 1;
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("42545a1200000001"));
        t.memo = 0;
        t.icrc1_memo = None;
        if let Operation::Transfer { spender, .. } = &mut t.operation {
            *spender = Some(receiving_account(owner(), 2).to_string());
        }
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("0000000000000000"));
        if let Operation::Transfer { from, .. } = &mut t.operation {
            *from = recipient.to_string();
        }
        assert!(classify(&t, &recipient).unwrap().is_none());
        t.operation = Operation::Mint {
            to: recipient.to_string(),
            amount: Tokens { e8s: 1 },
        };
        assert!(classify(&t, &recipient).unwrap().is_none());
        t.operation = Operation::Transfer {
            to: "bad".into(),
            from: recipient.to_string(),
            amount: Tokens { e8s: 1 },
            fee: Tokens { e8s: 1 },
            spender: None,
        };
        assert!(classify(&t, &recipient).is_err());
    }
    #[test]
    fn v6_adapter_is_explicit_and_preserves_normalized_history() {
        let recipient = receiving_account(owner(), 0);
        let mut t = tx(1).transaction;
        t.icrc1_memo = Some(b"FIRE 1 37.5 3".to_vec());
        let old = classify(&t, &recipient).unwrap().unwrap();
        let new = classify_v6(&t, &recipient).unwrap().unwrap();
        assert!(old.ends_with("0000000000000000"));
        assert!(new.ends_with("f6000000011aab03"));
        assert_eq!(&old[..96], &new[..96]);
        let mut s = fresh();
        let bytes = serde_json::to_vec(&s).unwrap();
        assert!(!String::from_utf8(bytes.clone())
            .unwrap()
            .contains("memo_adapter_version"));
        s = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(s.memo_adapter_version, 3);
        let mut row = tx(1);
        row.transaction = t.clone();
        s.page(History {
            balance: 0,
            transactions: vec![row],
            oldest_tx_id: Some(1),
        })
        .unwrap();
        let payload = s.pending.as_ref().unwrap().rows[0].payload.clone();
        s.memo_adapter_version = 4;
        s = serde_json::from_slice(&serde_json::to_vec(&s).unwrap()).unwrap();
        assert_eq!(s.pending.as_ref().unwrap().rows[0].payload, payload);
        assert!(payload.unwrap().ends_with("0000000000000000"));
        s.memo_adapter_version = 5;
        assert!(s.validate().is_err());
        assert!(s.page(page(&[2], Some(1))).is_err());
        for text in [b"ANGLE 37.5".as_slice(), b"MOVE 42".as_slice()] {
            t.icrc1_memo = Some(text.to_vec());
            assert_eq!(
                classify(&t, &recipient).unwrap(),
                classify_v6(&t, &recipient).unwrap()
            );
        }
        t.memo = b2z_protocol::numeric(b2z_protocol::Command::Angle(0));
        t.icrc1_memo = Some(vec![]);
        assert!(classify_v6(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("0000000000000000"));
    }
    #[test]
    fn full_nat64_source_positions_and_subaccounts_survive_durable_codec() {
        let (mut s, _) = SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::from_slice(&[1]),
                index: Principal::from_slice(&[2]),
                receiving_subaccount: u64::MAX,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
            owner(),
        )
        .unwrap();
        let mut record = tx(u64::MAX - 1);
        if let Operation::Transfer { to, .. } = &mut record.transaction.operation {
            *to = s.recipient_hex.clone();
        }
        s.page(History {
            balance: 0,
            transactions: vec![record],
            oldest_tx_id: Some(u64::MAX - 1),
        })
        .unwrap();
        let bytes = dtr_wire::encode(&s).unwrap();
        let restored: SourceState = dtr_wire::decode(&bytes).unwrap();
        restored.validate().unwrap();
        assert_eq!(restored.receiving_subaccount, u64::MAX);
        let (end, inputs, _) = restored.admission(&"00".repeat(32)).unwrap();
        assert_eq!(end, u64::MAX);
        assert_eq!(inputs[0].position.0.to_string(), (u64::MAX - 1).to_string());
        let bad = String::from_utf8(bytes)
            .unwrap()
            .replace(&format!("\"{}\"", u64::MAX), "\"018446744073709551615\"");
        assert!(dtr_wire::decode::<SourceState>(bad.as_bytes()).is_err());
    }
    #[test]
    fn exact_numeric_subaccount_derivation() {
        assert_eq!(
            receiving_account(owner(), 0),
            AccountIdentifier::new(&owner(), &ic_ledger_types::DEFAULT_SUBACCOUNT)
        );
        let mut raw = [0; 32];
        raw[31] = 7;
        assert_eq!(
            receiving_account(owner(), 7),
            AccountIdentifier::new(&owner(), &Subaccount(raw))
        );
        assert_ne!(receiving_account(owner(), 0), receiving_account(owner(), 7));
    }
    #[test]
    fn poke_target_positive_nat_and_bounded_vector() {
        let p = |target, amount| PokeMatch {
            target,
            max_amount: Nat::from(amount),
        };
        assert!(!matching_poke(&[], 0));
        for target in [PokeTarget::subaccount(1), PokeTarget::neuron_nonce(0)] {
            assert!(!matching_poke(&[p(target, 1u64)], 0));
        }
        assert!(!matching_poke(&[p(PokeTarget::subaccount(0), 0u64)], 0));
        assert!(matching_poke(&[p(PokeTarget::subaccount(0), 1u64)], 0));
        let huge = Nat::parse(b"18446744073709551616000000000000000").unwrap();
        assert!(matching_poke(
            &[PokeMatch {
                target: PokeTarget::subaccount(0),
                max_amount: huge
            }],
            0
        ));
        let duplicate = p(PokeTarget::subaccount(0), 1u64);
        assert!(matching_poke(&vec![duplicate.clone(); 256], 0));
        assert!(!matching_poke(&vec![duplicate; 257], 0));
    }
}

/// Repair only a missing timestamp of an incoming timestamped Index row. The
/// configured Index remains responsible for finding and ordering the history.
#[cfg(target_arch = "wasm32")]
pub async fn recover_block_times(
    state: &SourceState,
    history: &mut History,
    timeout_seconds: u32,
) -> Result<()> {
    if !matches!(
        state.memo_adapter_version,
        b2z_protocol::economy17::MEMO_ADAPTER_VERSION | b2z_protocol::delegation::ADAPTER_VERSION
    ) {
        return Ok(());
    }
    let recipient = account(&state.recipient_hex)?;
    let ledger = Principal::from_text(&state.ledger).map_err(|e| e.to_string())?;
    for row in history.transactions.iter_mut().take(PAGE as usize) {
        if row.id >= state.cursor
            && row
                .transaction
                .timestamp
                .as_ref()
                .is_none_or(|t| t.timestamp_nanos == 0)
            && incoming(&row.transaction, &recipient)?
        {
            let block = ledger_block(ledger, row.id, timeout_seconds).await?;
            row.transaction.timestamp = Some(corroborate_block(&row.transaction, block)?);
        }
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn incoming(transaction: &Transaction, recipient: &AccountIdentifier) -> Result<bool> {
    match &transaction.operation {
        Operation::Transfer { from, to, .. } => {
            Ok(&account(from)? != recipient && &account(to)? == recipient)
        }
        _ => Ok(false),
    }
}

#[cfg(target_arch = "wasm32")]
#[derive(CandidType, Deserialize)]
struct BlockAt {
    start: u64,
    length: u64,
}
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(CandidType, Deserialize)]
enum LedgerOperation {
    Transfer {
        from: Vec<u8>,
        to: Vec<u8>,
        amount: Tokens,
        fee: Tokens,
        spender: Option<Vec<u8>>,
    },
}
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(CandidType, Deserialize)]
struct LedgerTransaction {
    memo: u64,
    icrc1_memo: Option<Vec<u8>>,
    operation: Option<LedgerOperation>,
}
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(CandidType, Deserialize)]
struct LedgerBlock {
    timestamp: Timestamp,
    transaction: LedgerTransaction,
}
#[cfg(target_arch = "wasm32")]
#[derive(CandidType, Deserialize)]
struct BlockRange {
    blocks: Vec<LedgerBlock>,
}
#[cfg(target_arch = "wasm32")]
#[derive(CandidType, Deserialize)]
enum ArchiveError {
    BadFirstBlockIndex {
        requested_index: u64,
        first_valid_index: u64,
    },
    Other {
        error_code: u64,
        error_message: String,
    },
}
#[cfg(target_arch = "wasm32")]
type ArchiveResult = std::result::Result<BlockRange, ArchiveError>;
#[cfg(target_arch = "wasm32")]
candid::define_function!(ArchiveBlocks : (BlockAt) -> (ArchiveResult) query);
#[cfg(target_arch = "wasm32")]
#[derive(CandidType, Deserialize)]
struct ArchivedRange {
    start: u64,
    length: u64,
    callback: ArchiveBlocks,
}
#[cfg(target_arch = "wasm32")]
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(CandidType, Deserialize)]
struct LedgerBlocks {
    chain_length: u64,
    first_block_index: u64,
    blocks: Vec<LedgerBlock>,
    archived_blocks: Vec<ArchivedRange>,
}

#[cfg(target_arch = "wasm32")]
async fn ledger_block(ledger: Principal, position: u64, timeout: u32) -> Result<LedgerBlock> {
    use ic_cdk::call::Call;
    let args = BlockAt {
        start: position,
        length: 1,
    };
    let mut response: LedgerBlocks = Call::bounded_wait(ledger, "query_blocks")
        .change_timeout(timeout)
        .with_arg(&args)
        .await
        .map_err(|e| format!("Ledger timestamp read: {e}"))?
        .candid()
        .map_err(|e| format!("Ledger timestamp decode: {e}"))?;
    if response.chain_length <= position {
        return Err("Ledger timestamp position unavailable".into());
    }
    if response.first_block_index == position
        && response.blocks.len() == 1
        && response.archived_blocks.is_empty()
    {
        return Ok(response.blocks.remove(0));
    }
    if !response.blocks.is_empty() || response.archived_blocks.len() != 1 {
        return Err("Ledger timestamp block range mismatch".into());
    }
    let range = response.archived_blocks.remove(0);
    if range.start > position
        || range
            .start
            .checked_add(range.length)
            .is_none_or(|end| position >= end)
    {
        return Err("Ledger timestamp archive position mismatch".into());
    }
    let callback = range.callback.0;
    let archived: ArchiveResult = Call::bounded_wait(callback.principal, &callback.method)
        .change_timeout(timeout)
        .with_arg(&args)
        .await
        .map_err(|e| format!("Ledger archive timestamp read: {e}"))?
        .candid()
        .map_err(|e| format!("Ledger archive timestamp decode: {e}"))?;
    let mut range = archived.map_err(|_| "Ledger archive timestamp unavailable")?;
    if range.blocks.len() != 1 {
        return Err("Ledger archive timestamp block count mismatch".into());
    }
    Ok(range.blocks.remove(0))
}

#[cfg(any(test, target_arch = "wasm32"))]
fn corroborate_block(index: &Transaction, block: LedgerBlock) -> Result<Timestamp> {
    let Operation::Transfer {
        from,
        to,
        amount,
        fee,
        spender,
    } = &index.operation
    else {
        return Err("Ledger timestamp Index operation mismatch".into());
    };
    let Some(LedgerOperation::Transfer {
        from: block_from,
        to: block_to,
        amount: block_amount,
        fee: block_fee,
        spender: block_spender,
    }) = block.transaction.operation
    else {
        return Err("Ledger timestamp block operation mismatch".into());
    };
    let index_spender = spender
        .as_ref()
        .map(|id| account(id).map(|id| id.as_bytes().to_vec()))
        .transpose()?;
    if block.timestamp.timestamp_nanos == 0
        || block.transaction.memo != index.memo
        || block.transaction.icrc1_memo != index.icrc1_memo
        || block_from != account(from)?.as_bytes()
        || block_to != account(to)?.as_bytes()
        || block_amount.e8s != amount.e8s
        || block_fee.e8s != fee.e8s
        || block_spender != index_spender
    {
        return Err("Ledger timestamp block does not match Index transaction".into());
    }
    Ok(block.timestamp)
}

#[cfg(test)]
mod timestamp_tests {
    use super::*;
    #[test]
    fn candidate_admits_only_inbound_transfers_with_a_real_block_timestamp() {
        use b2z_protocol::delegation::Payment;
        let recipient = AccountIdentifier::new(&Principal::anonymous(), &Subaccount([0; 32]));
        let payer = AccountIdentifier::new(&Principal::management_canister(), &Subaccount([0; 32]));
        let spender = AccountIdentifier::new(&Principal::from_slice(&[7]), &Subaccount([0; 32]));
        let mut row = TransactionWithId {
            id: 14,
            transaction: Transaction {
                memo: 0,
                icrc1_memo: Some(b"RESERVOIR 4".to_vec()),
                operation: Operation::Transfer {
                    from: payer.to_hex(),
                    to: recipient.to_hex(),
                    amount: Tokens { e8s: 10_000_000 },
                    fee: Tokens { e8s: 10_000 },
                    spender: Some(spender.to_hex()),
                },
                created_at_time: Some(Timestamp {
                    timestamp_nanos: 10,
                }),
                timestamp: None,
            },
        };
        assert!(classify_delegation(&row, &recipient).is_err());
        row.transaction.timestamp = Some(Timestamp {
            timestamp_nanos: 20,
        });
        let normalized = classify_delegation(&row, &recipient).unwrap().unwrap();
        let payment = Payment::decode(&unhex(&normalized).unwrap()).unwrap();
        assert_eq!(payment.position, 14);
        assert_eq!(payment.spender, Some(*spender.as_bytes()));
        assert_eq!(payment.created_at_ns, Some(10));
        assert_eq!(payment.ledger_time_ns, 20);
        assert_eq!(
            b2z_protocol::economy17::untimed(&payment.pricing_envelope().unwrap())
                .unwrap()
                .1,
            20
        );
        row.transaction.operation = Operation::Approve {
            fee: Tokens { e8s: 10_000 },
            from: payer.to_hex(),
            allowance: Tokens { e8s: 10_000_000 },
            expires_at: None,
            spender: spender.to_hex(),
            expected_allowance: None,
        };
        assert_eq!(classify_delegation(&row, &recipient).unwrap(), None);
    }
    #[test]
    fn adapter11_uses_block_time_and_fails_closed_without_it() {
        let recipient = AccountIdentifier::new(&Principal::anonymous(), &Subaccount([0; 32]));
        let sender =
            AccountIdentifier::new(&Principal::management_canister(), &Subaccount([0; 32]));
        let mut tx = Transaction {
            memo: 0,
            icrc1_memo: Some(b"RESERVOIR 7".to_vec()),
            operation: Operation::Transfer {
                from: sender.to_hex(),
                to: recipient.to_hex(),
                fee: Tokens { e8s: 10_000 },
                amount: Tokens { e8s: 10_000_000 },
                spender: None,
            },
            timestamp: None,
            created_at_time: Some(Timestamp {
                timestamp_nanos: 111,
            }),
        };
        assert!(classify_with(&tx, &recipient, 11).is_err());
        let block = |timestamp_nanos, amount| LedgerBlock {
            timestamp: Timestamp { timestamp_nanos },
            transaction: LedgerTransaction {
                memo: 0,
                icrc1_memo: Some(b"RESERVOIR 7".to_vec()),
                operation: Some(LedgerOperation::Transfer {
                    from: sender.as_bytes().to_vec(),
                    to: recipient.as_bytes().to_vec(),
                    fee: Tokens { e8s: 10_000 },
                    amount: Tokens { e8s: amount },
                    spender: None,
                }),
            },
        };
        assert!(corroborate_block(&tx, block(222, 11_000_000)).is_err());
        assert!(corroborate_block(&tx, block(0, 10_000_000)).is_err());
        tx.timestamp = Some(corroborate_block(&tx, block(222, 10_000_000)).unwrap());
        let payload =
            |version| unhex(&classify_with(&tx, &recipient, version).unwrap().unwrap()).unwrap();
        assert_eq!(
            b2z_protocol::economy17::untimed(&payload(11)).unwrap(),
            (payload(10), 222)
        );
    }
}
