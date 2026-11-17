//! Failures that the skills schedule logs without failing a start or turn.

use internal_error::InternalError;
use thiserror::Error;

/// A public repository copy could not finish.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// A caller supplied a value that cannot name a public GitHub repository.
    #[error("[cnd-runner/skills] the skills repository name is invalid")]
    InvalidRepository,
    /// Git failed without returning a complete copy.
    #[error("[cnd-runner/skills] Git exited with {code:?}")]
    Git {
        /// Exit code, absent for a signal.
        code: Option<i32>,
    },
    /// The public Git operation exceeded its time limit.
    #[error("[cnd-runner/skills] Git exceeded its 30-second time limit")]
    Timeout,
    /// Git returned no valid commit identity.
    #[error("[cnd-runner/skills] the skills commit is unavailable")]
    InvalidCommit,
    /// Unhandled filesystem and process failures retain their source.
    #[error("[cnd-runner/skills] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result at the skills copy boundaries.
pub type Result<T> = std::result::Result<T, Error>;
