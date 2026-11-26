//! A repository move ends the round only for a known work tree and only after the turns end.

use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner::clock::Clock;
use cnd_runner::config::{Configuration, ConnectionRequest};
use cnd_runner::error::Result;
use cnd_runner::link::connection::SavedRunnerLink;
use cnd_runner::relocation::{RepositoryFolders, RepositoryTarget};
use cnd_runner::repository::io::LocalRepositoryIo;
use cnd_runner::runtime::{CommandHandler, RunExit, Runner, RunnerCore};
use cnd_runner::update::NoUpdates;
use cnd_runner_interface::runner_commands::RunnerCommand;
use cnd_runner_interface::runner_handshake::{RunnerHello, RunnerToWorkspace};
use futures_util::future::BoxFuture;
use serde_json::json;
use tokio::sync::{Notify, watch};

use crate::relocation_services::HeldServices;
use crate::support::fixture::Fixture;
use crate::support::workspace::{EndpointConnector, request};

struct MoveClock;
#[async_trait]
impl Clock for MoveClock {
    fn now(&self) -> Result<i64> {
        Ok(100)
    }
    async fn reconnect_delay(&self) {
        tokio::task::yield_now().await;
    }
    async fn move_delay(&self) {
        tokio::task::yield_now().await;
    }
}

#[derive(Default)]
struct Turns {
    working: AtomicBool,
    connected: Notify,
    checked: Notify,
    ended: AtomicBool,
}

#[async_trait]
impl CommandHandler for Turns {
    async fn busy(&self) -> Result<bool> {
        Ok(true)
    }
    async fn working(&self) -> Result<bool> {
        self.checked.notify_one();
        Ok(self.working.load(Ordering::SeqCst))
    }
    fn connected(&self) -> BoxFuture<'static, Result<()>> {
        self.connected.notify_one();
        Box::pin(async { Ok(()) })
    }
    fn command(&self, _: RunnerCommand) -> Result<()> {
        Ok(())
    }
    async fn shutdown(&self) -> Result<()> {
        self.ended.store(true, Ordering::SeqCst);
        Ok(())
    }
}

struct Harness {
    fixture: Fixture,
    turns: Arc<Turns>,
    stop: watch::Sender<bool>,
    running: tokio::task::JoinHandle<Result<RunExit>>,
    services: Arc<HeldServices>,
    _folders: tempfile::TempDir,
}

async fn start(root: tempfile::TempDir) -> Harness {
    let current = root.path().join("storefront");
    let billing = root.path().join("billing");
    let configuration = Configuration {
        workspace_id: "workspace".into(),
        request: ConnectionRequest {
            url: request().url,
            workspace_token: request().workspace_token,
        },
        cwd: current.clone(),
        home: root.path().into(),
        default_branch: "main".into(),
        workspace_branch: Some("alice/cart-v1-ab12".into()),
        skills_repository: None,
        trusted_skills_repository: None,
        repository_directories: BTreeMap::from([
            ("CONDUCTIVE_REPOSITORY_BILLING_DIR".into(), billing.clone()),
            (
                "CONDUCTIVE_REPOSITORY_EMPTY_DIR".into(),
                root.path().join("empty"),
            ),
            (
                "CONDUCTIVE_REPOSITORY_STOREFRONT_DIR".into(),
                current.clone(),
            ),
        ]),
        workspace_context: None,
        state_path: root.path().join("state.json"),
    };
    std::fs::create_dir_all(billing.join(".git")).unwrap();
    std::fs::create_dir_all(root.path().join("empty")).unwrap();
    let fixture = Fixture::new().await;
    fixture.endpoint.state.lock().await.services = Some(true);
    let link = Arc::new(
        SavedRunnerLink::new(
            "workspace".into(),
            "abcdef01-2345-4678-89ab-cdef01234567".into(),
            request(),
            Arc::new(EndpointConnector(fixture.endpoint.clone())),
            Arc::new(MoveClock),
            fixture.store.clone(),
            false,
        )
        .with_repository_folder(&current)
        .with_services(),
    );
    let turns = Arc::new(Turns::default());
    let services = Arc::new(HeldServices::default());
    let core = RunnerCore::new(
        link,
        fixture.store.clone(),
        Arc::new(MoveClock),
        turns.clone(),
        Arc::new(NoUpdates),
    )
    .with_services(services.clone())
    .with_folders(RepositoryFolders::new(
        &configuration,
        Arc::new(LocalRepositoryIo),
    ));
    let (stop, shutdown) = watch::channel(false);
    let running = tokio::spawn(async move { core.run(shutdown).await });
    turns.connected.notified().await;
    Harness {
        fixture,
        turns,
        stop,
        running,
        services,
        _folders: root,
    }
}

