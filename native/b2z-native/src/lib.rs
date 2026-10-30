//! Complete S03 reference rule port. Source-only until the native conformance gate executes.
#![forbid(unsafe_code)]
mod cursor;
mod economics_generated;
pub mod geometry;
pub mod lifecycle_v6;
pub mod migration;
pub mod playability;
mod playability_generated;
pub mod pricing_v6;
pub mod purchases_v6;
pub mod spawn;
pub mod territory_topology_v6;
pub mod territory_v6;
pub mod topology;
pub mod world;
pub use cursor::{identity, million_identity, torus_identity, Cursor, Input, Output};

pub mod host;
