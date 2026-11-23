//! Mocked connection input, release readiness, activity, and shutdown observations.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerControlCommand, RunnerInterrupt};
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::services::transport::RunnerServiceMessage;
use futures_util::future::BoxFuture;
use tokio::sync::{self, Notify, mpsc, watch};
use unimock::{MockFn, Unimock, matching};

use crate::clock::ClockMock;
use crate::error::Result;
use crate::link::ports::{LinkUpdate, RunnerLink, RunnerLinkMock, ServiceConnection};
use crate::runtime::{CommandHandlerMock, RunExit, Runner, RunnerCore};
use crate::services::ports::ServiceEffects;
use crate::state::store::EventStoreMock;
use crate::update::{ReleaseReadinessMock, ReleaseStatus};

#[unimock::unimock(api = StepsMock)]
trait Steps: Send + Sync {
    fn next(&self) -> BoxFuture<'static, Result<LinkUpdate>>;
}

struct Link {
    effects: Unimock,
    output: mpsc::UnboundedSender<RunnerServiceMessage>,
}

#[async_trait]
impl RunnerLink for Link {
    async fn connect(&self) -> Result<()> {
        RunnerLink::connect(&self.effects).await
    }
    async fn step(&self) -> Result<LinkUpdate> {
        Steps::next(&self.effects).await
    }
    async fn emit(&self, event: RunnerEvent, id: Option<String>) -> Result<()> {
        RunnerLink::emit(&self.effects, event, id).await
    }
    async fn persist(&self) -> Result<()> {
        RunnerLink::persist(&self.effects).await
    }
    async fn reply(&self, response: RunnerToWorkspace) -> Result<()> {
        RunnerLink::reply(&self.effects, response).await
    }
    async fn close(&self) -> Result<()> {
        RunnerLink::close(&self.effects).await
    }
    async fn service_connection(&self) -> Option<ServiceConnection> {
        Some(ServiceConnection { generation: 1 })
    }
    async fn service_reply(
        &self,
        connection: ServiceConnection,
        message: RunnerServiceMessage,
    ) -> Result<bool> {
        assert_eq!(connection, ServiceConnection { generation: 1 });
        let _ = self.output.send(message);
        Ok(true)
    }
}

pub(super) struct Fixture {
    pub(super) running: tokio::task::JoinHandle<Result<RunExit>>,
    pub(super) stop: watch::Sender<bool>,
    pub(super) input: mpsc::UnboundedSender<LinkUpdate>,
    pub(super) busy: Arc<AtomicBool>,
    pub(super) commands: Arc<Notify>,
    pub(super) order: Arc<Mutex<Vec<&'static str>>>,
    checked: Arc<Notify>,
    pub(super) services: mpsc::UnboundedReceiver<RunnerServiceMessage>,
}

impl Fixture {
    pub(super) async fn new(release: ReleaseStatus) -> Self {
        Self::configured(release, None).await
    }

    pub(super) async fn configured(
        release: ReleaseStatus,
        services: Option<Arc<dyn ServiceEffects>>,
    ) -> Self {
        let checked = Arc::new(Notify::new());
        let check = checked.clone();
        let busy = Arc::new(AtomicBool::new(false));
        let activity = busy.clone();
        let order = Arc::new(Mutex::new(vec![]));
        let closed = order.clone();
        let ended = order.clone();
        let persisted = order.clone();
        let commands = Arc::new(Notify::new());
        let command = commands.clone();
        let (input, received) = mpsc::unbounded_channel();
        let (output, private) = mpsc::unbounded_channel();
        let received = Arc::new(sync::Mutex::new(received));
        let (stop, shutdown) = watch::channel(false);
        let effects = Unimock::new((
            ClockMock::now.some_call(matching!()).returns(Ok(0)),
            EventStoreMock::recover
                .some_call(matching!(_))
                .returns(Ok(())),
            CommandHandlerMock::start
                .some_call(matching!())
                .returns(Ok(())),
            CommandHandlerMock::connected
                .some_call(matching!())
                .answers(&|_| Box::pin(async { Ok(()) })),
            CommandHandlerMock::busy
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| Ok(activity.load(Ordering::SeqCst)))),
            CommandHandlerMock::command
                .each_call(matching!(_))
                .answers_arc(Arc::new(move |_, _| {
                    command.notify_one();
                    Ok(())
                })),
            CommandHandlerMock::shutdown
                .some_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    ended.lock().unwrap().push("shutdown");
                    Ok(())
                })),
            RunnerLinkMock::connect
                .some_call(matching!())
                .returns(Ok(())),
            StepsMock::next
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    let received = received.clone();
                    Box::pin(async move { Ok(received.lock().await.recv().await.unwrap()) })
                })),
            ReleaseReadinessMock::status
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    check.notify_one();
                    Ok(release)
                })),
            RunnerLinkMock::close
                .each_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    closed.lock().unwrap().push("close");
                    Ok(())
                })),
            RunnerLinkMock::persist
                .some_call(matching!())
                .answers_arc(Arc::new(move |_| {
                    persisted.lock().unwrap().push("persist");
                    Ok(())
                })),
        ));
        let mut core = RunnerCore::new(
            Arc::new(Link {
                effects: effects.clone(),
                output,
            }),
            Arc::new(effects.clone()),
            Arc::new(effects.clone()),
            Arc::new(effects.clone()),
            Arc::new(effects),
        );
        if let Some(services) = services {
            core = core.with_services(services);
        }
        input.send(LinkUpdate::Connected).unwrap();
        input
            .send(LinkUpdate::Command(Box::new(
                RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerInterrupt(
                    RunnerInterrupt::Interrupt {
                        command_id: "probe".into(),
                        session_id: "session".into(),
                        turn_id: "turn".into(),
                    },
                )),
            )))
            .unwrap();
        let running = tokio::spawn(async move { core.run(shutdown).await });
        commands.notified().await;
        Self {
            running,
            stop,
            input,
            busy,
            commands,
            order,
            checked,
            services: private,
        }
    }

    pub(super) async fn tick(&self) {
        tokio::time::advance(Duration::from_secs(60)).await;
        self.checked.notified().await;
    }
}

pub(super) fn ready() -> ReleaseStatus {
    ReleaseStatus {
        newer_available: true,
        confirmed: true,
    }
}
