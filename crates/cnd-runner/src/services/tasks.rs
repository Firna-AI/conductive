//! Independent connection work whose lifetime never enters ordinary busy counts.

use std::sync::Arc;

use cnd_runner_interface::services::control::{
    ServiceControlOutcome, ServiceControlResult, ServiceFailure,
};
use cnd_runner_interface::services::logs::{ServiceRawLogResponse, ServiceRawLogResult};
use cnd_runner_interface::services::transport::RunnerServiceCommand;
use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::clock::Clock;
use crate::link::ports::{RunnerLink, ServiceConnection};

use super::ports::ServiceEffects;
use super::sender::{ServiceDocument, ServiceSender};

#[derive(Default)]
pub(crate) struct ServiceTasks {
    jobs: JoinSet<()>,
    current: Option<Current>,
}

struct Current {
    source: Arc<dyn ServiceEffects>,
    sender: Arc<ServiceSender>,
    force: watch::Sender<bool>,
    connection: ServiceConnection,
}

impl ServiceTasks {
    pub(crate) fn connect(
        &mut self,
        source: Arc<dyn ServiceEffects>,
        link: Arc<dyn RunnerLink>,
        connection: ServiceConnection,
        clock: Arc<dyn Clock>,
    ) {
        let sender = Arc::new(ServiceSender::new(link, connection));
        let (force, refresh) = watch::channel(false);
        self.current = Some(Current {
            source: source.clone(),
            sender: sender.clone(),
            force,
            connection,
        });
        self.jobs.spawn(observe(source, sender, clock, refresh));
    }

    pub(crate) fn command(&mut self, connection: ServiceConnection, command: RunnerServiceCommand) {
        let Some(current) = &self.current else {
            return;
        };
        if current.connection != connection {
            return;
        }
        let source = current.source.clone();
        let sender = current.sender.clone();
        let force = current.force.clone();
        match command {
            RunnerServiceCommand::Report { .. } => {
                force.send_modify(|value| *value = !*value);
            }
            RunnerServiceCommand::Control { request } => {
                self.jobs.spawn(async move {
                    let result =
                        source
                            .control(request.clone())
                            .await
                            .unwrap_or(ServiceControlResult {
                                request,
                                outcome: ServiceControlOutcome::Unconfirmed,
                            });
                    let _ = send(&sender, ServiceDocument::Control(result)).await;
                    force.send_modify(|value| *value = !*value);
                });
            }
            RunnerServiceCommand::Logs { request } => {
                self.jobs.spawn(async move {
                    let result =
                        source
                            .logs(request.clone())
                            .await
                            .unwrap_or(ServiceRawLogResponse {
                                request,
                                result: ServiceRawLogResult::Failed {
                                    error: ServiceFailure {
                                        code: "service_log_failed".into(),
                                        message: "The service log could not load. Try again."
                                            .into(),
                                    },
                                },
                            });
                    let _ = send(&sender, ServiceDocument::Logs(result)).await;
                });
            }
        }
    }

    pub(crate) async fn finished(&mut self) {
        if !matches!(self.jobs.join_next().await, Some(Ok(()))) {
            tracing::warn!("The private service task could not finish.");
        }
    }

    pub(crate) fn pending(&self) -> bool {
        !self.jobs.is_empty()
    }

    pub(crate) async fn close(&mut self) {
        self.current = None;
        self.jobs.shutdown().await;
    }
}

async fn send(sender: &ServiceSender, document: ServiceDocument) -> bool {
    match sender.send(document).await {
        Ok(sent) => sent,
        Err(_) => {
            tracing::warn!("The private service reply could not be sent.");
            false
        }
    }
}

async fn observe(
    source: Arc<dyn ServiceEffects>,
    sender: Arc<ServiceSender>,
    clock: Arc<dyn Clock>,
    mut refresh: watch::Receiver<bool>,
) {
    let mut fresh = true;
    let mut forced = true;
    let mut last = None;
    loop {
        match source.snapshot(fresh).await {
            Ok(report) => {
                fresh = false;
                let revision = (report.boot_id.clone(), report.revision);
                if forced || last.as_ref() != Some(&revision) {
                    if !send(&sender, ServiceDocument::Report(report)).await {
                        return;
                    }
                    last = Some(revision);
                }
            }
            Err(_) => tracing::warn!("The service snapshot could not be read."),
        }
        forced = false;
        tokio::select! {
            changed = refresh.changed() => { if changed.is_err() { return; } forced = true; },
            _ = clock.service_delay() => {},
        }
    }
}
