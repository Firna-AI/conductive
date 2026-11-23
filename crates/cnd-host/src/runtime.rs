//! Continuous configuration reads, connection attempts, and capped reconnects.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::host::limits::HOST_CLOSE_UNSUPPORTED_VERSION;
use tokio::sync::watch;

use crate::clock::Retry;
use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::ports::{Clock, Configuration, Connector};
use crate::session::ports::{Session, SessionExit};

/// Long-lived host program. Connection failures never terminate it.
#[async_trait]
pub trait Host: Send + Sync {
    /// Reconnect until the service receives shutdown.
    async fn run(&self, shutdown: watch::Receiver<bool>) -> Result<()>;
}

/// Runtime composed with replaceable effects.
pub struct HostRuntime {
    /// Saved credentials, reread before every attempt.
    pub configuration: Arc<dyn Configuration>,
    /// TLS socket factory.
    pub connector: Arc<dyn Connector>,
    /// One-connection coordinator.
    pub session: Arc<dyn Session>,
    /// Wait and jitter boundary.
    pub clock: Arc<dyn Clock>,
    /// Credential-free diagnostic events.
    pub diagnostics: Arc<dyn Diagnostics>,
    /// Installed Conductive release version.
    pub program_version: String,
}

#[async_trait]
impl Host for HostRuntime {
    async fn run(&self, mut shutdown: watch::Receiver<bool>) -> Result<()> {
        let mut retry = Retry::default();
        let mut settings_missing = false;
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            let settings = tokio::select! { _ = shutdown.changed() => break, settings = self.configuration.read() => settings };
            let request = match settings {
                Ok(Some(request)) => {
                    if settings_missing {
                        self.diagnostics.settings_restored();
                        settings_missing = false;
                    }
                    request
                }
                _ => {
                    if !settings_missing {
                        self.diagnostics.settings_missing();
                        settings_missing = true;
                    }
                    if !self.pause(Duration::from_secs(1), &mut shutdown).await {
                        break;
                    }
                    continue;
                }
            };
            let connected = tokio::select! {
                biased;
                _ = shutdown.changed() => break,
                connected = self.connector.connect(&request) => connected,
                _ = self.clock.wait(Duration::from_secs(60)) => Err(Error::Unavailable),
            };
            let exit = match connected {
                Ok(socket) => {
                    self.session
                        .serve(socket, &self.program_version, shutdown.clone())
                        .await
                }
                Err(error) => {
                    match error {
                        Error::UpgradeRefused { status } => {
                            self.diagnostics.attempt_failed(Some(status));
                        }
                        Error::TlsRequired => {
                            self.diagnostics.tls_required();
                        }
                        _ => self.diagnostics.attempt_failed(None),
                    }
                    SessionExit::default()
                }
            };
            if *shutdown.borrow() || shutdown.has_changed().is_err() {
                break;
            }
            if exit.welcomed {
                retry.reset();
            }
            let delay = if exit.close_code == Some(HOST_CLOSE_UNSUPPORTED_VERSION) {
                Duration::from_secs(60)
            } else {
                let base = retry.next_delay();
                base + self.clock.jitter(base).min(base / 5)
            };
            if !self.pause(delay, &mut shutdown).await {
                break;
            }
        }
        Ok(())
    }
}

impl HostRuntime {
    async fn pause(&self, duration: Duration, shutdown: &mut watch::Receiver<bool>) -> bool {
        tokio::select! { _ = shutdown.changed() => false, _ = self.clock.wait(duration) => true }
    }
}

#[cfg(test)]
#[path = "_tests_/runtime/mod.rs"]
mod tests;
