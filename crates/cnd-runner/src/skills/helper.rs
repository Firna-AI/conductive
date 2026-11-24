//! Persistent private scanner child and agent helpers with current skill paths.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_skills::SkillReadOutcome;
use cnd_runner_interface::sdk_helper::{HelperOutput, HelperRequest, HelperSkillSource};
use cnd_runner_interface::sdk_helper_options::OrgSkills as HelperOrgSkills;
use cnd_runner_interface::skills::{HelperSkillLists, SkillEntry};
use tokio::sync::{Mutex, watch};

use crate::error::{Error, Result};
use crate::filter::service::Credentials;
use crate::helper::boundary::{Helper, HelperEvents, HelperFactory, HelperPort, HelperPorts};
use crate::helper::driver::HelperConnection;

use super::boundary::{OrgSkills, SkillInputs, SkillScanner};
use super::lease::SkillsLease;
use super::read;

const SCAN_ID: &str = "skills";
const READ_ID: &str = "skill.read";

/// Configured org source whose current copy joins each scan.
pub struct ScannedOrgSkills {
    /// Copy lifecycle shared with agent starts.
    pub copy: Arc<dyn OrgSkills>,
    /// Valid public GitHub source identity as owner/name.
    pub repository: String,
    /// Trusted repository identity, absent when no matching grant exists.
    pub trusted_repository: Option<String>,
}

impl ScannedOrgSkills {
    fn options(&self, lease: Option<&SkillsLease>) -> HelperOrgSkills {
        HelperOrgSkills {
            repository: self.repository.clone(),
            trusted_repository: self.trusted_repository.clone(),
            directory: lease.map(|lease| lease.path().to_string_lossy().into_owned()),
        }
    }
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

    async fn receive(&self, port: &dyn HelperPort, scan: bool) -> Result<HelperOutput> {
        loop {
            let output = port.read().await?.ok_or(Error::HelperResponse)?;
            match &output {
                HelperOutput::Skills { request_id, .. } if scan && request_id == SCAN_ID => {
                    return Ok(output);
                }
                HelperOutput::SkillRead { request_id, .. } if !scan && request_id == READ_ID => {
                    return Ok(output);
                }
                HelperOutput::Warning { message } => {
                    if scan {
                        let message = self.credentials.text(message)?;
                        tracing::warn!("{message}");
                    }
                }
                HelperOutput::Error { code, message, .. } if scan => {
                    return Err(Error::Agent {
                        code: code.clone(),
                        message: message.clone(),
                    });
                }
                _ => return Err(Error::HelperResponse),
            }
        }
    }
    async fn request(
        &self,
        state: &mut Option<Arc<dyn HelperPort>>,
        request: HelperRequest,
    ) -> Result<HelperOutput> {
        let mut stopped = self.stopped.subscribe();
        if *stopped.borrow() {
            return Err(Error::Canceled);
        }
        let port = match state {
            Some(port) => port.clone(),
            None => {
                let port = self.ports.port()?;
                *state = Some(port.clone());
                port
            }
        };
        let scan = matches!(request, HelperRequest::Skills { .. });
        let action = async {
            port.write(request).await?;
            self.receive(port.as_ref(), scan).await
        };
        let result = tokio::select! {
            biased;
            _ = stopped.wait_for(|value| *value) => Err(Error::Canceled),
            result = action => result,
        };
        if result.is_err() {
            let _ = port.terminate().await;
            *state = None;
        }
        result
    }
}

#[async_trait]
impl SkillScanner for NodeSkillScanner {
    async fn scan(&self, reload: bool) -> Result<HelperSkillLists> {
        let mut port = self.port.lock().await;
        let lease = self.org.as_ref().and_then(|org| org.copy.current());
        let response = self
            .request(
                &mut port,
                HelperRequest::Skills {
                    request_id: SCAN_ID.into(),
                    repository: self.repository.clone(),
                    home: self.home.clone(),
                    reload,
                    org_skills: self.org.as_ref().map(|org| org.options(lease.as_ref())),
                },
            )
            .await?;
        match response {
            HelperOutput::Skills { skills, .. } => Ok(skills),
            _ => Err(Error::HelperResponse),
        }
    }

    async fn read(&self, agent: Agent, skill: SkillEntry, max_bytes: u64) -> SkillReadOutcome {
        let mut port = self.port.lock().await;
        let lease;
        let source = if skill.org.is_some() {
            let Some(org) = &self.org else {
                return read::not_found();
            };
            let Some(current) = org.copy.current() else {
                return read::not_found();
            };
            lease = current;
            HelperSkillSource::Org {
                repository: self.repository.clone(),
                org_skills: org.options(Some(&lease)),
                agent,
                name: skill.skill.name,
            }
        } else {
            HelperSkillSource::File { path: skill.path }
        };
        match self
            .request(
                &mut port,
                HelperRequest::SkillRead {
                    request_id: READ_ID.into(),
                    max_bytes,
                    source,
                },
            )
            .await
        {
            Ok(HelperOutput::SkillRead { result, .. }) => result,
            _ => read::unavailable(),
        }
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

#[cfg(test)]
#[path = "_tests_/helper_read_tests.rs"]
mod helper_read_tests;
