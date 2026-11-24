//! Computer errors with fixed text at the command and connection boundaries.

use std::io;

use internal_error::InternalError;
use thiserror::Error;

/// A failure in the own computer program.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// The server address cannot be used safely.
    #[error("[cnd-computer/settings] Use an HTTPS server URL, or HTTP on localhost.")]
    InvalidServer,
    /// The user home folder could not be determined.
    #[error("[cnd-computer/settings] Set HOME to the home folder of the computer user.")]
    MissingHome,
    /// The saved settings could not be read as a computer credential.
    #[error("[cnd-computer/settings] Computer settings are invalid.")]
    InvalidSettings,
    /// The supplied code does not have the required form.
    #[error("[cnd-computer/enrollment] Copy the full computer code from the app.")]
    InvalidCode,
    /// The Worker refused the code.
    #[error(
        "[cnd-computer/enrollment] A code works once within 1 hour. Choose New code in the app to get a new command."
    )]
    CodeRefused,
    /// The code exchange did not return a valid credential.
    #[error(
        "[cnd-computer/enrollment] The computer could not enroll. Check the server URL and try again."
    )]
    EnrollmentUnavailable,
    /// The local systemd user manager did not complete installation.
    #[error(
        "[cnd-computer/service] The service could not start. Check the systemd user manager and run this command again."
    )]
    ServiceFailed,
    /// The peer sent an invalid protocol message.
    #[error("[cnd-computer/protocol] The computer message is invalid.")]
    Protocol,
    /// The computer could not open or use the connection.
    #[error("[cnd-computer/socket] The computer connection is unavailable.")]
    ConnectionUnavailable,
    /// The Worker refused the upgrade. Keep only its numeric status.
    #[error("[cnd-computer/socket] The upgrade returned HTTP {status}.")]
    UpgradeRefused {
        /// Numeric HTTP status.
        status: u16,
    },
    /// A native process could not complete.
    #[error("[cnd-computer/process] The command failed.")]
    ProcessFailed,
    /// The computer could not read its resources.
    #[error("[cnd-computer/resources] Could not read the server resources.")]
    ResourcesUnavailable,
    /// Release files could not be read from the configured server.
    #[error("[cnd-computer/releases] The release is unavailable.")]
    ReleaseUnavailable,
    /// Release metadata, signature, digest, or contents failed verification.
    #[error("[cnd-computer/releases] The release failed verification.")]
    ReleaseInvalid,
    /// The verified image could not be loaded into Podman.
    #[error("[cnd-computer/releases] Podman could not import the base image.")]
    ImageImportFailed,
    /// The installed program layout changed or is incomplete.
    #[error("[cnd-computer/update] The installed program path is unavailable.")]
    UpdateLocation,
    /// An installed candidate failed its executable version check.
    #[error("[cnd-computer/update] The new program did not report the expected version.")]
    UpdateProgramVersion,
    /// A disk write exceeded the available space or quota.
    #[error("[cnd-computer/storage] The computer has insufficient disk space.")]
    NoSpace,
    /// An unexpected internal failure.
    #[error("[cnd-computer/internal] The operation failed.")]
    Internal(#[from] InternalError),
}

/// Result of an own computer action.
pub type Result<T> = std::result::Result<T, Error>;

impl From<io::Error> for Error {
    #[track_caller]
    fn from(error: io::Error) -> Self {
        match error.kind() {
            io::ErrorKind::StorageFull | io::ErrorKind::QuotaExceeded => Self::NoSpace,
            _ => Self::internal(error),
        }
    }
}
