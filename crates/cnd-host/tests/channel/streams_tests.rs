//! Native local TCP half closes and socket-drop cleanup through a real host peer.

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use cnd_host::commands::native::NativeCommands;
use cnd_host::dispatch::Dispatcher;
use cnd_host::files::NativeFiles;
use cnd_host::streams::local::TcpLocal;
use cnd_host::streams::ports::{Connection, LocalSocket, Network};
use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::HostResult;
use futures_util::SinkExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;
use tokio_tungstenite::tungstenite::Message;

use super::support::{self, TestResult};

struct SelectedNetwork {
    address: SocketAddr,
    ports: Arc<Mutex<Vec<HostStreamPort>>>,
}

impl Network for SelectedNetwork {
    fn connect(&self, port: HostStreamPort) -> Connection<'_> {
        Box::pin(async move {
            self.ports
                .lock()
                .map_err(|_| cnd_host::error::Error::Unavailable)?
                .push(port);
            let stream = TcpStream::connect(self.address)
                .await
                .map_err(|_| cnd_host::error::Error::Unavailable)?;
            let socket: Arc<dyn LocalSocket> = Arc::new(TcpLocal::new(stream));
            Ok(socket)
        })
    }
}

#[tokio::test]
async fn streams_half_close_one_direction_and_a_drop_closes_every_local_socket() -> TestResult {
    let folder = tempfile::tempdir()?;
    let listener = Arc::new(TcpListener::bind("127.0.0.1:0").await?);
    let ports = Arc::new(Mutex::new(Vec::new()));
    let network = Arc::new(SelectedNetwork {
        address: listener.local_addr()?,
        ports: ports.clone(),
    });
    let operations = Arc::new(Dispatcher {
        commands: Arc::new(NativeCommands::new(
            folder.path().join("commands"),
            folder.path().into(),
        )),
        files: Arc::new(NativeFiles),
    });
    let session = support::session(operations, network);
    let (socket, mut peer) = support::sockets().await?;
    let (_stop, shutdown) = watch::channel(false);
    let run = tokio::spawn(async move { session.serve(socket, "test", shutdown).await });
    assert_eq!(
        support::message(&mut peer).await?,
        HostToWorker::Hello {
            host_protocol_version: 1,
            program_version: "test".into()
        }
    );
    support::welcome(&mut peer).await?;
    let server = listener.clone();
    let echo = tokio::spawn(async move {
        let (mut socket, _) = server.accept().await?;
        let mut bytes = Vec::new();
        socket.read_to_end(&mut bytes).await?;
        socket.write_all(b"response").await?;
        socket.shutdown().await?;
        Ok::<_, std::io::Error>(bytes)
    });
    assert_eq!(
        support::request(
            &mut peer,
            1,
            HostOperation::StreamOpen {
                stream_id: 9,
                port: HostStreamPort::Terminal
            }
        )
        .await?,
        HostResult::StreamOpened { stream_id: 9 }
    );
    peer.send(Message::Binary(
        frames::encode(&HostFrame::StreamData {
            stream_id: 9,
            data: b"request".to_vec(),
        })?
        .into(),
    ))
    .await?;
    support::send(&mut peer, WorkerToHost::StreamEnd { stream_id: 9 }).await?;
    assert_eq!(
        support::message(&mut peer).await?,
        HostToWorker::StreamCredit {
            stream_id: 9,
            bytes: 7
        }
    );
    let frame = support::next(&mut peer).await?;
    assert!(matches!(frame, Message::Binary(_)));
    let Message::Binary(bytes) = frame else {
        return Err("expected stream data".into());
    };
    assert_eq!(
        frames::decode(&bytes)?,
        HostFrame::StreamData {
            stream_id: 9,
            data: b"response".to_vec()
        }
    );
    assert_eq!(
        support::message(&mut peer).await?,
        HostToWorker::StreamEnd { stream_id: 9 }
    );
    assert_eq!(echo.await??, b"request");
    let server = listener.clone();
    let dropped = tokio::spawn(async move {
        let (mut socket, _) = server.accept().await?;
        let mut bytes = Vec::new();
        socket.read_to_end(&mut bytes).await?;
        Ok::<_, std::io::Error>(bytes)
    });
    assert_eq!(
        support::request(
            &mut peer,
            2,
            HostOperation::StreamOpen {
                stream_id: 10,
                port: HostStreamPort::PreviewRelay
            }
        )
        .await?,
        HostResult::StreamOpened { stream_id: 10 }
    );
    peer.close(None).await?;
    assert!(run.await?.welcomed);
    assert_eq!(dropped.await??, b"");
    assert_eq!(
        *ports.lock().map_err(|_| "port capture poisoned")?,
        [HostStreamPort::Terminal, HostStreamPort::PreviewRelay]
    );
    Ok(())
}
