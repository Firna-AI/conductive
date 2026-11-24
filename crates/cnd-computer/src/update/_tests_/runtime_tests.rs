//! Update startup, rollback recovery, and first healthy start.

#![expect(
    clippy::unwrap_used,
    reason = "The update fixture must run to completion."
)]

use std::sync::Arc;
use std::time::Duration;

use cnd_release::version::DEVELOPMENT_VERSION;
use tokio::sync::{Notify, watch};
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::virtual_timer;
use crate::diagnostics::DiagnosticsMock;
use crate::settings::SettingsStoreMock;
use crate::update::ports::UpdateFilesMock;

use super::{Startup, Updates};

use super::support::{pending, updater};

#[test]
fn development_and_other_program_locations_skip_automatic_updates() {
    let mut updater = updater();
    updater.version = DEVELOPMENT_VERSION.into();
    assert_eq!(updater.start().ok(), Some(Startup::Disabled));
    updater.version = "0.0.41".into();
    updater.files = Arc::new(Unimock::new(
        UpdateFilesMock::is_current
            .some_call(matching!())
            .returns(Ok(false)),
    ));
    updater.diagnostics = Arc::new(Unimock::new(
        DiagnosticsMock::update_location
            .some_call(matching!())
            .returns(()),
    ));
    assert_eq!(updater.start().ok(), Some(Startup::Disabled));
}

#[test]
fn startup_persists_the_failed_start_before_switching_to_the_previous_version() {
    let mut updater = updater();
    updater.files = Arc::new(Unimock::new((
        UpdateFilesMock::is_current.some_call(matching!()).returns(Ok(true)),
        UpdateFilesMock::state.some_call(matching!()).returns(Ok(pending(5))),
        UpdateFilesMock::save.next_call(matching!((value) if value.starts == 6 && value.pending.as_deref() == Some("0.0.41")))
            .returns(Ok(())),
        UpdateFilesMock::switch.next_call(matching!("0.0.40")).returns(Ok(())),
        UpdateFilesMock::save.next_call(matching!((value) if value.starts == 0 && value.pending.is_none()
            && value.refused.contains("0.0.41"))).returns(Ok(())),
        UpdateFilesMock::collect.some_call(matching!("0.0.40", None)).returns(Ok(())),
    )));
    updater.diagnostics = Arc::new(Unimock::new(
        DiagnosticsMock::update_rolled_back
            .some_call(matching!())
            .returns(()),
    ));
    assert_eq!(updater.start().unwrap(), Startup::RolledBack);
}

#[tokio::test(start_paused = true)]
async fn welcome_or_sixty_seconds_alone_confirms_a_pending_start() {
    for welcome in [true, false] {
        let mut updater = updater();
        updater.timer = virtual_timer();
        let saved = Arc::new(Notify::new());
        let capture = saved.clone();
        updater.files = Arc::new(
            Unimock::new((
                UpdateFilesMock::state
                    .some_call(matching!())
                    .returns(Ok(pending(3))),
                UpdateFilesMock::save
                    .some_call(matching!((state) if state.pending.is_none()
                && state.starts == 0 && state.previous.as_deref() == Some("0.0.40")))
                    .answers_arc(Arc::new(move |_, _| {
                        capture.notify_one();
                        Ok(())
                    })),
            ))
            .no_verify_in_drop(),
        );
        updater.settings = Arc::new(
            Unimock::new(
                SettingsStoreMock::read
                    .some_call(matching!())
                    .answers(&|_| Ok(None))
                    .at_least_times(0),
            )
            .no_verify_in_drop(),
        );
        let (stop, shutdown) = watch::channel(false);
        let signal = stop.clone();
        if welcome {
            updater.activity.welcomed();
        }
        let task = tokio::spawn(async move { updater.monitor(signal, shutdown).await });
        let logical_limit = if welcome {
            Duration::from_secs(1)
        } else {
            Duration::from_secs(61)
        };
        let confirmed = tokio::time::timeout(logical_limit, saved.notified()).await;
        stop.send(true).unwrap();
        task.await.unwrap();
        assert!(confirmed.is_ok(), "confirmation with welcome={welcome}");
    }
}
