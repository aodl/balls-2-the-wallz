//! One-coordinator-lifetime memo, never durable or shared across messages.
//! Every previously unseen byte string still passes Cursor::restore, including
//! its hash, bounds, schema roundtrip and world checks. Generated snapshots are
//! deliberately NOT inserted: the host must validate those bytes normally.
use b2z_native::{host::B2zHostKernel, Cursor};
use dtr_host::{Input, Kernel, Output, Progress, Seal};
use dtr_wire::{hash, Result};
use std::cell::RefCell;

const CACHE_BYTES: usize = 256 * 1024;

struct Entry {
    bytes: Vec<u8>,
    digest: String,
    cursor: Cursor,
    output: Option<Output>,
}

#[derive(Default)]
pub struct OperationKernel {
    entry: RefCell<Option<Entry>>,
}

impl OperationKernel {
    fn access<T>(
        &self,
        bytes: &[u8],
        expected: Option<&str>,
        action: impl FnOnce(&mut Entry) -> Result<T>,
    ) -> Result<T> {
        let mut slot = self.entry.borrow_mut();
        if let Some(entry) = slot.as_mut().filter(|entry| entry.bytes == bytes) {
            if expected.is_some_and(|digest| digest != entry.digest) {
                return Err("cursor integrity".into());
            }
            return action(entry);
        }
        let digest = expected.map(str::to_owned).unwrap_or_else(|| hash(bytes));
        let cursor = Cursor::restore(bytes, &digest)?;
        let mut entry = Entry {
            bytes: Vec::new(),
            digest,
            cursor,
            output: None,
        };
        if bytes.len() <= CACHE_BYTES {
            entry.bytes = bytes.to_vec();
            *slot = Some(entry);
            action(slot.as_mut().expect("inserted operation cursor"))
        } else {
            // Large continuations retain the original uncached behavior.
            action(&mut entry)
        }
    }
}

impl Kernel for OperationKernel {
    fn begin(&self, state: &[u8], inputs: &[Input], seal: &Seal) -> Result<Vec<u8>> {
        B2zHostKernel.begin(state, inputs, seal)
    }

    fn validate_cursor(&self, bytes: &[u8], expected_hash: &str) -> Result<()> {
        self.access(bytes, Some(expected_hash), |_| Ok(()))
    }

    fn step(&self, bytes: &[u8], budget: usize) -> Result<(Vec<u8>, Progress)> {
        self.access(bytes, None, |entry| {
            let mut cursor = entry.cursor.clone();
            let (used, complete) = cursor.step(budget)?;
            Ok((cursor.snapshot()?, Progress { used, complete }))
        })
    }

