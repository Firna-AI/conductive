//! Signed release downloads and base image imports with real loopback HTTP.

#![expect(
    clippy::unwrap_used,
    reason = "Invalid signed fixtures must fail the test."
)]

#[path = "releases/base_tests.rs"]
mod base_tests;
#[path = "releases/fixtures.rs"]
mod fixtures;
#[path = "releases/program_tests.rs"]
mod program_tests;
mod support;
