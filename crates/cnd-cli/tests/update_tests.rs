//! Release update tests with real stores and local HTTP.

mod support;

#[path = "update/checks_tests.rs"]
mod checks_tests;
#[path = "update/lifecycle_tests.rs"]
mod lifecycle_tests;
#[path = "update/pinned_tests.rs"]
mod pinned_tests;
#[path = "update/repair_tests.rs"]
mod repair_tests;
#[path = "update/signature_tests.rs"]
mod signature_tests;
