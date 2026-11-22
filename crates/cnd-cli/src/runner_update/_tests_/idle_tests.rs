//! A non-exec attempt must not disconnect every later idle runner instance.

#![allow(clippy::unwrap_used)]

use std::sync::Arc;

use cnd_release::parts::PartsList;
use cnd_runner::update::{ReleaseReadiness, ReleaseStatus};
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::runner_update::idle::IdleUpdates;
use crate::runner_update::ports::{RunnerSwap, RunnerSwapMock};
use crate::runner_update::releases::RunnerReleases;
use crate::update::error::Error;
use crate::update::ports::{State, StoreMock};

#[tokio::test]
async fn a_non_exec_swap_disables_readiness_for_the_next_runner() {
    let effects = Unimock::new((
        StoreMock::state.some_call(matching!()).answers(&|_| {
            Ok(State {
                current: Some("0.0.9".into()),
                ..State::default()
            })
        }),
        StoreMock::versions
            .some_call(matching!())
            .answers(&|_| Ok(vec!["0.0.10".into()])),
        StoreMock::parts
            .some_call(matching!("0.0.10"))
            .answers(&|_, _| PartsList::new(Vec::new()).map_err(|_| Error::InvalidRelease)),
        RunnerSwapMock::swap.some_call(matching!(_)).returns(Ok(())),
    ));
    let updates = Arc::new(IdleUpdates::new(
        Arc::new(RunnerReleases {
            store: Arc::new(effects.clone()),
            running_version: "0.0.9".into(),
        }),
        Arc::new(effects),
    ));
    let first_run: Arc<dyn ReleaseReadiness> = updates.clone();
    assert_eq!(
        first_run.status().unwrap(),
        ReleaseStatus {
            newer_available: true,
            confirmed: true,
        }
    );
    let updater: Arc<dyn RunnerSwap> = updates.clone();
    let (_stop, shutdown) = watch::channel(false);
    updater.swap(shutdown.clone()).await.unwrap();
    let next_run: Arc<dyn ReleaseReadiness> = updates;
    assert_eq!(next_run.status().unwrap(), ReleaseStatus::default());
    updater.swap(shutdown).await.unwrap();
}
