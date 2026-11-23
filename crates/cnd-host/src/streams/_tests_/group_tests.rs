//! Stream capacity, receive windows, sender credit, handoff, and half closes.

#![expect(
    clippy::unwrap_used,
    reason = "In-memory fixture failures must stop the test."
)]

use std::sync::{Arc, Mutex};
use std::time::Duration;

use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::error::Error;
use crate::ports::{Socket, SocketMock};
use crate::streams::group::StreamGroups;
use crate::streams::ports::{LocalSocket, LocalSocketMock, NetworkMock, StreamFactory};
use crate::test_support::Time;

#[tokio::test]
async fn streams_refuse_capacity_and_close_unknown_or_over_window_data() {
    let time = Time::new();
    let messages = Arc::new(Mutex::new(Vec::new()));
    let captured = messages.clone();
    let socket: Arc<dyn Socket> = Arc::new(Unimock::new(
        SocketMock::send
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, message| {
                captured.lock().unwrap().push(message.clone());
                Ok(())
            })),
    ));
    let local: Arc<dyn LocalSocket> = Arc::new(Unimock::new(()));
    let network = Arc::new(Unimock::new(
        NetworkMock::connect
            .each_call(matching!(HostStreamPort::Terminal))
            .answers_arc(Arc::new(move |_, _| {
                let local = local.clone();
                Box::pin(async move { Ok(local) })
            })),
    ));
    let streams = StreamGroups {
        network,
        clock: time.clock,
    }
    .create(socket);
    for stream_id in 0..64 {
        assert_eq!(
            streams
                .open(stream_id, HostStreamPort::Terminal)
                .await
                .unwrap(),
            HostResult::StreamOpened { stream_id }
        );
    }
    assert_eq!(
        streams.open(64, HostStreamPort::Terminal).await.unwrap(),
        HostResult::Error {
            code: HostErrorCode::Busy
        }
    );
    for _ in 0..4 {
        streams.data(1, vec![1; 65_536]).await.unwrap();
    }
    streams.data(1, vec![1]).await.unwrap();
    assert_eq!(
        streams.open(64, HostStreamPort::Terminal).await.unwrap(),
        HostResult::StreamOpened { stream_id: 64 }
    );
    streams.data(999, vec![1]).await.unwrap();
    assert_eq!(
        *messages.lock().unwrap(),
        [
            HostToWorker::StreamClose { stream_id: 1 },
            HostToWorker::StreamClose { stream_id: 999 }
        ]
    );
    streams.close_all().await;
}

#[tokio::test]
async fn refused_ports_and_ten_second_connect_deadlines_return_port_unavailable() {
    for delayed in [false, true] {
        let time = Time::new();
        let network = Arc::new(Unimock::new(
            NetworkMock::connect
                .some_call(matching!(HostStreamPort::PreviewRelay))
                .answers_arc(Arc::new(move |_, _| {
                    Box::pin(async move {
                        if delayed {
                            std::future::pending::<()>().await;
                        }
                        Err(Error::Unavailable)
                    })
                })),
        ));
        let socket: Arc<dyn Socket> = Arc::new(Unimock::new(()));
        let streams = StreamGroups {
            network,
            clock: time.clock.clone(),
        }
        .create(socket);
        let opening = streams.clone();
        let open = tokio::spawn(async move { opening.open(1, HostStreamPort::PreviewRelay).await });
        if delayed {
            time.fire(Duration::from_secs(10)).await;
        }
        assert_eq!(
            open.await.unwrap().unwrap(),
            HostResult::Error {
                code: HostErrorCode::PortUnavailable
            }
        );
        streams.close_all().await;
    }
}

#[tokio::test]
async fn credit_pauses_local_reads_and_handoff_precedes_credit_and_half_close() {
    let time = Time::new();
    let reads = Arc::new(Mutex::new(Vec::new()));
    let captured = reads.clone();
    let sent = Arc::new(Mutex::new(0));
    let sent_count = sent.clone();
    let window = Arc::new(Notify::new());
    let window_ready = window.clone();
    let returned = Arc::new(Notify::new());
    let credit_returned = returned.clone();
    let ended = Arc::new(Notify::new());
    let write_ended = ended.clone();
    let eof = Arc::new(Notify::new());
    let sent_eof = eof.clone();
    let effects = Arc::new(Unimock::new((
        LocalSocketMock::read.each_call(matching!(_)).answers_arc(Arc::new(move |_, maximum| {
            let captured = captured.clone();
            Box::pin(async move {
            let mut reads = captured.lock().unwrap(); reads.push(maximum);
            Ok(if reads.len() <= 4 { vec![7; maximum] } else { Vec::new() })
            })
        })),
        SocketMock::data.each_call(matching!(1, _)).answers_arc(Arc::new(move |_, _, _| {
            let mut count = sent_count.lock().unwrap(); *count += 1; if *count == 4 { window_ready.notify_one(); } Ok(())
        })),
        LocalSocketMock::write.next_call(matching!((bytes) if *bytes == [1, 2])).answers(&|_, _| Box::pin(async { Ok(()) })),
        SocketMock::send.next_call(matching!((message) if matches!(message, HostToWorker::StreamCredit { stream_id: 1, bytes: 2 }))).answers_arc(Arc::new(move |_, _| { credit_returned.notify_one(); Ok(()) })),
        LocalSocketMock::end.next_call(matching!()).answers_arc(Arc::new(move |_| { write_ended.notify_one(); Ok(()) })),
        SocketMock::send.next_call(matching!((message) if matches!(message, HostToWorker::StreamEnd { stream_id: 1 }))).answers_arc(Arc::new(move |_, _| { sent_eof.notify_one(); Ok(()) })),
    )));
    let local: Arc<dyn LocalSocket> = effects.clone();
    let network = Arc::new(Unimock::new(
        NetworkMock::connect
            .some_call(matching!(HostStreamPort::Terminal))
            .answers_arc(Arc::new(move |_, _| {
                let local = local.clone();
                Box::pin(async move { Ok(local) })
            })),
    ));
    let streams = StreamGroups {
        network,
        clock: time.clock,
    }
    .create(effects);
    assert_eq!(
        streams.open(1, HostStreamPort::Terminal).await.unwrap(),
        HostResult::StreamOpened { stream_id: 1 }
    );
    streams.activate(1).await;
    window.notified().await;
    assert_eq!(*reads.lock().unwrap(), [65_536; 4]);
    assert_eq!(*sent.lock().unwrap(), 4);
    streams.data(1, vec![1, 2]).await.unwrap();
    returned.notified().await;
    streams.end(1).await.unwrap();
    ended.notified().await;
    streams.credit(1, 3).await.unwrap();
    eof.notified().await;
    assert_eq!(*reads.lock().unwrap(), [65_536, 65_536, 65_536, 65_536, 3]);
    streams.close_all().await;
}
