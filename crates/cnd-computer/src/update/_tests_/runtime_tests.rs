//! Promotion waits for a welcome or 60 seconds of service uptime.

#![expect(
    clippy::unwrap_used,
    reason = "The tests must read back the stored startup state."
)]

use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::poll;
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::virtual_timer;
use crate::settings::SettingsStoreMock;
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

fn fixture() -> (Updater, Arc<Observed>) {
    let mut updater = updater();
    updater.version = "0.0.42".into();
    updater.timer = virtual_timer();
    let observed = Arc::new(Observed {
        current: Mutex::new("0.0.41".into()),
        state: Mutex::new(trial_state()),
    });
    let state = observed.clone();
    let read = observed.clone();
    let change = observed.clone();
    let record = observed.clone();
    updater.files = Arc::new(Unimock::new((
        UpdateFilesMock::state
            .some_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(state.state.lock().unwrap().clone()))),
        UpdateFilesMock::current_version
            .some_call(matching!())
            .answers_arc(Arc::new(move |_| {
                Ok(Some(read.current.lock().unwrap().clone()))
            })),
        UpdateFilesMock::switch
            .next_call(matching!("0.0.42"))
            .answers_arc(Arc::new(move |_, version| {
                *change.current.lock().unwrap() = version.to_owned();
                Ok(())
            })),
        UpdateFilesMock::save
            .next_call(matching!(_))
            .answers_arc(Arc::new(move |_, state| {
                *record.state.lock().unwrap() = state.clone();
                Ok(())
            })),
    )));
    (updater, observed)
}

#[tokio::test(start_paused = true)]
async fn a_trial_with_no_welcome_stays_pending_at_59_seconds_and_confirms_at_60() {
    let (mut updater, observed) = fixture();
    updater.settings = Arc::new(Unimock::new(
        SettingsStoreMock::read
            .some_call(matching!())
            .returns(Ok(None)),
    ));
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
    let (updater, observed) = fixture();
    let (stop, shutdown) = watch::channel(false);
    let monitor = updater.monitor(Startup::Trial, stop.clone(), shutdown);
    tokio::pin!(monitor);
    assert!(poll!(&mut monitor).is_pending());
    observed.pending();
    updater.activity.welcomed();
    assert!(poll!(&mut monitor).is_pending());
    observed.confirmed();
}
