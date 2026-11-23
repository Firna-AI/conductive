//! One synchronized command state, with persisted exits for host restarts.

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex, PoisonError};

use async_trait::async_trait;

use crate::error::Result;

use super::records::{Exit, ExitRecords};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum State {
    Running,
    Exited(Exit),
    Lost,
}

#[async_trait]
pub(super) trait Registry: Send + Sync {
    fn started(&self, id: u64);
    async fn finished(&self, id: u64, exit: Exit) -> Result<()>;
    fn lost(&self, id: u64);
    async fn snapshot(&self, id: u64) -> Result<State>;
}

pub(super) struct SavedRegistry {
    entries: Mutex<BTreeMap<u64, State>>,
    records: Arc<dyn ExitRecords>,
}

impl SavedRegistry {
    pub(super) fn new(records: Arc<dyn ExitRecords>) -> Self {
        Self {
            entries: Mutex::new(BTreeMap::new()),
            records,
        }
    }
}

#[async_trait]
impl Registry for SavedRegistry {
    fn started(&self, id: u64) {
        self.entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(id, State::Running);
    }

    async fn finished(&self, id: u64, exit: Exit) -> Result<()> {
        let saved = self.records.write(id, exit).await;
        self.entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(id, State::Exited(exit));
        saved
    }

    fn lost(&self, id: u64) {
        self.entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(id, State::Lost);
    }

    async fn snapshot(&self, id: u64) -> Result<State> {
        let recorded = self.records.read(id).await?;
        let current = self
            .entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .get(&id)
            .copied();
        Ok(current.unwrap_or_else(|| recorded.map(State::Exited).unwrap_or(State::Lost)))
    }
}

#[cfg(test)]
#[path = "_tests_/registry_tests.rs"]
mod tests;
