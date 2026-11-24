//! A stalled connector must time out through the injected clock and retry.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::sync::{Arc, Mutex};
use std::task::Poll;
use std::time::Duration;

use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::diagnostics::DiagnosticsMock;
use crate::ports::{ClockMock, ConfigurationMock, ConnectorMock};
use crate::runtime::{Host, HostRuntime};

use super::support::settings;

#[tokio::test]
async fn stalled_attempts_expire_at_sixty_seconds_and_take_the_normal_retry_path() {
    let (stop, shutdown) = watch::channel(false);
    let attempts = Arc::new(Mutex::new(0));
    let captured = attempts.clone();
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let captured = captured.clone();
                Box::pin(async move {
                    *captured.lock().unwrap() += 1;
                    std::future::pending().await
                })
            })),
    ));
    let waits = Arc::new(Mutex::new(Vec::new()));
    let captured = waits.clone();
    let clock = Arc::new(Unimock::new((
        ClockMock::jitter
            .each_call(matching!(_))
            .returns(Duration::ZERO)
            .at_least_times(0),
        ClockMock::wait
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, duration| {
                let captured = captured.clone();
                let stop = stop.clone();
                Box::pin(async move {
                    let mut values = captured.lock().unwrap();
                    values.push(duration);
                    if values.len() == 4 {
                        stop.send_replace(true);
                    }
                })
            }))
            .at_least_times(0),
    )));
    let host = HostRuntime {
        configuration: Arc::new(Unimock::new(
            ConfigurationMock::read
                .each_call(matching!())
                .answers(&|_| Ok(Some(settings()))),
        )),
        connector,
        clock,
        session: Arc::new(Unimock::new(())),
        diagnostics: Arc::new(Unimock::new(
            DiagnosticsMock::attempt_failed
                .some_call(matching!(None))
                .returns(())
                .n_times(2),
        )),
        program_version: "test".into(),
    };
    let running = host.run(shutdown);
    tokio::pin!(running);
    assert!(matches!(
        futures_util::poll!(&mut running),
        Poll::Ready(Ok(()))
    ));
    assert_eq!(*attempts.lock().unwrap(), 2);
    assert_eq!(
        *waits.lock().unwrap(),
        [60, 1, 60, 2].map(Duration::from_secs)
    );
}
