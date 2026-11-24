//! State inspection and startup recovery against the typed process boundary.

#![expect(
    clippy::unwrap_used,
    reason = "The mocked process must record its calls."
)]

use std::os::unix::process::ExitStatusExt;
use std::process::ExitStatus;
use std::sync::{Arc, Mutex};

use unimock::{MockFn, Unimock, matching};

use crate::engine::error::EngineError;
use crate::engine::podman::Podman;
use crate::engine::ports::Engine;
use crate::engine::states::ContainerStatus;
use crate::process::{Output, ProcessMock};

fn output(text: &str) -> Output {
    Output {
        status: ExitStatus::from_raw(0),
        stdout: text.as_bytes().to_vec(),
        stderr: Vec::new(),
    }
}

#[tokio::test]
async fn podman_transitions_are_distinct_from_stopped_containers() {
    for (text, state) in [
        ("configured", Some(ContainerStatus::Stopped)),
        ("created", Some(ContainerStatus::Stopped)),
        ("exited", Some(ContainerStatus::Stopped)),
        ("paused", Some(ContainerStatus::Paused)),
        ("stopping", Some(ContainerStatus::Stopping)),
        ("removing", Some(ContainerStatus::Removing)),
        ("unknown", None),
    ] {
        let fixture = format!(r#"[{{"State":{{"Status":"{text}"}}}}]"#);
        let podman = Podman::new(Arc::new(Unimock::new(
            ProcessMock::run
                .some_call(
                    matching!((call) if call.args == ["container","inspect","conductive-box"]),
                )
                .returns(Ok(output(&fixture))),
        )));
        let result = podman.inspect("box").await;
        assert!(
            result.as_ref().is_ok_and(|status| Some(*status) == state)
                || (state.is_none() && matches!(result, Err(EngineError::Failed))),
            "{text}: {result:?}"
        );
    }
}

#[tokio::test]
async fn startup_recovers_all_labeled_pauses_by_id() {
    let first = "a".repeat(64);
    let second = "b".repeat(64);
    let ids = format!("{first}\n{second}\n");
    let calls = Arc::new(Mutex::new(Vec::new()));
    let capture = calls.clone();
    let process = Arc::new(Unimock::new(
        ProcessMock::run
            .some_call(matching!(_))
            .answers_arc(Arc::new(move |_, call| {
                let result = if call.args[0] == "ps" {
                    output(&ids)
                } else {
                    output("")
                };
                capture.lock().unwrap().push(call.args);
                Ok(result)
            }))
            .at_least_times(0),
    ));
    let podman = Podman::new(process);
    podman.recover_paused().await.unwrap();
    assert_eq!(
        *calls.lock().unwrap(),
        [
            vec![
                "ps",
                "--all",
                "--filter",
                "label=build.conductive.container",
                "--filter",
                "status=paused",
                "--no-trunc",
                "--format",
                "{{.ID}}"
            ],
            vec!["unpause", &first],
            vec!["unpause", &second],
        ],
    );
}
