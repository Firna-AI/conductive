//! Independent report histories, content-only edits, and full recovery after failure.

use cnd_runner_interface::file_changes::ChangeKind;
use cnd_runner_interface::file_tree::{FileEntryKind, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;

use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot, snapshot};

fn kinds(events: &[(RunnerEvent, Option<String>)]) -> Vec<&'static str> {
    events
        .iter()
        .map(|(event, _)| match event {
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { .. }) => "tree",
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesChanged { .. }) => "delta",
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { .. }) => "changes",
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesUnavailable {}) => "unavailable",
            _ => "other",
        })
        .collect()
}

fn listed_changes(events: &[(RunnerEvent, Option<String>)]) -> (Vec<&str>, Option<u64>) {
    let report = events
        .iter()
        .find_map(|(event, _)| match event {
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }) => {
                Some(&changes.changes_response)
            }
            _ => None,
        })
        .unwrap();
    let paths = report
        .files
        .iter()
        .map(|row| row.changed_file.path.as_str())
        .collect();
    (paths, report.omitted.as_ref().map(|totals| totals.files))
}

fn full_tree(events: &[(RunnerEvent, Option<String>)]) -> (u64, Vec<&str>, Option<u64>) {
    let tree = events
        .iter()
        .find_map(|(event, _)| match event {
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) => Some(tree),
            _ => None,
        })
        .unwrap();
    let paths = tree
        .entries
        .iter()
        .map(|entry| entry.path.as_str())
        .collect();
    (tree.part.revision, paths, tree.omitted_entry_count)
}

#[tokio::test]
async fn requested_kind_preserves_other_history_and_failed_scans_require_full_recovery() {
    let h = Fixture::new(snapshot(vec![]));
    h.files.refresh(true, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes", "tree"]);
    h.files
        .refresh(true, Some(FileReportKind::Changes), None)
        .await
        .unwrap();
    assert_eq!(kinds(&h.take()), ["changes"]);
    h.files.refresh(false, None, None).await.unwrap();
    assert!(h.take().is_empty());

    let mut first = snapshot(vec!["first".into()]);
    first.changes.unpushed_commits = Some(7);
    *h.current.lock().unwrap() = Some(first);
    h.files
        .refresh(true, Some(FileReportKind::Tree), None)
        .await
        .unwrap();
    assert_eq!(kinds(&h.take()), ["tree"]);
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes", "tree"]);
    let mut current = snapshot(vec!["second".into()]);
    current.changes.uncommitted_file_count = Some(7);
    *h.current.lock().unwrap() = Some(current);
    h.files
        .refresh(true, Some(FileReportKind::Changes), None)
        .await
        .unwrap();
    assert_eq!(kinds(&h.take()), ["changes"]);
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["tree"]);
    *h.current.lock().unwrap() = None;
    h.files
        .refresh(true, Some(FileReportKind::Changes), Some("failed".into()))
        .await
        .unwrap();
    let unavailable = h.take();
    assert_eq!(kinds(&unavailable), ["unavailable"]);
    assert_eq!(unavailable[0].1.as_deref(), Some("failed"));
    *h.current.lock().unwrap() = Some(snapshot(vec!["second".into()]));
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes", "tree"]);
}

#[tokio::test]
async fn changes_only_repair_refreshes_a_reverted_ignored_context_file() {
    const PATH: &str = ".context/note.txt";
    let mut original = named_snapshot(&[".context", PATH]);
    original.entries[0].kind = FileEntryKind::Directory;
    original.context_only_paths = [".context", PATH].map(str::to_owned).into();
    original.read_identities = [(PATH.into(), "original bytes".into())].into();
    let h = Fixture::new(original.clone());
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    let mut edited = original.clone();
    edited.read_identities = [(PATH.into(), "temporary bytes".into())].into();
    *h.current.lock().unwrap() = Some(edited);
    h.files
        .refresh(true, Some(FileReportKind::Changes), None)
        .await
        .unwrap();
    assert_eq!(kinds(&h.take()), ["changes"]);

    *h.current.lock().unwrap() = Some(original);
    h.files.refresh(false, None, None).await.unwrap();
    let events = h.take();
    assert_eq!(kinds(&events), ["tree"]);
    assert_eq!(full_tree(&events), (2, vec![".context", PATH], Some(0)));
}

