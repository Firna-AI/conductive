//! Host failures without credential values or machine error text in replies.

use internal_error::InternalError;
use thiserror::Error;

/// Host transport or native operation failure.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// A message or stream violates the host protocol.
    #[error("[cnd-host/protocol] invalid host message")]
    Protocol,
    /// The configured origin does not use TLS.
    #[error("[cnd-host/socket] TLS is required")]
    TlsRequired,
    /// The socket or local port is unavailable.
    #[error("[cnd-host/connection] connection unavailable")]
    Unavailable,
    /// The peer refused the WebSocket upgrade. Only its numeric status is retained.
    #[error("[cnd-host/connection] upgrade refused with HTTP status {status}")]
    UpgradeRefused {
        /// HTTP response status, without headers or body.
        status: u16,
    },
    /// An unexpected native failure.
    #[error("[cnd-host] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result of a host operation.
pub type Result<T> = std::result::Result<T, Error>;
