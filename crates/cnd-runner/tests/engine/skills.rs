//! Controlled current-copy state for session start integration tests.

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;

use async_trait::async_trait;
use cnd_runner::skills::boundary::OrgSkills;
use cnd_runner::skills::lease::SkillsLease;
use tokio::sync::Notify;

#[derive(Default)]
pub(super) struct Skills(pub(super) Mutex<Option<PathBuf>>, pub(super) Arc<Notify>);

#[async_trait]
impl OrgSkills for Skills {
    async fn start(&self) {}
    fn current(&self) -> Option<SkillsLease> {
        self.0
            .lock()
            .ok()
            .and_then(|current| current.clone())
            .map(|path| SkillsLease::new(path, self.1.clone()))
    }
    async fn close(&self) {}
}
