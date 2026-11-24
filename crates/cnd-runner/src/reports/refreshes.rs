//! Find paths whose content or base-relative row changed in the full scans.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::iter;

use cnd_runner_interface::file_changes::{BranchChangedFile, ChangesResponse};

use crate::repository::service::{Checkpoint, RepositorySnapshot};

fn file_paths(file: &BranchChangedFile) -> impl Iterator<Item = &str> {
    iter::once(file.changed_file.path.as_str()).chain(file.changed_file.previous_path.as_deref())
}

/// Paths that a changes report already asks readers to refresh.
pub(super) fn listed_changes_paths(changes: &ChangesResponse) -> HashSet<String> {
    changes
        .files
        .iter()
        .flat_map(file_paths)
        .map(str::to_owned)
        .collect()
}

fn identity_changes<'a>(
    before: &'a Checkpoint,
    after: &'a Checkpoint,
) -> impl Iterator<Item = &'a str> {
    before
        .iter()
        .filter(move |(path, identity)| after.get(*path) != Some(*identity))
        .map(|(path, _)| path.as_str())
        .chain(
            after
                .keys()
                .filter(move |path| !before.contains_key(*path))
                .map(String::as_str),
        )
}

/// Changed Git or readable identities, including paths that disappeared.
pub(super) fn content_paths<'a>(
    before: &'a RepositorySnapshot,
    after: &'a RepositorySnapshot,
) -> BTreeSet<&'a str> {
    identity_changes(&before.identities, &after.identities)
        .chain(identity_changes(
            &before.read_identities,
            &after.read_identities,
        ))
        .collect()
}

/// Refresh paths that neither changes report names, including both names of a rename.
pub(super) fn omitted_diff_paths<'a>(
    before: &'a RepositorySnapshot,
    after: &'a RepositorySnapshot,
    listed_before: &HashSet<String>,
    listed_after: &HashSet<String>,
) -> BTreeSet<&'a str> {
    let mut refreshes = BTreeSet::new();
    let mut record = |file: &'a BranchChangedFile| {
        refreshes.extend(
            file_paths(file)
                .filter(|path| !listed_before.contains(*path) && !listed_after.contains(*path)),
        );
    };
    if before.base_commit != after.base_commit {
        for file in before.changes.files.iter().chain(&after.changes.files) {
            record(file);
        }
    } else if before.changes.files != after.changes.files {
        let mut remaining: HashMap<_, _> = after
            .changes
            .files
            .iter()
            .map(|file| (&file.changed_file.path, file))
            .collect();
        for file in &before.changes.files {
            let next = remaining.remove(&file.changed_file.path);
            if next != Some(file) {
                record(file);
                if let Some(next) = next {
                    record(next);
                }
            }
        }
        for file in remaining.into_values() {
            record(file);
        }
    }
    refreshes
}