async fn send_move(h: &Harness, id: &str, folder: &Path) {
    let command = json!({"type":"repository.move","commandId":id,"folder":folder,
        "branches":{"workspaceBranch":"alice/cart-v2-cd34","targetBranch":"trunk"}});
    h.fixture
        .endpoint
        .raw(serde_json::to_vec(&command).unwrap())
        .await;
}

fn replies(received: &[RunnerToWorkspace]) -> Vec<serde_json::Value> {
    received
        .iter()
        .filter(|message| matches!(message, RunnerToWorkspace::RunnerRepositoryMoveRefused(_)))
        .map(|message| serde_json::to_value(message).unwrap())
        .collect()
}

#[tokio::test]
async fn names_its_folder_in_hello_and_moves_after_the_turns_end() {
    let root = tempfile::tempdir().unwrap();
    let billing = root.path().join("billing");
    let current = root.path().join("storefront");
    let h = start(root).await;
    let hello = h.fixture.endpoint.state.lock().await.received[0].clone();
    let RunnerToWorkspace::RunnerHello(RunnerHello::Hello {
        repository_folder,
        adds_repository_folder,
        ..
    }) = hello
    else {
        panic!("expected hello");
    };
    assert_eq!(repository_folder, Some(current.to_string_lossy().into()));
    assert_eq!(adds_repository_folder, Some(true));
    h.fixture.endpoint.raw(serde_json::to_vec(&json!({"type":"services.logs","request":{"requestId":"held","target":{"bootId":"boot","serviceId":"web","generation":"run"}}})).unwrap()).await;
    h.services.entered.notified().await;
    h.turns.working.store(true, Ordering::SeqCst);
    send_move(&h, "move", &billing).await;
    for _ in 0..3 {
        h.turns.checked.notified().await;
    }
    assert!(!h.running.is_finished());
    h.turns.working.store(false, Ordering::SeqCst);
    let exit = h.running.await.unwrap().unwrap();
    assert_eq!(
        exit,
        RunExit::Relocate(RepositoryTarget {
            folder: billing,
            default_branch: "trunk".into(),
            workspace_branch: "alice/cart-v2-cd34".into(),
            variable: None,
        })
    );
    assert!(h.turns.ended.load(Ordering::SeqCst));
    assert!(h.services.canceled.load(Ordering::SeqCst));
    assert!(replies(&h.fixture.endpoint.state.lock().await.received).is_empty());
}

#[tokio::test]
async fn refuses_unknown_folders_and_folders_without_a_work_tree_and_keeps_its_folder() {
    let root = tempfile::tempdir().unwrap();
    let other = root.path().join("other");
    let empty = root.path().join("empty");
    let current = root.path().join("storefront");
    let h = start(root).await;
    send_move(&h, "current", &current).await;
    send_move(&h, "unknown", &other).await;
    send_move(&h, "empty", &empty).await;
    loop {
        if replies(&h.fixture.endpoint.state.lock().await.received).len() == 2 {
            break;
        }
        tokio::task::yield_now().await;
    }
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Shutdown);
    assert_eq!(
        replies(&h.fixture.endpoint.state.lock().await.received),
        vec![
            json!({"type":"repository.move.refused","commandId":"unknown","reason":"unknown_folder"}),
            json!({"type":"repository.move.refused","commandId":"empty","reason":"not_repository"}),
        ]
    );
}
