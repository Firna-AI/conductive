//! Retry schedules, welcome reset, unsupported versions, and missing settings.

#![expect(
    clippy::unwrap_used,
    reason = "In-memory fixture failures must stop the test."
)]

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::ports::{ClockMock, ConfigurationMock, ConnectorMock};
use crate::runtime::{Host, HostRuntime};

use super::support::settings;

#[tokio::test]
async fn missing_env_values_wait_one_second_before_reading_again() {
    let (stop, shutdown) = watch::channel(false);
    let delays = Arc::new(Mutex::new(Vec::new()));
    let captured = delays.clone();
    let clock = Arc::new(Unimock::new(
        ClockMock::wait
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, duration| {
                let captured = captured.clone();
                Box::pin(async move {
                    captured.lock().unwrap().push(duration);
                })
            })),
    ));
    let count = Arc::new(Mutex::new(0));
    let captured = count.clone();
    let configuration = Arc::new(Unimock::new(
        ConfigurationMock::read
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let mut count = captured.lock().unwrap();
                *count += 1;
                Ok(if *count == 3 { Some(settings()) } else { None })
            })),
    ));
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .some_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let stop = stop.clone();
                Box::pin(async move {
                    stop.send_replace(true);
                    Err(Error::Unavailable)
                })
            })),
    ));
    HostRuntime {
        configuration,
        connector,
        session: Arc::new(Unimock::new(())),
        clock,
        diagnostics: Arc::new(Unimock::new((
            DiagnosticsMock::settings_missing
                .some_call(matching!())
                .returns(())
                .once(),
            DiagnosticsMock::settings_restored
                .some_call(matching!())
                .returns(())
                .once(),
            DiagnosticsMock::attempt_failed
                .some_call(matching!(None))
                .returns(())
                .once(),
        ))),
        program_version: "test".into(),
    }
    .run(shutdown)
    .await
    .unwrap();
    assert_eq!(*delays.lock().unwrap(), [Duration::from_secs(1); 2]);
    assert_eq!(*count.lock().unwrap(), 3);
}
