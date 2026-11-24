//! Hello and welcome negotiation, activity, periodic ping, and service close.

#![expect(
    clippy::unwrap_used,
    reason = "Fixture channel failures must stop the test."
)]

use std::future;
use std::sync::Arc;
use std::time::Duration;

use cnd_runner_interface::computer::literals::ComputerProtocolVersion;
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::activity::Activity;
use crate::connection_support::{Peer, Sent, context, resources, virtual_timer};
use crate::diagnostics::{Diagnostics, DiagnosticsMock};
use crate::socket::Incoming;

use super::{ComputerSession, Session, SessionExit};

fn session(diagnostics: Arc<dyn Diagnostics>) -> Arc<dyn Session> {
    Arc::new(ComputerSession {
        activity: Arc::new(Activity::default()),
        operations: Arc::new(Unimock::new(())),
        timer: virtual_timer(),
        diagnostics,
    })
}

#[tokio::test(start_paused = true)]
async fn emits_hello_then_pings_after_welcome_until_shutdown() {
    let mut peer = Peer::new();
    let (stop, shutdown) = watch::channel(false);
    let session = session(Arc::new(Unimock::new(
        DiagnosticsMock::welcomed
            .some_call(matching!())
            .returns(())
            .once(),
    )));
    let socket = peer.socket.clone();
    let run = tokio::spawn(async move {
        session
            .serve(
                socket,
                "0.0.42",
                context(),
                Box::pin(future::pending()),
                shutdown,
            )
            .await
    });
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Hello {
            computer_protocol_version: 1,
            program_version: "0.0.42".into(),
            resources: resources(),
        }))
    );
    assert!(peer.rx.try_recv().is_err());
    peer.tx
        .send(Ok(Incoming::Message(WorkerToComputer::Welcome {
            computer_protocol_version: ComputerProtocolVersion,
        })))
        .unwrap();
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Ping))
    );
    stop.send(true).unwrap();
    assert_eq!(peer.rx.recv().await, Some(Sent::Close(1000)));
    assert!(run.await.unwrap().welcomed);
}

#[tokio::test(start_paused = true)]
async fn closes_out_of_order_application_message_with_policy_code() {
    let peer = Peer::new();
    let (_stop, shutdown) = watch::channel(false);
    let session = session(Arc::new(Unimock::new(
        DiagnosticsMock::protocol_error
            .some_call(matching!())
            .returns(())
            .once(),
    )));
    peer.tx
        .send(Ok(Incoming::Message(WorkerToComputer::Pong)))
        .unwrap();
    peer.tx.send(Ok(Incoming::Closed(None))).unwrap();
    let exit = session
        .serve(
            peer.socket.clone(),
            "0.0.42",
            context(),
            Box::pin(future::pending()),
            shutdown,
        )
        .await;
    assert_eq!(exit, SessionExit::default());
    let mut rx = peer.rx;
    assert!(matches!(
        rx.try_recv(),
        Ok(Sent::Message(ComputerToWorker::Hello { .. }))
    ));
    assert_eq!(rx.try_recv().unwrap(), Sent::Close(1008));
}

#[tokio::test(start_paused = true)]
async fn inbound_activity_resets_the_sixty_second_inactivity_deadline() {
    let mut peer = Peer::new();
    let (_stop, shutdown) = watch::channel(false);
    let session = session(Arc::new(Unimock::new((
        DiagnosticsMock::welcomed.some_call(matching!()).returns(()),
        DiagnosticsMock::inactive
            .some_call(matching!())
            .returns(())
            .at_least_times(0),
    ))));
    let socket = peer.socket.clone();
    peer.tx
        .send(Ok(Incoming::Message(WorkerToComputer::Welcome {
            computer_protocol_version: ComputerProtocolVersion,
        })))
        .unwrap();
    let run = tokio::spawn(async move {
        session
            .serve(
                socket,
                "0.0.42",
                context(),
                Box::pin(future::pending()),
                shutdown,
            )
            .await
    });
    let _hello = peer.rx.recv().await.unwrap();
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Ping))
    );
    peer.tx
        .send(Ok(Incoming::Message(WorkerToComputer::Pong)))
        .unwrap();
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Ping))
    );
    tokio::time::advance(Duration::from_secs(11)).await;
    tokio::task::yield_now().await;
    assert!(!run.is_finished(), "pong must reset inactivity");
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Ping))
    );
    assert!(run.await.unwrap().welcomed);
}
