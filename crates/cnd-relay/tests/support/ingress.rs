//! Mutable provider identity for public relay transport checks.

use std::collections::BTreeMap;
use std::sync::{PoisonError, RwLock};

use async_trait::async_trait;
use cnd_relay::ingress::{Ingress, IngressIdentity};
use cnd_runner_interface::preview_ingress::PreviewIngressIdentity;

pub(crate) struct TestIngress {
    pub(crate) identity: RwLock<PreviewIngressIdentity>,
}

pub(crate) struct MissingIngress;

#[async_trait]
impl Ingress for MissingIngress {
    async fn read(&self) -> IngressIdentity {
        IngressIdentity::Missing
    }
}

impl TestIngress {
    pub(crate) fn new() -> Self {
        Self {
            identity: RwLock::new(PreviewIngressIdentity {
                sandbox_id: "sandbox-one".into(),
                domain: "eu.e2b.test".into(),
                aliases: BTreeMap::new(),
            }),
        }
    }

    pub(crate) fn alias(&self, port: u16, alias: u16) {
        self.identity
            .write()
            .unwrap_or_else(PoisonError::into_inner)
            .aliases
            .insert(port.to_string(), alias);
    }
}

#[async_trait]
impl Ingress for TestIngress {
    async fn read(&self) -> IngressIdentity {
        IngressIdentity::Current(
            self.identity
                .read()
                .unwrap_or_else(PoisonError::into_inner)
                .clone(),
        )
    }
}
