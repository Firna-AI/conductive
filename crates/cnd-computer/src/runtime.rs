//! Read settings before each attempt and reconnect until shutdown.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_host::clock::Retry;
use cnd_runner_interface::computer::limits::COMPUTER_CLOSE_UNSUPPORTED_VERSION;
use tokio::sync::watch;

use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::operations::RequestContext;
use crate::resources::Resources;
use crate::session::serve::{Session, SessionExit};
use crate::settings::{Settings, SettingsStore};
use crate::socket::Connector;
use crate::timer::Timer;

const ATTEMPT: Duration = Duration::from_secs(60);
const MAX_RETRY: Duration = Duration::from_secs(30);

/// Long-lived computer service until the caller requests shutdown.
#[async_trait]
pub trait Computer: Send + Sync {
    /// Open successive sessions with current credentials and resources.
    async fn run(&self, shutdown: watch::Receiver<bool>) -> Result<()>;
}

/// Computer service with replaceable connection and host effects.
pub struct ComputerRuntime {
    /// Computer settings reloaded for every attempt.
    pub settings: Arc<dyn SettingsStore>,
    /// Resource report for each new session.
    pub resources: Arc<dyn Resources>,
    /// Factory for authenticated WebSockets.
    pub connector: Arc<dyn Connector>,
    /// One established computer connection.
    pub session: Arc<dyn Session>,
    /// Timers and reconnect jitter.
    pub timer: Arc<dyn Timer>,
    /// Credential-free diagnostic events.
    pub diagnostics: Arc<dyn Diagnostics>,
    /// Embedded release version of the program.
    pub version: String,
}

#[async_trait]
impl Computer for ComputerRuntime {
    async fn run(&self, mut shutdown: watch::Receiver<bool>) -> Result<()> {
        let mut retry = Retry::default();
        let mut missing = false;
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            let settings = tokio::select! {
                biased;
                _ = shutdown.changed() => break,
                settings = self.settings.read() => settings,
            };
            let Ok(Some(settings)) = settings else {
                if !missing {
                    self.diagnostics.settings_missing();
                    missing = true;
                }
                if !self.wait(Duration::from_secs(5), &mut shutdown).await {
                    break;
                }
                continue;
            };
            if missing {
                self.diagnostics.settings_restored();
                missing = false;
            }
            let attempt = self.attempt(settings, &mut shutdown).await;
            if *shutdown.borrow() || shutdown.has_changed().is_err() {
                break;
            }
            let delay = self.delay(attempt, &mut retry);
            if !self.wait(delay, &mut shutdown).await {
                break;
            }
        }
        Ok(())
    }
}

enum Attempt {
    Ended(SessionExit),
    Unauthorized,
    Failed,
    Shutdown,
}

impl ComputerRuntime {
    async fn attempt(&self, settings: Settings, shutdown: &mut watch::Receiver<bool>) -> Attempt {
        let mut deadline = self.timer.wait(ATTEMPT);
        let prepared = tokio::select! {
            biased;
            _ = shutdown.changed() => return Attempt::Shutdown,
            _ = &mut deadline => Err(Error::ConnectionUnavailable),
            result = async {
                let resources = self.resources.read().await;
                let Ok(resources) = resources else {
                    self.diagnostics.resources_unavailable();
                    return Err(Error::ResourcesUnavailable);
                };
                Ok((resources, self.connector.connect(&settings).await?))
            } => result,
        };
        match prepared {
            Ok((resources, socket)) => Attempt::Ended(
                self.session
                    .serve(
                        socket,
                        &self.version,
                        RequestContext {
                            resources,
                            release_server: settings.release_server,
                        },
                        deadline,
                        shutdown.clone(),
                    )
                    .await,
            ),
            Err(Error::UpgradeRefused { status: 401 }) => {
                self.diagnostics.new_code_needed();
                Attempt::Unauthorized
            }
            Err(Error::UpgradeRefused { status }) => {
                self.diagnostics.attempt_failed(Some(status));
                Attempt::Failed
            }
            Err(Error::ResourcesUnavailable) => Attempt::Failed,
            Err(_) => {
                self.diagnostics.attempt_failed(None);
                Attempt::Failed
            }
        }
    }

    fn delay(&self, attempt: Attempt, retry: &mut Retry) -> Duration {
        if matches!(attempt, Attempt::Ended(SessionExit { welcomed: true, .. })) {
            retry.reset();
        }
        match attempt {
            Attempt::Ended(SessionExit {
                close_code: Some(COMPUTER_CLOSE_UNSUPPORTED_VERSION),
                ..
            }) => {
                return Duration::from_secs(60);
            }
            Attempt::Unauthorized => return Duration::from_secs(5 * 60),
            _ => {}
        }
        let base = retry.next_delay();
        (base + self.timer.jitter(base).min(base / 5)).min(MAX_RETRY)
    }

    async fn wait(&self, duration: Duration, shutdown: &mut watch::Receiver<bool>) -> bool {
        tokio::select! {
            biased;
            _ = shutdown.changed() => false,
            _ = self.timer.wait(duration) => true,
        }
    }
}

#[cfg(test)]
#[path = "_tests_/runtime_tests.rs"]
mod tests;
