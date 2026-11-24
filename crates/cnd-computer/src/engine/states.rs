//! Podman state decoding and recovery of pauses left across service starts.

use serde::Deserialize;

use crate::process::Input;

use super::error::{EngineError, EngineErrorResultExt, EngineResult};
use super::podman::{CONTAINER_LABEL, Podman, container};

/// Local container state before it is projected onto the Worker protocol.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContainerStatus {
    /// No container with this name.
    Missing,
    /// A container that can be started.
    Stopped,
    /// A running container.
    Running,
    /// A container left with its processes frozen.
    Paused,
    /// A container whose stop has started.
    Stopping,
    /// A container whose removal has started.
    Removing,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Inspect {
    state: InspectState,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InspectState {
    status: PodmanState,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum PodmanState {
    Unknown,
    Configured,
    Created,
    Running,
    Stopped,
    Paused,
    Exited,
    Removing,
    Stopping,
}

impl Podman {
    pub(super) async fn container_status(&self, name: &str) -> EngineResult<ContainerStatus> {
        let output = match self
            .checked(["container", "inspect", &container(name)], Input::Closed)
            .await
        {
            Err(EngineError::NotFound) => return Ok(ContainerStatus::Missing),
            result => result?,
        };
        let states: Vec<Inspect> = serde_json::from_slice(&output.stdout).internal()?;
        let [inspect] = states.as_slice() else {
            return if states.is_empty() {
                Ok(ContainerStatus::Missing)
            } else {
                Err(EngineError::Failed)
            };
        };
        match inspect.state.status {
            PodmanState::Configured
            | PodmanState::Created
            | PodmanState::Stopped
            | PodmanState::Exited => Ok(ContainerStatus::Stopped),
            PodmanState::Running => Ok(ContainerStatus::Running),
            PodmanState::Paused => Ok(ContainerStatus::Paused),
            PodmanState::Stopping => Ok(ContainerStatus::Stopping),
            PodmanState::Removing => Ok(ContainerStatus::Removing),
            PodmanState::Unknown => Err(EngineError::Failed),
        }
    }

    pub(super) async fn recover_pauses(&self) -> EngineResult<()> {
        let output = self
            .checked(
                [
                    "ps",
                    "--all",
                    "--filter",
                    &format!("label={CONTAINER_LABEL}"),
                    "--filter",
                    "status=paused",
                    "--no-trunc",
                    "--format",
                    "{{.ID}}",
                ],
                Input::Closed,
            )
            .await?;
        let mut result = Ok(());
        for id in String::from_utf8_lossy(&output.stdout).split_ascii_whitespace() {
            let unpaused = if id.len() == 64 && id.bytes().all(|b| b.is_ascii_hexdigit()) {
                self.checked(["unpause", id], Input::Closed)
                    .await
                    .map(|_| ())
            } else {
                Err(EngineError::Failed)
            };
            if unpaused.is_err() {
                result = unpaused;
            }
        }
        result
    }
}

#[cfg(test)]
#[path = "_tests_/states_tests.rs"]
mod tests;
