//! The production connector and session speak the protocol on a loopback socket.

#![expect(
    clippy::unwrap_used,
    reason = "A failed wire fixture must fail the test."
)]

use std::future;
use std::sync::Arc;
use std::time::Duration;

use cnd_computer::activity::Activity;
use cnd_computer::diagnostics::TracingDiagnostics;
use cnd_computer::operations::{OperationFuture, Operations, RequestContext};
use cnd_computer::session::serve::{ComputerSession, Session};
use cnd_computer::settings::Settings;
use cnd_computer::socket::{Connector, WebSocketConnector};
use cnd_host::clock::SystemClock;
use cnd_runner_interface::computer::messages::{ComputerResources, ComputerToWorker};
use cnd_runner_interface::computer::operations::ComputerOperation;
use cnd_runner_interface::computer::results::{ComputerResult, ContainerState};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio::sync::watch;
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};

struct GetFixture;

impl Operations for GetFixture {
    fn execute(
        &self,
        operation: ComputerOperation,
        _context: Arc<RequestContext>,
    ) -> OperationFuture<'_> {
        Box::pin(async move {
            assert_eq!(
                operation,
                ComputerOperation::ContainerGet {
                    container: "fixture".into()
                }
            );
            ComputerResult::Container {
                container: "fixture".into(),
                state: ContainerState::Stopped,
            }
        })
    }
}

#[expect(
    clippy::result_large_err,
    reason = "The WebSocket library fixes the callback error type."
)]
fn authenticated(request: &Request, response: Response) -> Result<Response, ErrorResponse> {
    assert_eq!(request.uri().path(), "/v1/computer");
    assert_eq!(request.headers()["authorization"], "Bearer fixture-token");
    assert!(!request.headers().contains_key("origin"));
    assert!(!request.headers().contains_key("cookie"));
    Ok(response)
}

#[tokio::test]
async fn authenticates_reports_resources_answers_a_request_and_closes_cleanly() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap())
        .parse()
        .unwrap();
    let resources = ComputerResources {
        cpus: 4,
        memory_bytes: 8_000_000_000,
        system: "Ubuntu 24.04 · x86_64".into(),
    };
    let (stop, shutdown) = watch::channel(false);
    let reported = resources.clone();
    let server = tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let mut socket = accept_hdr_async(stream, authenticated).await.unwrap();
        let hello = socket.next().await.unwrap().unwrap();
        assert_eq!(
            serde_json::from_str::<ComputerToWorker>(hello.to_text().unwrap()).unwrap(),
            ComputerToWorker::Hello {
                computer_protocol_version: 1,
                program_version: "0.0.42".into(),
                resources: reported
            }
        );
        socket
            .send(Message::Text(
                r#"{"type":"welcome","computerProtocolVersion":1}"#.into(),
            ))
            .await
            .unwrap();
        socket.send(Message::Text(r#"{"type":"request","requestId":3,"operation":{"kind":"container.get","container":"fixture"}}"#.into())).await.unwrap();
        let reply = socket.next().await.unwrap().unwrap();
        assert_eq!(
            serde_json::from_str::<ComputerToWorker>(reply.to_text().unwrap()).unwrap(),
            ComputerToWorker::Reply {
                request_id: 3,
                result: ComputerResult::Container {
                    container: "fixture".into(),
                    state: ContainerState::Stopped,
                }
            }
        );
        stop.send(true).unwrap();
        let closed = socket.next().await.unwrap().unwrap();
        assert!(matches!(closed, Message::Close(Some(code)) if u16::from(code.code) == 1000));
    });
    let settings = Settings {
        origin,
        token: "fixture-token".into(),
        release_server: "https://runner.conductive.build".parse().unwrap(),
    };
    let socket = WebSocketConnector.connect(&settings).await.unwrap();
    let session = ComputerSession {
        activity: Arc::new(Activity::default()),
        operations: Arc::new(GetFixture),
        timer: Arc::new(SystemClock),
        diagnostics: Arc::new(TracingDiagnostics),
    };
    let context = RequestContext {
        resources,
        release_server: settings.release_server,
    };
    let joined = async {
        tokio::join!(
            session.serve(
                socket,
                "0.0.42",
                context,
                Box::pin(future::pending()),
                shutdown
            ),
            server
        )
    };
    let (exit, server) = tokio::time::timeout(Duration::from_secs(10), joined)
        .await
        .unwrap();
    server.unwrap();
    assert!(exit.welcomed);
}
