//! Local adapters work without credentials and preserve literal service inputs.

#![allow(clippy::unwrap_used, clippy::panic)]

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_services::socket::client::LocalClientMock;
use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::cli::{Program, ToolProgram};
use crate::ports::{RuntimeMock, StreamsMock};
use crate::services::tools::{LocalContextMock, LocalServices, ServiceName, ServiceTools};

fn local_reply() -> ServiceLocalResponse {
    serde_json::from_value(json!({
        "type":"list", "requestId":"list", "bootId":"boot", "services":[{
            "target":{"bootId":"boot","serviceId":"service","generation":"run"},
            "name":"web", "command":["npm","run","dev"],"folder":"/caller",
            "status":{"state":"running","startedAt":0,"endedAt":null,"result":null},"ports":[]
        }]
    }))
    .unwrap()
}

#[tokio::test]
async fn cli_and_mcp_service_inputs_keep_names_argv_and_explicit_values_without_credentials() {
    let captured = Arc::new(Mutex::new(Vec::<Value>::new()));
    let output = Arc::new(Mutex::new(Vec::<Value>::new()));
    let requests = captured.clone();
    let printed = output.clone();
    let lines = Arc::new(Mutex::new(VecDeque::from([
        json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}).to_string(),
        json!({"jsonrpc":"2.0","method":"notifications/initialized"}).to_string(),
        json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"start_service","arguments":{"name":" ","command":["npm","run","dev"],"folder":"/literal%folder","env":{"VALUE":"private-value"},"waitForPort":{"kind":"first"}}}}).to_string(),
    ])));
    let mock = Arc::new(Unimock::new((
        RuntimeMock::request_id
            .each_call(matching!())
            .returns("request".to_owned()),
        StreamsMock::stdout
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, text| {
                printed
                    .lock()
                    .unwrap()
                    .push(serde_json::from_str(text).unwrap());
                Ok(())
            })),
        StreamsMock::line
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(lines.lock().unwrap().pop_front()))),
        LocalClientMock::call
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| {
                requests
                    .lock()
                    .unwrap()
                    .push(serde_json::to_value(request).unwrap());
                Ok(local_reply())
            })),
        LocalContextMock::folder
            .some_call(matching!())
            .returns(Ok("/caller".to_owned())),
        LocalContextMock::turn_id
            .each_call(matching!())
            .returns(Some("turn".to_owned())),
    )));
    let services: Arc<dyn ServiceTools> = Arc::new(LocalServices {
        client: mock.clone(),
        context: mock.clone(),
    });
    let program = ToolProgram::with_environment(
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
    )
    .with_services(services);
    let args: Vec<_> = [
        "services",
        "start",
        "--name",
        "",
        "--env",
        "VALUE=private-value",
        "--",
        "program",
        "--help",
        "argument with spaces",
    ]
    .into_iter()
    .map(String::from)
    .collect();
    assert_eq!(program.cli(&args).await.unwrap(), 0);
    assert_eq!(program.mcp().await.unwrap(), 0);
    let requests = captured.lock().unwrap();
    assert_eq!(requests.len(), 2);
    assert_eq!(
        requests[0],
        json!({"type":"start","request":{"requestId":"request","name":"","definition":{"command":["program","--help","argument with spaces"],"folder":"/caller","env":{"VALUE":"private-value"}},"originatingTurnId":"turn"}})
    );
    assert_eq!(
        requests[1],
        json!({"type":"start","request":{"requestId":"request","name":" ","definition":{"command":["npm","run","dev"],"folder":"/literal%folder","env":{"VALUE":"private-value"}},"originatingTurnId":"turn","waitForPort":{"kind":"first"}}})
    );
    let output = output.lock().unwrap();
    assert_eq!(output.len(), 3);
    assert_eq!(output[2]["result"]["isError"], false);
    assert_eq!(
        output[2]["result"]["structuredContent"],
        serde_json::to_value(local_reply()).unwrap()
    );
    assert!(
        !serde_json::to_string(&*output)
            .unwrap()
            .contains("private-value")
    );
}

#[tokio::test]
async fn lost_local_restart_reply_is_unconfirmed_without_retry() {
    let controls = Arc::new(Mutex::new(Vec::<Value>::new()));
    let received = controls.clone();
    let mock = Arc::new(Unimock::new(
        LocalClientMock::call
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| match request {
                ServiceLocalRequest::List { .. } => Ok(local_reply()),
                request => {
                    received
                        .lock()
                        .unwrap()
                        .push(serde_json::to_value(request).unwrap());
                    Err(cnd_services::error::Error::Unavailable)
                }
            })),
    ));
    let services: Arc<dyn ServiceTools> = Arc::new(LocalServices {
        client: mock,
        context: Arc::new(Unimock::new(())),
    });
    let reply = services
        .mcp(
            ServiceName::RestartService,
            serde_json::from_value(json!({"name":"web","requestId":"explicit"})).unwrap(),
            "generated",
        )
        .await
        .unwrap();
    assert_eq!(
        serde_json::to_value(reply).unwrap()["result"]["outcome"],
        json!({"state":"unconfirmed"})
    );
    assert_eq!(
        *controls.lock().unwrap(),
        [
            json!({"type":"control","request":{"requestId":"explicit","action":"restart","target":{"bootId":"boot","serviceId":"service","generation":"run"}}})
        ]
    );
}
