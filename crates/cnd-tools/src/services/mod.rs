//! Local service adapters, separate from authenticated workspace calls.

pub(crate) mod cli;
mod dispatch;
mod input;
pub mod tools;

#[cfg(test)]
#[path = "_tests_/adapter_tests.rs"]
mod adapter_tests;
