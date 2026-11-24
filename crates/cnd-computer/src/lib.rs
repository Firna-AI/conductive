//! Own computer setup, the outbound connection, and fixed container operations.

pub mod activity;
pub mod diagnostics;
mod disk;
pub mod engine;
pub mod enrollment;
pub mod error;
mod http;
pub mod operations;
pub mod preflight;
pub mod process;
pub mod releases;
pub mod resources;
pub mod runtime;
pub mod service;
pub mod session;
pub mod settings;
pub mod socket;
pub mod timer;
pub mod update;
mod wire;

#[cfg(test)]
#[path = "_tests_/connection_support.rs"]
mod connection_support;
