//! Tree and changes revisions keep bounded selections and independent repairs.

use cnd_runner_interface::file_changes::ChangesResponseSummary;
use cnd_runner_interface::file_tree::{
    FileEntryKind, FileTreeChange, FileTreeDelta, RunnerFileEvent,
};
use cnd_runner_interface::runner::RunnerEvent;

use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot, snapshot};

fn operations(delta: &FileTreeDelta) -> Vec<(&str, &str)> {
    delta
        .changes
        .iter()
        .map(|change| match change {
            FileTreeChange::Remove { path } => ("remove", path.as_str()),
            FileTreeChange::Upsert { entry } => ("upsert", entry.path.as_str()),
            FileTreeChange::Move { entry, .. } => ("move", entry.path.as_str()),
        })
        .collect()
}

#[tokio::test]
async fn applies_growth_eviction_omitted_deletion_and_return_below_limit_as_deltas() {
    let h = Fixture::with_limits(
        named_snapshot(&["a", "b"]),
        ReportLimits {
            tree_entries: 2,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    assert!(
        matches!(&h.take_reports()[1], RunnerFileEvent::FilesSnapshot { tree }
        if tree.entries.len() == 2 && tree.omitted_entry_count == Some(0))
    );

    type Case<'a> = (&'a [&'a str], bool, u64, &'a [(&'a str, &'a str)]);
    let cases: [Case<'_>; 5] = [
        (&["a", "b", "c"], true, 1, &[("remove", "c")]),
        (&["a", "b", "c", "d"], true, 2, &[]),
        (
            &["a", "a0", "b", "c", "d"],
            true,
            3,
            &[("remove", "b"), ("upsert", "a0")],
        ),
        (&["a", "a0", "b", "d"], false, 2, &[("remove", "c")]),
        (
            &["b"],
            false,
            0,
            &[("remove", "a"), ("remove", "a0"), ("upsert", "b")],
        ),
    ];
    for (index, (paths, has_c, omitted, expected)) in cases.into_iter().enumerate() {
        let mut current = named_snapshot(paths);
        if has_c {
            current.read_identities.insert("c".into(), "c bytes".into());
        }
        if let Some(directory) = current.entries.iter_mut().find(|entry| entry.path == "d") {
            directory.kind = FileEntryKind::Directory;
        }
        *h.current.lock().unwrap() = Some(current);
        h.files.refresh(false, None, None).await.unwrap();
        let reports = h.take_reports();
        assert_eq!(reports.len(), 1, "scan {index}");
        let RunnerFileEvent::FilesChanged { delta } = &reports[0] else {
            panic!("scan {index}: expected a tree delta");
        };
        assert_eq!(delta.revision, index as u64 + 2);
        assert_eq!(delta.omitted_entry_count, Some(omitted));
        assert_eq!(operations(delta), expected, "scan {index}");
    }
}

#[tokio::test]
async fn an_edit_of_an_omitted_file_refreshes_the_path_and_resends_the_same_changes_totals() {
    let mut current = named_snapshot(&["a", "z"]);
    current.changes.files = vec![changed_file("a", 5, 1, true), changed_file("z", 3, 2, true)];
    current.identities.insert("z".into(), "before".into());
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
    current.identities.insert("z".into(), "after".into());
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 2);
    let [
        RunnerFileEvent::ChangesUpdated { changes },
        RunnerFileEvent::FilesChanged { delta },
    ] = reports.as_slice()
    else {
        panic!("expected Changes followed by an absent-path refresh");
    };
    let RunnerFileEvent::ChangesUpdated { changes: before } = &initial[0] else {
        panic!("expected initial changes");
    };
    assert_eq!(operations(delta), [("remove", "z")]);
    assert_eq!(delta.omitted_entry_count, Some(1));
    assert_eq!(changes.runner_file_revision_part.revision, 2);
    assert_eq!(changes.changes_response, before.changes_response);
    assert_eq!(
        changes.changes_response.omitted,
        Some(ChangesResponseSummary {
            files: 1,
            added: 3,
            removed: 2
        })
    );
}

#[tokio::test]
async fn limited_membership_replacements_send_one_delta_or_one_full_tree() {
    for (cap, omitted_before, omitted_after, full) in [
        (256, true, true, false),
        (257, true, false, true),
        (257, false, true, true),
    ] {
        let paths = |prefix, omitted: bool| {
            (0..cap)
                .map(|index| format!("{prefix}-{index:03}"))
                .chain(omitted.then(|| "z-omitted".into()))
                .collect()
        };
        let h = Fixture::with_limits(
            snapshot(paths('a', omitted_before)),
            ReportLimits {
                tree_entries: cap,
                ..ReportLimits::default()
            },
        );
        h.files.refresh(true, None, None).await.unwrap();
        h.take();
        *h.current.lock().unwrap() = Some(snapshot(paths('b', omitted_after)));
        h.files.refresh(false, None, None).await.unwrap();
        let reports = h.take_reports();
        assert_eq!(reports.len(), 1, "cap {cap}");
        assert_eq!(
            matches!(&reports[0], RunnerFileEvent::FilesSnapshot { .. }),
            full
        );
        let (revision, omitted, count, boundary) = match &reports[0] {
            RunnerFileEvent::FilesSnapshot { tree } => (
                tree.part.revision,
                tree.omitted_entry_count,
                tree.entries.len(),
                None,
            ),
            RunnerFileEvent::FilesChanged { delta } => {
                let operations = operations(delta);
                (
                    delta.revision,
                    delta.omitted_entry_count,
                    operations.len(),
                    Some((operations.get(255).copied(), operations.get(256).copied())),
                )
            }
            _ => panic!("expected a tree update"),
        };
        assert_eq!(revision, 2);
        assert_eq!(omitted, Some(u64::from(omitted_after)));
        assert_eq!(count, if full { cap } else { 512 });
        assert_eq!(
            boundary,
            (!full).then_some((Some(("remove", "a-255")), Some(("upsert", "b-000"))))
        );
    }
}

#[tokio::test]
async fn requests_repair_only_the_requested_list_with_its_new_bounded_selection() {
    let mut current = named_snapshot(&["a", "z"]);
    current.changes.files = vec![
        changed_file("a", 5, 1, false),
        changed_file("z", 3, 2, false),
    ];
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 1,
            changed_files: 1,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    current.changes.files[1].uncommitted = true;
    *h.current.lock().unwrap() = Some(current);
    h.files
        .refresh(
            true,
            Some(FileReportKind::Changes),
            Some("changes repair".into()),
        )
        .await
        .unwrap();
    let reports = h.take();
    assert_eq!(reports.len(), 1);
    assert_eq!(reports[0].1.as_deref(), Some("changes repair"));
    let RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }) = &reports[0].0
    else {
        panic!("expected the repair to send changes");
    };
    assert_eq!(changes.runner_file_revision_part.revision, 2);
    assert_eq!(changes.changes_response.files.len(), 1);
    assert_eq!(changes.changes_response.files[0].changed_file.path, "z");
    assert_eq!(
        changes.changes_response.omitted,
        Some(ChangesResponseSummary {
            files: 1,
            added: 5,
            removed: 1
        })
    );
    h.files
        .refresh(true, Some(FileReportKind::Tree), Some("tree repair".into()))
        .await
        .unwrap();
    let reports = h.take();
    assert_eq!(reports.len(), 1);
    assert_eq!(reports[0].1.as_deref(), Some("tree repair"));
    let RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) = &reports[0].0
    else {
        panic!("expected the repair to send a full tree");
    };
    assert_eq!(tree.part.revision, 2);
    assert_eq!(tree.omitted_entry_count, Some(1));
    assert_eq!(
        tree.entries
            .iter()
            .map(|entry| entry.path.as_str())
            .collect::<Vec<_>>(),
        ["z"]
    );
    h.files.refresh(false, None, None).await.unwrap();
    assert_eq!(h.take_reports(), []);
}
