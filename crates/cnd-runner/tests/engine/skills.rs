//! Controlled current-copy state for session start integration tests.

use std::path::PathBuf;
use std::sync::Mutex;

use async_trait::async_trait;
use cnd_runner::skills::boundary::OrgSkills;

#[derive(Default)]
pub(super) struct Skills(pub(super) Mutex<Option<PathBuf>>);

#[async_trait]
impl OrgSkills for Skills {
    async fn start(&self) {}
    fn current(&self) -> Option<PathBuf> {
        self.0.lock().ok().and_then(|current| current.clone())
    }
    async fn close(&self) {}
}
