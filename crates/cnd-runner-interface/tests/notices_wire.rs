//! App note commands and receipts stay compatible with older frames.

use cnd_runner_interface::chat_events::AgentChatEvent;
use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use serde_json::{Value, json};

fn turn() -> Value {
    json!({
        "type": "turn", "commandId": "command", "sessionId": "session", "turnId": "turn",
        "message": {
            "id": "message", "sessionId": "session",
            "sender": {"id": "member", "githubLogin": "member", "displayName": null, "avatarUrl": null},
            "text": "Deploy.", "attachments": [],
            "choice": {"agent": "claude", "model": "model", "effort": "high", "fast": false},
            "createdAt": 100, "state": "sent"
        },
        "attachments": [], "credential": {"agent": "claude", "kind": "token", "token": "fake-token"},
        "commitAuthor": null
    })
}

#[test]
fn notice_command_round_trips_without_a_member_message() -> Result<(), serde_json::Error> {
    let frame = json!({
        "type": "notice", "commandId": "command", "sessionId": "session", "turnId": "turn",
        "notices": [{"id": "note-1", "text": "Octocat pre-approved `DEPLOY_KEY`."}, {"id": "note-2", "text": "A secret is approved."}]
    });
    let parsed: WorkspaceToRunner = serde_json::from_value(frame.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, frame);
    Ok(())
}

#[test]
fn turn_notices_are_optional_and_keep_their_order() -> Result<(), serde_json::Error> {
    let original = turn();
    let parsed: WorkspaceToRunner = serde_json::from_value(original.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, original);
    let mut frame = original.clone();
    frame["notices"] = json!([]);
    let parsed: WorkspaceToRunner = serde_json::from_value(frame.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, original);
    frame["notices"] =
        json!([{"id": "note-2", "text": "First."}, {"id": "note-1", "text": "Second."}]);
    let parsed: WorkspaceToRunner = serde_json::from_value(frame.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, frame);
    Ok(())
}

#[test]
fn notice_receipts_are_optional_on_each_acknowledgement() -> Result<(), serde_json::Error> {
    let started = json!({"type": "turn.started", "sessionId": "session", "turnId": "turn", "senderId": "member", "choice": {"agent": "claude", "model": "model", "effort": "high", "fast": false}, "startedAt": 100, "messageIds": ["message"]});
    let parsed: AgentChatEvent = serde_json::from_value(started.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, started);
    let mut frame = started.clone();
    frame["noticeIds"] = json!([]);
    let parsed: AgentChatEvent = serde_json::from_value(frame.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, started);
    frame["noticeIds"] = json!(["note-2", "note-1"]);
    let parsed: AgentChatEvent = serde_json::from_value(frame)?;
    assert_eq!(serde_json::to_value(parsed)?, started);
    let events = [
        json!({"type": "assistant.completed", "sessionId": "session", "turnId": "turn", "messageId": "answer", "text": "Done.", "userMessageIds": ["message"]}),
        json!({"type": "turn.completed", "sessionId": "session", "turnId": "turn", "state": "finished", "durationMs": 100, "files": [], "omittedFileCount": 0, "userMessageIds": ["message"]}),
        json!({"type": "turn.failed", "sessionId": "session", "turnId": "turn", "error": {"code": "agent_failed", "message": "The agent failed."}, "retryMessageId": "message", "durationMs": 100}),
    ];
    for original in events {
        let parsed: AgentChatEvent = serde_json::from_value(original.clone())?;
        assert_eq!(serde_json::to_value(parsed)?, original);
        let mut frame = original.clone();
        frame["noticeIds"] = json!([]);
        let parsed: AgentChatEvent = serde_json::from_value(frame.clone())?;
        assert_eq!(serde_json::to_value(parsed)?, original);
        frame["noticeIds"] = json!(["note-2", "note-1"]);
        let parsed: AgentChatEvent = serde_json::from_value(frame.clone())?;
        assert_eq!(serde_json::to_value(parsed)?, frame);
    }
    Ok(())
}

#[test]
fn hello_notice_support_is_optional() -> Result<(), serde_json::Error> {
    let original = json!({"type": "hello", "protocolVersion": 2, "workspaceId": "workspace", "streamId": "stream"});
    let parsed: RunnerToWorkspace = serde_json::from_value(original.clone())?;
    assert_eq!(serde_json::to_value(parsed)?, original);
    for support in [true, false] {
        let mut frame = original.clone();
        frame["capabilityNotices"] = json!(support);
        let parsed: RunnerToWorkspace = serde_json::from_value(frame.clone())?;
        assert_eq!(serde_json::to_value(parsed)?, frame);
    }
    Ok(())
}
