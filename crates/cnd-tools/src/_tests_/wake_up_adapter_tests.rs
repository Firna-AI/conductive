//! The public wake-up descriptors and adapter requests.

use serde_json::{Value, json};

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::HttpResponse;

use super::session_tool_support::{reply, result, run};

#[tokio::test]
async fn discovers_all_wake_up_tools_without_a_calling_turn() -> Result<()> {
    let output = run(
        "schedule_wake_up",
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
    let response = result(&output)?;
    let tools = response["tools"]
        .as_array()
        .ok_or(Error::Reply { mac: false })?;
    for (name, required, read_only) in [
        ("schedule_wake_up", json!(["text"]), false),
        ("list_wake_ups", json!(["sessionId"]), true),
        ("cancel_wake_up", json!(["sessionId", "wakeUpId"]), false),
    ] {
        let descriptor = tools.iter().find(|tool| tool["name"] == name);
        assert!(descriptor.is_some(), "{name} must be discoverable");
        let descriptor = descriptor.ok_or(Error::Reply { mac: false })?;
        assert_eq!(descriptor["inputSchema"]["required"], required);
        assert_eq!(descriptor["annotations"]["readOnlyHint"], read_only);
    }
    assert_eq!(output.requests.len(), 0);
    Ok(())
}

#[tokio::test]
async fn cli_and_mcp_schedule_list_and_cancel_through_the_same_wire_paths() -> Result<()> {
    let wake_up = json!({
        "id": "wake / one", "at": 1795420800000_i64,
        "atUtc": "23 November 2026, 08:00 UTC", "text": "Check later"
    });
    let mut delayed = wake_up.clone();
    delayed["text"] = json!("--help");
    let cases = [
        (
            "schedule_wake_up",
            vec![
                "wake-ups",
                "schedule",
                "--message",
                "Check later",
                "--at",
                "2026-11-23T09:00:00+01:00",
            ],
            json!({"text":"Check later", "at":"2026-11-23T09:00:00+01:00"}),
            Some("calling-turn"),
            "/v1/tools/wake-ups",
            Some(json!({"at":1795420800000_i64, "text":"Check later"})),
            json!({"wakeUp": wake_up}),
        ),
        (
            "schedule_wake_up",
            vec![
                "wake-ups",
                "schedule",
                "--message",
                "--help",
                "--delay-seconds",
                "60.5",
            ],
            json!({"text":"--help", "delaySeconds":60.5}),
            Some("calling-turn"),
            "/v1/tools/wake-ups",
            Some(json!({"text":"--help", "delaySeconds":60.5})),
            json!({"wakeUp": delayed}),
        ),
        (
            "list_wake_ups",
            vec!["wake-ups", "list", "--session", "target-session"],
            json!({"sessionId":"target-session"}),
            None,
            "/v1/tools/workspaces/current/sessions/target-session/wake-ups",
            None,
            json!({"wakeUps":[wake_up]}),
        ),
        (
            "cancel_wake_up",
            vec![
                "wake-ups",
                "cancel",
                "--workspace",
                "team / one",
                "--session",
                "target-session",
                "--wake-up-id",
                "wake / one",
            ],
            json!({"workspaceId":"team / one", "sessionId":"target-session", "wakeUpId":"wake / one"}),
            Some("calling-turn"),
            "/v1/tools/workspaces/team%20%2F%20one/sessions/target-session/wake-ups/wake%20%2F%20one/cancel",
            Some(json!({})),
            json!({"wakeUpId":"wake / one", "state":"already-fired"}),
        ),
    ];
    for (name, args, fields, turn, path, body, fields_in_reply) in cases {
        let expected = reply(fields_in_reply)?;
        let mut raw = expected.clone();
        raw["unknown"] = json!("private-field");
        let response = HttpResponse {
            status: 200,
            body: raw.to_string(),
        };
        let cli = run(
            name,
            false,
            &args,
            Some(fields.clone()),
            response.clone(),
            turn,
            false,
        )
        .await?;
        let mcp = run(name, true, &args, Some(fields), response, turn, false).await?;
        for output in [&cli, &mcp] {
            assert_eq!(output.status, 0, "{name}");
            assert_eq!(output.stderr, Vec::<String>::new(), "{name}");
            assert_eq!(output.requests.len(), 1, "{name}");
            let request = &output.requests[0];
            assert_eq!(request.url, format!("https://machine.test{path}"));
            assert_eq!(request.turn_id.as_deref(), turn);
            assert_eq!(
                request
                    .body
                    .as_deref()
                    .map(serde_json::from_str::<Value>)
                    .transpose()
                    .internal()?,
                body,
            );
        }
        assert_eq!(
            serde_json::from_str::<Value>(&cli.stdout[0]).internal()?,
            expected
        );
        let output = result(&mcp)?;
        assert_eq!(output["isError"], false);
        assert_eq!(output["structuredContent"], expected);
    }
    Ok(())
}
