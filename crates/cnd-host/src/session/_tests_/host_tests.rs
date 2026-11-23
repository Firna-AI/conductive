//! Negotiation, independent ping, inactivity, protocol errors, and drop cleanup.

#![expect(
    clippy::unwrap_used,
    reason = "In-memory fixture failures must stop the test."
)]

use std::sync::Arc;
use std::time::Duration;

use cnd_runner_interface::host::literals::HostProtocolVersion;
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::diagnostics::{Diagnostics, DiagnosticsMock};
use crate::error::Error;
use crate::ports::Incoming;
use crate::session::host::HostSession;
use crate::session::ports::{Session, SessionExit};
use crate::streams::ports::{StreamFactoryMock, Streams, StreamsMock};
use crate::test_support::{Peer, Time};

fn session(time: &Time, diagnostics: Arc<dyn Diagnostics>) -> Arc<dyn Session> {
    let streams: Arc<dyn Streams> = Arc::new(Unimock::new(
        StreamsMock::close_all.some_call(matching!()).returns(()),
    ));
    Arc::new(HostSession {
        operations: Arc::new(Unimock::new(())),
        streams: Arc::new(Unimock::new(
            StreamFactoryMock::create
                .some_call(matching!(_))
                .returns(streams),
        )),
        clock: time.clock.clone(),
        diagnostics,
    })
}

#[tokio::test]
async fn hello_precedes_welcome_and_ping_continues_until_a_drop_releases_streams() {
    let time = Time::new();
    let peer = Peer::new(false);
    let (_stop, shutdown) = watch::channel(false);
    let diagnostics = Arc::new(Unimock::new((
        DiagnosticsMock::welcomed
            .some_call(matching!())
            .returns(())
            .once(),
        DiagnosticsMock::peer_closed
            .some_call(matching!(Some(4001)))
            .returns(())
            .once(),
    )));
    let session = session(&time, diagnostics);
    let socket = peer.socket.clone();
    let run = tokio::spawn(async move { session.serve(socket, "0.0.42", shutdown).await });
    assert_eq!(
        peer.next().await,
        HostToWorker::Hello {
            host_protocol_version: 1,
            program_version: "0.0.42".into()
        }
    );
    peer.incoming
        .send(Ok(Incoming::Message(WorkerToHost::Welcome {
            host_protocol_version: HostProtocolVersion,
        })))
        .unwrap();
    time.fire(Duration::from_secs(25)).await;
    assert_eq!(peer.next().await, HostToWorker::Ping);
    peer.incoming
        .send(Ok(Incoming::Message(WorkerToHost::Pong)))
        .unwrap();
    time.fire(Duration::from_secs(25)).await;
    assert_eq!(peer.next().await, HostToWorker::Ping);
    peer.incoming
        .send(Ok(Incoming::Closed(Some(4001))))
        .unwrap();
    assert_eq!(
        run.await.unwrap(),
        SessionExit {
            welcomed: true,
            close_code: Some(4001)
        }
    );
}

#[tokio::test]
async fn sixty_seconds_without_an_incoming_frame_drops_the_session() {
    let time = Time::new();
    let peer = Peer::new(false);
    let (_stop, shutdown) = watch::channel(false);
    let session = session(
        &time,
        Arc::new(Unimock::new(
            DiagnosticsMock::inactive
                .some_call(matching!())
                .returns(())
                .once(),
        )),
    );
    let socket = peer.socket.clone();
    let run = tokio::spawn(async move { session.serve(socket, "test", shutdown).await });
    let _ = peer.next().await;
    time.fire(Duration::from_secs(60)).await;
    assert_eq!(
        run.await.unwrap(),
        SessionExit {
            welcomed: false,
            close_code: None
        }
    );
}

#[tokio::test]
async fn malformed_input_closes_with_policy_code_before_any_operation() {
    let time = Time::new();
    let peer = Peer::new(true);
    let (_stop, shutdown) = watch::channel(false);
    let session = session(
        &time,
        Arc::new(Unimock::new(
            DiagnosticsMock::protocol_error
                .some_call(matching!())
                .returns(())
                .once(),
        )),
    );
    let socket = peer.socket.clone();
    let run = tokio::spawn(async move { session.serve(socket, "test", shutdown).await });
    let _ = peer.next().await;
    peer.incoming.send(Err(Error::Protocol)).unwrap();
    assert_eq!(run.await.unwrap(), SessionExit::default());
    assert_eq!(*peer.closed.lock().unwrap(), [1008]);
}
