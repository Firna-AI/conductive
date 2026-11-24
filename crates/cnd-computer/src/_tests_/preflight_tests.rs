//! Capability reports use the local systemd and Podman data.

#![allow(clippy::unwrap_used)]

use std::os::unix::process::ExitStatusExt;
use std::sync::Arc;

use unimock::{MockFn, Unimock, matching};

use crate::process::{Invocation, Output, ProcessMock};
use crate::settings::SettingsStoreMock;

use super::{Check, Preflight};

fn output(code: i32, stdout: &str) -> crate::error::Result<Output> {
    Ok(Output {
        status: std::process::ExitStatus::from_raw(code << 8),
        stdout: stdout.as_bytes().to_vec(),
        stderr: Vec::new(),
    })
}

fn args(invocation: &Invocation, expected: &[&str]) -> bool {
    invocation.args.iter().eq(expected.iter())
}

#[tokio::test]
async fn degraded_user_manager_and_rootless_podman_pass_without_enrollment() {
    let process = Arc::new(Unimock::new((
        ProcessMock::run.some_call(matching!((call) if call.program == "systemctl" && args(call, &["--user", "is-system-running"]))).returns(output(1, "degraded\n")),
        ProcessMock::run.some_call(matching!((call) if call.program == "podman" && args(call, &["version", "--format", "json"]))).returns(output(0, r#"{"Client":{"Version":"4.9.3"}}"#)),
        ProcessMock::run.some_call(matching!((call) if call.program == "podman" && args(call, &["info", "--format", "json"]))).returns(output(0, r#"{"host":{"cgroupVersion":"v2","cgroupControllers":["cpu","memory","pids"],"security":{"rootless":true},"idMappings":{"uidmap":[{"container_id":1,"host_id":100000,"size":65536}],"gidmap":[{"container_id":1,"host_id":100000,"size":65536}]}}}"#)),
    )));
    let store = Arc::new(Unimock::new(
        SettingsStoreMock::read
            .some_call(matching!())
            .returns(Ok(None)),
    ));
    let report = Preflight {
        process,
        store,
        supported_system: true,
    }
    .report()
    .await;
    assert!(report.passed());
    assert_eq!(
        report.lines().collect::<Vec<_>>(),
        [
            "ok Linux x86_64",
            "ok systemd user manager",
            "ok Podman 4 or later",
            "ok rootless Podman",
            "ok cgroups v2",
            "ok cpu controller",
            "ok memory controller",
            "ok pids controller",
            "ok subordinate user IDs",
            "ok subordinate group IDs",
            "Computer token is missing.",
        ]
    );
}

#[tokio::test]
async fn reports_missing_requirements_independently() {
    let process = Arc::new(Unimock::new((
        ProcessMock::run.some_call(matching!((call) if call.program == "systemctl")).returns(output(1, "offline\n")),
        ProcessMock::run.some_call(matching!((call) if args(call, &["version", "--format", "json"]))).returns(output(0, r#"{"Client":{"Version":"3.9.3"}}"#)),
        ProcessMock::run.some_call(matching!((call) if args(call, &["info", "--format", "json"]))).returns(output(0, r#"{"host":{"cgroupVersion":"v1","cgroupControllers":["cpu"],"security":{"rootless":false},"idMappings":{"uidmap":[{"container_id":0,"host_id":1000,"size":1}]}}}"#)),
    )));
    let store = Arc::new(Unimock::new(
        SettingsStoreMock::read
            .some_call(matching!())
            .returns(Ok(None)),
    ));
    let report = Preflight {
        process,
        store,
        supported_system: false,
    }
    .report()
    .await;
    assert!(!report.passed());
    let lines: Vec<_> = report.lines().collect();
    for name in [
        "Linux x86_64",
        "systemd user manager",
        "Podman 4 or later",
        "rootless Podman",
        "cgroups v2",
        "memory controller",
        "pids controller",
        "subordinate user IDs",
        "subordinate group IDs",
    ] {
        assert!(
            lines
                .iter()
                .any(|line| line.starts_with(&format!("fail {name}: "))),
            "{name}"
        );
    }
    assert!(lines.contains(&"ok cpu controller".to_owned()));
}
