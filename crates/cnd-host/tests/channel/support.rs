//! Local socket peers using the production transport and session coordinators.

use std::error::Error;
use std::sync::Arc;

use cnd_host::clock::SystemClock;
use cnd_host::diagnostics::DiagnosticsMock;
use cnd_host::ports::{Operations, Socket};
use cnd_host::session::host::HostSession;
use cnd_host::session::ports::Session;
use cnd_host::socket::transport::{Stream, WebSocket};
use cnd_host::streams::group::StreamGroups;
use cnd_host::streams::ports::Network;
use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::host::literals::HostProtocolVersion;
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::HostResult;
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::protocol::{Message, Role};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use unimock::{MockFn, Unimock, matching};

pub(super) type TestResult<T = ()> = Result<T, Box<dyn Error + Send + Sync>>;

pub(super) fn session(
    operations: Arc<dyn Operations>,
    network: Arc<dyn Network>,
) -> Arc<dyn Session> {
    let clock = Arc::new(SystemClock);
    Arc::new(HostSession {
        operations,
        streams: Arc::new(StreamGroups {
            network,
            clock: clock.clone(),
        }),
        clock,
        diagnostics: Arc::new(Unimock::new((
            DiagnosticsMock::welcomed.each_call(matching!()).returns(()),
            DiagnosticsMock::peer_closed
                .each_call(matching!(None))
                .returns(()),
        ))),
    })
}

pub(super) async fn sockets() -> TestResult<(Arc<dyn Socket>, Stream)> {
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let address = listener.local_addr()?;
    let (client, server) = tokio::try_join!(TcpStream::connect(address), listener.accept())?;
    let client =
        WebSocketStream::from_raw_socket(MaybeTlsStream::Plain(client), Role::Client, None).await;
    let server =
        WebSocketStream::from_raw_socket(MaybeTlsStream::Plain(server.0), Role::Server, None).await;
    Ok((Arc::new(WebSocket::new(client)), server))
}

pub(super) async fn next(peer: &mut Stream) -> TestResult<Message> {
    peer.next().await.ok_or("peer closed")?.map_err(Into::into)
}

pub(super) async fn message(peer: &mut Stream) -> TestResult<HostToWorker> {
    let mut joined = Vec::new();
    loop {
        match next(peer).await? {
            Message::Text(text) => return Ok(serde_json::from_slice(text.as_bytes())?),
            Message::Binary(bytes) => {
                let HostFrame::MessagePart { last, data, .. } = frames::decode(&bytes)? else {
                    return Err("expected message part".into());
                };
                joined.extend(data);
                if last {
                    return Ok(serde_json::from_slice(&joined)?);
                }
            }
            _ => return Err("unexpected socket frame".into()),
        }
    }
}

pub(super) async fn send(peer: &mut Stream, message: WorkerToHost) -> TestResult {
    peer.send(Message::Text(serde_json::to_string(&message)?.into()))
        .await?;
    Ok(())
}

pub(super) async fn welcome(peer: &mut Stream) -> TestResult {
    send(
        peer,
        WorkerToHost::Welcome {
            host_protocol_version: HostProtocolVersion,
        },
    )
    .await
}

pub(super) async fn request(
    peer: &mut Stream,
    request_id: u32,
    operation: HostOperation,
) -> TestResult<HostResult> {
    send(
        peer,
        WorkerToHost::Request {
            request_id,
            operation,
        },
    )
    .await?;
    let HostToWorker::Reply {
        request_id: reply_id,
        result,
    } = message(peer).await?
    else {
        return Err("expected reply".into());
    };
    assert_eq!(reply_id, request_id);
    Ok(result)
}
