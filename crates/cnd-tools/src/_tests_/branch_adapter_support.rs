//! Workspace branch calls through both adapters with mocked effects.

#![expect(
    clippy::unwrap_used,
    reason = "Test fixtures and captured mock calls must be valid"
)]

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::cli::{Program, ToolProgram};
use crate::client::Configuration;
use crate::ports::{HttpMock, HttpResponse, RuntimeMock, StreamsMock};

pub(super) struct Output {
    pub status: u8,
    pub stdout: Vec<String>,
    pub stderr: Vec<String>,
    pub requests: Vec<Value>,
}

pub(super) fn created() -> Value {
    json!({
        "workspace": {
            "id":"created-workspace", "number":3,
            "link":"https://app.conductive.test/org/created-workspace",
            "orgId":"org", "repositoryId":"repo", "sectionId":"general", "parentId":null,
            "owner":{"id":"owner", "githubLogin":"owner", "displayName":null, "avatarUrl":null},
            "name":null, "branch":"owner/task-ab12",
            "choice":{"agent":"codex", "model":"model", "effort":"high", "fast":false},
            "state":"input", "github":null, "createdAt":1, "updatedAt":1,
            "archivedAt":null, "restoreUntil":null
        },
        "sessionId":"first-session",
        "sessionLink":"https://app.conductive.test/org/created-workspace/first-session"
    })
}

pub(super) fn success() -> HttpResponse {
    HttpResponse {
        status: 201,
        body: created().to_string(),
    }
}

pub(super) fn input(branches: Value) -> Value {
    let mut fields = json!({
        "repositoryId":"repo", "firstMessage":"Build from this branch", "requestId":"branch-create"
    });
    fields
        .as_object_mut()
        .unwrap()
        .extend(branches.as_object().unwrap().clone());
    fields
}

pub(super) async fn run(mcp: bool, fields: Value, response: Option<HttpResponse>) -> Output {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let stdout = Arc::new(Mutex::new(Vec::new()));
    let stderr = Arc::new(Mutex::new(Vec::new()));
    let lines = Arc::new(Mutex::new(VecDeque::from([
        json!({"jsonrpc":"2.0", "id":"init", "method":"initialize", "params":{
            "protocolVersion":"2025-11-25", "capabilities":{}, "clientInfo":{"name":"test", "version":"1"}
        }}).to_string(),
        json!({"jsonrpc":"2.0", "method":"notifications/initialized"}).to_string(),
        json!({"jsonrpc":"2.0", "id":"create", "method":"tools/call", "params":{
            "name":"create_workspace", "arguments":fields
        }}).to_string(),
    ])));
    let runtime = Arc::new(Unimock::new(
        RuntimeMock::request_id
            .each_call(matching!())
            .returns(String::from("generated-id")),
    ));
    let success = response
        .as_ref()
        .is_some_and(|response| response.status < 400);
    let http = Arc::new(match response {
        Some(response) => Unimock::new(HttpMock::send.some_call(matching!(_)).answers_arc({
            let requests = requests.clone();
            Arc::new(move |_, request| {
                assert_eq!(
                    request.url,
                    "https://machine.conductive.test/v1/tools/workspaces"
                );
                assert_eq!(request.token, "token");
                assert_eq!(request.turn_id.as_deref(), Some("turn-sender"));
                requests
                    .lock()
                    .unwrap()
                    .push(serde_json::from_str(request.body.as_deref().unwrap()).unwrap());
                Ok(response.clone())
            })
        })),
        None => Unimock::new(()),
    });
    let stdout_mock = StreamsMock::stdout.each_call(matching!(_)).answers_arc({
        let stdout = stdout.clone();
        Arc::new(move |_, text| {
            stdout.lock().unwrap().push(text.into());
            Ok(())
        })
    });
    let stderr_mock = StreamsMock::stderr.each_call(matching!(_)).answers_arc({
        let stderr = stderr.clone();
        Arc::new(move |_, text| {
            stderr.lock().unwrap().push(text.into());
            Ok(())
        })
    });
    let streams = Arc::new(if mcp {
        Unimock::new((
            StreamsMock::line
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| Ok(lines.lock().unwrap().pop_front()))),
            stdout_mock,
        ))
    } else if success {
        Unimock::new(stdout_mock)
    } else {
        Unimock::new(stderr_mock)
    });
    let program = ToolProgram::new(
        Configuration::new(
            Some("https://machine.conductive.test".into()),
            Some("token".into()),
            Some("turn-sender".into()),
        )
        .unwrap(),
        http,
        runtime,
        streams,
        // A workspace create runs no process, so any call fails the test.
        Arc::new(Unimock::new(())),
    );
    let status = if mcp {
        program.mcp().await.unwrap()
    } else {
        let mut args = vec!["workspaces".into(), "create".into()];
        for (field, option) in [
            ("repositoryId", "--repository"),
            ("firstMessage", "--message"),
            ("requestId", "--request-id"),
            ("startBranch", "--start-branch"),
            ("baseBranch", "--base-branch"),
        ] {
            if let Some(value) = fields.get(field) {
                args.extend([option.into(), value.as_str().unwrap().into()]);
            }
        }
        program.cli(&args).await.unwrap()
    };
    Output {
        status,
        stdout: stdout.lock().unwrap().clone(),
        stderr: stderr.lock().unwrap().clone(),
        requests: requests.lock().unwrap().clone(),
    }
}

pub(super) fn mcp_result(output: &Output) -> Value {
    let reply = output
        .stdout
        .iter()
        .map(|line| serde_json::from_str::<Value>(line).unwrap())
        .find(|reply| reply["id"] == "create")
        .unwrap();
    reply["result"].clone()
}
