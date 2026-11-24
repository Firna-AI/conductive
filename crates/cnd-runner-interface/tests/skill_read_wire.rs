//! The skill read command and result use unnumbered runner messages.

use cnd_runner_interface::runner_handshake::{RunnerHello, RunnerToWorkspace, WorkspaceToRunner};
use serde_json::json;

#[test]
fn skill_read_command_round_trips_with_agent_and_name() {
    let input = json!({
        "type": "skill.read",
        "requestId": "read-1",
        "agent": "claude",
        "name": "review",
        "maxBytes": 1048576
    });
    let result =
        serde_json::from_value::<WorkspaceToRunner>(input.clone()).and_then(serde_json::to_value);
    assert_eq!(result.map_err(|error| error.to_string()), Ok(input));
}

#[test]
fn skill_read_result_round_trips_with_text_or_public_error() {
    for result in [
        json!({"ok": true, "text": "# Review\n"}),
        json!({"ok": false, "error": {
            "code": "skill_not_found", "message": "The skill was not found."
        }}),
        json!({"ok": false, "error": {
            "code": "skill_unavailable", "message": "The skill could not be read."
        }}),
        json!({"ok": false, "error": {
            "code": "skill_too_large", "message": "The skill is too large.",
            "sizeBytes": 1048577, "limitBytes": 1048576
        }}),
    ] {
        let input = json!({"type": "skill.read.result", "requestId": "read-1", "result": result});
        let response = serde_json::from_value::<RunnerToWorkspace>(input.clone())
            .and_then(serde_json::to_value);
        assert_eq!(response.map_err(|error| error.to_string()), Ok(input));
    }
}

#[test]
fn hello_round_trips_with_and_without_the_skill_reads_offer() {
    let older = json!({
        "type": "hello", "protocolVersion": 2, "workspaceId": "workspace", "streamId": "stream"
    });
    let mut current = older.clone();
    current["skillReads"] = json!(true);
    for input in [older, current] {
        let response =
            serde_json::from_value::<RunnerHello>(input.clone()).and_then(serde_json::to_value);
        assert_eq!(response.map_err(|error| error.to_string()), Ok(input));
    }
}
