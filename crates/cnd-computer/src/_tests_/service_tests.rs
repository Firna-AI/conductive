//! The service unit precedes the ordered systemd reload, enable, and restart.

#![allow(clippy::unwrap_used)]

use std::os::unix::process::ExitStatusExt;
use std::sync::Arc;

use unimock::{MockFn, Unimock, matching};

use crate::process::{Invocation, Output, ProcessMock};

use super::{Service, UNIT, UNIT_NAME, UnitStoreMock, UserService};

fn succeeded() -> crate::error::Result<Output> {
    Ok(Output {
        status: std::process::ExitStatus::from_raw(0),
        stdout: Vec::new(),
        stderr: Vec::new(),
    })
}

fn command(call: &Invocation, args: &[&str]) -> bool {
    call.program == "systemctl" && call.args.iter().eq(args.iter())
}

#[tokio::test]
async fn installs_the_embedded_unit_before_enabling_and_restarting_it() {
    let native = Arc::new(Unimock::new((
        UnitStoreMock::write.next_call(matching!((text) if *text == UNIT &&
            text.contains("KillMode=process\n") &&
            text.contains("ExecStart=%h/.local/share/conductive/current/conductive computer run\n")
        )).returns(Ok(())),
        ProcessMock::run.next_call(matching!((call) if command(call, &["--user", "daemon-reload"]))).returns(succeeded()),
        ProcessMock::run.next_call(matching!((call) if command(call, &["--user", "enable", UNIT_NAME]))).returns(succeeded()),
        ProcessMock::run.next_call(matching!((call) if command(call, &["--user", "restart", UNIT_NAME]))).returns(succeeded()),
    )));
    let service = UserService {
        process: native.clone(),
        unit: native,
    };
    let result = service.install().await;
    assert!(result.is_ok(), "{result:?}");
}
