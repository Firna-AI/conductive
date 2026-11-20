//! Capability changes affect only newly prepared complete tool sources.

use cnd_runner::json::codec;
use cnd_runner::link::ports::LinkUpdate;
use cnd_runner_interface::chat_events::AgentChatEvent;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_handshake::{RUNNER_EVENT_MAX_BYTES, RunnerEventEnvelope};
use cnd_runner_interface::runner_tool_detail::RunnerToolDetailPart;
use serde_json::json;

use crate::support::fixture::{self, Fixture};

fn update(id: &str) -> RunnerEvent {
    serde_json::from_value(json!({
        "type":"tool.updated", "sessionId":"session", "turnId":"turn",
        "tool": { "id":id, "kind":"run", "target":"target", "detail":"\u{01}".repeat(180000),
            "omittedDetailBytes":0, "state":"done" }
    }))
    .unwrap()
}

#[tokio::test]
async fn capability_survives_disconnect_and_batches_concurrent_sources_but_new_unsupported_welcome_selects_legacy()
 {
    let h = Fixture::new().await;
    h.link.emit(update("before-welcome"), None).await.unwrap();
    h.endpoint.state.lock().await.complete_tool_details = Some(true);
    h.connected().await;
    let (first, second) = tokio::join!(
        h.link.emit(update("first"), None),
        h.link.emit(update("second"), None)
    );
    first.unwrap();
    second.unwrap();
    let before_drop = h.store.snapshot().await;
    let kinds: Vec<_> = before_drop
        .outbox
        .iter()
        .map(|RunnerEventEnvelope::Event { event, .. }| match event {
            RunnerEvent::RunnerToolDetailPart(RunnerToolDetailPart::ToolDetailPart {
                start,
                part_number,
                final_part,
                ..
            }) => (
                start.as_ref().map(|start| start.tool.id.clone()),
                *part_number,
                *final_part,
            ),
            _ => (Some("legacy".into()), 0, true),
        })
        .collect();
    assert_eq!(
        kinds,
        vec![
            (Some("legacy".into()), 0, true),
            (Some("first".into()), 1, false),
            (None, 2, true),
            (Some("second".into()), 1, false),
            (None, 2, true),
        ]
    );
    h.endpoint.disconnect().await;
    assert_eq!(h.link.step().await.unwrap(), LinkUpdate::Disconnected);
    h.link.emit(update("offline"), None).await.unwrap();
    let offline = h.store.snapshot().await;
    assert_eq!(offline.outbox.len(), 7);
    assert!(matches!(
        offline.outbox[6],
        RunnerEventEnvelope::Event {
            event: RunnerEvent::RunnerToolDetailPart(_),
            ..
        }
    ));
    h.endpoint.state.lock().await.complete_tool_details = None;
    h.connected().await;
    assert_eq!(h.endpoint.state.lock().await.events, offline.outbox);
    h.link.emit(update("fallback"), None).await.unwrap();
    let saved = h.store.snapshot().await;
    assert!(matches!(
        saved.outbox.last(),
        Some(RunnerEventEnvelope::Event {
            event: RunnerEvent::AgentChatEvent(_),
            ..
        })
    ));
    assert_eq!(saved.next_event_number, 9);
    let reopened = fixture::open(h.disk.clone()).await;
    assert_eq!(reopened.snapshot().await, saved);
    h.link.close().await.unwrap();
}

#[tokio::test]
async fn complete_sources_bound_envelopes_without_repeating_large_metadata_or_splitting_unicode() {
    let source = "\u{01}\"\\🦀ordinary".repeat(15000);
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.complete_tool_details = Some(true);
    h.connected().await;
    let mut event = update("large-target");
    let RunnerEvent::AgentChatEvent(AgentChatEvent::ToolUpdated { tool, .. }) = &mut event else {
        panic!("Expected tool");
    };
    tool.target = "t".repeat(980000);
    tool.detail = Some(source.clone());
    h.link.emit(event, None).await.unwrap();
    let events = h.store.snapshot().await.outbox;
    assert_eq!(events.len(), 2);
    let mut recovered = String::new();
    let mut headers = 0;
    for (index, event) in events.iter().enumerate() {
        let RunnerEventEnvelope::Event {
            event:
                RunnerEvent::RunnerToolDetailPart(RunnerToolDetailPart::ToolDetailPart {
                    start,
                    detail,
                    part_number,
                    final_part,
                }),
            ..
        } = event
        else {
            panic!("Expected private source");
        };
        assert_eq!(*part_number, index as u64 + 1);
        assert_eq!(*final_part, index + 1 == events.len());
        headers += usize::from(start.is_some());
        recovered.push_str(detail);
        assert!(codec::encode(event).unwrap().len() <= RUNNER_EVENT_MAX_BYTES as usize);
    }
    assert_eq!(headers, 1);
    assert_eq!(recovered, source);
    h.link.close().await.unwrap();
}
