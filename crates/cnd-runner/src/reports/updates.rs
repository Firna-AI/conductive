//! Compare the last emitted tree, with full scans for content and diff refreshes.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use cnd_runner_interface::file_changes::ChangesResponse;
use cnd_runner_interface::file_tree::{
    FileTreeChange, FileTreeDelta, RunnerFileEvent, RunnerFileRevisionPart, RunnerFileTreePart,
};

use crate::error::Result;
use crate::repository::service::RepositorySnapshot;

use super::parts::{fits_one_delta, split};
use super::prepare::ReportFilter;
use super::refreshes::{content_paths, listed_changes_paths, omitted_diff_paths};
use super::selection::{ReportLimits, TreeSelection, select_tree};

/// Last complete tree and the unbounded scan that supplied it.
pub(super) struct TreeHistory {
    source: Arc<RepositorySnapshot>,
    selection: TreeSelection,
    listed_changes: HashSet<String>,
}

impl TreeHistory {
    /// Build the next selection from the same capture as its changes report.
    pub(super) fn new(
        source: Arc<RepositorySnapshot>,
        changes: &ChangesResponse,
        limits: ReportLimits,
    ) -> Self {
        let selection = select_tree(&source, changes, limits);
        let listed_changes = listed_changes_paths(changes);
        Self {
            source,
            selection,
            listed_changes,
        }
    }

    /// Apply the whole update in one delta when its membership or refreshes require it.
    pub(super) fn parts(
        &self,
        previous: Option<&Self>,
        revision: u64,
        filter: &dyn ReportFilter,
    ) -> Result<Option<Vec<RunnerFileEvent>>> {
        if let Some(previous) = previous {
            let Some((delta, atomic)) = self.delta(previous, revision) else {
                return Ok(Some(vec![]));
            };
            let event = filter.file_report(RunnerFileEvent::FilesChanged { delta })?;
            if !atomic {
                return split(event);
            }
            if fits_one_delta(&event)? {
                return Ok(Some(vec![event]));
            }
        }
        split(filter.file_report(RunnerFileEvent::FilesSnapshot {
            tree: RunnerFileTreePart {
                part: RunnerFileRevisionPart {
                    revision,
                    part_number: 1,
                    part_count: 1,
                },
                unavailable: None,
                omitted_entry_count: Some(self.selection.omitted_entry_count),
                entries: self.selection.entries.clone(),
            },
        })?)
    }

    fn delta(&self, previous: &Self, revision: u64) -> Option<(FileTreeDelta, bool)> {
        let before: HashMap<_, _> = previous
            .selection
            .entries
            .iter()
            .map(|entry| (entry.path.as_str(), entry))
            .collect();
        let after: HashSet<_> = self
            .selection
            .entries
            .iter()
            .map(|entry| entry.path.as_str())
            .collect();
        let content = content_paths(&previous.source, &self.source);
        let mut refreshes = omitted_diff_paths(
            &previous.source,
            &self.source,
            &previous.listed_changes,
            &self.listed_changes,
        );
        refreshes.extend(
            content
                .iter()
                .copied()
                .filter(|path| !before.contains_key(path) && !after.contains(path)),
        );

        let mut changes: Vec<_> = previous
            .selection
            .entries
            .iter()
            .filter(|entry| !after.contains(entry.path.as_str()))
            .map(|entry| FileTreeChange::Remove {
                path: entry.path.clone(),
            })
            .collect();
        let mut membership_changed = !changes.is_empty();
        changes.extend(
            refreshes
                .iter()
                .filter(|path| !before.contains_key(*path) && !after.contains(*path))
                .map(|path| FileTreeChange::Remove {
                    path: (*path).to_owned(),
                }),
        );
        for entry in &self.selection.entries {
            let path = entry.path.as_str();
            let old = before.get(path).copied();
            membership_changed |= old.is_none();
            if old != Some(entry) || content.contains(path) || refreshes.contains(path) {
                changes.push(FileTreeChange::Upsert {
                    entry: entry.clone(),
                });
            }
        }

        let old_count = previous.selection.omitted_entry_count;
        let new_count = self.selection.omitted_entry_count;
        let atomic =
            !refreshes.is_empty() || (membership_changed && (old_count > 0 || new_count > 0));
        (!changes.is_empty() || old_count != new_count).then_some((
            FileTreeDelta {
                revision,
                omitted_entry_count: Some(new_count),
                changes,
            },
            atomic,
        ))
    }
}

/// Compare complete history even when the wire selection itself stays the same.
pub(super) fn changes_updated(
    previous: Option<&RepositorySnapshot>,
    current: &RepositorySnapshot,
) -> bool {
    previous.is_none_or(|previous| {
        previous.identities != current.identities
            || previous.base_commit != current.base_commit
            || previous.changes != current.changes
    })
}
