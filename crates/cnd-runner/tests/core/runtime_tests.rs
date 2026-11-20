//! Startup connects without a helper, and commands keep their wire order.

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use cnd_runner::error::{Error, Result};
use cnd_runner::helper::boundary::Startup;
use cnd_runner::helper::startup::RunnerStartup;
use cnd_runner::runtime::{CommandHandler, RunExit, Runner, RunnerCore};
use cnd_runner::update::NoUpdates;
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerControlCommand, RunnerInterrupt};
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use futures_util::future::BoxFuture;
use tokio::sync::{Notify, watch};

use crate::support::fixture::{FixedClock, Fixture};

struct StartupConnection {
    startup: Arc<dyn Startup>,
    credentials: PathBuf,
    stop: watch::Sender<bool>,
}

#[async_trait]
impl CommandHandler for StartupConnection {
    async fn start(&self) -> Result<()> {
        self.startup.prepare().await
    }

    fn connected(&self) -> BoxFuture<'static, Result<()>> {
        assert_eq!(fs::read_dir(&self.credentials).unwrap().count(), 0);
        self.stop.send_replace(true);
        Box::pin(async { Ok(()) })
    }

    fn command(&self, _: RunnerCommand) -> Result<()> {
        Err(Error::InvalidCommand)
    }

    async fn busy(&self) -> Result<bool> {
        Ok(false)
    }

    async fn shutdown(&self) -> Result<()> {
        Ok(())
    }
}

#[tokio::test]
async fn connects_without_opening_a_helper_during_startup() {
    let h = Fixture::new().await;
    let home = tempfile::tempdir().unwrap();
    let credentials = home.path().join(".conductive/anthropic/credentials");
    fs::create_dir_all(&credentials).unwrap();
    fs::write(credentials.join("old.json"), "stale secret").unwrap();
    let (stop, receiver) = watch::channel(false);
    let handler = Arc::new(StartupConnection {
        startup: Arc::new(RunnerStartup {
            home: home.path().to_owned(),
            executable: PathBuf::from("/unused"),
        }),
        credentials,
        stop,
    });
    let core = RunnerCore::new(
        h.link.clone(),
        h.store.clone(),
        Arc::new(FixedClock),
        handler,
        Arc::new(NoUpdates),
    );
    let result = core.run(receiver).await;
    assert_eq!(result.unwrap(), RunExit::Shutdown);
    assert!(matches!(
        h.endpoint.state.lock().await.received.as_slice(),
        [RunnerToWorkspace::RunnerHello(_)]
    ));
}

struct HeldReports {
    started: Notify,
    release: Arc<Notify>,
    commands: Mutex<Vec<String>>,
    stop: watch::Sender<bool>,
}

#[async_trait]
impl CommandHandler for HeldReports {
    async fn busy(&self) -> Result<bool> {
        Ok(false)
    }
    fn connected(&self) -> BoxFuture<'static, Result<()>> {
        self.started.notify_one();
        let release = self.release.clone();
        Box::pin(async move {
            release.notified().await;
            Ok(())
        })
    }

    fn command(&self, command: RunnerCommand) -> Result<()> {
        let RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerInterrupt(
            RunnerInterrupt::Interrupt { command_id, .. },
        )) = command
        else {
            panic!("expected interrupt");
        };
        let mut commands = self.commands.lock().unwrap();
        commands.push(command_id);
        if commands.len() == 2 {
            self.stop.send(true).unwrap();
        }
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.release.notify_one();
        Ok(())
    }
}

#[tokio::test]
async fn dispatches_commands_in_wire_order_while_initial_reports_wait() {
    let h = Fixture::new().await;
    let (stop, receiver) = watch::channel(false);
    let handler = Arc::new(HeldReports {
        started: Notify::new(),
        release: Arc::new(Notify::new()),
        commands: Mutex::new(vec![]),
        stop,
    });
    let core: Arc<dyn Runner> = Arc::new(RunnerCore::new(
        h.link.clone(),
        h.store.clone(),
        Arc::new(FixedClock),
        handler.clone(),
        Arc::new(NoUpdates),
    ));
    let running = tokio::spawn(async move { core.run(receiver).await });
    handler.started.notified().await;
    for id in ["first", "second"] {
        h.endpoint.raw(serde_json::to_vec(&serde_json::json!({"type":"interrupt","commandId":id,"sessionId":"s","turnId":"t"})).unwrap()).await;
    }
    running.await.unwrap().unwrap();
    assert_eq!(*handler.commands.lock().unwrap(), vec!["first", "second"]);
    assert_eq!(h.store.snapshot().await.confirmed_through, 0);
}
