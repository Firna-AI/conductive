//! Detached Ed25519 signatures for the exact bytes of a release manifest.

use ed25519_dalek::pkcs8::DecodePrivateKey;
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};

use crate::error::{Error, ErrorResultExt, Result};
use crate::files::sha256;
use crate::version::BINARY;

const PLACEHOLDER_KEY: [u8; 32] = [0; 32];

/// Public key built into `conductive`. Replace this placeholder before the first signed deploy.
pub const RELEASE_PUBLIC_KEY: [u8; 32] = PLACEHOLDER_KEY;

/// An Ed25519 signer for a release manifest.
pub struct ReleaseSigner(SigningKey);

impl ReleaseSigner {
    /// Read an Ed25519 private key in PKCS#8 PEM format.
    pub fn from_pem(pem: &str) -> Result<Self> {
        match SigningKey::from_pkcs8_pem(pem) {
            Ok(key) => Ok(Self(key)),
            Err(_) => Err(Error::InvalidSigningKey),
        }
    }

    /// Read the deploy key and check that new programs will trust its signatures.
    pub fn for_publish(pem: &str) -> Result<Self> {
        let signer = Self::from_pem(pem)?;
        if RELEASE_PUBLIC_KEY == PLACEHOLDER_KEY {
            return Err(Error::MissingPublicKey);
        }
        if signer.public_key() != RELEASE_PUBLIC_KEY {
            return Err(Error::SigningKeyMismatch);
        }
        Ok(signer)
    }

    /// Return the public half of the key pair as 32 raw bytes.
    pub fn public_key(&self) -> [u8; 32] {
        self.0.verifying_key().to_bytes()
    }

    /// Sign the manifest and return the 64 raw bytes of its signature.
    pub fn sign(&self, manifest: &[u8]) -> Result<[u8; 64]> {
        Ok(self.0.try_sign(manifest).internal()?.to_bytes())
    }
}

/// Check the detached signature with the trusted public key.
pub fn verify_manifest(public_key: &[u8; 32], manifest: &[u8], signature: &[u8]) -> bool {
    let (Ok(key), Ok(signature)) = (
        VerifyingKey::from_bytes(public_key),
        Signature::from_slice(signature),
    ) else {
        return false;
    };
    key.verify_strict(manifest, &signature).is_ok()
}

/// Immutable release key derived from the manifest, relative to the configured server.
pub fn manifest_signature_key(manifest: &[u8]) -> String {
    format!(
        "releases/download/{BINARY}/signatures/{}.sig",
        sha256(manifest)
    )
}
