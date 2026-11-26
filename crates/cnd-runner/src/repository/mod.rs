//! Git comparisons, safe file access, and captured repository reports.

mod access;
pub(crate) mod changes;
mod checkpoint;
mod context;
mod diff;
mod entries;
pub mod error;
pub mod git;
mod identity_cache;
mod index;
pub mod io;
pub(crate) mod open;
pub mod paths;
pub mod service;
mod setup;
mod snapshot;
