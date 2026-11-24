//! Tree delta budgets keep whole operations and consecutive revisions.

use cnd_runner_interface::file_changes::ChangeKind;
use cnd_runner_interface::file_tree::{
    FileEntryKind, FileTreeChange, FileTreeDelta, RunnerFileEvent,
};
use cnd_runner_interface::runner::RunnerEvent;

use crate::json::codec;
use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, snapshot};

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
        matches!(&h.take()[1].0, RunnerEvent::RunnerFileEvent(RunnerFileEvent::FilesSnapshot { tree }) if tree.part.revision == 9)
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

fn delta_shape(delta: &FileTreeDelta) -> (u64, usize, Option<u64>) {
    (
        delta.revision,
        delta.changes.len(),
        delta.omitted_entry_count,
    )
}

#[tokio::test]
async fn splits_513_mark_edits_when_a_new_base_clears_omitted_diffs() {
    let mut current = snapshot(
        ["a-listed".into()]
            .into_iter()
            .chain((0..513).map(|index| format!("file-{index:03}")))
            .collect(),
    );
    current.changes.files = current
        .entries
        .iter_mut()
        .map(|entry| {
            entry.change = Some(ChangeKind::Modified);
            changed_file(&entry.path, 1, 1, false)
        })
        .collect();
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
    current.changes.files.truncate(1);
    for entry in &mut current.entries[1..] {
        entry.change = None;
    }
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let deltas: Vec<_> = h
        .take_reports()
        .iter()
        .filter_map(|event| match event {
            RunnerFileEvent::FilesChanged { delta } => Some(delta_shape(delta)),
            _ => None,
        })
        .collect();
    assert_eq!(deltas, [(2, 512, Some(0)), (3, 1, Some(0))]);
}

#[tokio::test]
async fn omitted_context_refresh_and_512_listed_edits_split_into_two_deltas() {
    let mut current = snapshot(
        [
            ".context".into(),
            ".context/notes.md".into(),
            ".context/tracked.md".into(),
        ]
        .into_iter()
        .chain((0..511).map(|index| format!("file-{index:03}")))
        .collect(),
    );
    current.entries[0].kind = FileEntryKind::Directory;
    current
        .context_only_paths
        .insert(".context/notes.md".into());
    let h = Fixture::with_limits(
        current.clone(),
        ReportLimits {
            tree_entries: 513,
            context_entries: 0,
            ..ReportLimits::default()
        },
    );
    h.files.refresh(true, None, None).await.unwrap();
    h.take();
    for entry in &current.entries[1..] {
        current
            .read_identities
            .insert(entry.path.clone(), "changed bytes".into());
    }
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 2);
    let [
        RunnerFileEvent::FilesChanged { delta: first },
        RunnerFileEvent::FilesChanged { delta: second },
    ] = reports.as_slice()
    else {
        panic!("expected two tree deltas");
    };
    assert_eq!(
        [delta_shape(first), delta_shape(second)],
        [(2, 512, Some(1)), (3, 1, Some(1))]
    );
    assert_eq!(
        first.changes[0],
        FileTreeChange::Remove {
            path: ".context/notes.md".into()
        }
    );
}

#[tokio::test]
async fn two_omitted_diff_refreshes_and_511_listed_edits_split_into_two_deltas() {
    let mut current = snapshot((0..511).map(|index| format!("file-{index:03}")).collect());
    current.changes.files = ["a-listed", "y-omitted", "z-omitted"]
        .into_iter()
        .map(|path| {
            let mut file = changed_file(path, 0, 1, false);
            file.changed_file.change = ChangeKind::Deleted;
            file
        })
        .collect();
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
    for entry in &current.entries {
        current
            .read_identities
            .insert(entry.path.clone(), "changed bytes".into());
    }
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    let reports = h.take_reports();
    assert_eq!(reports.len(), 3);
    let [
        RunnerFileEvent::ChangesUpdated { .. },
        RunnerFileEvent::FilesChanged { delta: first },
        RunnerFileEvent::FilesChanged { delta: second },
    ] = reports.as_slice()
    else {
        panic!("expected Changes and two tree deltas");
    };
    assert_eq!(
        [delta_shape(first), delta_shape(second)],
        [(2, 512, Some(0)), (3, 1, Some(0))]
    );
    assert_eq!(
        first.changes[..2],
        [
            FileTreeChange::Remove {
                path: "y-omitted".into()
            },
            FileTreeChange::Remove {
                path: "z-omitted".into()
            },
        ]
    );
}
