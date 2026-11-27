//! Changes report edits, selection, base changes, and display labels.

use std::sync::Arc;

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangesDelta, ChangesDeltaUpsert, ChangesResponseSummary,
};
use cnd_runner_interface::file_tree::{FileTreeChange, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;

use crate::filter::service::{CredentialFilter, Credentials};
use crate::reports::files::FileReportKind;
use crate::reports::prepare::UnfilteredReports;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, named_snapshot};

pub(super) fn delta(reports: &[RunnerFileEvent]) -> &ChangesDelta {
    let first = reports.first();
    assert!(
        matches!(first, Some(RunnerFileEvent::ChangesChanged { .. })),
        "expected a changes delta as the first report"
    );
    let Some(RunnerFileEvent::ChangesChanged { delta }) = first else {
        unreachable!()
    };
    delta
}

fn totals(files: u64, added: u64, removed: u64) -> ChangesResponseSummary {
    ChangesResponseSummary {
        files,
        added,
        removed,
    }
}

fn upsert(index: u64, file: BranchChangedFile) -> ChangesDeltaUpsert {
    ChangesDeltaUpsert { index, file }
}

#[tokio::test]
async fn changes_delta_lists_edits_in_new_path_order_before_tree() {
    let mut original = named_snapshot(&["b-count", "c-modify", "d-delete", "old"]);
    let retained = changed_file("g-untouched", 4, 1, false);
    original.changes.files = vec![
        changed_file("b-count", 1, 1, true),
        changed_file("e-reverted", 1, 0, true),
        retained.clone(),
        changed_file("old", 1, 1, true),
    ];
    let h = Fixture::with_changes_deltas(
        original,
        Arc::new(UnfilteredReports),
        ReportLimits::default(),
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    let mut added = changed_file("a-add", 4, 0, true);
    added.changed_file.change = ChangeKind::Added;
    let count = changed_file("b-count", 2, 3, true);
    let modified = changed_file("c-modify", 1, 2, true);
    let mut deleted = changed_file("d-delete", 0, 5, true);
    deleted.changed_file.change = ChangeKind::Deleted;
    let mut renamed = changed_file("z-renamed", 0, 0, true);
    renamed.changed_file.change = ChangeKind::Renamed;
    renamed.changed_file.previous_path = Some("old".into());
    let mut edited = named_snapshot(&["a-add", "b-count", "c-modify", "z-renamed"]);
    edited.changes.unpushed_commits = Some(5);
    edited.changes.uncommitted_file_count = Some(7);
    edited.changes.files = vec![
        added.clone(),
        count.clone(),
        modified.clone(),
        deleted.clone(),
        retained,
        renamed.clone(),
    ];
    *h.current.lock().unwrap() = Some(edited);

    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(
        delta(&reports),
        &ChangesDelta {
            revision: 2,
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(5),
            uncommitted_file_count: Some(7),
            summary: totals(6, 11, 11),
            omitted: totals(0, 0, 0),
            removes: vec!["e-reverted".into(), "old".into()],
            upserts: vec![
                upsert(0, added),
                upsert(1, count),
                upsert(2, modified),
                upsert(3, deleted),
                upsert(5, renamed),
            ],
        }
    );
    assert_eq!(reports.len(), 2);
    assert!(matches!(&reports[1], RunnerFileEvent::FilesChanged { delta } if delta.revision == 2));
}

#[tokio::test]
async fn changes_delta_has_no_rows_when_only_content_changes() {
    let mut current = named_snapshot(&["file"]);
    current.changes.files = vec![changed_file("file", 1, 1, true)];
    current.identities.insert("file".into(), "before".into());
    let h = Fixture::with_changes_deltas(
        current.clone(),
        Arc::new(UnfilteredReports),
        ReportLimits::default(),
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    current.identities.insert("file".into(), "after".into());
    let entry = current.entries[0].clone();
    *h.current.lock().unwrap() = Some(current);

    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(
        delta(&reports),
        &ChangesDelta {
            revision: 2,
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(3),
            uncommitted_file_count: Some(4),
            summary: totals(1, 1, 1),
            omitted: totals(0, 0, 0),
            removes: vec![],
            upserts: vec![],
        }
    );
    assert_eq!(reports.len(), 2);
    assert!(
        matches!(&reports[1], RunnerFileEvent::FilesChanged { delta }
        if delta.changes == vec![FileTreeChange::Upsert { entry }])
    );
}

#[tokio::test]
async fn changes_delta_updates_omitted_totals_and_swaps_rows_at_the_limit() {
    let mut current = named_snapshot(&[]);
    current.changes.files = vec![
        changed_file("a", 1, 2, false),
        changed_file("b", 2, 1, true),
        changed_file("z", 3, 2, false),
    ];
    let h = Fixture::with_changes_deltas(
        current.clone(),
        Arc::new(UnfilteredReports),
        ReportLimits {
            changed_files: 2,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    current.changes.files[2].changed_file.added = 7;
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let omitted = delta(&reports);
    assert_eq!(omitted.revision, 2);
    assert_eq!(omitted.summary, totals(2, 3, 3));
    assert_eq!(omitted.omitted, totals(1, 7, 2));
    assert!(omitted.removes.is_empty());
    assert!(omitted.upserts.is_empty());

    current.changes.files[2].uncommitted = true;
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let swapped = delta(&reports);
    assert_eq!(swapped.revision, 3);
    assert_eq!(swapped.summary, totals(2, 9, 3));
    assert_eq!(swapped.omitted, totals(1, 1, 2));
    assert_eq!(swapped.removes, ["a"]);
    assert_eq!(swapped.upserts, [upsert(1, changed_file("z", 7, 2, true))]);
}

#[tokio::test]
async fn changes_delta_resumes_after_full_reports_for_a_base_change_or_repair() {
    let mut current = named_snapshot(&[]);
    current.changes.files = vec![changed_file("file", 1, 1, true)];
    let h = Fixture::with_changes_deltas(
        current.clone(),
        Arc::new(UnfilteredReports),
        ReportLimits::default(),
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    current.base_commit = "new-base".into();
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert!(
        matches!(h.take_reports().as_slice(), [RunnerFileEvent::ChangesUpdated { changes }]
        if changes.runner_file_revision_part.revision == 2 && changes.changes_response.base_branch == "main")
    );

    current.changes.base_branch = "next".into();
    *h.current.lock().unwrap() = Some(current.clone());
    h.files.refresh(false, None, None).await.unwrap();
    assert!(
        matches!(h.take_reports().as_slice(), [RunnerFileEvent::ChangesUpdated { changes }]
        if changes.runner_file_revision_part.revision == 3 && changes.changes_response.base_branch == "next")
    );

    h.files
        .refresh(true, Some(FileReportKind::Changes), Some("repair".into()))
        .await
        .unwrap();
    assert!(
        matches!(h.take().as_slice(), [(RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }), receipt)]
        if changes.runner_file_revision_part.revision == 4 && receipt.as_deref() == Some("repair"))
    );

    current.changes.unpushed_commits = Some(1);
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let latest = delta(&reports);
    assert_eq!(latest.revision, 5);
    assert_eq!(latest.base_branch, "next");
    assert_eq!(latest.unpushed_commits, Some(1));
    assert!(latest.upserts.is_empty());
}

#[tokio::test]
async fn changes_delta_masks_labels_that_change_when_a_credential_becomes_known() {
    let mut current = named_snapshot(&[]);
    current.changes.base_branch = "topic-secret".into();
    let mut renamed = changed_file("secret.txt", 1, 1, true);
    renamed.changed_file.change = ChangeKind::Renamed;
    renamed.changed_file.previous_path = Some("old-secret.txt".into());
    current.changes.files = vec![renamed.clone()];
    let filter = Arc::new(CredentialFilter::default());
    let h = Fixture::with_changes_deltas(current.clone(), filter.clone(), ReportLimits::default());
    h.files.refresh(true, None, None).await.unwrap();
    h.take();

    filter.add("secret".into()).unwrap();
    current.changes.unpushed_commits = Some(1);
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    let latest = delta(&reports);
    renamed.changed_file.display_path = Some("[redacted].txt".into());
    renamed.changed_file.previous_display_path = Some("old-[redacted].txt".into());
    assert_eq!(latest.base_branch, "topic-secret");
    assert_eq!(
        latest.display_base_branch.as_deref(),
        Some("topic-[redacted]")
    );
    assert_eq!(latest.upserts, [upsert(0, renamed)]);
}
