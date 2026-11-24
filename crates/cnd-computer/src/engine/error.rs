//! Stable engine errors without native command output.

use internal_error::InternalError;
use thiserror::Error;

/// Classified Podman failure.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum EngineError {
    /// The target container or image is missing.
    #[error("[cnd-computer/engine] The container or image is missing.")]
    NotFound,
    /// The name is already in use.
    #[error("[cnd-computer/engine] The container or image already exists.")]
    AlreadyExists,
    /// Podman could not write to local storage.
    #[error("[cnd-computer/engine] Podman has insufficient disk space.")]
    NoSpace,
    /// The loaded image does not have the signed identity.
    #[error("[cnd-computer/engine] The loaded image ID did not match the release.")]
    ImageIdMismatch,
    /// A native command failed or returned unexpected output.
    #[error("[cnd-computer/engine] The Podman command failed.")]
    Failed,
    /// An internal native failure.
    #[error("[cnd-computer/engine] The operation failed.")]
    Internal(#[from] InternalError),
}

/// Result of one Podman operation.
pub type EngineResult<T> = std::result::Result<T, EngineError>;
