//! Current protected provider metadata, read again for each preview request.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::preview_ingress::PreviewIngressIdentity;

use crate::ingress_file::{IngressFile, IngressFiles};

/// Metadata absence keeps the Boat hostname rule; invalid metadata permits no host.
#[derive(Clone, Debug, PartialEq)]
pub enum IngressIdentity {
    /// No metadata file exists, as on Boat.
    Missing,
    /// The metadata cannot be trusted or parsed.
    Untrusted,
    /// The current exact E2B sandbox and aliases.
    Current(PreviewIngressIdentity),
}

/// Protected metadata boundary of the preview relay.
#[cfg_attr(test, unimock::unimock(api = IngressMock))]
#[async_trait]
pub trait Ingress: Send + Sync {
    /// Read the current provider identity without caching an earlier alias.
    async fn read(&self) -> IngressIdentity;
}

/// Trust and schema checks of the current protected preview metadata.
pub struct IngressReader {
    /// Descriptor access for the metadata path.
    pub files: Arc<dyn IngressFiles>,
}

#[async_trait]
impl Ingress for IngressReader {
    async fn read(&self) -> IngressIdentity {
        match self.files.read() {
            IngressFile::Missing => IngressIdentity::Missing,
            IngressFile::Contents {
                bytes,
                uid,
                mode,
                regular,
            } if regular && uid == 0 && mode & 0o022 == 0 && bytes.len() <= 1024 => parse(&bytes),
            _ => IngressIdentity::Untrusted,
        }
    }
}

fn parse(bytes: &[u8]) -> IngressIdentity {
    let identity: PreviewIngressIdentity = match serde_json::from_slice(bytes) {
        Ok(identity) => identity,
        Err(_) => return IngressIdentity::Untrusted,
    };
    if !label(&identity.sandbox_id)
        || identity.domain.len() > 253
        || !identity.domain.split('.').all(label)
        || !identity.aliases.iter().all(|(port, alias)| {
            !port.is_empty()
                && port.bytes().all(|byte| byte.is_ascii_digit())
                && port.parse::<u16>().is_ok_and(|port| port != 0)
                && *alias != 0
        })
    {
        return IngressIdentity::Untrusted;
    }
    IngressIdentity::Current(identity)
}

fn label(value: &str) -> bool {
    let alphanumeric = |byte: u8| byte.is_ascii_lowercase() || byte.is_ascii_digit();
    !value.is_empty()
        && value.len() <= 63
        && value.bytes().all(|byte| alphanumeric(byte) || byte == b'-')
        && value
            .as_bytes()
            .first()
            .is_some_and(|byte| alphanumeric(*byte))
        && value
            .as_bytes()
            .last()
            .is_some_and(|byte| alphanumeric(*byte))
}

#[cfg(test)]
#[path = "_tests_/ingress_tests.rs"]
mod ingress_tests;
