//! Workspace tree inputs and replies through CLI and stdio MCP boundaries.

#![allow(clippy::unwrap_used)]

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::call::Name;
use crate::cli::{Program, ToolProgram};
use crate::client::Configuration;
use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{HttpMock, HttpResponse, RuntimeMock, StreamsMock};
use crate::reply;
use crate::schema;

#[path = "workspace_fixtures.rs"]
mod fixtures;

fn configuration() -> Result<Configuration> {
    Configuration::new(
        Some("https://machine.test".into()),
        Some("token".into()),
        Some("turn".into()),
    )
}

#[test]
fn advertises_optional_parent_fields_without_changing_the_24_calls() -> Result<()> {
    let tools = serde_json::to_value(schema::tools()?).internal()?;
    let tools = tools.as_array().unwrap();
    assert_eq!(tools.len(), 24);
    for name in ["create_workspace", "list_workspaces"] {
        let tool = tools.iter().find(|tool| tool["name"] == name).unwrap();
        assert_eq!(
            tool["inputSchema"]["properties"]["parentId"]["type"], "string",
            "{name}"
        );
        assert_eq!(
            tool["inputSchema"]["properties"]["parentId"]["minLength"], 1,
            "{name}"
        );
        assert!(
            !tool["inputSchema"]["required"]
                .as_array()
                .into_iter()
                .flatten()
                .any(|field| field == "parentId")
        );
    }
    Ok(())
}

fn http(case: &fixtures::Case) -> Unimock {
    let url = format!("https://machine.test{}", case.path);
    let body = case.body.clone();
    let reply = case.reply.to_string();
    Unimock::new(
        HttpMock::send
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| {
                assert_eq!(request.url, url);
                let actual: Option<Value> = request
                    .body
                    .as_deref()
                    .map(serde_json::from_str)
                    .transpose()
                    .internal()?;
                assert_eq!(actual, body);
                Ok(HttpResponse {
                    status: 200,
                    body: reply.clone(),
                })
            })),
    )
}

#[tokio::test]
async fn cli_sends_parent_options_and_keeps_tree_fields_and_notices() -> Result<()> {
    for case in fixtures::cases() {
        let output = Arc::new(Mutex::new(Vec::<Value>::new()));
        let mock = Arc::new(Unimock::new((
            RuntimeMock::request_id
                .each_call(matching!())
                .returns(String::from("retry")),
            StreamsMock::stdout.each_call(matching!(_)).answers_arc({
                let output = output.clone();
                Arc::new(move |_, text| {
                    output
                        .lock()
                        .unwrap()
                        .push(serde_json::from_str(text).unwrap());
                    Ok(())
                })
            }),
        )));
        let program = ToolProgram::new(configuration()?, Arc::new(http(&case)), mock.clone(), mock);
        let args: Vec<String> = case.cli.iter().map(|value| (*value).into()).collect();
        assert_eq!(program.cli(&args).await?, 0, "{}", case.name);
        assert_eq!(*output.lock().unwrap(), vec![case.reply], "{}", case.name);
    }
    Ok(())
}

#[tokio::test]
async fn mcp_sends_parent_fields_and_keeps_tree_fields_and_notices() -> Result<()> {
    for case in fixtures::cases() {
        let input = Arc::new(Mutex::new(VecDeque::from([
            json!({"jsonrpc":"2.0", "id":"init", "method":"initialize", "params":{"protocolVersion":"2025-11-25", "capabilities":{}, "clientInfo":{"name":"test", "version":"1"}}}).to_string(),
            json!({"jsonrpc":"2.0", "method":"notifications/initialized"}).to_string(),
            json!({"jsonrpc":"2.0", "id":"call", "method":"tools/call", "params":{"name":case.name, "arguments":case.fields}}).to_string(),
        ])));
        let output = Arc::new(Mutex::new(Vec::<Value>::new()));
        let mock = Arc::new(Unimock::new((
            RuntimeMock::request_id
                .each_call(matching!())
                .returns(String::from("retry")),
            StreamsMock::line
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| Ok(input.lock().unwrap().pop_front()))),
            StreamsMock::stdout.each_call(matching!(_)).answers_arc({
                let output = output.clone();
                Arc::new(move |_, text| {
                    output
                        .lock()
                        .unwrap()
                        .push(serde_json::from_str(text).unwrap());
                    Ok(())
                })
            }),
        )));
        let program = ToolProgram::new(configuration()?, Arc::new(http(&case)), mock.clone(), mock);
        assert_eq!(program.mcp().await?, 0, "{}", case.name);
        let replies = output.lock().unwrap();
        let result = &replies.iter().find(|reply| reply["id"] == "call").unwrap()["result"];
        assert_eq!(result["isError"], false, "{}", case.name);
        assert_eq!(result["structuredContent"], case.reply, "{}", case.name);
        let text: Value =
            serde_json::from_str(result["content"][0]["text"].as_str().unwrap()).internal()?;
        assert_eq!(text, case.reply, "{}", case.name);
    }
    Ok(())
}

#[test]
fn rejects_empty_parent_ids_and_unsafe_workspace_depths() {
    for (key, value) in [
        ("parentId", json!(" ")),
        ("depth", json!(9_007_199_254_740_992u64)),
    ] {
        let mut raw = fixtures::cases().remove(2).reply;
        raw["workspace"][key] = value;
        let result = reply::parse(Name::GetWorkspace, &raw.to_string());
        assert!(
            matches!(result, Err(Error::Reply { mac: false })),
            "{key}: {result:?}"
        );
    }
}
