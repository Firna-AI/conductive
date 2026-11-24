//! Update failures with a stable typed boundary.

use internal_error::InternalError;
use thiserror::Error;

/// An update could not finish safely.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// Another background check owns the download lock. Installation checks wait.
    #[error("[cnd-cli/update] another update check is running. Try again later.")]
    Busy,
    /// Another activation or confirmation owns the apply lock.
    #[error(
        "[cnd-cli/update] another release activation or confirmation is running. Try again later."
    )]
    ApplyBusy,
    /// The active release is newer than the requested release.
    #[error("[cnd-cli/update] cannot apply {requested} while newer release {active} is active")]
    NewerReleaseActive {
        /// The requested version.
        requested: String,
        /// The active version.
        active: String,
    },
    /// The requested release has no complete local download.
    #[error("[cnd-cli/update] release {version} is not complete")]
    ReleaseNotComplete {
        /// The requested version.
        version: String,
    },
    /// The requested release failed an earlier start.
    #[error("[cnd-cli/update] release {version} was rejected")]
    ReleaseRejected {
        /// The requested version.
        version: String,
    },
    /// Releases and parts require a valid digest.
    #[error("[cnd-cli/update] missing or invalid digest")]
    MissingDigest,
    /// The release server has no manifest for the pinned release.
    #[error("[cnd-cli/update] manifest for pinned release {version} is missing")]
    MissingManifest {
        /// The requested version.
        version: String,
    },
    /// The release server has no signature for this manifest.
    #[error("[cnd-cli/update] release manifest signature is missing")]
    MissingSignature,
    /// The manifest does not verify with the embedded signing key.
    #[error("[cnd-cli/update] release manifest signature is invalid")]
    InvalidSignature,
    /// A downloaded archive does not match its digest.
    #[error("[cnd-cli/update] digest mismatch for {name}")]
    DigestMismatch {
        /// Program or part name.
        name: String,
    },
    /// The new executable or root installer failed.
    #[error("[cnd-cli/update] start or install check failed")]
    StartFailed,
    /// A release lacks the required parts or has an invalid identity.
    #[error("[cnd-cli/update] invalid release")]
    InvalidRelease,
    /// There is no previous release to restore.
    #[error("[cnd-cli/update] failed first start has no previous release")]
    NoPrevious,
    /// An unexpected dependency failure.
    #[error("[cnd-cli/update] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result of a sandbox update operation.
pub type Result<T> = std::result::Result<T, Error>;
