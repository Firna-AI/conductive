//! Update polling verifies the executable and waits before activation.

#![expect(
    clippy::unwrap_used,
    reason = "The update fixture must run to completion."
)]

use std::os::unix::process::ExitStatusExt;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use tokio::sync::{Notify, watch};
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::virtual_timer;
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::process::{Output, ProcessMock};
use crate::releases::ports::ReleasesMock;
use crate::settings::SettingsStoreMock;
use crate::update::ports::UpdateFilesMock;
use crate::update::state::UpdateState;

use super::{Updater, Updates};

use super::support::{latest, settings, updater};

fn candidate() -> Updater {
    let mut updater = updater();
    updater.timer = virtual_timer();
    updater.settings = Arc::new(Unimock::new(
        SettingsStoreMock::read
            .some_call(matching!())
            .returns(Ok(Some(settings()))),
    ));
    updater.releases = Arc::new(Unimock::new((
        ReleasesMock::latest
            .some_call(matching!(_))
            .returns(Ok(latest("0.0.42"))),
        ReleasesMock::verified_program
            .some_call(matching!((_, release) if release.identity().version == "0.0.42"))
            .returns(Ok(PathBuf::from("/fixture/cache/conductive"))),
    )));
    updater
}

fn output(version: &str) -> Output {
    Output {
        status: std::process::ExitStatus::from_raw(0),
        stdout: format!("conductive {version}\n").into_bytes(),
        stderr: Vec::new(),
    }
}

#[tokio::test(start_paused = true)]
async fn update_waits_for_pending_requests_before_switching_and_stopping() {
    let mut updater = candidate();
    let checked = Arc::new(Notify::new());
    let ready = checked.clone();
    let switched = Arc::new(AtomicBool::new(false));
    let observed = switched.clone();
    updater.files = Arc::new(Unimock::new((
        UpdateFilesMock::state
            .each_call(matching!())
            .answers(&|_| Ok(UpdateState::default())),
        UpdateFilesMock::install
            .some_call(
                matching!(("0.0.42", path) if path.to_str() == Some("/fixture/cache/conductive")),
            )
            .returns(Ok(PathBuf::from("/fixture/versions/0.0.42/conductive"))),
        UpdateFilesMock::is_current
            .some_call(matching!())
            .returns(Ok(true)),
        UpdateFilesMock::save
            .next_call(
                matching!((state) if state.previous.as_deref() == Some("0.0.41")
            && state.pending.as_deref() == Some("0.0.42") && state.starts == 0),
            )
            .returns(Ok(())),
        UpdateFilesMock::switch
            .next_call(matching!("0.0.42"))
            .answers_arc(Arc::new(move |_, _| {
                switched.store(true, Ordering::SeqCst);
                Ok(())
            })),
        UpdateFilesMock::collect
            .some_call(matching!("0.0.42", Some("0.0.41")))
            .returns(Ok(())),
    )));
    updater.process = Arc::new(Unimock::new(
        ProcessMock::run
            .some_call(matching!((call) if
        call.program == "/fixture/versions/0.0.42/conductive" && call.args == ["--version"]))
            .answers_arc(Arc::new(move |_, _| {
                ready.notify_one();
                Ok(output("0.0.42"))
            })),
    ));
    updater.diagnostics = Arc::new(Unimock::new(
        DiagnosticsMock::update_activated
            .some_call(matching!())
            .returns(()),
    ));
    let request = updater.activity.request().await;
    let (stop, mut stopped) = watch::channel(false);
    let shutdown = stopped.clone();
    let monitor = tokio::spawn(async move { updater.monitor(stop, shutdown).await });
    checked.notified().await;
    assert!(!observed.load(Ordering::SeqCst));
    assert!(!*stopped.borrow());
    drop(request);
    stopped.changed().await.unwrap();
    assert!(*stopped.borrow());
    assert!(observed.load(Ordering::SeqCst));
    monitor.await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn a_wrong_program_version_cannot_become_a_candidate() {
    let mut updater = candidate();
    updater.files = Arc::new(
        Unimock::new((
            UpdateFilesMock::state
                .some_call(matching!())
                .returns(Ok(UpdateState::default())),
            UpdateFilesMock::install
                .some_call(matching!("0.0.42", _))
                .returns(Ok(PathBuf::from("/fixture/versions/0.0.42/conductive"))),
            UpdateFilesMock::collect
                .some_call(matching!("0.0.41", None))
                .returns(Ok(())),
        ))
        .no_verify_in_drop(),
    );
    updater.process = Arc::new(Unimock::new(
        ProcessMock::run
            .some_call(matching!(_))
            .returns(Ok(output("0.0.40"))),
    ));
    assert!(matches!(
        updater.prepare().await,
        Err(Error::UpdateProgramVersion)
    ));
}

#[tokio::test]
async fn an_older_or_refused_release_is_never_installed() {
    for (version, refused) in [("0.0.9", false), ("0.0.42", true)] {
        let mut updater = updater();
        updater.settings = Arc::new(Unimock::new(
            SettingsStoreMock::read
                .some_call(matching!())
                .returns(Ok(Some(settings()))),
        ));
        updater.releases = Arc::new(
            Unimock::new((
                ReleasesMock::latest
                    .some_call(matching!(_))
                    .returns(Ok(latest(version))),
                ReleasesMock::verified_program
                    .some_call(matching!(_, _))
                    .returns(Err(Error::ReleaseInvalid)),
            ))
            .no_verify_in_drop(),
        );
        if refused {
            let mut state = UpdateState::default();
            state.refused.insert(version.into());
            updater.files = Arc::new(Unimock::new(
                UpdateFilesMock::state
                    .some_call(matching!())
                    .returns(Ok(state)),
            ));
        }
        assert!(matches!(updater.prepare().await, Ok(None)), "{version}");
    }
}
