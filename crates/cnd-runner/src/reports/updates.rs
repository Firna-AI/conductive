//! Compare the last emitted tree, with full scans for content and diff refreshes.

use std::collections::{HashMap, HashSet};
use std::ops::Range;
use std::ptr;
use std::sync::Arc;

use cnd_runner_interface::file_tree::{
    FileTreeChange, FileTreeDelta, RunnerFileEvent, RunnerFileRevisionPart, RunnerFileTreePart,
};

use crate::error::Result;
use crate::repository::service::RepositorySnapshot;

use super::parts::{Oversized, fits_one_delta, split, split_delta};
use super::prepare::ReportFilter;
use super::refreshes::{content_paths, listed_changes_paths, omitted_diff_paths};
use super::selection::{ChangesSelection, ReportLimits, TreeSelection, select_tree};

/// Last complete tree and the unbounded scan that supplied it.
pub(super) struct TreeHistory {
    source: Arc<RepositorySnapshot>,
    selection: TreeSelection,
    listed_changes: HashSet<String>,
}

enum TreeUpdate {
    Full,
    Unchanged,
    LimitedMembership(FileTreeDelta),
    Split {
        delta: FileTreeDelta,
        refreshes: Range<usize>,
    },
}

impl TreeHistory {
    /// Build the next selection from the same capture as its changes report.
    pub(super) fn new(
        source: Arc<RepositorySnapshot>,
        changes: &ChangesSelection<'_>,
        limits: ReportLimits,
    ) -> Self {
        let selection = select_tree(&source, &changes.priority_files, limits);
        let listed_changes = listed_changes_paths(&changes.response);
        Self {
            source,
            selection,
            listed_changes,
        }
    }

    /// Deltas require matching captures for the prior tree and Changes reports.
    fn can_use_delta(&self, published_changes: &RepositorySnapshot) -> bool {
        let tree = self.source.as_ref();
        ptr::eq(tree, published_changes) || tree == published_changes
    }

    /// Plan against the prior report histories. Pack each group after filtering.
    pub(super) fn parts(
        &self,
        previous: Option<&Self>,
        published_changes: Option<&RepositorySnapshot>,
        revision: u64,
        filter: &dyn ReportFilter,
    ) -> Result<Option<Vec<RunnerFileEvent>>> {
        let plan = previous
            .filter(|tree| published_changes.is_none_or(|changes| tree.can_use_delta(changes)))
            .map_or(TreeUpdate::Full, |previous| self.delta(previous, revision));
        match plan {
            TreeUpdate::Full => {}
            TreeUpdate::Unchanged => return Ok(Some(vec![])),
            TreeUpdate::LimitedMembership(delta) => {
                let event = filter.file_report(RunnerFileEvent::FilesChanged { delta })?;
                if fits_one_delta(&event)? {
                    return Ok(Some(vec![event]));
                }
            }
            TreeUpdate::Split { delta, refreshes } => {
                let event = filter.file_report(RunnerFileEvent::FilesChanged { delta })?;
                let RunnerFileEvent::FilesChanged { delta } = event else {
                    return split(event);
                };
                match split_delta(delta, refreshes)? {
                    Ok(parts) => return Ok(Some(parts)),
                    Err(Oversized::Entry) => return Ok(None),
                    Err(Oversized::Refreshes) => {}
                }
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

    fn delta(&self, previous: &Self, revision: u64) -> TreeUpdate {
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
        let refresh_start = changes.len();
        changes.extend(
            refreshes
                .iter()
                .filter(|path| !before.contains_key(*path) && !after.contains(*path))
                .map(|path| FileTreeChange::Remove {
                    path: (*path).to_owned(),
                }),
        );
        let mut edits = vec![];
        for entry in &self.selection.entries {
            let path = entry.path.as_str();
            let old = before.get(path).copied();
            membership_changed |= old.is_none();
            if old != Some(entry) || content.contains(path) {
                edits.push(FileTreeChange::Upsert {
                    entry: entry.clone(),
                });
            } else if refreshes.contains(path) {
                changes.push(FileTreeChange::Upsert {
                    entry: entry.clone(),
                });
            }
        }
        let refreshes = refresh_start..changes.len();
        changes.extend(edits);

        let old_count = previous.selection.omitted_entry_count;
        let new_count = self.selection.omitted_entry_count;
        let delta = FileTreeDelta {
            revision,
            omitted_entry_count: Some(new_count),
            changes,
        };
        if delta.changes.is_empty() && old_count == new_count {
            TreeUpdate::Unchanged
        } else if membership_changed && (old_count > 0 || new_count > 0) {
            TreeUpdate::LimitedMembership(delta)
        } else {
            TreeUpdate::Split { delta, refreshes }
        }
    }
}
