//! Frozen startup values and basic user settings without caller inheritance.

use std::collections::BTreeMap;
use std::sync::Arc;

use async_trait::async_trait;

use crate::error::Result;
use crate::ports::StartupEnvironment;

/// Independent reads of frozen settings and selected basic login variables.
#[cfg_attr(test, unimock::unimock(api = SettingsMock))]
#[async_trait]
pub trait Settings: Send + Sync {
    /// Org and generated settings installed at this computer start.
    async fn frozen(&self) -> Result<BTreeMap<String, String>>;
    /// Basic user variables only, from a shell with no caller environment.
    async fn basic(&self) -> Result<BTreeMap<String, String>>;
}

/// Services keep installed org values and project paths, with fixed exclusions.
pub struct CleanEnvironment {
    /// Isolated settings effects. No ambient agent environment enters this map.
    pub settings: Arc<dyn Settings>,
}

#[async_trait]
impl StartupEnvironment for CleanEnvironment {
    async fn read(&self) -> Result<BTreeMap<String, String>> {
        let mut values = self.settings.basic().await?;
        values.extend(self.settings.frozen().await?);
        for name in [
            "WORKSPACE_TOKEN",
            "CONDUCTIVE_WORKSPACE_TOKEN",
            "CONDUCTIVE_TURN_ID",
            "CONDUCTIVE_SESSION_ID",
            "CONDUCTIVE_MACHINE_ORIGIN",
            "CONDUCTIVE_RUNNER_URL",
            "CONDUCTIVE_WORKSPACE_ID",
            "CONDUCTIVE_WORKSPACE_LINK",
            "CONDUCTIVE_WORKSPACE_DEPTH",
            "CONDUCTIVE_WORKSPACE_MAX_DEPTH",
            "CONDUCTIVE_PARENT_WORKSPACE_ID",
            "CONDUCTIVE_PARENT_WORKSPACE_LINK",
            "CONDUCTIVE_DEFAULT_BRANCH",
            "CONDUCTIVE_WORKSPACE_BRANCH",
            "CONDUCTIVE_DISK_KEEPALIVE",
            "GIT_AUTHOR_NAME",
            "GIT_AUTHOR_EMAIL",
            "GIT_AUTHOR_DATE",
            "GIT_COMMITTER_NAME",
            "GIT_COMMITTER_EMAIL",
            "GIT_COMMITTER_DATE",
        ] {
            values.remove(name);
        }
        Ok(values)
    }
}
