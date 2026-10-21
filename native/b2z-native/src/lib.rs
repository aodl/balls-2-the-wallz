//! Complete S03 reference rule port. Source-only until the native conformance gate executes.
#![forbid(unsafe_code)]
mod cursor;
mod economics_generated;
pub mod geometry;
pub mod migration;
pub mod spawn;
pub mod topology;
pub mod world;
pub use cursor::{identity, torus_identity, Cursor, Input, Output};

pub mod host;
