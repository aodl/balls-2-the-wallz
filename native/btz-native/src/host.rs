//! Adapter only: generic host must not import this game.
use crate::{Cursor, Input};
use dtr_host::{Kernel, Output, Progress, Seal};
use dtr_wire::{hash, Result};
#[derive(Clone, Copy)]
pub struct BtzHostKernel;
impl Kernel for BtzHostKernel {
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
