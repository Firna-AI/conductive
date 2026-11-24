//! Timer and socket effects for deterministic connection tests.

#![expect(
    clippy::unwrap_used,
    reason = "Closed fixture channels must fail the test."
)]

use std::sync::Arc;

use cnd_runner_interface::computer::messages::{ComputerResources, ComputerToWorker};
use tokio::sync::{Mutex, mpsc};
use unimock::{MockFn, Unimock, matching};

use crate::error::Result;
use crate::operations::RequestContext;
use crate::socket::{Incoming, Socket, SocketMock};
use crate::timer::{Timer, TimerMock};

pub(crate) fn resources() -> ComputerResources {
    ComputerResources {
        cpus: 4,
        memory_bytes: 8_000_000_000,
        system: "Linux · x86_64".into(),
    }
}

pub(crate) fn context() -> RequestContext {
    RequestContext {
        resources: resources(),
        release_server: "https://runner.conductive.build".parse().unwrap(),
    }
}

pub(crate) fn virtual_timer() -> Arc<dyn Timer> {
    Arc::new(Unimock::new(
        TimerMock::wait
            .some_call(matching!(_))
            .answers(&|_, duration| Box::pin(tokio::time::sleep(duration)))
            .at_least_times(0),
    ))
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Sent {
    Message(ComputerToWorker),
    Close(u16),
}

pub(crate) struct Peer {
    pub(crate) socket: Arc<dyn Socket>,
    pub(crate) rx: mpsc::UnboundedReceiver<Sent>,
    pub(crate) tx: mpsc::UnboundedSender<Result<Incoming>>,
}

impl Peer {
    pub(crate) fn new() -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        let rx = Arc::new(Mutex::new(rx));
        let (sent, messages) = mpsc::unbounded_channel();
        let closed = sent.clone();
        let socket = Arc::new(
            Unimock::new((
                SocketMock::send
                    .some_call(matching!(_))
                    .answers_arc(Arc::new(move |_, message| {
                        sent.send(Sent::Message(message.clone())).unwrap();
                        Ok(())
                    }))
                    .at_least_times(0),
                SocketMock::close
                    .some_call(matching!(_))
                    .answers_arc(Arc::new(move |_, code| {
                        closed.send(Sent::Close(code)).unwrap();
                        Ok(())
                    }))
                    .at_least_times(0),
                SocketMock::receive
                    .some_call(matching!())
                    .answers_arc(Arc::new(move |_| {
                        let rx = rx.clone();
                        Box::pin(async move {
                            rx.lock()
                                .await
                                .recv()
                                .await
                                .unwrap_or(Ok(Incoming::Closed(None)))
                        })
                    }))
                    .at_least_times(0),
            ))
            .no_verify_in_drop(),
        );
        Self {
            socket,
            rx: messages,
            tx,
        }
    }
}
