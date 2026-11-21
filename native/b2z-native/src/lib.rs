//! Complete S03 reference rule port. Source-only until the native conformance gate executes.
#![forbid(unsafe_code)]
pub mod capture_v6;
pub mod clearance_v9;
pub mod combined_v11;
pub mod context_structures;
mod cursor;
mod cursor_v6;
pub mod deflector_boundary;
pub mod deflectors_v12;
mod economics_generated;
pub mod entry_v7;
pub mod geometry;
pub mod lifecycle_v6;
pub mod migration;
pub mod playability;
mod playability_generated;
pub mod pricing_v6;
pub mod purchases_v6;
pub mod shout;
pub mod spacing;
pub mod spawn;
pub mod territory_topology_v6;
pub mod territory_v6;
pub mod topology;
pub mod war_cry;
pub mod world;
pub use cursor::{identity, million_identity, torus_identity, Cursor, Input, Output};

pub mod host;
