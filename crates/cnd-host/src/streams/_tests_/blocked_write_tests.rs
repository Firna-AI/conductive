//! Local reads must reach the peer before a blocked local write completes.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::results::HostResult;
use tokio::sync::{Notify, watch};
use unimock::{MockFn, Unimock, matching};

use crate::ports::SocketMock;
use crate::streams::group::StreamGroups;
use crate::streams::ports::{LocalSocket, LocalSocketMock, NetworkMock, StreamFactory};
use crate::test_support::Time;

#[tokio::test(start_paused = true)]
async fn local_data_reaches_the_peer_while_a_local_write_is_pending() {
    let (started, observing) = watch::channel(false);
    let (sent, mut received) = watch::channel(false);
    let release = Arc::new(Notify::new());
    let released = release.clone();
    let ended = Arc::new(Notify::new());
    let finished = ended.clone();
    let events = Arc::new(Mutex::new(Vec::new()));
    let written = events.clone();
    let outgoing = events.clone();
    let read = Arc::new(AtomicBool::new(false));
    let local: Arc<dyn LocalSocket> = Arc::new(Unimock::new((
        LocalSocketMock::write
            .some_call(matching!((bytes) if *bytes == [1,2]))
            .answers_arc(Arc::new(move |_, _| {
                let started = started.clone();
                let released = released.clone();
                let written = written.clone();
                let finished = finished.clone();
                Box::pin(async move {
                    started.send_replace(true);
                    released.notified().await;
                    written.lock().unwrap().push("write_completed");
                    finished.notify_one();
                    Ok(())
                })
            })),
        LocalSocketMock::read
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let mut observing = observing.clone();
                let read = read.clone();
                Box::pin(async move {
                    observing.wait_for(|value| *value).await.unwrap();
                    if read.swap(true, Ordering::SeqCst) {
                        std::future::pending().await
                    } else {
                        Ok(vec![9, 8, 7])
                    }
                })
            })),
    )));
    let network = Arc::new(Unimock::new(
        NetworkMock::connect
            .some_call(matching!(HostStreamPort::PreviewRelay))
            .answers_arc(Arc::new(move |_, _| {
                let local = local.clone();
                Box::pin(async move { Ok(local) })
            })),
    ));
    let socket = Arc::new(Unimock::new((
        SocketMock::data.some_call(matching!((id, bytes) if *id == 5 && *bytes == [9,8,7])).answers_arc(Arc::new(move |_, _, _| { outgoing.lock().unwrap().push("peer_data"); sent.send_replace(true); Ok(()) })),
        SocketMock::send.some_call(matching!((message) if **message == HostToWorker::StreamCredit { stream_id:5, bytes:2 })).returns(Ok(())),
    )));
    let streams = StreamGroups {
        network,
        clock: Time::new().clock,
    }
    .create(socket);
    assert_eq!(
        streams.open(5, HostStreamPort::PreviewRelay).await.unwrap(),
        HostResult::StreamOpened { stream_id: 5 }
    );
    streams.data(5, vec![1, 2]).await.unwrap();
    streams.activate(5).await;
    let _ = tokio::time::timeout(Duration::from_secs(10), received.wait_for(|value| *value)).await;
    release.notify_one();
    ended.notified().await;
    received.wait_for(|value| *value).await.unwrap();
    streams.close_all().await;
    assert_eq!(*events.lock().unwrap(), ["peer_data", "write_completed"]);
}
