//! Select bounded reports from complete repository scans before filtering.

use std::collections::{HashMap, HashSet};

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangesResponse, FILE_CHANGES_REPORT_MAX_FILES,
};
use cnd_runner_interface::file_tree::{FILE_TREE_REPORT_MAX_ENTRIES, FileEntry, FileEntryKind};

use crate::error::{Error, ErrorResultExt, Result};
use crate::repository::changes::{sort_changed_files_by_path, summarize_changes};
use crate::repository::service::RepositorySnapshot;

const CONTEXT_TREE_RESERVE: usize = 5_000;

/// Entry and file budgets for report selection.
#[derive(Clone, Copy)]
pub(super) struct ReportLimits {
    /// Total tree entries, including directories.
    pub(super) tree_entries: usize,
    /// Changed files across all parts of a changes report.
    pub(super) changed_files: usize,
    /// Reservation for context-only entries after the priority pass.
    pub(super) context_entries: usize,
}

impl Default for ReportLimits {
    fn default() -> Self {
        Self {
            tree_entries: FILE_TREE_REPORT_MAX_ENTRIES as usize,
            changed_files: FILE_CHANGES_REPORT_MAX_FILES as usize,
            context_entries: CONTEXT_TREE_RESERVE,
        }
    }
}

/// Listed changes for tree priority and report output.
pub(super) struct ChangesSelection<'a> {
    /// Retained files in selection order for the tree priority pass.
    pub(super) priority_files: Vec<&'a BranchChangedFile>,
    /// Changes report with its files in path order.
    pub(super) response: ChangesResponse,
}

/// Select uncommitted changes first. Keep Git status counts from the complete scan.
pub(super) fn select_changes(
    source: &ChangesResponse,
    limit: usize,
) -> Result<ChangesSelection<'_>> {
    let mut ordered = source
        .files
        .iter()
        .filter(|file| file.uncommitted)
        .chain(source.files.iter().filter(|file| !file.uncommitted));
    let priority_files: Vec<_> = ordered.by_ref().take(limit).collect();
    let mut files: Vec<_> = priority_files.iter().copied().cloned().collect();
    let summary = summarize_changes(&files).ok_or(Error::InvalidNumber)?;
    let omitted = summarize_changes(ordered).ok_or(Error::InvalidNumber)?;
    sort_changed_files_by_path(&mut files).internal()?;
    Ok(ChangesSelection {
        priority_files,
        response: ChangesResponse {
            base_branch: source.base_branch.clone(),
            display_base_branch: source.display_base_branch.clone(),
            unpushed_commits: source.unpushed_commits,
            uncommitted_file_count: source.uncommitted_file_count,
            files,
            summary,
            omitted: Some(omitted),
        },
    })
}

/// Entries and omission count that one complete tree report carries.
pub(super) struct TreeSelection {
    /// Listed entries in the scan's path order.
    pub(super) entries: Vec<FileEntry>,
    /// Paths from the scan that are absent from these entries.
    pub(super) omitted_entry_count: u64,
}

struct TreePaths<'a> {
    source: &'a RepositorySnapshot,
    available: HashMap<&'a str, &'a FileEntry>,
    kept: HashSet<&'a str>,
}

impl<'a> TreePaths<'a> {
    /// Reserve all missing ancestors before keeping a path.
    fn keep(&mut self, path: &'a str, limit: usize) {
        let mut missing = Vec::new();
        let mut current = Some(path);
        while let Some(path) = current.filter(|path| !self.kept.contains(path)) {
            if self.kept.len() + missing.len() == limit || !self.available.contains_key(path) {
                return;
            }
            missing.push(path);
            current = path.rsplit_once('/').map(|(parent, _)| parent);
        }
        self.kept.extend(missing.into_iter().rev());
    }

    fn keep_group(&mut self, context_only: bool, limit: usize) {
        for entry in &self.source.entries {
            if self.kept.len() == limit {
                break;
            }
            if self.source.context_only_paths.contains(&entry.path) == context_only {
                self.keep(&entry.path, limit);
            }
        }
    }
}

/// Give retained changed files priority, then share space between the two path groups.
pub(super) fn select_tree(
    source: &RepositorySnapshot,
    priority_files: &[&BranchChangedFile],
    limits: ReportLimits,
) -> TreeSelection {
    if source.entries.len() <= limits.tree_entries {
        return TreeSelection {
            entries: source.entries.clone(),
            omitted_entry_count: 0,
        };
    }
    let mut paths = TreePaths {
        source,
        available: source
            .entries
            .iter()
            .map(|entry| (entry.path.as_str(), entry))
            .collect(),
        kept: HashSet::with_capacity(limits.tree_entries),
    };
    for file in priority_files {
        if let Some(entry) = paths
            .available
            .get(file.changed_file.path.as_str())
            .copied()
            && (entry.kind == FileEntryKind::File || entry.change.is_some())
        {
            paths.keep(&entry.path, limits.tree_entries);
        }
    }
    let context_slots = limits
        .context_entries
        .min(limits.tree_entries - paths.kept.len())
        .min(source.context_only_paths.len());
    paths.keep_group(false, limits.tree_entries - context_slots);
    paths.keep_group(true, limits.tree_entries);
    paths.keep_group(false, limits.tree_entries);

    let entries: Vec<_> = source
        .entries
        .iter()
        .filter(|entry| paths.kept.contains(entry.path.as_str()))
        .cloned()
        .collect();
    TreeSelection {
        omitted_entry_count: (source.entries.len() - entries.len()) as u64,
        entries,
    }
}
