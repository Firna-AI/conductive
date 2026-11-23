//! Persistent private scanner child and agent helpers with current skill paths.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::sdk_helper::{HelperOutput, HelperRequest};
use cnd_runner_interface::sdk_helper_options::OrgSkills as HelperOrgSkills;
use cnd_runner_interface::skills::HelperSkillLists;
use tokio::sync::{Mutex, watch};

use crate::error::{Error, Result};
use crate::filter::service::Credentials;
use crate::helper::boundary::{Helper, HelperEvents, HelperFactory, HelperPort, HelperPorts};
use crate::helper::driver::HelperConnection;

use super::boundary::{OrgSkills, SkillInputs, SkillScanner};

/// Configured org source whose current copy joins each scan.
pub struct ScannedOrgSkills {
    /// Copy lifecycle shared with agent starts.
    pub copy: Arc<dyn OrgSkills>,
    /// Valid public GitHub source identity as owner/name.
    pub repository: String,
    /// Trusted repository identity, absent when no matching grant exists.
    pub trusted_repository: Option<String>,
}

/// Scanner keeps SDK caches in one credential-free helper process.
pub struct NodeSkillScanner {
    ports: Arc<dyn HelperPorts>,
    credentials: Arc<dyn Credentials>,
    repository: String,
    home: String,
    org: Option<ScannedOrgSkills>,
    port: Mutex<Option<Arc<dyn HelperPort>>>,
    stopped: watch::Sender<bool>,
}

impl NodeSkillScanner {
    /// Compose with the same pinned helper release as agent starts.
    pub fn new(
        ports: Arc<dyn HelperPorts>,
        credentials: Arc<dyn Credentials>,
        repository: String,
        home: String,
    ) -> Self {
        Self {
            ports,
            credentials,
            repository,
            home,
            org: None,
            port: Mutex::new(None),
            stopped: watch::channel(false).0,
        }
    }

    /// List the skills of the org copy too, as agent starts load them.
    pub fn with_org_skills(mut self, org: ScannedOrgSkills) -> Self {
        self.org = Some(org);
        self
    }

    async fn receive(&self, port: &dyn HelperPort) -> Result<HelperSkillLists> {
        loop {
            match port.read().await? {
                Some(HelperOutput::Skills { request_id, skills }) if request_id == "skills" => {
                    return Ok(skills);
                }
                Some(HelperOutput::Warning { message }) => {
                    let message = self.credentials.text(&message)?;
                    tracing::warn!("{message}");
                }
                Some(HelperOutput::Error { code, message, .. }) => {
                    return Err(Error::Agent { code, message });
                }
                _ => return Err(Error::HelperResponse),
            }
        }
    }
}

#[async_trait]
impl SkillScanner for NodeSkillScanner {
    async fn scan(&self, reload: bool) -> Result<HelperSkillLists> {
        let mut state = self.port.lock().await;
        let mut stopped = self.stopped.subscribe();
        if *stopped.borrow() {
            return Err(Error::Canceled);
        }
        let port = match &*state {
            Some(port) => port.clone(),
            None => {
                let port = self.ports.port()?;
                *state = Some(port.clone());
                port
            }
        };
        // The lease keeps the copy on disk until the helper has read it.
        let lease = self.org.as_ref().and_then(|org| org.copy.current());
        let org_skills = self.org.as_ref().map(|org| HelperOrgSkills {
            repository: org.repository.clone(),
            trusted_repository: org.trusted_repository.clone(),
            directory: lease
                .as_ref()
                .map(|lease| lease.path().to_string_lossy().into_owned()),
        });
        let request = async {
            port.write(HelperRequest::Skills {
                request_id: "skills".into(),
                repository: self.repository.clone(),
                home: self.home.clone(),
                reload,
                org_skills,
            })
            .await?;
            self.receive(port.as_ref()).await
        };
        let result = tokio::select! {
            biased;
            _ = stopped.wait_for(|value| *value) => Err(Error::Canceled),
            result = request => result,
        };
        if result.is_err() {
            let _ = port.terminate().await;
            *state = None;
        }
        drop(lease);
        result
    }

    async fn close(&self) {
        self.stopped.send_replace(true);
        if let Some(port) = self.port.lock().await.take() {
            let _ = port.terminate().await;
        }
    }
}

/// Agent helper factory supplies the latest Codex paths for every input.
pub struct SkillHelpers {
    /// Pinned Node/helper process boundary.
    pub ports: Arc<dyn HelperPorts>,
    /// Shared list filtered by the report owner.
    pub skills: Arc<dyn SkillInputs>,
}

impl HelperFactory for SkillHelpers {
    fn open(&self, output: Arc<dyn HelperEvents>) -> Result<Arc<dyn Helper>> {
        Ok(Arc::new(
            HelperConnection::new(self.ports.port()?, output).with_skills(self.skills.clone()),
        ))
    }
}

#[cfg(test)]
#[path = "_tests_/helper_tests.rs"]
mod helper_tests;
