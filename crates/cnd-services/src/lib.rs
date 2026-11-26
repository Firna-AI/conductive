//! Local service supervision, private runtime state, and unit-owned output.

pub mod environment;
pub mod error;
pub mod files;
pub mod helper;
pub mod logs;
pub mod manager;
pub mod ownership;
pub mod port_reports;
pub mod ports;
pub mod records;
pub mod runner;
pub mod runtime;
pub mod settings;
pub mod socket;
pub mod systemd;

#[cfg(test)]
#[path = "_tests_/mod.rs"]
mod tests;
