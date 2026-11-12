//! Staged downloads and restart-time activation of sandbox releases.

pub mod disk;
pub mod engine;
pub mod error;
pub mod ports;
pub mod process;
mod staging;
mod state;

#[cfg(test)]
#[path = "_tests_/apply_tests.rs"]
mod apply_tests;
#[cfg(test)]
#[path = "_tests_/check_tests.rs"]
mod check_tests;

#[cfg(test)]
#[path = "_tests_/support.rs"]
mod test_support;

#[cfg(test)]
#[path = "_tests_/warning_tests.rs"]
mod warning_tests;
