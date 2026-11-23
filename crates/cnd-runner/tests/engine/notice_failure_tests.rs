//! Failed notice sends and canceled starts keep unread notes without losing answers.

use std::sync::atomic::Ordering;

use cnd_runner::runtime::CommandHandler;
use cnd_runner_interface::provider_events::{ProviderEvent, ProviderResultState};
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerNoticeLine, RunnerTurn};
use serde_json::json;

use super::builders::{stop, turn};
use super::notice_tests::notice;
use super::support::{Fixture, TestResult};

fn attached_turn() -> std::result::Result<RunnerCommand, Box<dyn std::error::Error>> {
    let mut command = turn("session", "first")?;
    let RunnerCommand::RunnerTurn(RunnerTurn::Turn { notices, .. }) = &mut command else {
        unreachable!()
    };
    notices.push(RunnerNoticeLine {
        id: "attached".into(),
        text: "Octocat pre-approved `DEPLOY_KEY`.".into(),
    });
    Ok(command)
}

#[tokio::test]
async fn failed_notice_send_keeps_the_queued_answer_and_normal_turn_end() -> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("session", "first")?).await?;
    let helper = h.latest()?;
    helper.fail_send.store(true, Ordering::SeqCst);
    helper.send_gate.hold();
    h.engine.command(notice("session", "first", "rejected"))?;
    helper.send_gate.entered.notified().await;
    helper.event(ProviderEvent::Answer {
        message_id: "answer".into(),
        text: "Work is complete.".into(),
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["rejected".into()],
    });
    helper.event(ProviderEvent::Result {
        state: ProviderResultState::Finished,
        user_message_ids: vec!["message-first".into()],
        notice_ids: vec!["rejected".into()],
        end_reason: None,
    });
    helper.send_gate.release();
    h.engine.idle().await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 3);
    assert_eq!(
        events[1],
        json!({"type":"assistant.completed","sessionId":"session","turnId":"first","messageId":"answer","text":"Work is complete.","userMessageIds":["message-first"]})
    );
    assert_eq!(events[2]["type"], "turn.completed");
    assert_eq!(events[2]["state"], "finished");
    assert_eq!(events[2].get("noticeIds"), None);
    assert!(helper.closed.load(Ordering::SeqCst));
    h.close().await
}

#[tokio::test]
async fn failed_start_does_not_acknowledge_attached_notices() -> TestResult {
    let h = Fixture::new().await?;
    h.repositories.fail_baseline.store(true, Ordering::SeqCst);
    h.command(attached_turn()?).await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 2);
    assert_eq!(events[0]["type"], "turn.started");
    assert_eq!(events[1]["type"], "turn.failed");
    assert_eq!(events[0].get("noticeIds"), None);
    assert_eq!(events[1].get("noticeIds"), None);
    assert_eq!(
        h.helpers.processes.lock().map_err(|_| "test lock")?.len(),
        0
    );
    h.close().await
}

#[tokio::test]
async fn stopped_start_does_not_acknowledge_attached_notices() -> TestResult {
    let h = Fixture::new().await?;
    h.helpers.start_gate.hold();
    h.engine.command(attached_turn()?)?;
    h.helpers.start_gate.entered.notified().await;
    let helper = h.latest()?;
    h.command(stop("session", "first", "stop")?).await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 2);
    assert_eq!(events[0]["type"], "turn.started");
    assert_eq!(events[1]["type"], "turn.completed");
    assert_eq!(events[1]["state"], "stopped");
    assert_eq!(events[0].get("noticeIds"), None);
    assert_eq!(events[1].get("noticeIds"), None);
    assert_eq!(helper.inputs.lock().map_err(|_| "test lock")?.len(), 0);
    assert!(helper.closed.load(Ordering::SeqCst));
    h.close().await
}

#[tokio::test]
async fn failed_turn_reports_only_notices_with_read_proof() -> TestResult {
    let h = Fixture::new().await?;
    h.command(attached_turn()?).await?;
    h.command(notice("session", "first", "unread")).await?;
    h.latest()?.event(serde_json::from_value(json!({
        "type":"failed", "code":"provider_failed", "message":"The provider failed.",
        "noticeIds":["attached", "not-delivered"]
    }))?);
    h.engine.idle().await?;
    let events = serde_json::to_value(h.events().await)?;
    assert_eq!(events.as_array().ok_or("No events")?.len(), 2);
    assert_eq!(events[1]["type"], "turn.failed");
    assert_eq!(events[1]["noticeIds"], json!(["attached"]));
    h.close().await
}
