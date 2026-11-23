//! Runtime diagnostic calls preserve state-change counts and numeric HTTP status.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::config::ConnectionRequest;
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::ports::{ClockMock, ConfigurationMock, ConnectorMock};
use crate::runtime::{Host, HostRuntime};

use super::support::settings;

#[tokio::test]
async fn refused_attempt_reports_http_status_through_diagnostics() {
    let (stop, shutdown) = watch::channel(false);
    let object = "0123456789abcdef".repeat(4);
    let secret = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
    let token = format!("cndm1.{object}.{secret}");
    let request = ConnectionRequest {
        token: token.clone(),
        ..settings()
    };
    let configuration = Arc::new(Unimock::new(
        ConfigurationMock::read
            .some_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(Some(request.clone())))),
    ));
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .some_call(matching!(_))
            .returns(Err(Error::UpgradeRefused { status: 401 })),
    ));
    let clock = Arc::new(Unimock::new((
        ClockMock::jitter
            .some_call(matching!(_))
            .returns(Duration::ZERO),
        ClockMock::wait
            .some_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                stop.send_replace(true);
                Box::pin(async {})
            })),
    )));
    let diagnostics = Arc::new(Unimock::new(
        DiagnosticsMock::attempt_failed
            .some_call(matching!(Some(401)))
            .returns(())
            .once(),
    ));
    HostRuntime {
        configuration,
        connector,
        clock,
        diagnostics,
        session: Arc::new(Unimock::new(())),
        program_version: "test".into(),
    }
    .run(shutdown)
    .await
    .unwrap();
}

#[tokio::test]
async fn missing_and_restored_settings_warn_once_per_transition() {
    let (stop, shutdown) = watch::channel(false);
    let reads = Arc::new(Mutex::new(0));
    let configuration = Arc::new(Unimock::new(
        ConfigurationMock::read
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let mut count = reads.lock().unwrap();
                let missing = matches!(*count, 0 | 1 | 4 | 5);
                *count += 1;
                Ok(if missing { None } else { Some(settings()) })
            })),
    ));
    let attempts = Arc::new(Mutex::new(0));
    let connector = Arc::new(Unimock::new(
        ConnectorMock::connect
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let mut count = attempts.lock().unwrap();
                *count += 1;
                if *count == 4 {
                    stop.send_replace(true);
                }
                Err(Error::Unavailable)
            })),
    ));
    let clock = Arc::new(Unimock::new((
        ClockMock::jitter
            .each_call(matching!(_))
            .returns(Duration::ZERO),
        ClockMock::wait
            .each_call(matching!(_))
            .answers(&|_, _| Box::pin(async {})),
    )));
    let diagnostics = Arc::new(Unimock::new((
        DiagnosticsMock::settings_missing
            .some_call(matching!())
            .returns(())
            .n_times(2),
        DiagnosticsMock::settings_restored
            .some_call(matching!())
            .returns(())
            .n_times(2),
        DiagnosticsMock::attempt_failed
            .some_call(matching!(None))
            .returns(())
            .n_times(4),
    )));
    HostRuntime {
        configuration,
        connector,
        clock,
        diagnostics,
        session: Arc::new(Unimock::new(())),
        program_version: "test".into(),
    }
    .run(shutdown)
    .await
    .unwrap();
}
