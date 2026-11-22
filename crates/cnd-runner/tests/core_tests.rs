//! Runner core exercised through a fake workspace endpoint and real state storage.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

#[path = "core/connection_tests.rs"]
mod connection_tests;
#[path = "core/disk_tests.rs"]
mod disk_tests;
#[path = "core/envelope_tests.rs"]
mod envelope_tests;
#[path = "core/recovery_tests.rs"]
mod recovery_tests;
#[path = "core/relocation_services.rs"]
mod relocation_services;
#[path = "core/relocation_tests.rs"]
mod relocation_tests;
#[path = "core/reports/mod.rs"]
mod reports;
#[path = "core/runtime_tests.rs"]
mod runtime_tests;
#[path = "core/service_tests.rs"]
mod service_tests;
mod support;
#[path = "core/tool_detail_tests.rs"]
mod tool_detail_tests;
