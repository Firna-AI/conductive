//! Promotion waits for a welcome or 60 seconds of service uptime.

#![expect(
    clippy::unwrap_used,
    reason = "The tests must read back the stored startup state."
)]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::{FutureExt, poll};
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::virtual_timer;
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::update::ports::UpdateFilesMock;
use crate::update::state::UpdateState;

use super::support::{trial_state, updater};
use super::{Startup, Updater, Updates};

struct Observed {
    current: Mutex<String>,
    state: Mutex<UpdateState>,
}

impl Observed {
    fn pending(&self) {
        assert_eq!(
            *self.current.lock().unwrap(),
            "0.0.41",
            "Trial became current early"
        );
        assert_eq!(
            *self.state.lock().unwrap(),
            trial_state(),
            "Trial was confirmed early"
        );
    }

    fn confirmed(&self) {
        assert_eq!(*self.current.lock().unwrap(), "0.0.42");
        let state = self.state.lock().unwrap();
        assert_eq!(state.trial, None);
        assert_eq!(state.previous.as_deref(), Some("0.0.41"));
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Write {
    Link,
    State,
}

fn fixture(failure: Option<Write>) -> (Updater, Arc<Observed>) {
    let mut updater = updater();
    updater.version = "0.0.42".into();
    updater.timer = virtual_timer();
    if failure.is_some() {
        updater.diagnostics = Arc::new(Unimock::new(
            DiagnosticsMock::update_failed
                .some_call(matching!())
                .returns(()),
        ));
    }
    let observed = Arc::new(Observed {
        current: Mutex::new("0.0.41".into()),
        state: Mutex::new(trial_state()),
    });
    let state = observed.clone();
    let read = observed.clone();
    let change = observed.clone();
    let record = observed.clone();
    let switch_failed = AtomicBool::new(false);
    let save_failed = AtomicBool::new(false);
    updater.files = Arc::new(Unimock::new((
        UpdateFilesMock::state
            .some_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(state.state.lock().unwrap().clone()))),
        UpdateFilesMock::current_version
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                Ok(Some(read.current.lock().unwrap().clone()))
            })),
        UpdateFilesMock::runs_version
            .each_call(matching!("0.0.42"))
            .answers(&|_, _| Ok(true)),
        UpdateFilesMock::switch
            .each_call(matching!("0.0.42"))
            .answers_arc(Arc::new(move |_, version| {
                if failure == Some(Write::Link) && !switch_failed.swap(true, Ordering::SeqCst) {
                    return Err(Error::NoSpace);
                }
                *change.current.lock().unwrap() = version.to_owned();
                Ok(())
            })),
        UpdateFilesMock::save
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, state| {
                if failure == Some(Write::State) && !save_failed.swap(true, Ordering::SeqCst) {
                    return Err(Error::NoSpace);
                }
                *record.state.lock().unwrap() = state.clone();
                Ok(())
            })),
    )));
    (updater, observed)
}

#[tokio::test(start_paused = true)]
async fn a_trial_with_no_welcome_stays_pending_at_59_seconds_and_confirms_at_60() {
    let (updater, observed) = fixture(None);
    let (stop, shutdown) = watch::channel(false);
    let monitor = updater.monitor(Startup::Trial, stop.clone(), shutdown);
    tokio::pin!(monitor);
    assert!(poll!(&mut monitor).is_pending());
    tokio::time::advance(Duration::from_secs(59)).await;
    assert!(poll!(&mut monitor).is_pending());
    observed.pending();
    tokio::time::advance(Duration::from_secs(1)).await;
    assert!(poll!(&mut monitor).is_pending());
    observed.confirmed();
}

#[tokio::test(start_paused = true)]
async fn a_trial_stays_pending_until_the_worker_welcome() {
    let (updater, observed) = fixture(None);
    let (stop, shutdown) = watch::channel(false);
    let monitor = updater.monitor(Startup::Trial, stop.clone(), shutdown);
    tokio::pin!(monitor);
    assert!(poll!(&mut monitor).is_pending());
    observed.pending();
    updater.activity.welcomed();
    assert!(poll!(&mut monitor).is_pending());
    observed.confirmed();
}

#[tokio::test(start_paused = true)]
async fn a_failed_link_switch_is_retried_on_the_next_poll() {
    retries_confirmation(Write::Link, "0.0.41").await;
}

#[tokio::test(start_paused = true)]
async fn a_moved_link_with_a_failed_state_save_is_reconciled_on_the_next_poll() {
    retries_confirmation(Write::State, "0.0.42").await;
}

async fn retries_confirmation(failure: Write, link_after_failure: &str) {
    let (updater, observed) = fixture(Some(failure));
    let (stop, shutdown) = watch::channel(false);
    let monitor = updater
        .monitor(Startup::Trial, stop, shutdown.clone())
        .fuse();
    tokio::pin!(monitor);
    assert!(poll!(&mut monitor).is_pending());
    updater.activity.welcomed();
    let _ = poll!(&mut monitor);
    assert_eq!(*observed.current.lock().unwrap(), link_after_failure);
    assert_eq!(*observed.state.lock().unwrap(), trial_state());

    tokio::time::advance(Duration::from_secs(60)).await;
    assert!(poll!(&mut monitor).is_pending());
    assert_eq!(
        observed.state.lock().unwrap().previous.as_deref(),
        Some("0.0.41"),
        "The next poll did not record the previous release"
    );
    observed.confirmed();
    assert!(!*shutdown.borrow());
}
