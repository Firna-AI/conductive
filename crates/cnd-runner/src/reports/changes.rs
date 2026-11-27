//! Choose full changes lists or deltas against the last emitted list.

use std::collections::HashMap;
use std::mem;
use std::sync::Arc;

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangesDelta, ChangesDeltaUpsert, ChangesResponse, RunnerChangesPart,
};
use cnd_runner_interface::file_tree::{RunnerFileEvent, RunnerFileRevisionPart};

use crate::error::Result;
use crate::repository::service::RepositorySnapshot;

use super::parts::split;
use super::prepare::ReportFilter;

/// The scan for tree comparisons and the separate list for changes deltas.
#[derive(Default)]
pub(super) struct ChangesHistory {
    /// Last scan whose changes data readers hold, even if it reused an earlier report.
    pub(super) source: Option<Arc<RepositorySnapshot>>,
    /// Filtered rows of the last emitted report for an accepting welcome.
    pub(super) baseline: Option<ChangesBaseline>,
}

/// Listed rows tied to the welcome under which the report was prepared.
pub(super) struct ChangesBaseline {
    generation: u64,
    rows: Vec<BranchChangedFile>,
}

/// Changes events for one scan after applying the latest welcome and both budgets.
pub(super) enum ChangesUpdate {
    /// The scan can reuse the existing changes report.
    Unchanged,
    /// A row or the report header exceeds the full list's part budget.
    Oversized,
    /// The events of one revision and the list they produce.
    Report {
        /// One delta or all parts of a full list, in order.
        parts: Vec<RunnerFileEvent>,
        /// Rows that future changes deltas can use after this report is saved.
        baseline: Option<ChangesBaseline>,
    },
}

impl ChangesHistory {
    /// Compare complete scans even when their listed rows stay the same.
    pub(super) fn update(
        &self,
        current: &RepositorySnapshot,
        selected: ChangesResponse,
        revision: u64,
        full: bool,
        generation: Option<u64>,
        filter: &dyn ReportFilter,
    ) -> Result<ChangesUpdate> {
        let baseline = self
            .baseline
            .as_ref()
            .filter(|baseline| generation == Some(baseline.generation));
        let previous = self.source.as_deref();
        if !full
            && (generation.is_none() || baseline.is_some())
            && previous.is_some_and(|previous| {
                previous.base_commit == current.base_commit
                    && previous.identities == current.identities
                    && previous.changes == current.changes
            })
        {
            return Ok(ChangesUpdate::Unchanged);
        }
        let baseline = baseline.filter(|_| {
            !full
                && previous.is_some_and(|previous| {
                    previous.base_commit == current.base_commit
                        && previous.changes.base_branch == current.changes.base_branch
                })
        });
        let event = filter.file_report(RunnerFileEvent::ChangesUpdated {
            changes: RunnerChangesPart {
                changes_response: selected,
                runner_file_revision_part: RunnerFileRevisionPart {
                    revision,
                    part_number: 1,
                    part_count: 1,
                },
            },
        })?;
        prepare_update(event, baseline, generation)
    }
}

/// Derive the delta and its baseline from the same filtered list.
fn prepare_update(
    mut event: RunnerFileEvent,
    previous: Option<&ChangesBaseline>,
    generation: Option<u64>,
) -> Result<ChangesUpdate> {
    let mut baseline = None;
    if let RunnerFileEvent::ChangesUpdated { changes } = &mut event {
        if let Some(previous) = previous
            && let Some(delta) = build_delta(&previous.rows, changes)
            && let Some(parts) = split(RunnerFileEvent::ChangesChanged { delta })?
        {
            return Ok(ChangesUpdate::Report {
                parts,
                baseline: Some(ChangesBaseline {
                    generation: previous.generation,
                    rows: mem::take(&mut changes.changes_response.files),
                }),
            });
        }
        baseline = generation.map(|generation| ChangesBaseline {
            generation,
            rows: changes.changes_response.files.clone(),
        });
    }
    Ok(match split(event)? {
        Some(parts) => ChangesUpdate::Report { parts, baseline },
        None => ChangesUpdate::Oversized,
    })
}

fn build_delta(
    previous: &[BranchChangedFile],
    changes: &RunnerChangesPart,
) -> Option<ChangesDelta> {
    let current = &changes.changes_response;
    let omitted = current.omitted.clone()?;
    let mut before: HashMap<_, _> = previous
        .iter()
        .map(|file| (file.changed_file.path.as_str(), file))
        .collect();
    let mut upserts = Vec::new();
    for (index, file) in current.files.iter().enumerate() {
        if before.remove(file.changed_file.path.as_str()) != Some(file) {
            upserts.push(ChangesDeltaUpsert {
                index: index as u64,
                file: file.clone(),
            });
        }
    }
    let removes = previous
        .iter()
        .map(|file| &file.changed_file.path)
        .filter(|path| before.contains_key(path.as_str()))
        .cloned()
        .collect();
    Some(ChangesDelta {
        revision: changes.runner_file_revision_part.revision,
        base_branch: current.base_branch.clone(),
        display_base_branch: current.display_base_branch.clone(),
        unpushed_commits: current.unpushed_commits,
        uncommitted_file_count: current.uncommitted_file_count,
        summary: current.summary.clone(),
        omitted,
        removes,
        upserts,
    })
}
