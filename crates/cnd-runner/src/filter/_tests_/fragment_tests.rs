//! Credential fragments at complete, streamed, and resumed answer boundaries.

use cnd_runner_interface::chat_events::{AgentChatEvent, TurnEventContext};
use cnd_runner_interface::runner::RunnerEvent;

use super::streaming::Sanitizer;

fn context() -> TurnEventContext {
    TurnEventContext {
        session_id: "session-a".into(),
        turn_id: "turn-a".into(),
    }
}

fn delta(message: &str, text: &str) -> RunnerEvent {
    RunnerEvent::AgentChatEvent(AgentChatEvent::AssistantDelta {
        turn_event_context: context(),
        message_id: message.into(),
        text: text.into(),
    })
}

fn answer(message: &str, text: &str) -> RunnerEvent {
    RunnerEvent::AgentChatEvent(AgentChatEvent::AssistantCompleted {
        turn_event_context: context(),
        message_id: message.into(),
        text: text.into(),
        user_message_ids: vec!["message-a".into()],
        notice_ids: vec![],
    })
}

#[test]
fn masks_long_fragments_and_counts_unicode_scalars_without_hiding_short_parts() {
    let mut filter = Sanitizer::default();
    for secret in [
        "sk-ant-oat01-gt1.WyJ.ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "start-αβγδεζηθικλμνξοπρστυφχψω-end",
        "tiny",
    ] {
        filter.registry.add(secret.into());
    }
    assert_eq!(
        filter.text("tiny | sk-ant-oat01-gt1.WyJ | sk-ant-oat01-gt1.WyJ. | ABCDEFGHIJKLMNOPQRST | ABCDEFGHIJKLMNOPQRSTU | JKLMNOPQRSTUVWXYZ0123456789 | [redacted]"),
        "[redacted] | sk-ant-oat01-gt1.WyJ | [redacted] | ABCDEFGHIJKLMNOPQRST | [redacted] | [redacted] | [redacted]"
    );
    assert_eq!(filter.text("αβγδεζηθικλμνξοπρστυ"), "αβγδεζηθικλμνξοπρστυ");
    assert_eq!(filter.text("αβγδεζηθικλμνξοπρστυφ"), "[redacted]");
}

#[test]
fn masks_held_fragments_when_a_completion_or_turn_end_stops_the_stream()
-> Result<(), Box<dyn std::error::Error>> {
    let turn_end: RunnerEvent = serde_json::from_str(
        r#"{"type":"turn.completed","sessionId":"session-a","turnId":"turn-a","state":"finished","durationMs":1,"files":[],"omittedFileCount":0,"userMessageIds":["message-a"]}"#,
    )?;
    for (end, expected_end) in [
        (
            answer("a", "part: EFGHIJKLMNOPQRSTUVWXY"),
            answer("a", "part: [redacted]"),
        ),
        (turn_end.clone(), turn_end),
    ] {
        let mut filter = Sanitizer::default();
        filter
            .registry
            .add("before-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-after".into());
        assert_eq!(
            filter.accept(delta("a", "part: EFGHIJKLMN")),
            vec![delta("a", "part: ")]
        );
        assert_eq!(filter.accept(delta("a", "OPQRSTUVWX")), vec![]);
        assert_eq!(filter.accept(delta("a", "Y")), vec![]);
        assert_eq!(
            filter.accept(end),
            vec![delta("a", "[redacted]"), expected_end]
        );
    }
    Ok(())
}

#[test]
fn masks_new_text_that_extends_a_released_interior_fragment_without_mixing_answers() {
    let mut filter = Sanitizer::default();
    filter
        .registry
        .add("before-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-after".into());
    assert_eq!(
        filter.accept(answer("a", "EFGHIJKLMNOPQRSTUVWX")),
        vec![answer("a", "EFGHIJKLMNOPQRSTUVWX")]
    );
    filter.registry.active.clear();
    assert_eq!(filter.accept(delta("b", "YZ?")), vec![delta("b", "YZ?")]);
    assert_eq!(filter.accept(delta("a", "Y")), vec![]);
    assert_eq!(
        filter.accept(delta("a", "Z?")),
        vec![delta("a", "[redacted]?")]
    );
}
