//! Actual startup identity generation over controlled storage and transport.

use std::sync::Arc;
use std::sync::mpsc::{self, Sender};

use async_trait::async_trait;
use cnd_runner::clock::Clock;
use cnd_runner::config::ConnectionRequest;
use cnd_runner::disk::Disk;
use cnd_runner::error::{Error, ErrorResultExt, Result};
use cnd_runner::link::connection::SavedRunnerLink;
use cnd_runner::link::ports::RunnerLink;
use cnd_runner::socket::{Connector, Socket};
use cnd_runner::state::records::RunnerState;
use cnd_runner::state::store::{DurableStore, EventStore};
use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use unimock::{MockFn, Unimock, matching};
use uuid::{Uuid, Version};

use super::RunnerStart;

#[unimock::unimock(api = StartIoMock)]
#[async_trait]
trait StartIo: Send + Sync {
    async fn read(&self) -> Result<Option<Vec<u8>>>;
    async fn write(&self, bytes: &[u8]) -> Result<()>;
    async fn connect(&self, request: &ConnectionRequest) -> Result<Arc<dyn Socket>>;
    fn sent(&self, message: &RunnerToWorkspace) -> Result<()>;
}

struct Boundary(Unimock);

#[async_trait]
impl Disk for Boundary {
    async fn read(&self) -> Result<Option<Vec<u8>>> {
        StartIo::read(&self.0).await
    }
    async fn write(&self, bytes: &[u8]) -> Result<()> {
        StartIo::write(&self.0, bytes).await
    }
}

#[async_trait]
impl Connector for Boundary {
    async fn connect(&self, request: &ConnectionRequest) -> Result<Arc<dyn Socket>> {
        StartIo::connect(&self.0, request).await
    }
}

#[async_trait]
impl Socket for Boundary {
    async fn send(&self, message: &RunnerToWorkspace) -> Result<()> {
        StartIo::sent(&self.0, message)
    }
    async fn receive(&self) -> Result<Option<WorkspaceToRunner>> {
        Err(Error::Disconnected)
    }
    async fn close(&self) -> Result<()> {
        Ok(())
    }
}

struct FixedClock;

#[async_trait]
impl Clock for FixedClock {
    fn now(&self) -> Result<i64> {
        Ok(25)
    }
    async fn reconnect_delay(&self) {}
}

async fn link(start: &RunnerStart, sent: Sender<RunnerToWorkspace>) -> Result<SavedRunnerLink> {
    let saved = serde_json::to_vec(&RunnerState::new("saved-stream".into())).internal()?;
    let disk = Boundary(Unimock::new((
        StartIoMock::read
            .some_call(matching!())
            .returns(Ok(Some(saved))),
        StartIoMock::write
            .some_call(matching!(_))
            .answers(&|_, bytes| {
                assert!(!String::from_utf8_lossy(bytes).contains("processStartId"));
                Ok(())
            }),
    )));
    let store: Arc<dyn EventStore> = Arc::new(DurableStore::new(
        Arc::new(disk),
        "unused-new-stream".into(),
    ));
    store.load().await?;
    let socket: Arc<dyn Socket> = Arc::new(Boundary(Unimock::new(
        StartIoMock::sent
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, message| {
                sent.send(message.clone()).internal()
            })),
    )));
    let connector = Boundary(Unimock::new(
        StartIoMock::connect
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| Ok(socket.clone()))),
    ));
    Ok(start.link(
        "workspace".into(),
        ConnectionRequest {
            url: "wss://machines.test/v1/runner".into(),
            workspace_token: "private-token".into(),
        },
        Arc::new(connector),
        Arc::new(FixedClock),
        store,
    ))
}

#[tokio::test]
async fn startup_identity_survives_reconnect_and_link_reconstruction_but_not_a_new_start()
-> Result<()> {
    let (sent, received) = mpsc::channel();
    let start = RunnerStart::new(true);
    let first = link(&start, sent.clone()).await?;
    first.connect().await?;
    first.connect().await?;
    first.close().await?;
    let reconstructed = link(&start, sent.clone()).await?;
    reconstructed.connect().await?;
    reconstructed.close().await?;
    let next_start = RunnerStart::new(false);
    let next = link(&next_start, sent).await?;
    next.connect().await?;
    next.close().await?;
    let messages = received
        .try_iter()
        .map(serde_json::to_value)
        .collect::<std::result::Result<Vec<_>, _>>()
        .internal()?;
    assert_eq!(messages.len(), 4);
    assert_eq!(messages[0]["fileServer"], true);
    assert_eq!(messages[1]["fileServer"], true);
    assert_eq!(messages[2]["fileServer"], true);
    assert_eq!(messages[3].get("fileServer"), None);
    for message in messages.iter() {
        assert_eq!(message["type"], "hello");
        assert_eq!(message["streamId"], "saved-stream");
    }
    let identities: Vec<&str> = messages
        .iter()
        .map(|message| {
            message["processStartId"]
                .as_str()
                .ok_or(Error::InvalidWelcome)
        })
        .collect::<Result<_>>()?;
    for identity in &identities {
        let uuid = Uuid::parse_str(identity).internal()?;
        assert_eq!(uuid.get_version(), Some(Version::Random));
        assert_eq!(&uuid.to_string(), identity);
    }
    assert_eq!(identities[0], identities[1]);
    assert_eq!(identities[0], identities[2]);
    assert_ne!(identities[0], identities[3]);
    Ok(())
}
