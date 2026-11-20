//! Complete-source preparation, bounded envelopes, and atomic pending batches.

#![expect(clippy::unwrap_used, reason = "Test operations must fail on errors.")]

use std::sync::atomic::Ordering;

use cnd_runner_interface::chat_events::{
    AgentChatEvent, ToolCall, ToolCallKind, ToolCallState, TurnEventContext,
};
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_handshake::RunnerEventEnvelope;

use crate::error::Error;
use crate::test_support::{Memory, title};

use super::prepare;

fn update(target: String, detail: String) -> RunnerEvent {
    RunnerEvent::AgentChatEvent(AgentChatEvent::ToolUpdated {
        turn_event_context: TurnEventContext {
            session_id: "session".into(),
            turn_id: "turn".into(),
        },
        tool: ToolCall {
            id: "tool".into(),
            kind: ToolCallKind::Run,
            target,
            detail: Some(detail),
            omitted_detail_bytes: 17,
            state: ToolCallState::Done,
        },
    })
}

#[tokio::test]
async fn failed_source_batch_stays_whole_pending_and_retries_before_following_updates_and_restart()
{
    let memory = Memory::default();
    let store = memory.store().await;
    let events = prepare(
        update("target".into(), "\u{01}".repeat(400000)),
        true,
        "stream",
        100,
    )
    .unwrap();
    assert_eq!(events.len(), 3);
    memory.fail.store(true, Ordering::SeqCst);
    assert!(matches!(
        store.append_batch(events.clone(), 100, None).await,
        Err(Error::Disconnected)
    ));
    assert_eq!(store.snapshot().await.outbox, vec![]);
    assert_eq!(memory.store().await.snapshot().await.outbox, vec![]);
    store.append(title("following"), 101, None).await.unwrap();
    let state = store.snapshot().await;
    assert_eq!(state.outbox.len(), 4);
    assert_eq!(state.next_event_number, 5);
    let actual: Vec<_> = state
        .outbox
        .iter()
        .map(|RunnerEventEnvelope::Event { event, .. }| event.clone())
        .collect();
    assert_eq!(actual[..3], events);
    assert_eq!(actual[3], title("following"));
    assert_eq!(memory.store().await.snapshot().await, state);
    store.confirm(1).await.unwrap();
    let restarted = memory.store().await;
    assert_eq!(restarted.snapshot().await.outbox, state.outbox[1..]);
    let rejected = vec![title("would-be-prefix"), title(&"x".repeat(1_048_576))];
    assert_eq!(
        restarted.append_batch(rejected, 101, None).await.unwrap(),
        None
    );
    assert_eq!(restarted.snapshot().await.next_event_number, 5);
}
