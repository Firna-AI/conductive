//! Change note acceptance preserves the lifetime of a background wait.

use std::sync::atomic::Ordering;
use std::time::Duration;

use cnd_runner_interface::provider_events::{ProviderEvent, ProviderResultState};
use serde_json::json;

use super::background_tests::{ended_work_wait, wait};
use super::builders::turn;
use super::notice_tests::notice;
use super::support::{Fixture, TestResult};

const LIMIT: Duration = Duration::from_secs(30 * 24 * 60 * 60);

#[tokio::test(start_paused = true)]
async fn accepted_notice_waits_for_its_reply_without_restarting_the_deadline() -> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("session", "first")?).await?;
    wait(&h).await?;
    h.advance(Duration::from_secs(1)).await;
    h.command(notice("session", "first", "accepted")).await?;
    let helper = h.latest()?;
    helper.event(ProviderEvent::Background {
        live: false,
        idle: true,
    });
    h.engine.idle().await?;
    assert_eq!(h.events().await.len(), 1);
    h.advance(LIMIT - Duration::from_secs(1)).await;
    h.engine.idle().await?;
    assert_eq!(h.events().await.len(), 1);
    helper.event(ProviderEvent::Result {
        state: ProviderResultState::Finished,
        user_message_ids: vec![],
        notice_ids: vec!["accepted".into()],
        end_reason: None,
    });
    h.engine.idle().await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 2);
    assert_eq!(events[1]["endReason"], "background_work_limit");
    assert_eq!(events[1]["durationMs"], LIMIT.as_millis() as u64);
    assert_eq!(events[1]["noticeIds"], json!(["accepted"]));
    h.close().await
}

#[tokio::test(start_paused = true)]
async fn rejected_notice_preserves_the_wait_and_final_idle_completion() -> TestResult {
    let h = Fixture::new().await?;
    ended_work_wait(&h).await?;
    h.advance(Duration::from_secs(1)).await;
    let helper = h.latest()?;
    helper.fail_send.store(true, Ordering::SeqCst);
    h.command(notice("session", "first", "rejected")).await?;
    assert_eq!(h.events().await.len(), 1);
    assert_eq!(helper.inputs.lock().map_err(|_| "test lock")?.len(), 1);
    helper.event(ProviderEvent::Activity { idle: true });
    h.engine.idle().await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 2);
    assert_eq!(events[1]["type"], "turn.completed");
    assert_eq!(events[1]["state"], "finished");
    assert_eq!(events[1].get("endReason"), None);
    assert_eq!(events[1].get("noticeIds"), None);
    assert!(helper.closed.load(Ordering::SeqCst));
    h.close().await
}
