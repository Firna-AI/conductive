//! One-shot watch discovery, wire requests, replies, and shared refusal behavior.

use serde_json::{Value, json};

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::HttpResponse;

#[path = "watch_support.rs"]
mod support;

#[tokio::test]
async fn watch_discovery_requires_only_the_target_session() -> Result<()> {
    let output = support::run(
        true,
        &[],
        None,
        HttpResponse {
            status: 200,
            body: String::new(),
        },
        None,
        false,
    )
    .await?;
    assert_eq!(output.status, 0);
    assert_eq!(output.stderr, Vec::<String>::new());
    assert_eq!(output.requests.len(), 0);
    let result = support::result(&output)?;
    let tools = &result["tools"];
    let watch = tools
        .as_array()
        .ok_or(Error::Reply { mac: false })?
        .iter()
        .find(|tool| tool["name"] == "watch_session");
    assert!(watch.is_some(), "watch_session must be discoverable");
    let watch = watch.ok_or(Error::Reply { mac: false })?;
    assert_eq!(watch["inputSchema"]["required"], json!(["sessionId"]));
    assert_eq!(
        watch["inputSchema"]["properties"]
            .as_object()
            .ok_or(Error::Reply { mac: false })?
            .keys()
            .collect::<Vec<_>>(),
        vec!["sessionId", "turnId", "workspaceId"]
    );
    for key in ["sessionId", "turnId", "workspaceId"] {
        assert_eq!(
            watch["inputSchema"]["properties"][key]["type"], "string",
            "{key}"
        );
    }
    assert_eq!(
        watch["annotations"],
        json!({"readOnlyHint":false, "destructiveHint":false, "idempotentHint":true})
    );
    Ok(())
}

#[tokio::test]
async fn watch_adapters_preserve_target_selection_and_each_typed_result() -> Result<()> {
    for (args, fields, path, body, state) in [
        (
            vec![
                "sessions",
                "watch",
                "--workspace",
                "team / one",
                "--session=session / one",
                "--turn-id",
                "--help",
            ],
            json!({"workspaceId":"team / one", "sessionId":"session / one", "turnId":"--help"}),
            "https://machine.test/v1/tools/workspaces/team%20%2F%20one/sessions/session%20%2F%20one/watch",
            json!({"turnId":"--help"}),
            json!({"state":"watching", "watchId":"watch-one", "turnId":"--help"}),
        ),
        (
            vec!["sessions", "watch", "--session", "target-session"],
            json!({"sessionId":"target-session"}),
            "https://machine.test/v1/tools/workspaces/current/sessions/target-session/watch",
            json!({}),
            json!({"state":"idle"}),
        ),
        (
            vec![
                "sessions",
                "watch",
                "--session",
                "target-session",
                "--turn-id=finished-turn",
            ],
            json!({"sessionId":"target-session", "turnId":"finished-turn"}),
            "https://machine.test/v1/tools/workspaces/current/sessions/target-session/watch",
            json!({"turnId":"finished-turn"}),
            json!({"state":"finished", "turnId":"finished-turn"}),
        ),
        (
            vec![
                "sessions",
                "watch",
                "--session",
                "target-session",
                "--turn-id",
                "failed-turn",
            ],
            json!({"sessionId":"target-session", "turnId":"failed-turn"}),
            "https://machine.test/v1/tools/workspaces/current/sessions/target-session/watch",
            json!({"turnId":"failed-turn"}),
            json!({"state":"failed", "turnId":"failed-turn"}),
        ),
        (
            vec![
                "sessions",
                "watch",
                "--session",
                "target-session",
                "--turn-id",
                "stopped-turn",
            ],
            json!({"sessionId":"target-session", "turnId":"stopped-turn"}),
            "https://machine.test/v1/tools/workspaces/current/sessions/target-session/watch",
            json!({"turnId":"stopped-turn"}),
            json!({"state":"stopped", "turnId":"stopped-turn"}),
        ),
    ] {
        let expected = support::reply(state.clone())?;
        let mut raw = expected.clone();
        raw["unknown"] = json!("private-field");
        let response = HttpResponse {
            status: 200,
            body: raw.to_string(),
        };
        let cli = support::run(
            false,
            &args,
            Some(fields.clone()),
            response.clone(),
            Some("calling-turn"),
            false,
        )
        .await?;
        let mcp = support::run(
            true,
            &args,
            Some(fields),
            response,
            Some("calling-turn"),
            false,
        )
        .await?;
        for output in [&cli, &mcp] {
            assert_eq!(output.status, 0, "state={state}");
            assert_eq!(output.stderr, Vec::<String>::new());
            assert_eq!(output.requests.len(), 1);
            let request = &output.requests[0];
            assert_eq!(request.url, path);
            assert_eq!(request.token, "watch-test-credential");
            assert_eq!(request.turn_id.as_deref(), Some("calling-turn"));
            assert_eq!(
                serde_json::from_str::<Value>(
                    request.body.as_deref().ok_or(Error::Reply { mac: false })?
                )
                .internal()?,
                body
            );
        }
        assert_eq!(cli.stdout.len(), 1);
        assert_eq!(
            serde_json::from_str::<Value>(&cli.stdout[0]).internal()?,
            expected
        );
        let result = support::result(&mcp)?;
        assert_eq!(result["isError"], false);
        assert_eq!(result["structuredContent"], expected);
        let text: Value = serde_json::from_str(
            result["content"][0]["text"]
                .as_str()
                .ok_or(Error::Reply { mac: false })?,
        )
        .internal()?;
        assert_eq!(text, expected);
    }
    Ok(())
}

#[tokio::test]
async fn watch_adapters_keep_worker_refusals_and_reject_malformed_replies() -> Result<()> {
    for (response, turn, expected) in [
        (HttpResponse {status:400, body:json!({"error":{"code":"invalid_input", "message":"A turn cannot watch itself."}}).to_string()}, Some("calling-turn"), "invalid_input: A turn cannot watch itself."),
        (HttpResponse {status:403, body:json!({"error":{"code":"calling_turn_required", "message":"Use an active turn. watch-test-credential"}}).to_string()}, None, "calling_turn_required: Use an active turn. [redacted]"),
        (HttpResponse {status:404, body:json!({"error":{"code":"turn_not_found", "message":"Turn missing."}}).to_string()}, Some("calling-turn"), "turn_not_found: Turn missing."),
        (HttpResponse {status:200, body:support::reply(json!({"state":"watching", "turnId":"target-turn"}))?.to_string()}, Some("calling-turn"), "The workspace reply is not valid. Try again."),
    ] {
        let args = &["sessions", "watch", "--session", "target-session"];
        let fields = Some(json!({"sessionId":"target-session"}));
        let cli = support::run(false, args, fields.clone(), response.clone(), turn, true).await?;
        let mcp = support::run(true, args, fields, response, turn, true).await?;
        assert_eq!(cli.status, 1);
        assert_eq!(cli.stdout, Vec::<String>::new());
        assert_eq!(cli.stderr, vec![format!("{expected}\n")]);
        assert_eq!(mcp.status, 0);
        assert_eq!(mcp.stderr, Vec::<String>::new());
        assert_eq!(support::result(&mcp)?, json!({"isError":true, "content":[{"type":"text", "text":expected}]}));
        for output in [&cli, &mcp] {
            assert_eq!(output.requests.len(), 1);
            assert_eq!(output.requests[0].turn_id.as_deref(), turn);
        }
    }
    Ok(())
}
