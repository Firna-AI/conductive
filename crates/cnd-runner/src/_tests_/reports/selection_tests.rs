//! Complete tree and changes reports select real paths and keep exact totals.

use cnd_runner_interface::file_changes::{ChangeKind, ChangesResponseSummary};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind, RunnerFileEvent};

use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot};

fn paths(entries: &[FileEntry]) -> Vec<&str> {
    entries.iter().map(|entry| entry.path.as_str()).collect()
}

#[tokio::test]
async fn keeps_uncommitted_changes_first_and_reports_exact_omitted_totals() {
    let mut current = named_snapshot(&["b-untracked", "c-modified", "d-modified", "z-modified"]);
    current.changes.files = vec![
        changed_file("a-deleted", 0, 10, false),
        changed_file("b-untracked", 3, 0, true),
        changed_file("c-modified", 7, 6, false),
        changed_file("d-modified", 1, 4, false),
        changed_file("z-modified", 2, 1, true),
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
        RunnerFileEvent::FilesSnapshot { tree },
        RunnerFileEvent::ChangesUpdated { changes },
    ] = events.as_slice()
    else {
        panic!("expected a complete tree and changes report");
    };
    let report = &changes.changes_response;
    assert_eq!(
        report
            .files
            .iter()
            .map(|file| file.changed_file.path.as_str())
            .collect::<Vec<_>>(),
        ["b-untracked", "z-modified", "a-deleted"],
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
