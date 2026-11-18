//! Identity shared by every runner link of one CLI program start.

use std::sync::Arc;

use cnd_runner::clock::Clock;
use cnd_runner::config::ConnectionRequest;
use cnd_runner::link::connection::SavedRunnerLink;
use cnd_runner::socket::Connector;
use cnd_runner::state::store::EventStore;
use uuid::Uuid;

/// Owns the identity of one runner program, independent of its saved stream.
pub(crate) struct RunnerStart {
    process_start_id: String,
}

impl RunnerStart {
    /// Make one identity before the program's runner reconstruction loop.
    pub(crate) fn new() -> Self {
        Self {
            process_start_id: Uuid::new_v4().to_string(),
        }
    }

    /// Compose a link that keeps this program's identity across every reconnect.
    pub(crate) fn link(
        &self,
        workspace_id: String,
        request: ConnectionRequest,
        connector: Arc<dyn Connector>,
        clock: Arc<dyn Clock>,
        store: Arc<dyn EventStore>,
    ) -> SavedRunnerLink {
        SavedRunnerLink::new(
            workspace_id,
            self.process_start_id.clone(),
            request,
            connector,
            clock,
            store,
        )
    }
}

#[cfg(test)]
#[path = "_tests_/runner_start_tests.rs"]
mod runner_start_tests;
