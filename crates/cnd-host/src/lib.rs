//! Outbound host connection, machine operations, and local streams.

pub mod clock;
pub mod commands;
pub mod config;
pub mod diagnostics;
pub mod dispatch;
pub mod error;
pub mod files;
pub mod ports;
pub mod replies;
pub mod runtime;
pub mod session;
pub mod socket;
pub mod streams;
pub mod wire;

#[cfg(test)]
#[path = "_tests_/support.rs"]
mod test_support;

#[cfg(test)]
#[path = "_tests_/diagnostics.rs"]
mod test_diagnostics;
