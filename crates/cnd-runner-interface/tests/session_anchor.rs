//! Session anchors preserve their wire fields without changing older records.

use cnd_runner_interface::tools::session_types::Session;

#[test]
fn session_anchor_round_trips_and_old_records_omit_it() -> Result<(), serde_json::Error> {
    let older = serde_json::json!({
        "id": "session-1",
        "workspaceId": "workspace-1",
        "title": null,
        "choice": { "agent": "claude", "model": "test-model", "effort": "high" },
        "createdAt": 1730000000000_i64,
        "closedAt": null,
        "activeTurnId": null,
        "activeTurnStartedAt": null,
        "retryMessageId": null,
        "startedBy": null,
        "sourceSessionId": null,
        "loginAvailable": false,
        "loginShared": true
    });
    let session: Session = serde_json::from_value(older.clone())?;
    assert!(serde_json::to_value(session)?.get("anchor").is_none());

    let anchor = serde_json::json!({
        "parentSessionId": "parent-1",
        "messageId": "answer-1",
        "quote": "The selected text",
        "before": "Before",
        "after": "After"
    });
    let mut explanation = older;
    explanation["anchor"] = anchor.clone();
    let session: Session = serde_json::from_value(explanation)?;
    assert_eq!(serde_json::to_value(session)?["anchor"], anchor);
    Ok(())
}
