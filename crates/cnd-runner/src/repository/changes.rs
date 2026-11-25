//! Complete base-relative changes and independent raw-status and unpushed counts.

use std::collections::{BTreeMap, BTreeSet};

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangedFile, ChangesResponse, ChangesResponseSummary,
};

use super::context::path_order;
use super::entries::{path_input, zero_paths};
use super::error::{Error, ErrorResultExt, Result};
use super::index::TemporaryIndex;
use super::service::GitRepository;

fn counts(bytes: &[u8]) -> Result<BTreeMap<String, (u64, u64)>> {
    let records = zero_paths(bytes);
    let mut result = BTreeMap::new();
    let mut records = records.iter();
    while let Some(record) = records.next() {
        let mut fields = record.splitn(3, '\t');
        let added = fields.next().ok_or(Error::InvalidOutput)?;
        let removed = fields.next().ok_or(Error::InvalidOutput)?;
        let mut path = fields.next().ok_or(Error::InvalidOutput)?;
        if path.is_empty() {
            records.next().ok_or(Error::InvalidOutput)?;
            path = records.next().ok_or(Error::InvalidOutput)?;
        }
        result.insert(
            path.to_owned(),
            (added.parse().unwrap_or(0), removed.parse().unwrap_or(0)),
        );
    }
    Ok(result)
}

/// Sort changed files by English collation with the raw path as the tie-break.
pub(crate) fn sort_changed_files_by_path(files: &mut [BranchChangedFile]) -> Result<()> {
    let order = path_order()?;
    files.sort_by(|a, b| order(&a.changed_file.path, &b.changed_file.path));
    Ok(())
}

/// Sum complete or selected change rows with overflow checks.
pub(crate) fn summarize_changes<'a>(
    files: impl IntoIterator<Item = &'a BranchChangedFile>,
) -> Option<ChangesResponseSummary> {
    let mut summary = ChangesResponseSummary {
        files: 0,
        added: 0,
        removed: 0,
    };
    for file in files {
        summary.files = summary.files.checked_add(1)?;
        summary.added = summary.added.checked_add(file.changed_file.added)?;
        summary.removed = summary.removed.checked_add(file.changed_file.removed)?;
    }
    Some(summary)
}

impl GitRepository {
    /// Refresh the rebuilt index so restored stat data cannot hide changed content.
    /// Snapshot scans finish parallel content reads first to warm Git's serial reads.
    pub(super) async fn index_changes(
        &self,
        index: &mut TemporaryIndex,
        branch: &str,
        sha: &str,
    ) -> Result<ChangesResponse> {
        self.index_run(index, &["update-index", "-q", "--unmerged", "--refresh"])
            .await?;
        if !index.unavailable.is_empty() {
            tracing::warn!("Some repository files cannot be stored by Git.");
        }
        if !index.untracked.is_empty() {
            let mut request = index.request(
                self,
                &[
                    "add",
                    "--intent-to-add",
                    "--pathspec-from-file=-",
                    "--pathspec-file-nul",
                ],
            );
            request.input = path_input(&index.untracked);
            self.runner.run(request).await?;
        }
        let names = self.comparison(index, sha, "--name-status").await?;
        let numbers = counts(&self.comparison(index, sha, "--numstat").await?)?;
        let status = self
            .run(&["status", "--porcelain=v1", "-z", "--untracked-files=all"])
            .await?;
        let unpushed = self
            .run(&["rev-list", "--count", "HEAD", "--not", "--remotes"])
            .await?;
        let records = zero_paths(&status);
        let mut records = records.iter();
        let mut dirty = BTreeSet::new();
        let mut uncommitted_file_count = 0;
        while let Some(record) = records.next() {
            let status = record.get(..2).ok_or(Error::InvalidOutput)?;
            dirty.insert(record.get(3..).ok_or(Error::InvalidOutput)?.to_owned());
            uncommitted_file_count += 1;
            if status.contains(['R', 'C']) {
                dirty.insert(records.next().ok_or(Error::InvalidOutput)?.clone());
            }
        }
        let records = zero_paths(&names);
        let mut records = records.iter();
        let mut files = Vec::new();
        while let Some(status) = records.next() {
            let old = records.next().ok_or(Error::InvalidOutput)?;
            let renamed = status.starts_with(['R', 'C']);
            let path = if renamed {
                records.next().ok_or(Error::InvalidOutput)?
            } else {
                old
            };
            let change = match status.as_bytes().first() {
                Some(b'A') if index.untracked.contains(path) => ChangeKind::Untracked,
                Some(b'A') => ChangeKind::Added,
                Some(b'D') => ChangeKind::Deleted,
                Some(b'R') => ChangeKind::Renamed,
                _ => ChangeKind::Modified,
            };
            let (added, removed) = numbers.get(path).copied().unwrap_or_default();
            files.push(BranchChangedFile {
                changed_file: ChangedFile {
                    path: path.clone(),
                    display_path: None,
                    previous_path: renamed.then(|| old.clone()),
                    previous_display_path: None,
                    change,
                    added,
                    removed,
                },
                uncommitted: dirty.contains(path) || dirty.contains(old),
            });
        }
        sort_changed_files_by_path(&mut files)?;
        let summary = summarize_changes(&files).ok_or(Error::InvalidOutput)?;
        Ok(ChangesResponse {
            base_branch: branch.into(),
            display_base_branch: None,
            unpushed_commits: Some(
                String::from_utf8_lossy(&unpushed)
                    .trim()
                    .parse()
                    .internal()?,
            ),
            uncommitted_file_count: Some(uncommitted_file_count),
            files,
            summary,
            omitted: None,
        })
    }
}
