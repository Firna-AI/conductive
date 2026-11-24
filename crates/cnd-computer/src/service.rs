//! Install and start the embedded systemd user service.

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;

use crate::disk::atomic_write;
use crate::error::{Error, Result};
use crate::process::{Invocation, Process};

/// Service unit installed for the computer user.
pub const UNIT_NAME: &str = "conductive-computer.service";
const UNIT: &str = include_str!("../../../image/computer/conductive-computer.service");

/// Install the user unit and start the service.
#[async_trait]
pub trait Service: Send + Sync {
    /// Replace the unit, reload the manager, enable, and restart it.
    async fn install(&self) -> Result<()>;
}

/// Storage for a systemd user unit.
#[cfg_attr(test, unimock::unimock(api = UnitStoreMock))]
pub trait UnitStore: Send + Sync {
    /// Replace the installed unit text.
    fn write(&self, text: &str) -> Result<()>;
}

/// Systemd user manager and the target unit path.
pub struct UserService {
    process: Arc<dyn Process>,
    unit: Arc<dyn UnitStore>,
}

impl UserService {
    /// Adopt the native process runner and target unit storage.
    pub fn new(process: Arc<dyn Process>, unit: Arc<dyn UnitStore>) -> Self {
        Self { process, unit }
    }
}

#[async_trait]
impl Service for UserService {
    async fn install(&self) -> Result<()> {
        self.unit.write(UNIT)?;
        for arguments in [
            &["--user", "daemon-reload"][..],
            &["--user", "enable", UNIT_NAME],
            &["--user", "restart", UNIT_NAME],
        ] {
            let invocation = Invocation::new("systemctl", arguments.iter().copied());
            let result =
                tokio::time::timeout(Duration::from_secs(60), self.process.run(invocation)).await;
            if !matches!(result, Ok(Ok(output)) if output.status.success()) {
                return Err(Error::ServiceFailed);
            }
        }
        Ok(())
    }
}

/// The installed unit file under the user's configuration folder.
pub struct UnitFile {
    /// Destination path for the unit text.
    pub path: PathBuf,
}

impl UnitStore for UnitFile {
    fn write(&self, text: &str) -> Result<()> {
        let parent = self.path.parent().ok_or(Error::ServiceFailed)?;
        fs::create_dir_all(parent)?;
        atomic_write(&self.path, text.as_bytes())
    }
}

#[cfg(test)]
#[path = "_tests_/service_tests.rs"]
mod tests;
