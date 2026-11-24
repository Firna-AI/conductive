//! Results of fixed computer operations.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// State of a container on the computer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum ContainerState {
    /// The container is running.
    Running,
    /// The container is stopped.
    Stopped,
    /// The computer has no container with this name.
    Missing,
}

/// Fixed failure categories that can cross the computer connection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum ComputerErrorCode {
    /// The operation or its arguments are invalid.
    InvalidRequest,
    /// A required container or image does not exist.
    NotFound,
    /// The named container or image already exists.
    AlreadyExists,
    /// The computer cannot accept the operation now.
    Busy,
    /// The requested release cannot be obtained.
    ReleaseUnavailable,
    /// The requested release failed verification.
    ReleaseInvalid,
    /// The computer has insufficient space.
    NoSpace,
    /// An unexpected failure with no free error text.
    Internal,
}

/// Result of an operation on one own computer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all_fields = "camelCase")]
pub enum ComputerResult {
    /// The computer reports the current state of the named container.
    #[serde(rename = "container")]
    Container {
        /// Container name from the request.
        container: String,
        /// State after the operation.
        state: ContainerState,
    },
    /// A container was deleted.
    #[serde(rename = "container.deleted")]
    ContainerDeleted {
        /// Deleted container name.
        container: String,
    },
    /// An org image was saved.
    #[serde(rename = "image.saved")]
    ImageSaved {
        /// Saved image name.
        image: String,
    },
    /// The computer installed the requested release and started the host program.
    #[serde(rename = "container.bootstrapped")]
    ContainerBootstrapped {
        /// Container name from the request.
        container: String,
        /// Installed release version.
        version: String,
    },
    /// The operation failed.
    #[serde(rename = "error")]
    Error {
        /// Fixed error code with no free error text.
        code: ComputerErrorCode,
    },
}
