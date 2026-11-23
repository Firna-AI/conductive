//! App notes steer only their running turn and acknowledge only read lines.

use std::sync::atomic::Ordering;

use cnd_runner_interface::chat_events::AgentChatEvent;
use cnd_runner_interface::provider_events::{ProviderEvent, ProviderResultState};
use cnd_runner_interface::runner_commands::{
    RunnerCommand, RunnerNotice, RunnerNoticeLine, RunnerTurn,
};
use cnd_runner_interface::sdk_helper_options::ProviderInput;

use super::builders::{input_ids, message, stop, turn};
use super::support::{Fixture, TestResult};

pub(super) fn notice(session: &str, turn: &str, id: &str) -> RunnerCommand {
    RunnerCommand::RunnerNotice(RunnerNotice::Notice {
        command_id: format!("command-{id}"),
        session_id: session.into(),
        turn_id: turn.into(),
        notices: vec![RunnerNoticeLine {
            id: id.into(),
            text: "Octocat pre-approved `DEPLOY_KEY`.".into(),
        }],
    })
}

fn receipt(event: &AgentChatEvent) -> Vec<String> {
    match event {
        AgentChatEvent::AssistantCompleted { notice_ids, .. }
        | AgentChatEvent::TurnFailed { notice_ids, .. }
        | AgentChatEvent::TurnCompleted { notice_ids, .. } => notice_ids.clone(),
        _ => vec![],
    }
}

#[tokio::test]
async fn notice_steers_and_reports_only_the_lines_read() -> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("session", "first")?).await?;
    let helper = h.latest()?;
    h.command(notice("session", "first", "read")).await?;
    h.command(notice("session", "first", "result")).await?;
    h.command(notice("session", "first", "unread")).await?;
    let inputs = helper.inputs.lock().map_err(|_| "test lock")?.clone();
    assert_eq!(inputs.len(), 4);
    assert_eq!(
        serde_json::to_value(&inputs[1])?,
        serde_json::to_value(notice("session", "first", "read"))?
    );
    assert_eq!(input_ids(&helper)?, ["message-first"]);
    assert_eq!(
        h.events()
            .await
            .iter()
            .flat_map(receipt)
            .collect::<Vec<_>>(),
        Vec::<String>::new()
    );
    helper.event(ProviderEvent::Answer {
        message_id: "answer".into(),
        text: "Understood.".into(),
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["read".into(), "not-delivered".into()],
    });
    helper.event(ProviderEvent::Result {
        state: ProviderResultState::Finished,
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["result".into()],
        end_reason: None,
    });
    h.engine.idle().await?;
    let events = h.events().await;
    assert_eq!(receipt(&events[1]), ["read"]);
    assert_eq!(receipt(&events[2]), ["read", "result"]);
    assert_eq!(helper.models.lock().map_err(|_| "test lock")?.len(), 0);
    assert!(helper.closed.load(Ordering::SeqCst));
    h.close().await
}

#[tokio::test]
async fn notice_to_unknown_wrong_or_ended_turn_is_dropped_without_ack() -> TestResult {
    let h = Fixture::new().await?;
    h.command(notice("unknown", "none", "unknown")).await?;
    assert_eq!(
        h.helpers.processes.lock().map_err(|_| "test lock")?.len(),
        0
    );
    assert_eq!(h.store.snapshot().await.turns.len(), 0);
    h.command(turn("session", "first")?).await?;
    let helper = h.latest()?;
    h.command(notice("session", "wrong", "wrong")).await?;
    assert_eq!(helper.inputs.lock().map_err(|_| "test lock")?.len(), 1);
    helper.result(&["message-first"]);
    h.engine.idle().await?;
    let before = h.events().await;
    h.command(notice("session", "first", "ended")).await?;
    assert_eq!(h.events().await, before);
    assert_eq!(helper.inputs.lock().map_err(|_| "test lock")?.len(), 1);
    h.command(turn("session", "second")?).await?;
    h.command(notice("session", "first", "old")).await?;
    assert_eq!(h.latest()?.inputs.lock().map_err(|_| "test lock")?.len(), 1);
    h.close().await
}

#[tokio::test]
async fn turn_notices_reach_the_helper_and_are_acknowledged_only_when_read() -> TestResult {
    let h = Fixture::new().await?;
    let mut command = turn("session", "first")?;
    let RunnerCommand::RunnerTurn(RunnerTurn::Turn { notices, .. }) = &mut command else {
        unreachable!()
    };
    *notices = vec![
        RunnerNoticeLine {
            id: "before-1".into(),
            text: "First.".into(),
        },
        RunnerNoticeLine {
            id: "before-2".into(),
            text: "Second.".into(),
        },
    ];
    h.command(command.clone()).await?;
    assert_eq!(receipt(&h.events().await[0]), Vec::<String>::new());
    let helper = h.latest()?;
    let inputs = helper.inputs.lock().map_err(|_| "test lock")?.clone();
    assert_eq!(
        serde_json::to_value(&inputs[0])?,
        serde_json::to_value(command)?
    );
    helper.event(ProviderEvent::Answer {
        message_id: "answer".into(),
        text: "Understood.".into(),
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["before-1".into()],
    });
    helper.event(ProviderEvent::Result {
        state: ProviderResultState::Finished,
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["before-2".into()],
        end_reason: None,
    });
    h.engine.idle().await?;
    let events = h.events().await;
    assert_eq!(receipt(&events[1]), ["before-1"]);
    assert_eq!(receipt(&events[2]), ["before-1", "before-2"]);
    h.close().await
}

#[tokio::test]
async fn queued_notice_follows_deferred_input_and_stopped_notices_stay_unacknowledged() -> TestResult
{
    let h = Fixture::new().await?;
    h.command(turn("session", "first")?).await?;
    let first = h.latest()?;
    first.deferred.store(true, Ordering::SeqCst);
    h.command(message("session", "first", "second")?).await?;
    h.command(notice("session", "first", "queued")).await?;
    first.result(&["message-first"]);
    h.engine.idle().await?;
    let second = h.latest()?;
    let inputs = second.inputs.lock().map_err(|_| "test lock")?.clone();
    assert_eq!(inputs.len(), 2);
    assert!(matches!(&inputs[0], ProviderInput::Message(_)));
    assert_eq!(
        serde_json::to_value(&inputs[1])?,
        serde_json::to_value(notice("session", "first", "queued"))?
    );
    h.command(stop("session", "first", "stop")?).await?;
    let events = h.events().await;
    assert_eq!(
        events.iter().flat_map(receipt).collect::<Vec<_>>(),
        Vec::<String>::new()
    );
    h.close().await
}

#[tokio::test]
async fn notice_only_result_does_not_resolve_an_unread_member_message() -> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("session", "first")?).await?;
    let helper = h.latest()?;
    h.command(notice("session", "first", "note")).await?;
    helper.event(ProviderEvent::Result {
        state: ProviderResultState::Finished,
        user_message_ids: vec![],
        notice_ids: vec!["note".into()],
        end_reason: None,
    });
    h.engine.idle().await?;
    assert!(!helper.closed.load(Ordering::SeqCst));
    assert_eq!(h.events().await.len(), 1);
    helper.result(&["message-first"]);
    h.engine.idle().await?;
    assert_eq!(receipt(&h.events().await[1]), ["note"]);
    h.close().await
}