#[tokio::test]
async fn base_only_change_after_changes_repair_refreshes_the_omitted_diff_with_a_full_tree() {
    let mut current = named_snapshot(&["b-normal", "z-dir", "z-dir/file"]);
    current.entries[1].kind = FileEntryKind::Directory;
    current.entries[2].change = Some(ChangeKind::Modified);
    current.changes.files = vec![changed_file("z-dir/file", 1, 1, false)];
    current
        .identities
        .insert("z-dir/file".into(), "same content".into());
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 1,
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    assert_eq!(listed_changes(&h.take()), (vec!["z-dir/file"], Some(0)));

    current.base_commit = "repair base".into();
    let mut deleted = changed_file("a-deleted", 0, 1, false);
    deleted.changed_file.change = ChangeKind::Deleted;
    current.changes.files.insert(0, deleted);
    *h.current.lock().unwrap() = Some(current.clone());
    h.files
        .refresh(true, Some(FileReportKind::Changes), None)
        .await
        .unwrap();
    let repair = h.take();
    assert_eq!(kinds(&repair), ["changes"]);
    assert_eq!(listed_changes(&repair), (vec!["a-deleted"], Some(1)));

    current.base_commit = "base with the same file".into();
    current.changes.files.truncate(1);
    current.entries[2].change = None;
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let events = h.take();
    assert_eq!(kinds(&events), ["changes", "tree"]);
    assert_eq!(full_tree(&events), (2, vec!["b-normal"], Some(2)));
    assert_eq!(listed_changes(&events), (vec!["a-deleted"], Some(0)));
}

#[tokio::test]
async fn base_change_and_new_uncommitted_file_after_tree_repair_refresh_the_omitted_diff() {
    let mut current = named_snapshot(&["m-published", "z", "zz-ordinary"]);
    current.entries[0].change = Some(ChangeKind::Modified);
    current.changes.files = vec![changed_file("m-published", 1, 1, false)];
    current.identities.insert("z".into(), "same content".into());
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 3,
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    assert_eq!(listed_changes(&h.take()), (vec!["m-published"], Some(0)));

    current.base_commit = "repair base".into();
    current.entries[0].change = None;
    current.entries[1].change = Some(ChangeKind::Modified);
    current.changes.files = vec![changed_file("z", 2, 1, false)];
    *h.current.lock().unwrap() = Some(current.clone());
    h.files
        .refresh(true, Some(FileReportKind::Tree), None)
        .await
        .unwrap();
    let repair = h.take();
    assert_eq!(kinds(&repair), ["tree"]);
    assert_eq!(
        full_tree(&repair),
        (2, vec!["m-published", "z", "zz-ordinary"], Some(0))
    );

    current.base_commit = "new base".into();
    let mut entry = named_snapshot(&["a-untracked"]).entries.remove(0);
    entry.change = Some(ChangeKind::Untracked);
    current.entries.insert(0, entry);
    current
        .identities
        .insert("a-untracked".into(), "new content".into());
    let mut untracked = changed_file("a-untracked", 1, 0, true);
    untracked.changed_file.change = ChangeKind::Untracked;
    current.changes.files.insert(0, untracked);
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let events = h.take();
    assert_eq!(kinds(&events), ["changes", "tree"]);
    assert_eq!(
        full_tree(&events),
        (3, vec!["a-untracked", "m-published", "z"], Some(1))
    );
    assert_eq!(listed_changes(&events), (vec!["a-untracked"], Some(1)));
}

async fn check_return_to_original_base(deletions: usize) {
    let original = named_snapshot(&["live"]);
    let h = Fixture::new(original.clone());
    h.files.refresh(true, None, None).await.unwrap();
    assert_eq!(listed_changes(&h.take()), (vec![], Some(0)));

    let mut other_base = original.clone();
    other_base.base_commit = "base with deleted files".into();
    other_base.changes.files = (0..deletions)
        .map(|index| {
            let mut row = changed_file(&format!("deleted-{index:04}"), 0, 1, false);
            row.changed_file.change = ChangeKind::Deleted;
            row
        })
        .collect();
    *h.current.lock().unwrap() = Some(other_base);
    h.files
        .refresh(true, Some(FileReportKind::Tree), None)
        .await
        .unwrap();
    let repair = h.take();
    assert_eq!(kinds(&repair), ["tree"]);
    assert_eq!(full_tree(&repair), (2, vec!["live"], Some(0)));

    *h.current.lock().unwrap() = Some(original);
    h.files.refresh(false, None, None).await.unwrap();
    let events = h.take();
    assert_eq!(kinds(&events), ["tree"]);
    assert_eq!(full_tree(&events), (3, vec!["live"], Some(0)));
}

#[tokio::test]
async fn restores_diffs_after_returning_from_a_tree_repair_with_capped_deletions() {
    check_return_to_original_base(1_001).await;
}

#[tokio::test]
async fn restores_diffs_after_returning_from_a_tree_repair_with_complete_changes() {
    check_return_to_original_base(2).await;
}

#[tokio::test]
async fn raw_read_identity_changes_only_tree_and_git_or_base_changes_refresh_changes() {
    let mut current = snapshot(vec!["file".into()]);
    current.identities.insert("file".into(), "git-a".into());
    current
        .read_identities
        .insert("file".into(), "raw-a".into());
    let h = Fixture::new(current.clone());
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    current
        .read_identities
        .insert("file".into(), "raw-b".into());
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["delta"]);
    current.identities.insert("file".into(), "git-b".into());
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes", "delta"]);
    current.base_commit = "new-base".into();
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes"]);
    current.changes.unpushed_commits = Some(8);
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(kinds(&h.take()), ["changes"]);
}
