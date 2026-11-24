//! Full change rows invalidate file and diff tabs outside the listed reports.

use cnd_runner_interface::file_changes::{ChangeKind, ChangesResponseSummary};
use cnd_runner_interface::file_tree::{FileTreeChange, RunnerFileEvent};

use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot};

#[tokio::test]
async fn new_base_and_empty_diff_refresh_old_omitted_rename_paths_and_listed_tree_entry() {
    let mut current = named_snapshot(&["a", "b", "z"]);
    current.changes.files = vec![
        changed_file("a", 1, 1, true),
        changed_file("b", 0, 0, false),
        changed_file("z", 5, 1, false),
    ];
    current.changes.files[1].changed_file.change = ChangeKind::Renamed;
    current.changes.files[1].changed_file.previous_path = Some("old-b".into());
    for file in &current.changes.files {
        current
            .identities
            .insert(file.changed_file.path.clone(), "same".into());
    }
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 2,
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    for (base, listed, files, added, removed) in [
        ("different base, same rows", 1, 2, 5, 1),
        ("new base, empty diff", 0, 0, 0, 0),
    ] {
        current.base_commit = base.into();
        if listed == 0 {
            current.changes.files.clear();
        }
        *h.current.lock().unwrap() = Some(current.clone());
        h.files.refresh(false, None, None).await.unwrap();
        let reports = h.take_reports();
        assert_eq!(reports.len(), 2, "{base}");
        let [
            RunnerFileEvent::FilesChanged { delta },
            RunnerFileEvent::ChangesUpdated { changes },
        ] = reports.as_slice()
        else {
            panic!("expected a tree delta and changes report");
        };
        assert_eq!(
            delta.changes,
            [
                FileTreeChange::Remove {
                    path: "old-b".into()
                },
                FileTreeChange::Remove { path: "z".into() },
                FileTreeChange::Upsert {
                    entry: current.entries[1].clone()
                },
            ],
            "{base}"
        );
        assert_eq!(delta.omitted_entry_count, Some(1));
        assert_eq!(changes.changes_response.files.len(), listed);
        assert_eq!(
            changes.changes_response.omitted,
            Some(ChangesResponseSummary {
                files,
                added,
                removed
            })
        );
    }
}

#[tokio::test]
async fn omitted_rename_pairing_changes_refresh_both_old_names_and_the_destination() {
    let mut current = named_snapshot(&["a", "b", "z"]);
    current.changes.files = vec![
        changed_file("a", 1, 2, true),
        changed_file("b", 3, 8, false),
        changed_file("z", 0, 0, false),
    ];
    for file in &current.changes.files {
        current
            .identities
            .insert(file.changed_file.path.clone(), "same".into());
    }
    current.changes.files[2].changed_file.change = ChangeKind::Renamed;
    current.changes.files[2].changed_file.previous_path = Some("old-one".into());
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 1,
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    let initial = h.take_reports();
    current.changes.files[2].changed_file.previous_path = Some("old-two".into());
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 2);
    let [
        RunnerFileEvent::FilesChanged { delta },
        RunnerFileEvent::ChangesUpdated { changes },
    ] = reports.as_slice()
    else {
        panic!("expected a tree delta and changes report");
    };
    assert_eq!(
        delta.changes,
        [
            FileTreeChange::Remove {
                path: "old-one".into()
            },
            FileTreeChange::Remove {
                path: "old-two".into()
            },
            FileTreeChange::Remove { path: "z".into() },
        ]
    );
    let RunnerFileEvent::ChangesUpdated { changes: before } = &initial[1] else {
        panic!("expected initial changes");
    };
    assert_eq!(changes.runner_file_revision_part.revision, 2);
    assert_eq!(changes.changes_response, before.changes_response);
}

#[tokio::test]
async fn too_many_diff_refreshes_replace_deltas_when_the_tree_omits_nothing() {
    let mut current = named_snapshot(&["a"]);
    current.changes.files.push(changed_file("a", 1, 0, true));
    current.changes.files.extend((0..513).map(|index| {
        let mut file = changed_file(&format!("old-{index:03}"), 0, 1, false);
        file.changed_file.change = ChangeKind::Deleted;
        file
    }));
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    current.base_commit = "new base".into();
    current.changes.files.clear();
    let a = current.entries[0].clone();
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 2);
    assert!(
        matches!(&reports[0], RunnerFileEvent::FilesSnapshot { tree }
        if tree.part.revision == 2 && tree.omitted_entry_count == Some(0) && tree.entries == [a])
    );
    assert!(
        matches!(&reports[1], RunnerFileEvent::ChangesUpdated { changes }
        if changes.runner_file_revision_part.revision == 2 && changes.changes_response.files.is_empty())
    );
}
