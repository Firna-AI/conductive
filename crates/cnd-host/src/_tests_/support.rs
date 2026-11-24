//! In-memory clock gates and socket peers backed by unimock.

#![expect(
    clippy::unwrap_used,
    reason = "A failed fixture operation must fail the test."
)]

use std::collections::VecDeque;
use std::sync::{self, Arc};
use std::time::Duration;

use cnd_runner_interface::host::messages::HostToWorker;
use tokio::sync::{Mutex, Notify, mpsc, oneshot};
use unimock::{MockFn, Unimock, matching};

use crate::error::Result;
use crate::ports::{Clock, ClockMock, Incoming, Socket, SocketMock};

type Gates = VecDeque<(Duration, oneshot::Sender<()>)>;

pub(crate) struct Time {
    pub(crate) clock: Arc<dyn Clock>,
    gates: Arc<sync::Mutex<Gates>>,
    registered: Arc<Notify>,
}

impl Time {
    pub(crate) fn new() -> Self {
        let gates = Arc::new(sync::Mutex::new(VecDeque::new()));
        let registered = Arc::new(Notify::new());
        let captured = gates.clone();
        let wake = registered.clone();
        let clock = Arc::new(Unimock::new(
            ClockMock::wait
                .each_call(matching!(_))
                .answers_arc(Arc::new(move |_, duration| {
                    let (send, receive) = oneshot::channel();
                    captured.lock().unwrap().push_back((duration, send));
                    wake.notify_one();
                    Box::pin(async move {
                        let _ = receive.await;
                    })
                })),
        ));
        Self {
            clock,
            gates,
            registered,
        }
    }

    pub(crate) async fn fire(&self, duration: Duration) {
        loop {
            let notified = self.registered.notified();
            let gate = {
                let mut gates = self.gates.lock().unwrap();
                gates
                    .iter()
                    .position(|(wait, _)| *wait == duration)
                    .and_then(|index| gates.remove(index))
            };
            if let Some((_, send)) = gate {
                if send.send(()).is_ok() {
                    return;
                }
                continue;
            }
            notified.await;
        }
    }
}

pub(crate) struct Peer {
    pub(crate) socket: Arc<dyn Socket>,
    pub(crate) incoming: mpsc::UnboundedSender<Result<Incoming>>,
    pub(crate) closed: Arc<sync::Mutex<Vec<u16>>>,
    sent: Arc<sync::Mutex<VecDeque<HostToWorker>>>,
    available: Arc<Notify>,
}

impl Peer {
    pub(crate) fn new(closing: bool) -> Self {
        let (incoming, receive) = mpsc::unbounded_channel();
        let receive = Arc::new(Mutex::new(receive));
        let sent = Arc::new(sync::Mutex::new(VecDeque::new()));
        let available = Arc::new(Notify::new());
        let captured = sent.clone();
        let wake = available.clone();
        let send = SocketMock::send
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, message| {
                captured.lock().unwrap().push_back(message.clone());
                wake.notify_one();
                Ok(())
            }));
        let receive = SocketMock::receive
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let receive = receive.clone();
                Box::pin(async move {
                    receive
                        .lock()
                        .await
                        .recv()
                        .await
                        .unwrap_or(Ok(Incoming::Closed(None)))
                })
            }));
        let closed = Arc::new(sync::Mutex::new(Vec::new()));
        let captured = closed.clone();
        let socket: Arc<dyn Socket> = if closing {
            Arc::new(Unimock::new((
                send,
                receive,
                SocketMock::close
                    .some_call(matching!(_))
                    .answers_arc(Arc::new(move |_, code| {
                        captured.lock().unwrap().push(code);
                        Ok(())
                    })),
            )))
        } else {
            Arc::new(Unimock::new((send, receive)))
        };
        Self {
            socket,
            incoming,
            closed,
            sent,
            available,
        }
    }

    pub(crate) async fn next(&self) -> HostToWorker {
        loop {
            let notified = self.available.notified();
            let message = self.sent.lock().unwrap().pop_front();
            if let Some(message) = message {
                return message;
            }
            notified.await;
        }
    }
}
