//! Complete report filtering precedes splitting and preserves operational paths.

use std::sync::Arc;

use cnd_runner_interface::file_tree::{FILE_EVENT_MAX_BYTES, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;

use crate::filter::service::{CredentialFilter, Credentials};
use crate::json::codec;
use crate::reports::files::FileReportKind;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, named_snapshot, snapshot};

fn expanding_filter() -> Arc<CredentialFilter> {
    let filter = CredentialFilter::default();
    filter.add("x".into()).unwrap();
    Arc::new(filter)
}

#[tokio::test]
async fn expanded_filtered_paths_split_before_emission_and_keep_request_paths() {
    let current = snapshot(
        (0..6)
            .map(|index| format!("{}{index}", "x".repeat(9000)))
            .collect(),
    );
    let h = Fixture::with_filter_and_limits(
        current.clone(),
        expanding_filter(),
        ReportLimits {
            tree_entries: 5,
            ..ReportLimits::default()
        },
    );
    h.files
        .refresh(true, Some(FileReportKind::Tree), Some("filtered".into()))
        .await
        .unwrap();
    let events = h.take();
    assert_eq!(events.len(), 3);
    let mut paths = vec![];
    for (event, _) in &events {
        assert!(codec::encode(event).unwrap().len() <= FILE_EVENT_MAX_BYTES as usize);
        let RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) = event else {
            panic!("expected filtered tree part");
        };
        assert_eq!(tree.part.part_count, 3);
        assert_eq!(tree.omitted_entry_count, Some(1));
        for entry in &tree.entries {
            assert_eq!(
                entry.display_path.as_deref(),
                Some(entry.path.replace('x', "[redacted]").as_str())
            );
            paths.push(entry.path.clone());
        }
    }
    assert_eq!(
        paths,
        current
            .entries
            .into_iter()
            .take(5)
            .map(|entry| entry.path)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        events
            .iter()
            .filter(|(_, receipt)| receipt.is_some())
            .count(),
        1
    );
    assert_eq!(events.last().unwrap().1.as_deref(), Some("filtered"));
}

#[tokio::test]
async fn masked_replacement_that_exceeds_the_delta_byte_budget_sends_one_bounded_tree() {
    let h = Fixture::with_filter_and_limits(
        named_snapshot(&["a", "b", "z"]),
        expanding_filter(),
        ReportLimits {
            tree_entries: 2,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    let first = format!("{}0", "x".repeat(14_000));
    let second = format!("{}1", "x".repeat(14_000));
    *h.current.lock().unwrap() = Some(named_snapshot(&[&first, &second, "z"]));
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 2);
    assert!(
        reports
            .iter()
            .all(|event| matches!(event, RunnerFileEvent::FilesSnapshot { .. }))
    );
    for (index, (report, path)) in reports.iter().zip([first, second]).enumerate() {
        assert!(codec::encode(report).unwrap().len() <= FILE_EVENT_MAX_BYTES as usize);
        let RunnerFileEvent::FilesSnapshot { tree } = report else {
            panic!("expected a full tree part");
        };
        assert_eq!(
            (
                tree.part.revision,
                tree.part.part_number,
                tree.part.part_count
            ),
            (2, index as u64 + 1, 2)
        );
        assert_eq!(tree.omitted_entry_count, Some(1));
        assert_eq!(tree.entries.len(), 1);
        assert_eq!(tree.entries[0].path, path);
    }
}
