//! The runtime swaps only after a continuous idle interval with a confirmed release.

use std::sync::atomic::Ordering;

use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerControlCommand, RunnerInterrupt};

use crate::link::ports::LinkUpdate;
use crate::runtime::RunExit;
use crate::update::ReleaseStatus;

use super::support::{Fixture, ready};

#[tokio::test(start_paused = true)]
async fn swaps_after_two_idle_minutes_and_closes_before_shutdown_then_persist() {
    let h = Fixture::new(ready()).await;
    h.tick().await;
    assert!(!h.running.is_finished());
    h.tick().await;
    assert!(!h.running.is_finished());
    h.tick().await;
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Swap);
    assert_eq!(
        *h.order.lock().unwrap(),
        ["close", "shutdown", "persist", "close"]
    );
}

#[tokio::test(start_paused = true)]
async fn keeps_running_while_busy_without_a_newer_release_or_before_confirmation() {
    for (busy, release) in [
        (true, ready()),
        (
            false,
            ReleaseStatus {
                newer_available: false,
                confirmed: true,
            },
        ),
        (
            false,
            ReleaseStatus {
                newer_available: true,
                confirmed: false,
            },
        ),
    ] {
        let h = Fixture::new(release).await;
        h.busy.store(busy, Ordering::SeqCst);
        for _ in 0..4 {
            if h.running.is_finished() {
                break;
            }
            h.tick().await;
        }
        h.stop.send_replace(true);
        assert_eq!(
            h.running.await.unwrap().unwrap(),
            RunExit::Shutdown,
            "{busy:?} {release:?}"
        );
    }
}

#[tokio::test(start_paused = true)]
async fn a_busy_check_restarts_the_whole_idle_interval() {
    let h = Fixture::new(ready()).await;
    h.tick().await;
    h.busy.store(true, Ordering::SeqCst);
    h.tick().await;
    h.busy.store(false, Ordering::SeqCst);
    h.tick().await;
    assert!(!h.running.is_finished());
    h.tick().await;
    assert!(!h.running.is_finished());
    h.tick().await;
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Swap);
}

#[tokio::test(start_paused = true)]
async fn a_read_command_restarts_the_idle_interval_even_when_it_finishes_between_checks() {
    let h = Fixture::new(ready()).await;
    h.tick().await;
    h.input
        .send(LinkUpdate::Command(Box::new(
            RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerInterrupt(
                RunnerInterrupt::Interrupt {
                    command_id: "stop".into(),
                    session_id: "session".into(),
                    turn_id: "turn".into(),
                },
            )),
        )))
        .unwrap();
    h.commands.notified().await;
    h.tick().await;
    h.tick().await;
    assert!(!h.running.is_finished());
    h.tick().await;
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Swap);
}
