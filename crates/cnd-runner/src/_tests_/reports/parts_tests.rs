//! Serialized budgets include metadata and leave every path and summary whole.

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangedFile, ChangesResponseSummary,
};
use cnd_runner_interface::file_tree::{FILE_EVENT_MAX_BYTES, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;

use crate::json::codec;
use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, snapshot};

#[tokio::test]
async fn splits_whole_filtered_entries_and_repeats_complete_changes_metadata() {
    let mut current = snapshot(
        (0..6)
            .map(|index| format!("{}{}", "x".repeat(90_000), index))
            .collect(),
    );
    current.changes.files = current
        .entries
        .iter()
        .map(|entry| BranchChangedFile {
            changed_file: ChangedFile {
                path: entry.path.clone(),
                display_path: None,
                previous_path: None,
                previous_display_path: None,
                change: ChangeKind::Modified,
                added: 2,
                removed: 1,
            },
            uncommitted: true,
        })
        .collect();
    current.changes.summary.files = 6;
    current.changes.summary.added = 12;
    current.changes.summary.removed = 6;
    let h = Fixture::new(current.clone());
    h.files.refresh(true, None, None).await.unwrap();
    let events = h.take();
    assert_eq!(events.len(), 6);
    let mut entries = vec![];
    let mut files = vec![];
    for (index, (event, _)) in events.iter().enumerate() {
        assert!(codec::encode(event).unwrap().len() <= FILE_EVENT_MAX_BYTES as usize);
        match event {
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) => {
                assert_eq!(tree.omitted_entry_count, Some(0));
                assert_eq!(
                    (
                        tree.part.revision,
                        tree.part.part_number,
                        tree.part.part_count
                    ),
                    (1, index as u64 + 1, 3)
                );
                entries.extend(tree.entries.clone());
            }
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }) => {
                assert_eq!(changes.changes_response.summary, current.changes.summary);
                assert_eq!(
                    changes.changes_response.omitted,
                    Some(ChangesResponseSummary {
                        files: 0,
                        added: 0,
                        removed: 0
                    })
                );
                assert_eq!(changes.changes_response.unpushed_commits, Some(3));
                assert_eq!(changes.changes_response.uncommitted_file_count, Some(4));
                assert_eq!(
                    (
                        changes.runner_file_revision_part.revision,
                        changes.runner_file_revision_part.part_number,
                        changes.runner_file_revision_part.part_count
                    ),
                    (1, index as u64 - 2, 3)
                );
                files.extend(changes.changes_response.files.clone());
            }
            _ => panic!("expected report part"),
        }
    }
    assert_eq!(entries, current.entries);
    assert_eq!(files, current.changes.files);
    h.files
        .refresh(true, Some(FileReportKind::Tree), Some("receipt".into()))
        .await
        .unwrap();
    let requested = h.take();
    assert_eq!(requested.iter().filter(|(_, id)| id.is_some()).count(), 1);
    assert_eq!(requested.last().unwrap().1.as_deref(), Some("receipt"));
}

#[tokio::test]
async fn multipart_byte_budgets_include_repeated_omission_metadata() {
    // Two of these rows fit the previous format and exceed 256 KiB with metadata.
    for (kind, path_bytes) in [
        (FileReportKind::Tree, 130_973),
        (FileReportKind::Changes, 130_898),
    ] {
        let mut current = snapshot(vec![
            format!("{}0", "a".repeat(path_bytes)),
            format!("{}1", "a".repeat(path_bytes)),
            "z".into(),
        ]);
        current.changes.files = vec![
            changed_file(&current.entries[0].path, 2, 1, true),
            changed_file(&current.entries[1].path, 2, 1, true),
            changed_file("z", 5, 2, true),
        ];
        let h = Fixture::with_limits(
            current,
            ReportLimits {
                tree_entries: 2,
                changed_files: 2,
                ..ReportLimits::default()
            },
        );
        h.files.refresh(true, Some(kind), None).await.unwrap();
        let reports = h.take_reports();
        assert_eq!(reports.len(), 2, "{kind:?}");
        for report in reports {
            assert!(codec::encode(&report).unwrap().len() <= FILE_EVENT_MAX_BYTES as usize);
            let (rows, omitted_count, totals) = match report {
                RunnerFileEvent::FilesSnapshot { tree } => {
                    (tree.entries.len(), tree.omitted_entry_count, None)
                }
                RunnerFileEvent::ChangesUpdated { changes } => {
                    let response = changes.changes_response;
                    (
                        response.files.len(),
                        response.omitted.as_ref().map(|totals| totals.files),
                        Some((response.summary, response.omitted)),
                    )
                }
                _ => panic!("expected a full report part"),
            };
            assert_eq!((rows, omitted_count), (1, Some(1)));
            assert_eq!(
                totals,
                (kind == FileReportKind::Changes).then_some((
                    ChangesResponseSummary {
                        files: 2,
                        added: 4,
                        removed: 2
                    },
                    Some(ChangesResponseSummary {
                        files: 1,
                        added: 5,
                        removed: 2
                    }),
                ))
            );
        }
    }
}

#[tokio::test]
async fn splits_deltas_by_count_and_bytes_and_recovers_after_an_impossible_entry() {
    let h = Fixture::new(snapshot(vec![]));
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    *h.current.lock().unwrap() = Some(snapshot(
        (0..1030).map(|index| format!("file-{index}")).collect(),
    ));
    h.files.refresh(false, None, None).await.unwrap();
    *h.current.lock().unwrap() = Some(snapshot(
        (0..6)
            .map(|index| format!("{}{index}", "\n".repeat(30_000)))
            .collect(),
    ));
    h.files.refresh(false, None, None).await.unwrap();
    let events = h.take();
    let deltas: Vec<_> = events
        .iter()
        .filter_map(|(event, _)| match event {
            RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesChanged { delta }) => Some(delta),
            _ => None,
        })
        .collect();
    assert_eq!(
        deltas
            .iter()
            .map(|delta| delta.changes.len())
            .collect::<Vec<_>>(),
        [512, 512, 6, 512, 512, 10, 2]
    );
    assert_eq!(
        deltas
            .iter()
            .map(|delta| delta.revision)
            .collect::<Vec<_>>(),
        [2, 3, 4, 5, 6, 7, 8]
    );
    assert!(
        deltas
            .iter()
            .all(|delta| delta.omitted_entry_count == Some(0))
    );
    for (event, _) in events {
        assert!(codec::encode(&event).unwrap().len() <= 262144);
    }
    *h.current.lock().unwrap() = Some(snapshot(vec!["\n".repeat(140_000)]));
    h.files.refresh(true, None, None).await.unwrap();
    assert!(h.take().is_empty());
    *h.current.lock().unwrap() = Some(snapshot(vec![]));
    h.files.refresh(true, None, None).await.unwrap();
    assert!(
        matches!(&h.take()[0].0, RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) if tree.part.revision == 9)
    );
}

#[tokio::test]
async fn content_updates_that_keep_the_same_limited_membership_still_split() {
    let mut current = snapshot((0..514).map(|index| format!("file-{index:03}")).collect());
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 513,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    for entry in &current.entries[..513] {
        current
            .read_identities
            .insert(entry.path.clone(), "new content".into());
    }
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let deltas = reports
        .iter()
        .filter_map(|report| match report {
            RunnerFileEvent::FilesChanged { delta } => Some((
                delta.revision,
                delta.changes.len(),
                delta.omitted_entry_count,
            )),
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(reports.len(), 2);
    assert_eq!(deltas, [(2, 512, Some(1)), (3, 1, Some(1))]);
}
