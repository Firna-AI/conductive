//! Idle updates wait for queued, active, background, and unended accepted work.

use cnd_runner::runtime::CommandHandler;
use cnd_runner::state::records::SavedTurn;
use cnd_runner_interface::provider_events::ProviderEvent;

use super::builders::turn;
use super::support::{Fixture, TestResult};

#[tokio::test]
async fn busy_covers_queued_turns_active_turns_and_helper_cleanup() -> TestResult {
    let h = Fixture::new().await?;
    assert!(!h.engine.busy().await?);
    h.engine.command(turn("session", "turn")?)?;
    assert!(h.engine.busy().await?);
    h.engine.idle().await?;
    assert!(h.engine.busy().await?);
    let helper = h.latest()?;
    helper.close_gate.hold();
    helper.result(&[]);
    helper.close_gate.entered.notified().await;
    assert!(h.engine.busy().await?);
    helper.close_gate.release();
    h.engine.idle().await?;
    assert!(!h.engine.busy().await?);
    h.close().await
}

#[tokio::test]
async fn accepted_turn_without_end_blocks_updates_until_its_end_is_saved() -> TestResult {
    let h = Fixture::new().await?;
    h.store
        .accept_turn(SavedTurn {
            session_id: "session".into(),
            turn_id: "accepted".into(),
            started_at: 100,
            message_ids: vec!["message".into()],
            start_event_number: None,
            end_event_number: None,
        })
        .await?;
    assert!(h.engine.busy().await?);
    h.store.recover(100).await?;
    assert!(!h.engine.busy().await?);
    h.close().await
}

#[tokio::test]
async fn a_turn_waiting_for_background_work_stays_busy() -> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("session", "turn")?).await?;
    let helper = h.latest()?;
    helper.event(ProviderEvent::Background {
        live: true,
        idle: false,
    });
    helper.result(&[]);
    helper.event(ProviderEvent::Activity { idle: true });
    h.engine.idle().await?;
    assert_eq!(h.events().await.len(), 1);
    assert!(h.engine.busy().await?);
    helper.event(ProviderEvent::Background {
        live: false,
        idle: true,
    });
    h.engine.idle().await?;
    assert_eq!(h.events().await.len(), 2);
    assert!(!h.engine.busy().await?);
    h.close().await
}
