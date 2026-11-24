//! Complete tree and changes reports select real paths and keep exact totals.

use cnd_runner_interface::file_changes::{ChangeKind, ChangesResponseSummary};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind, RunnerFileEvent};

use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot, snapshot};

fn paths(entries: &[FileEntry]) -> Vec<&str> {
    entries.iter().map(|entry| entry.path.as_str()).collect()
}

#[tokio::test]
async fn production_reporter_enforces_tree_changes_and_context_limits() {
    let mut current = snapshot(
        [".context".into()]
            .into_iter()
            .chain((0..5_000).map(|index| format!(".context/note-{index:04}")))
            .chain((0..45_000).map(|index| format!("file-{index:05}")))
            .collect(),
    );
    current.entries[0].kind = FileEntryKind::Directory;
    current.context_only_paths = current.entries[..5_001]
        .iter()
        .map(|entry| entry.path.clone())
        .collect();
    current.changes.files = current.entries[5_001..6_002]
        .iter()
        .map(|entry| changed_file(&entry.path, 1, 0, true))
        .collect();
    let h = Fixture::new(current);
    h.files.refresh(true, None, None).await.unwrap();

    let mut tree_entries = 0;
    let mut changed_files = 0;
    let mut context_entries = 0;
    for report in h.take_reports() {
        match report {
            RunnerFileEvent::FilesSnapshot { tree } => {
                tree_entries += tree.entries.len();
                context_entries += tree
                    .entries
                    .iter()
                    .filter(|entry| entry.path == ".context" || entry.path.starts_with(".context/"))
                    .count();
            }
            RunnerFileEvent::ChangesUpdated { changes } => {
                changed_files += changes.changes_response.files.len();
            }
            _ => panic!("expected parts of a full report"),
        }
    }
    assert_eq!(
        (tree_entries, changed_files, context_entries),
        (50_000, 1_000, 5_000)
    );
}

