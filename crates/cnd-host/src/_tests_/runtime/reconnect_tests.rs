//! Retry schedules, welcome reset, unsupported versions, and missing settings.

#![expect(
    clippy::unwrap_used,
    reason = "In-memory fixture failures must stop the test."
)]

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::config::ConnectionRequest;
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::ports::{Clock, ClockMock, ConfigurationMock, ConnectorMock, Socket};
use crate::runtime::{Host, HostRuntime};
use crate::session::ports::{SessionExit, SessionMock};

use super::support::settings;

#[tokio::test]
async fn refused_connections_reread_settings_and_back_off_with_capped_jitter() {
    let (stop, shutdown) = watch::channel(false);
    let delays = Arc::new(Mutex::new(Vec::new()));
    let read_tokens = Arc::new(Mutex::new(Vec::new()));
    let waits = delays.clone();
    let clock: Arc<dyn Clock> = Arc::new(Unimock::new((
        ClockMock::jitter
            .each_call(matching!(_))
            .returns(Duration::from_secs(999)),
        ClockMock::wait
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, duration| {
                let waits = waits.clone();
                let stop = stop.clone();
                Box::pin(async move {
                    let mut waits = waits.lock().unwrap();
                    waits.push(duration);
                    if waits.len() == 7 {
                        stop.send_replace(true);
                    }
                })
            })),
    )));
    let reads = Arc::new(Mutex::new(0));
    let captured = reads.clone();
    let configuration = Arc::new(Unimock::new(
        ConfigurationMock::read
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let mut count = captured.lock().unwrap();
                *count += 1;
                Ok(Some(ConnectionRequest {
                    token: count.to_string(),
                    ..settings()
                }))
            })),
    ));
    let tokens = read_tokens.clone();
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| {
                let tokens = tokens.clone();
                let token = request.token.clone();
                Box::pin(async move {
                    tokens.lock().unwrap().push(token);
                    Err(Error::Unavailable)
                })
            })),
    ));
    HostRuntime {
        configuration,
        connector,
        session: Arc::new(Unimock::new(())),
        clock,
        diagnostics: Arc::new(Unimock::new(
            DiagnosticsMock::attempt_failed
                .some_call(matching!(None))
                .returns(())
                .n_times(7),
        )),
        program_version: "test".into(),
    }
    .run(shutdown)
    .await
    .unwrap();
    assert_eq!(
        *delays.lock().unwrap(),
        [1200, 2400, 4800, 9600, 19200, 36000, 36000].map(Duration::from_millis)
    );
    assert_eq!(
        *read_tokens.lock().unwrap(),
        ["1", "2", "3", "4", "5", "6", "7"]
    );
    assert_eq!(*reads.lock().unwrap(), 7);
}

#[tokio::test]
async fn a_welcome_resets_retry_and_version_4400_waits_sixty_seconds() {
    let (stop, shutdown) = watch::channel(false);
    let delays = Arc::new(Mutex::new(Vec::new()));
    let captured = delays.clone();
    let clock = Arc::new(Unimock::new((
        ClockMock::jitter
            .each_call(matching!(_))
            .returns(Duration::ZERO),
        ClockMock::wait
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, duration| {
                let captured = captured.clone();
                let stop = stop.clone();
                Box::pin(async move {
                    let mut waits = captured.lock().unwrap();
                    waits.push(duration);
                    if waits.len() == 4 {
                        stop.send_replace(true);
                    }
                })
            })),
    )));
    let socket: Arc<dyn Socket> = Arc::new(Unimock::new(()));
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let socket = socket.clone();
                Box::pin(async move { Ok(socket) })
            })),
    ));
    let counter = Arc::new(Mutex::new(0));
    let session = Arc::new(Unimock::new(
        SessionMock::serve
            .each_call(matching!(_, "test", _))
            .answers_arc(Arc::new(move |_, _, _, _| {
                let mut count = counter.lock().unwrap();
                let exit = [
                    SessionExit::default(),
                    SessionExit {
                        welcomed: true,
                        close_code: None,
                    },
                    SessionExit {
                        welcomed: false,
                        close_code: Some(4400),
                    },
                    SessionExit::default(),
                ][*count];
                *count += 1;
                exit
            })),
    ));
    let configuration = Arc::new(Unimock::new(
        ConfigurationMock::read
            .each_call(matching!())
            .answers(&|_| Ok(Some(settings()))),
    ));
    HostRuntime {
        configuration,
        connector,
        session,
        clock,
        diagnostics: Arc::new(Unimock::new(())),
        program_version: "test".into(),
    }
    .run(shutdown)
    .await
    .unwrap();
    assert_eq!(
        *delays.lock().unwrap(),
        [1, 1, 60, 2].map(Duration::from_secs)
    );
}
