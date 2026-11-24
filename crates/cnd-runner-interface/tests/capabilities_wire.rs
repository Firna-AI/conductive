//! Optional session capabilities round-trip without secret values.

use cnd_runner_interface::runner_handshake::WorkspaceToRunner;
use serde_json::json;

#[test]
fn turn_preserves_capability_names() -> Result<(), serde_json::Error> {
    for capabilities in [
        json!({"secrets": ["API_TOKEN", "DEPLOY_KEY"]}),
        json!({"secrets": []}),
    ] {
        let command = json!({
            "type": "turn",
            "commandId": "command",
            "sessionId": "session",
            "turnId": "turn",
            "message": {
                "id": "message",
                "sessionId": "session",
                "sender": {
                    "id": "member",
                    "githubLogin": "member",
                    "displayName": null,
                    "avatarUrl": null
                },
                "text": "Deploy the service.",
                "attachments": [],
                "choice": {
                    "agent": "claude",
                    "model": "model",
                    "effort": "high",
                    "fast": false
                },
                "createdAt": 100,
                "state": "sent"
            },
            "attachments": [],
            "credential": {"agent": "claude", "kind": "token", "token": "test-token"},
            "commitAuthor": null,
            "capabilities": capabilities
        });
        let message: WorkspaceToRunner = serde_json::from_value(command.clone())?;
        assert_eq!(serde_json::to_value(message)?, command);
    }
    Ok(())
}