#[tokio::test]
async fn keeps_uncommitted_changes_first_and_reports_exact_omitted_totals() {
    let mut current = named_snapshot(&["á.txt", "c-modified", "d-modified", "Z-modified"]);
    current.changes.files = vec![
        changed_file("a\u{301}.txt", 0, 10, false),
        changed_file("á.txt", 3, 0, true),
        changed_file("c-modified", 7, 6, false),
        changed_file("d-modified", 1, 4, false),
        changed_file("Z-modified", 2, 1, true),
    ];
    current.changes.files[0].changed_file.change = ChangeKind::Deleted;
    current.changes.files[1].changed_file.change = ChangeKind::Untracked;
    current.entries[1].change = Some(ChangeKind::Modified);
    let h = Fixture::with_limits(
        current,
        ReportLimits {
            changed_files: 3,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    let events = h.take_reports();
    let [
        RunnerFileEvent::ChangesUpdated { changes },
        RunnerFileEvent::FilesSnapshot { tree },
    ] = events.as_slice()
    else {
        panic!("expected Changes followed by a complete tree");
    };
    let report = &changes.changes_response;
    assert_eq!(
        report
            .files
            .iter()
            .map(|file| file.changed_file.path.as_str())
            .collect::<Vec<_>>(),
        ["a\u{301}.txt", "á.txt", "Z-modified"],
    );
    assert_eq!(
        report.summary,
        ChangesResponseSummary {
            files: 3,
            added: 5,
            removed: 11
        }
    );
    assert_eq!(
        report.omitted,
        Some(ChangesResponseSummary {
            files: 2,
            added: 8,
            removed: 10
        })
    );
    assert_eq!(
        (report.uncommitted_file_count, report.unpushed_commits),
        (Some(4), Some(3))
    );
    assert_eq!(tree.entries[1].change, Some(ChangeKind::Modified));
}

#[tokio::test]
async fn keeps_priority_files_with_ancestors_and_skips_an_oversized_closure() {
    let mut current = named_snapshot(&[
        "a",
        "b",
        "edits",
        "edits/work.txt",
        "nested",
        "nested/one",
        "nested/one/two",
        "nested/one/two/deep.txt",
        "z-last",
    ]);
    for index in [2, 4, 5, 6] {
        current.entries[index].kind = FileEntryKind::Directory;
    }
    current.changes.files = vec![
        changed_file("edits/work.txt", 7, 0, true),
        changed_file("nested/one/two/deep.txt", 3, 0, true),
        changed_file("z-last", 2, 0, false),
    ];
    let h = Fixture::with_limits(
        current,
        ReportLimits {
            tree_entries: 5,
            ..ReportLimits::default()
        },
    );
    h.files
        .refresh(true, Some(FileReportKind::Tree), None)
        .await
        .unwrap();
    let events = h.take_reports();
    let [RunnerFileEvent::FilesSnapshot { tree }] = events.as_slice() else {
        panic!("expected a bounded full tree");
    };
    assert_eq!(
        paths(&tree.entries),
        ["a", "b", "edits", "edits/work.txt", "z-last"]
    );
    assert_eq!(tree.omitted_entry_count, Some(4));
}

#[tokio::test]
async fn tree_priority_keeps_changed_submodules_and_files_that_remain_on_disk() {
    let mut current = named_snapshot(&["a-committed", "m-replacement", "y-submodule", "z-on-disk"]);
    current.entries[0].change = Some(ChangeKind::Modified);
    current.entries[1].kind = FileEntryKind::Directory;
    current.entries[2].kind = FileEntryKind::Directory;
    current.entries[2].change = Some(ChangeKind::Modified);
    current.entries[3].change = Some(ChangeKind::Deleted);
    current.changes.files = vec![
        changed_file("a-committed", 1, 0, false),
        changed_file("m-replacement", 0, 1, true),
        changed_file("y-submodule", 0, 0, true),
        changed_file("z-on-disk", 0, 2, true),
    ];
    current.changes.files[1].changed_file.change = ChangeKind::Deleted;
    current.changes.files[3].changed_file.change = ChangeKind::Deleted;
    let h = Fixture::with_limits(
        current,
        ReportLimits {
            tree_entries: 2,
            ..ReportLimits::default()
        },
    );

    h.files
        .refresh(true, Some(FileReportKind::Tree), None)
        .await
        .unwrap();
    let events = h.take_reports();
    let [RunnerFileEvent::FilesSnapshot { tree }] = events.as_slice() else {
        panic!("expected a bounded full tree");
    };
    assert_eq!(paths(&tree.entries), ["y-submodule", "z-on-disk"]);
    assert_eq!(tree.omitted_entry_count, Some(2));
}

#[tokio::test]
async fn context_and_repository_groups_use_path_order_and_share_unused_slots() {
    let limits = ReportLimits {
        tree_entries: 5,
        context_entries: 2,
        ..ReportLimits::default()
    };
    type Case<'a> = (&'a [&'a str], &'a [&'a str], &'a [&'a str], u64);
    let cases: [Case<'_>; 3] = [
        (
            &[
                ".context",
                ".context/a",
                ".context/b",
                ".context/c",
                ".context/tracked",
                "a",
                "b",
            ],
            &[".context/a", ".context/b", ".context/c"],
            &[
                ".context",
                ".context/a",
                ".context/b",
                ".context/tracked",
                "a",
            ],
            2,
        ),
        (
            &[
                ".context",
                ".context/note",
                ".context/tracked",
                "a",
                "b",
                "c",
            ],
            &[".context/note"],
            &[".context", ".context/note", ".context/tracked", "a", "b"],
            1,
        ),
        (
            &[
                ".context",
                ".context/a",
                ".context/b",
                ".context/c",
                ".context/d",
                "a",
            ],
            &[
                ".context",
                ".context/a",
                ".context/b",
                ".context/c",
                ".context/d",
            ],
            &[".context", ".context/a", ".context/b", ".context/c", "a"],
            1,
        ),
    ];
    for (input, ignored, expected, omitted) in cases {
        let mut current = named_snapshot(input);
        current.entries[0].kind = FileEntryKind::Directory;
        current.context_only_paths = ignored.iter().map(|path| (*path).into()).collect();
        let h = Fixture::with_limits(current, limits);
        h.files
            .refresh(true, Some(FileReportKind::Tree), None)
            .await
            .unwrap();
        let events = h.take_reports();
        let [RunnerFileEvent::FilesSnapshot { tree }] = events.as_slice() else {
            panic!("expected a bounded full tree");
        };
        assert_eq!(paths(&tree.entries), expected);
        assert_eq!(tree.omitted_entry_count, Some(omitted));
    }
}