    fn result(&self, bytes: &[u8]) -> Result<Output> {
        self.access(bytes, None, |entry| {
            if let Some(output) = &entry.output {
                return Ok(output.clone());
            }
            let output = entry.cursor.result()?;
            let output = Output {
                state: output.state,
                events: output.events,
                scores: output.scores,
            };
            if output.state.len() + output.events.len() + output.scores.len() <= CACHE_BYTES {
                entry.output = Some(output.clone());
            }
            Ok(output)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use b2z_native::{migration::stage_million_world, world::World};
    use dtr_wire::{unhex, Int};
    use serde_json::{json, Value};

    fn cursor() -> Cursor {
        let fixture: Value =
            serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json"))
                .unwrap();
        let world =
            World::decode(&unhex(fixture["migration"]["new_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        let world = stage_million_world(&world).unwrap();
        let start = world.time.0.to_integer();
        let mut context = b2z_native::million_identity().unwrap();
        context["logical_start"] = json!(Int(start.clone()));
        context["logical_end"] = json!(Int(start + 1));
        Cursor::begin(&world.encode().unwrap(), vec![], &context).unwrap()
    }

    #[test]
    fn warm_cache_never_accepts_a_wrong_commitment_or_changed_bytes() {
        let kernel = OperationKernel::default();
        let bytes = cursor().snapshot().unwrap();
        kernel.validate_cursor(&bytes, &hash(&bytes)).unwrap();
        assert!(kernel.entry.borrow().is_some());
        assert!(kernel.validate_cursor(&bytes, &"00".repeat(32)).is_err());
        let mut corrupt = bytes.clone();
        corrupt[0] ^= 1;
        assert!(kernel.validate_cursor(&corrupt, &hash(&corrupt)).is_err());
        assert!(OperationKernel::default().entry.borrow().is_none());
    }

    #[test]
    fn generated_continuations_still_require_first_validation_and_match_baseline() {
        let kernel = OperationKernel::default();
        let mut bytes = cursor().snapshot().unwrap();
        loop {
            kernel.validate_cursor(&bytes, &hash(&bytes)).unwrap();
            let (next, progress) = kernel.step(&bytes, 17).unwrap();
            let (reference, expected) = B2zHostKernel.step(&bytes, 17).unwrap();
            assert_eq!(next, reference);
            assert_eq!(
                (progress.used, progress.complete),
                (expected.used, expected.complete)
            );
            assert_eq!(kernel.entry.borrow().as_ref().unwrap().bytes, bytes);
            kernel.validate_cursor(&next, &hash(&next)).unwrap();
            bytes = next;
            if progress.complete {
                break;
            }
        }
        let first = kernel.result(&bytes).unwrap();
        let second = kernel.result(&bytes).unwrap();
        let baseline = B2zHostKernel.result(&bytes).unwrap();
        for output in [first, second] {
            assert_eq!(output.state, baseline.state);
            assert_eq!(output.events, baseline.events);
            assert_eq!(output.scores, baseline.scores);
        }
    }

    #[test]
    fn malformed_inputs_and_returned_copies_cannot_poison_a_valid_entry() {
        let kernel = OperationKernel::default();
        let mut bytes = cursor().snapshot().unwrap();
        loop {
            let (next, progress) = kernel.step(&bytes, 512).unwrap();
            bytes = next;
            if progress.complete {
                break;
            }
        }
        kernel.validate_cursor(&bytes, &hash(&bytes)).unwrap();
        let expected = kernel.result(&bytes).unwrap();
        let mut copy = kernel.result(&bytes).unwrap();
        copy.state.clear();
        copy.events.push(0);
        copy.scores.clear();
        for bad in [
            b"".as_slice(),
            b"{}",
            b"[]",
            b" { }",
            b"{\"version\":3,\"version\":3}",
            b"\xff",
        ] {
            assert_eq!(
                kernel.validate_cursor(bad, &hash(bad)),
                B2zHostKernel.validate_cursor(bad, &hash(bad))
            );
            assert!(kernel.step(bad, 512).is_err());
        }
        let actual = kernel.result(&bytes).unwrap();
        assert_eq!(actual.state, expected.state);
        assert_eq!(actual.events, expected.events);
        assert_eq!(actual.scores, expected.scores);
        // A failed step is isolated from the validated cursor kept in the memo.
        let before = kernel
            .entry
            .borrow()
            .as_ref()
            .unwrap()
            .cursor
            .snapshot()
            .unwrap();
        assert_eq!(
            kernel.step(&bytes, 0).err(),
            B2zHostKernel.step(&bytes, 0).err()
        );
        assert_eq!(
            kernel
                .entry
                .borrow()
                .as_ref()
                .unwrap()
                .cursor
                .snapshot()
                .unwrap(),
            before
        );
    }

    #[test]
    fn large_valid_continuations_use_uncached_validation() {
        let mut cursor = cursor();
        cursor
            .events
            .push(json!({"test_only_padding": "x".repeat(CACHE_BYTES)}));
        let bytes = cursor.snapshot().unwrap();
        assert!(bytes.len() > CACHE_BYTES);
        let kernel = OperationKernel::default();
        B2zHostKernel
            .validate_cursor(&bytes, &hash(&bytes))
            .unwrap();
        kernel.validate_cursor(&bytes, &hash(&bytes)).unwrap();
        assert!(kernel.entry.borrow().is_none());
    }
}
