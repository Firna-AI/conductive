//! Changes deltas fall back to complete reports when either budget is exceeded.

use std::sync::Arc;

use cnd_runner_interface::file_changes::ChangesResponseSummary;
use cnd_runner_interface::file_tree::{FILE_EVENT_MAX_BYTES, RunnerFileEvent};

use crate::filter::service::{CredentialFilter, Credentials};
use crate::json::codec;
use crate::reports::prepare::UnfilteredReports;
use crate::reports::selection::ReportLimits;

use super::changes_delta_tests::delta;
use super::support::{Fixture, changed_file, named_snapshot};

#[tokio::test]
async fn changes_delta_allows_512_operations_and_sends_one_full_list_for_513() {
    let mut current = named_snapshot(&[]);
    current.changes.files = (0..256)
        .map(|index| changed_file(&format!("a-{index:03}"), 1, 0, true))
        .collect();
    let h = Fixture::with_changes_deltas(
        current.clone(),
        Arc::new(UnfilteredReports),
        ReportLimits::default(),
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    current.changes.files = (0..256)
        .map(|index| changed_file(&format!("b-{index:03}"), 1, 0, true))
        .collect();
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 1);
    let at_limit = delta(&reports);
    assert_eq!(at_limit.revision, 2);
    assert_eq!(at_limit.removes.len(), 256);
    assert_eq!(at_limit.upserts.len(), 256);

    current.changes.files = (0..257)
        .map(|index| changed_file(&format!("c-{index:03}"), 1, 0, true))
        .collect();
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert!(
        matches!(h.take_reports().as_slice(), [RunnerFileEvent::ChangesUpdated { changes }]
        if changes.runner_file_revision_part.revision == 3 && changes.changes_response.files.len() == 257)
    );

    current.changes.files[0].changed_file.added = 2;
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let after_fallback = delta(&reports);
    assert_eq!(after_fallback.revision, 4);
    assert!(after_fallback.removes.is_empty());
    assert_eq!(after_fallback.upserts.len(), 1);
    assert_eq!(
        after_fallback.upserts[0].file,
        changed_file("c-000", 2, 0, true)
    );
}

#[tokio::test]
async fn changes_delta_over_byte_budget_sends_full_parts_before_tree() {
    let filter = Arc::new(CredentialFilter::default());
    filter.add("x".into()).unwrap();
    let h = Fixture::with_changes_deltas(named_snapshot(&[]), filter, ReportLimits::default());
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    let mut edited = named_snapshot(&["tree-entry"]);
    let paths: Vec<_> = (0..24)
        .map(|index| format!("{index:02}-{}", "x".repeat(1200)))
        .collect();
    edited.changes.files = paths
        .iter()
        .map(|path| changed_file(path, 1, 0, true))
        .collect();
    *h.current.lock().unwrap() = Some(edited);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert!(
        matches!(
            reports.as_slice(),
            [
                RunnerFileEvent::ChangesUpdated { .. },
                RunnerFileEvent::ChangesUpdated { .. },
                RunnerFileEvent::FilesChanged { .. },
            ]
        ),
        "the masked rows require two full changes parts before the tree delta"
    );

    let mut rows = vec![];
    for (index, event) in reports[..2].iter().enumerate() {
        assert!(codec::encode(event).unwrap().len() <= FILE_EVENT_MAX_BYTES as usize);
        let RunnerFileEvent::ChangesUpdated { changes } = event else {
            unreachable!()
        };
        let part = &changes.runner_file_revision_part;
        assert_eq!(
            (part.revision, part.part_number, part.part_count),
            (2, index as u64 + 1, 2)
        );
        assert_eq!(
            changes.changes_response.summary,
            ChangesResponseSummary {
                files: 24,
                added: 24,
                removed: 0
            }
        );
        rows.extend(
            changes
                .changes_response
                .files
                .iter()
                .map(|row| &row.changed_file),
        );
    }
    assert_eq!(rows.len(), paths.len());
    for (row, path) in rows.into_iter().zip(paths) {
        assert_eq!(row.path, path);
        assert_eq!(
            row.display_path.as_deref(),
            Some(path.replace('x', "[redacted]").as_str())
        );
    }
}
