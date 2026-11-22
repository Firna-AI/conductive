//! Captured requests and output from the real CLI and MCP adapters.

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::cli::{Program, ToolProgram};
use crate::client::Configuration;
use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{HttpMock, HttpRequest, HttpResponse, RuntimeMock, StreamsMock};

pub(super) struct Output {
    pub(super) status: u8,
    pub(super) requests: Vec<HttpRequest>,
    pub(super) stdout: Vec<String>,
    pub(super) stderr: Vec<String>,
}

pub(super) fn reply(state: Value) -> Result<Value> {
    let mut reply = json!({
        "workspace":{
            "id":"target-workspace", "number":42,
            "link":"https://app.test/orgs/org/workspaces/target-workspace",
            "name":"Watch target", "branch":"member/target", "state":"working"
        },
        "session":{
            "id":"target-session", "link":"https://app.test/orgs/org/workspaces/target-workspace/sessions/target-session"
        }
    });
    reply
        .as_object_mut()
        .ok_or(Error::Reply { mac: false })?
        .extend(
            state
                .as_object()
                .ok_or(Error::Reply { mac: false })?
                .clone(),
        );
    Ok(reply)
}

pub(super) async fn run(
    mcp: bool,
    args: &[&str],
    fields: Option<Value>,
    response: HttpResponse,
    turn: Option<&str>,
    failure: bool,
) -> Result<Output> {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let stdout = Arc::new(Mutex::new(Vec::new()));
    let stderr = Arc::new(Mutex::new(Vec::new()));
    let calling = fields.is_some();
    let request = match fields {
        Some(fields) => json!({"jsonrpc":"2.0", "id":"watch", "method":"tools/call", "params":{
            "name":"watch_session", "arguments":fields
        }}),
        None => json!({"jsonrpc":"2.0", "id":"watch", "method":"tools/list", "params":{}}),
    };
    let input = Arc::new(Mutex::new(VecDeque::from([
        json!({"jsonrpc":"2.0", "id":"init", "method":"initialize", "params":{
            "protocolVersion":"2025-11-25", "capabilities":{}, "clientInfo":{"name":"watch-test", "version":"1"}
        }}).to_string(),
        json!({"jsonrpc":"2.0", "method":"notifications/initialized"}).to_string(),
        request.to_string(),
    ])));
    let effects = Arc::new(if calling {
        Unimock::new((
            RuntimeMock::request_id
                .some_call(matching!())
                .returns(String::from("unused-request-id")),
            HttpMock::send.some_call(matching!(_)).answers_arc({
                let requests = requests.clone();
                Arc::new(move |_, request| {
                    requests
                        .lock()
                        .map_err(|_| Error::Reply { mac: false })?
                        .push(request);
                    Ok(response.clone())
                })
            }),
        ))
    } else {
        Unimock::new(())
    });
    let capture = if mcp || !failure {
        stdout.clone()
    } else {
        stderr.clone()
    };
    let write = Arc::new(move |_: &Unimock, text: &str| {
        capture
            .lock()
            .map_err(|_| Error::Reply { mac: false })?
            .push(text.to_owned());
        Ok(())
    });
    let streams = Arc::new(if mcp {
        Unimock::new((
            StreamsMock::line
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    Ok(input
                        .lock()
                        .map_err(|_| Error::Reply { mac: false })?
                        .pop_front())
                })),
            StreamsMock::stdout
                .each_call(matching!(_))
                .answers_arc(write),
        ))
    } else if failure {
        Unimock::new(
            StreamsMock::stderr
                .some_call(matching!(_))
                .answers_arc(write),
        )
    } else {
        Unimock::new(
            StreamsMock::stdout
                .some_call(matching!(_))
                .answers_arc(write),
        )
    });
    let program = ToolProgram::new(
        Configuration::new(
            Some("https://machine.test".into()),
            Some("watch-test-credential".into()),
            turn.map(String::from),
        )?,
        effects.clone(),
        effects.clone(),
        streams,
        Arc::new(Unimock::new(())),
    );
    let status = if mcp {
        program.mcp().await?
    } else {
        program
            .cli(&args.iter().map(|value| (*value).into()).collect::<Vec<_>>())
            .await?
    };
    Ok(Output {
        status,
        requests: requests
            .lock()
            .map_err(|_| Error::Reply { mac: false })?
            .clone(),
        stdout: stdout
            .lock()
            .map_err(|_| Error::Reply { mac: false })?
            .clone(),
        stderr: stderr
            .lock()
            .map_err(|_| Error::Reply { mac: false })?
            .clone(),
    })
}

pub(super) fn result(output: &Output) -> Result<Value> {
    let replies: Vec<Value> = output
        .stdout
        .iter()
        .map(|line| serde_json::from_str(line).internal())
        .collect::<Result<_>>()?;
    Ok(replies
        .iter()
        .find(|reply| reply["id"] == "watch")
        .ok_or(Error::Reply { mac: false })?["result"]
        .clone())
}
