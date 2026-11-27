//! Report histories and revision tracking across ordered saves.

use cnd_runner_interface::file_tree::RunnerFileEvent;
use cnd_runner_interface::runner::RunnerEvent;

use crate::emitter::EventEmitter;
use crate::error::Result;
use crate::state::records::FileRevisions;

use super::changes::ChangesHistory;
use super::updates::TreeHistory;

/// Data readers hold from the last file reports of each kind.
#[derive(Default)]
pub(super) struct History {
    /// Independent tree and changes revision counters.
    pub(super) revisions: FileRevisions,
    /// Last scan whose tree data readers hold, even if it reused an earlier report.
    pub(super) tree: Option<TreeHistory>,
    /// Changes scan and listed rows for independent comparisons.
    pub(super) changes: ChangesHistory,
    /// Whether the tree needs a full report after a failed scan or save.
    pub(super) unavailable: bool,
}

impl History {
    /// Record each revision before its save, which can retain it as pending on failure.
    pub(super) async fn emit_parts(
        &mut self,
        emitter: &dyn EventEmitter,
        parts: Vec<RunnerFileEvent>,
        command_id: Option<String>,
    ) -> Result<()> {
        let total = parts.len();
        for (index, part) in parts.into_iter().enumerate() {
            self.revisions.record(&part);
            emitter
                .emit(
                    vec![RunnerEvent::RunnerFileEvent(part)],
                    if index + 1 == total {
                        command_id.clone()
                    } else {
                        None
                    },
                )
                .await?;
        }
        Ok(())
    }
}
