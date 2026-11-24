//! Release input errors and the internal failure boundary.

use std::result;

use internal_error::InternalError;
use thiserror::Error;

/// A release cannot be built or read.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// A release lacks a role that its own program needs.
    #[error("[cnd-release] missing release part: {name}")]
    MissingPart {
        /// The absent role.
        name: String,
    },
    /// Release versions must use the commit-count version rule.
    #[error("[cnd-release] invalid release version: {version}")]
    InvalidVersion {
        /// The rejected version.
        version: String,
    },
    /// A SHA-256 digest must have 64 lowercase hexadecimal characters.
    #[error("[cnd-release] invalid SHA-256 digest")]
    InvalidDigest,
    /// The container base manifest cannot be decoded.
    #[error("[cnd-release/container-base] invalid manifest: {source}")]
    InvalidContainerBaseManifest {
        /// The JSON decode error.
        source: serde_json::Error,
    },
    /// The reader does not support the manifest schema version.
    #[error("[cnd-release/container-base] unsupported manifest schema: {version}")]
    UnsupportedContainerBaseSchema {
        /// The unknown schema version.
        version: u32,
    },
    /// The manifest names a different version or program archive digest.
    #[error("[cnd-release/container-base] manifest names a different program release")]
    ContainerBaseReleaseMismatch,
    /// The container archive size must be a positive JavaScript-safe integer.
    #[error("[cnd-release/container-base] invalid archive size: {size}")]
    InvalidContainerBaseArchiveSize {
        /// The rejected size in bytes.
        size: u64,
    },
    /// The image ID must have the sha256 prefix and a lowercase SHA-256 digest.
    #[error("[cnd-release/container-base] invalid image ID")]
    InvalidImageId,
    /// A parts file uses an unsupported format.
    #[error("[cnd-release] unsupported parts schema: {version}")]
    UnsupportedSchema {
        /// The unknown schema version.
        version: u32,
    },
    /// A part has no valid name, absolute HTTPS URL, or SHA-256 digest.
    #[error("[cnd-release] invalid or duplicate part: {name}")]
    InvalidPart {
        /// The rejected part name.
        name: String,
    },
    /// A build must supply both embedding variables or neither variable.
    #[error("[cnd-release] set CONDUCTIVE_RELEASE_VERSION and CONDUCTIVE_PARTS_FILE together")]
    IncompleteEmbedding,
    /// The current metadata must name this program and target.
    #[error("[cnd-release] metadata does not name the Conductive Linux musl release")]
    InvalidMetadata,
    /// The publishing command requires the deploy secret.
    #[error(
        "[cnd-release] set CONDUCTIVE_RELEASE_SIGNING_KEY to the Ed25519 private key in PKCS#8 PEM format"
    )]
    MissingSigningKey,
    /// The deploy secret is not an Ed25519 private key.
    #[error(
        "[cnd-release] CONDUCTIVE_RELEASE_SIGNING_KEY is not an Ed25519 private key in PKCS#8 PEM format"
    )]
    InvalidSigningKey,
    /// The release public key still needs its production value.
    #[error("[cnd-release] replace the RELEASE_PUBLIC_KEY placeholder before publishing a release")]
    MissingPublicKey,
    /// The deploy secret and the key in the program must belong to the same pair.
    #[error("[cnd-release] CONDUCTIVE_RELEASE_SIGNING_KEY does not match RELEASE_PUBLIC_KEY")]
    SigningKeyMismatch,
    /// An unexpected filesystem, archive, or serialization failure.
    #[error("[cnd-release] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result of building or reading release files.
pub type Result<T> = result::Result<T, Error>;
