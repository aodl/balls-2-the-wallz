//! Adapter only: generic host must not import this game.
use crate::{Cursor, Input};
use dtr_host::{Kernel, Output, Progress, Seal};
use dtr_wire::{hash, Result};
#[derive(Clone, Copy)]
pub struct B2zHostKernel;
impl Kernel for B2zHostKernel {
    fn begin(&self, state: &[u8], inputs: &[dtr_host::Input], seal: &Seal) -> Result<Vec<u8>> {
        let inputs = inputs
            .iter()
            .map(|i| Input {
                position: i.position.clone(),
                payload_hex: i.payload_hex.clone(),
            })
            .collect();
        let context = serde_json::to_value(seal).map_err(|e| e.to_string())?;
        Cursor::begin(state, inputs, &context)?.snapshot()
    }
    fn validate_cursor(&self, bytes: &[u8], expected_hash: &str) -> Result<()> {
        Cursor::restore(bytes, expected_hash)?;
        Ok(())
    }
    fn step(&self, bytes: &[u8], budget: usize) -> Result<(Vec<u8>, Progress)> {
        let mut c = Cursor::restore(bytes, &hash(bytes))?;
        let (used, complete) = c.step(budget)?;
        Ok((c.snapshot()?, Progress { used, complete }))
    }
    fn result(&self, bytes: &[u8]) -> Result<Output> {
        let out = Cursor::restore(bytes, &hash(bytes))?.result()?;
        Ok(Output {
            state: out.state,
            events: out.events,
            scores: out.scores,
        })
    }
}

/// An immutable, fully restored cursor owned by one execution operation. No
/// mutable cursor accessor or constructor from arbitrary typed game objects.
/// Every external byte string enters through the original full restore path.
#[derive(Clone)]
pub struct ExecutionSession {
    cursor: Cursor,
    bytes: Option<Vec<u8>>,
}
impl ExecutionSession {
    pub fn restore(bytes: &[u8], expected: &str, limit: usize) -> Result<Self> {
        Ok(Self {
            cursor: Cursor::restore(bytes, expected)?,
            bytes: (bytes.len() <= limit).then(|| bytes.to_vec()),
        })
    }
    pub fn snapshot(&self) -> Result<Vec<u8>> {
        match &self.bytes {
            Some(bytes) => Ok(bytes.clone()),
            None => self.cursor.snapshot(),
        }
    }
    pub fn result(&self) -> Result<Output> {
        let out = self.cursor.result()?;
        Ok(Output {
            state: out.state,
            events: out.events,
            scores: out.scores,
        })
    }
    pub fn propose_step(
        &self,
        budget: usize,
        limit: usize,
    ) -> Result<(Vec<u8>, Progress, Option<Self>)> {
        // Proposal isolation: an ordinary Err cannot mutate the trusted input.
        let mut cursor = self.cursor.clone();
        let (used, complete) = cursor.step(budget)?;
        // The original canonical encoder enforces all byte/structure/tag limits.
        let bytes = cursor.snapshot()?;
        let next = if bytes.len() <= limit {
            // Exact same cursor bounds/world checks as full restore. Typed fields
            // originate only from restore and deterministic kernel operations;
            // callers cannot mutate or inject them. No JSON parse is needed to
            // establish their schema or reduced-rational provenance again.
            cursor.validate_fields(3)?;
            Some(Self {
                cursor,
                bytes: Some(bytes.clone()),
            })
        } else {
            None
        }; // Oversized continuations keep the original uncached path.
        Ok((bytes, Progress { used, complete }, next))
    }
}
