//! Disposable frontend signer and official Index proof for Rules18.
use super::*;
use b2z_native::world::World;
use b2z_protocol::{delegation::Payment, economy17};
use serde_json::{Value, json};

type Expected = BTreeMap<u64, (String, u64, Option<Principal>)>;

pub(super) struct Signer {
    child: OwnedBrowser,
    out: PathBuf,
    pub owner: Principal,
    spender: Principal,
}
impl Signer {
    pub fn start(out: &Path) -> Self {
        let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        for file in [
            "signed-config.json",
            "signed-result.json",
            "signers-public.json",
        ] {
            match std::fs::remove_file(out.join(file)) {
                Ok(()) => (),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
                Err(error) => panic!("{file}: {error}"),
            }
        }
        let log = std::fs::File::create(out.join("signer.log")).unwrap();
        let child = OwnedBrowser(
            std::process::Command::new("node")
                .current_dir(repo)
                .args([
                    "tools/fixtures/delegated-ledger-signer.mjs",
                    out.to_str().unwrap(),
                    "--installed-game",
                ])
                .stdout(log.try_clone().unwrap())
                .stderr(log)
                .spawn()
                .unwrap(),
        );
        let began = std::time::Instant::now();
        let public: Value = loop {
            if let Ok(raw) = std::fs::read(out.join("signers-public.json")) {
                if let Ok(public) = serde_json::from_slice(&raw) {
                    break public;
                }
            }
            assert!(
                began.elapsed() < Duration::from_secs(30),
                "disposable signing identities"
            );
            std::thread::sleep(Duration::from_millis(100));
        };
        let owner = Principal::from_text(public["funding"].as_str().unwrap()).unwrap();
        let spender = Principal::from_text(public["spender"].as_str().unwrap()).unwrap();
        assert_ne!(owner, spender);
        assert_ne!(spender.to_text(), public["session_principal"]);
        Self {
            child,
            out: out.to_path_buf(),
            owner,
            spender,
        }
    }

    pub fn pay(
        &mut self,
        pic: &PocketIc,
        id: Principal,
        ledger: Principal,
        prior: &World,
        balls: usize,
    ) -> Expected {
        let now = pocket_ic::Time::from(std::time::SystemTime::now());
        assert!(now.as_nanos_since_unix_epoch() > pic.get_time().as_nanos_since_unix_epoch());
        pic.set_time(now);
        let multiplier = prior
            .economy
            .as_ref()
            .unwrap()
            .tariffs(now.as_nanos_since_unix_epoch())
            .0;
        let price = |n| economy17::marginal(economy17::BALL_BASE_E8S, multiplier, n).unwrap();
        let (delegated_amount, manual_amount) = (price(balls), price(balls + 1));
        let mut live =
            PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
        let gateway = live.make_live(None);
        let config = json!({"network":"pocketic-local","canister_id":id.to_text(),
            "ledger":ledger.to_text(),"host":gateway.as_str(),
            "root_key_hex":hex(&pic.root_key().unwrap()),"installed_game":true,
            "delegated_amount":delegated_amount.to_string(),"manual_amount":manual_amount.to_string()
        });
        std::fs::write(
            self.out.join("signed-config.json"),
            serde_json::to_vec(&config).unwrap(),
        )
        .unwrap();
        let deadline = std::time::Instant::now() + Duration::from_secs(180);
        loop {
            if let Some(status) = self.child.0.try_wait().unwrap() {
                assert!(
                    status.success(),
                    "disposable signer failed: {}",
                    self.out.join("signer.log").display()
                );
                break;
            }
            assert!(
                std::time::Instant::now() < deadline,
                "bounded disposable signer timed out"
            );
            std::thread::sleep(Duration::from_millis(100));
        }
        live.stop_live();
        let result: Value =
            serde_json::from_slice(&std::fs::read(self.out.join("signed-result.json")).unwrap())
                .unwrap();
        assert_eq!(result["status"], "PASS");
        assert_eq!(result["funding"], self.owner.to_text());
        assert_eq!(result["spender"], self.spender.to_text());
        let position = |key: &str| result[key].as_str().unwrap().parse::<u64>().unwrap();
        let mut expected = BTreeMap::from([
            (
                position("grant_position"),
                ("DELEGATION_GRANTED".into(), 0, None),
            ),
            (
                position("transfer_position"),
                ("ACCEPTED".into(), delegated_amount, Some(self.spender)),
            ),
            (
                position("manual_position"),
                ("ACCEPTED".into(), manual_amount, None),
            ),
        ]);
        assert!(position("approval_position") > position("grant_position"));
        assert!(position("approval_position") < position("transfer_position"));
        for row in result["cases"].as_array().unwrap() {
            let position = row["position"].as_str().unwrap().parse::<u64>().unwrap();
            let spender = row["spender"]
                .as_str()
                .map(|value| Principal::from_text(value).unwrap());
            assert!(
                expected
                    .insert(
                        position,
                        (row["reason"].as_str().unwrap().into(), 0, spender)
                    )
                    .is_none()
            );
        }
        expected
    }
}

pub(super) fn official_inputs(
    pic: &PocketIc,
    id: Principal,
    expected: &Expected,
) -> Vec<(Payment, (String, u64, Option<Principal>))> {
    let index = status(pic, id).source.index;
    let recipient = AccountIdentifier::new(&id, &DEFAULT_SUBACCOUNT).to_hex();
    let args = candid::encode_one(source::HistoryArgs {
        account_identifier: recipient.clone(),
        start: None,
        max_results: 64,
    })
    .unwrap();
    let mut rows = None;
    for _ in 0..90 {
        let raw = pic
            .query_call(
                index,
                Principal::anonymous(),
                "get_account_identifier_transactions",
                args.clone(),
            )
            .unwrap();
        let history = decode_one::<source::HistoryResult>(&raw).unwrap().unwrap();
        if history.transactions.first().map(|row| &row.id) == expected.keys().last() {
            rows = Some(history.transactions);
            break;
        }
        tick(pic);
    }
    let mut result = Vec::new();
    for row in rows.expect("official Index must catch up") {
        let Some(check) = expected.get(&row.id) else {
            continue;
        };
        let t = &row.transaction;
        let source::Operation::Transfer {
            from,
            to,
            amount,
            fee,
            spender,
        } = &t.operation
        else {
            panic!("signed result points to a non-transfer in the official Index");
        };
        assert_eq!(to, &recipient);
        let account = |hex| *AccountIdentifier::from_hex(hex).unwrap().as_bytes();
        let p = Payment {
            from: account(from),
            spender: spender.as_deref().map(account),
            to: account(to),
            amount: amount.e8s,
            fee: fee.e8s,
            position: row.id,
            ledger_time_ns: t.timestamp.as_ref().unwrap().timestamp_nanos,
            created_at_ns: t.created_at_time.as_ref().map(|ts| ts.timestamp_nanos),
            legacy_memo: t.memo,
            memo: t.icrc1_memo.clone(),
            raw_digest: unhex(&dtr_wire::hash(&candid::encode_one(&row).unwrap()))
                .unwrap()
                .try_into()
                .unwrap(),
        };
        result.push((p, check.clone()));
    }
    assert_eq!(
        result.len(),
        expected.len(),
        "every signed position verified against the real Index"
    );
    result
}
