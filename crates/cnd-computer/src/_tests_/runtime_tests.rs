//! The reconnect loop rereads credentials and uses the documented waits.

#![expect(clippy::unwrap_used, reason = "Fixture state must be available.")]

use std::future;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cnd_runner_interface::computer::limits::COMPUTER_CLOSE_UNSUPPORTED_VERSION;
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::resources;
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::resources::ResourcesMock;
use crate::session::serve::{SessionExit, SessionMock};
use crate::settings::{Settings, SettingsStoreMock};
use crate::socket::{ConnectorMock, Socket};
use crate::timer::TimerMock;

use super::{Attempt, Computer, ComputerRuntime, Retry};

fn settings(index: usize) -> Settings {
    Settings {
        origin: "https://api.conductive.build".parse().unwrap(),
        token: format!("fixture-{index}"),
        release_server: "https://runner.conductive.build".parse().unwrap(),
    }
}

#[tokio::test(start_paused = true)]
async fn missing_settings_refusals_and_unsupported_versions_use_distinct_waits() {
    let (stop, shutdown) = watch::channel(false);
    let reads = Arc::new(Mutex::new(0));
    let waits = Arc::new(Mutex::new(Vec::new()));
    let seen = waits.clone();
    let socket: Arc<dyn Socket> = Arc::new(Unimock::new(()));
    let runtime = ComputerRuntime {
        settings: Arc::new(Unimock::new(SettingsStoreMock::read.some_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let mut reads = reads.lock().unwrap();
                *reads += 1;
                match *reads {
                    1 => Ok(None),
                    2 => Err(Error::InvalidSettings),
                    6 => {
                        stop.send(true).unwrap();
                        Ok(Some(settings(*reads)))
                    }
                    index => Ok(Some(settings(index))),
                }
            })).n_times(6))),
        resources: Arc::new(Unimock::new(ResourcesMock::read.some_call(matching!()).answers(&|_| Ok(resources())).n_times(3))),
        connector: Arc::new(Unimock::new((
            ConnectorMock::connect.some_call(matching!((settings) if settings.token == "fixture-3"))
                .answers(&|_, _| Box::pin(async { Err(Error::UpgradeRefused { status: 401 }) })),
            ConnectorMock::connect.some_call(matching!((settings) if settings.token == "fixture-4" || settings.token == "fixture-5"))
                .answers_arc(Arc::new(move |_, _| {
                    let socket = socket.clone();
                    Box::pin(async move { Ok(socket) })
                })).n_times(2),
        ))),
        session: Arc::new(Unimock::new(SessionMock::serve.stub(|each| {
            each.call(matching!(_, "0.0.42", _, _, _))
                .returns(SessionExit { welcomed: false, close_code: Some(COMPUTER_CLOSE_UNSUPPORTED_VERSION) })
                .once().then().returns(SessionExit { welcomed: true, close_code: None }).once();
        }))),
        timer: Arc::new(Unimock::new((
            TimerMock::wait.some_call(matching!(_)).answers_arc(Arc::new(move |_, time| {
                seen.lock().unwrap().push(time.as_secs());
                Box::pin(tokio::time::sleep(time))
            })).at_least_times(0),
            TimerMock::jitter.some_call(matching!(_)).returns(Duration::ZERO).at_least_times(0),
        ))),
        diagnostics: Arc::new(Unimock::new((
            DiagnosticsMock::settings_missing.some_call(matching!()).returns(()).once(),
            DiagnosticsMock::settings_restored.some_call(matching!()).returns(()).once(),
            DiagnosticsMock::new_code_needed.some_call(matching!()).returns(()).once(),
        ))),
        version: "0.0.42".into(),
    };
    runtime.run(shutdown).await.unwrap();
    let observed = waits.lock().unwrap();
    assert_eq!(&observed[..8], [5, 5, 60, 300, 60, 60, 60, 1]);
}

#[tokio::test(start_paused = true)]
async fn a_stalled_upgrade_ends_at_the_attempt_deadline() {
    let (stop, shutdown) = watch::channel(false);
    let observed = Arc::new(Mutex::new(Vec::new()));
    let capture = observed.clone();
    let runtime = ComputerRuntime {
        settings: Arc::new(Unimock::new(
            SettingsStoreMock::read
                .some_call(matching!())
                .returns(Ok(Some(settings(1)))),
        )),
        resources: Arc::new(Unimock::new(
            ResourcesMock::read
                .some_call(matching!())
                .returns(Ok(resources())),
        )),
        connector: Arc::new(Unimock::new(
            ConnectorMock::connect
                .some_call(matching!(_))
                .answers(&|_, _| Box::pin(future::pending())),
        )),
        session: Arc::new(Unimock::new(())),
        timer: Arc::new(Unimock::new((
            TimerMock::wait
                .some_call(matching!(_))
                .answers_arc(Arc::new(move |_, time| {
                    let capture = capture.clone();
                    let stop = stop.clone();
                    Box::pin(async move {
                        capture.lock().unwrap().push(time.as_secs());
                        if time == Duration::from_secs(1) {
                            stop.send(true).unwrap();
                        } else {
                            tokio::time::sleep(time).await;
                        }
                    })
                }))
                .at_least_times(0),
            TimerMock::jitter
                .some_call(matching!(_))
                .returns(Duration::ZERO),
        ))),
        diagnostics: Arc::new(Unimock::new(
            DiagnosticsMock::attempt_failed
                .some_call(matching!(None))
                .returns(()),
        )),
        version: "0.0.42".into(),
    };
    runtime.run(shutdown).await.unwrap();
    assert_eq!(*observed.lock().unwrap(), [60, 1]);
}

#[test]
fn ordinary_waits_grow_with_jitter_and_stay_within_thirty_seconds() {
    let inert = Arc::new(Unimock::new(()));
    let runtime = ComputerRuntime {
        settings: inert.clone(),
        resources: inert.clone(),
        connector: inert.clone(),
        session: inert.clone(),
        diagnostics: inert,
        timer: Arc::new(Unimock::new(
            TimerMock::jitter
                .each_call(matching!(_))
                .returns(Duration::from_secs(10)),
        )),
        version: "0.0.42".into(),
    };
    let mut retry = Retry::default();
    let durations: Vec<_> = (0..7)
        .map(|_| runtime.delay(Attempt::Failed, &mut retry).as_millis())
        .collect();
    assert_eq!(durations, [1200, 2400, 4800, 9600, 19200, 30000, 30000]);
    let welcome = Attempt::Ended(SessionExit {
        welcomed: true,
        close_code: None,
    });
    assert_eq!(runtime.delay(welcome, &mut retry).as_millis(), 1200);
}
