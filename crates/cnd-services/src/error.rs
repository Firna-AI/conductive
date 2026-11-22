//! Typed service failures with source-preserving internal errors.

use internal_error::InternalError;
use thiserror::Error;

/// A local service operation could not complete.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// Start requires an executable argument.
    #[error("[cnd-services/start] choose a command to start")]
    CommandRequired,
    /// An operation names no registered exact service name.
    #[error("[cnd-services/local] the service was not found")]
    NotFound,
    /// The system manager could not apply the fixed unit operation.
    #[error("[cnd-services/units] the service operation failed")]
    Unit,
    /// The local request socket is not available.
    #[error("[cnd-services/socket] the service manager is not available")]
    Unavailable,
    /// IO and serialization failures retain their original source.
    #[error("[cnd-services] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result of a native service effect.
pub type Result<T> = std::result::Result<T, Error>;
