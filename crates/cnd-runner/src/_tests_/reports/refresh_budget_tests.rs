//! Keep refresh-only operations together through both reporter delta budgets.

use cnd_runner_interface::file_changes::ChangeKind;
use cnd_runner_interface::file_tree::{FileTreeChange, RunnerFileEvent};

use crate::reports::selection::ReportLimits;

use super::support::{Fixture, changed_file, snapshot};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TreePart {
    Delta(usize),
    FullTree { parts: u64 },
}

struct Case {
    name: &'static str,
    removals: Vec<String>,
    refreshes: Vec<String>,
    expected: &'static [TreePart],
}

async fn refresh_after_removals(removals: &[String], refreshes: &[String]) -> Vec<RunnerFileEvent> {
    let mut current = snapshot(
        ["kept".into()]
            .into_iter()
            .chain(removals.iter().cloned())
            .collect(),
    );
    current.entries[0].change = Some(ChangeKind::Modified);
    current.changes.files = [changed_file("kept", 1, 1, true)]
        .into_iter()
        .chain(refreshes.iter().map(|path| {
            let mut file = changed_file(path, 0, 1, false);
            file.changed_file.change = ChangeKind::Deleted;
            file
        }))
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

    current.entries.truncate(1);
    current.base_commit = "new base".into();
    *h.current.lock().unwrap() = Some(current);
    h.files.refresh(false, None, None).await.unwrap();
    h.take_reports()
}

#[tokio::test]
async fn keeps_refresh_groups_whole_at_both_delta_budgets() {
    let cases = [
        Case {
            name: "operation budget after ordinary removals",
            removals: (0..511).map(|index| format!("remove-{index:03}")).collect(),
            refreshes: vec!["refresh-a".into(), "refresh-b".into()],
            expected: &[TreePart::Delta(511), TreePart::Delta(2)],
        },
        Case {
            name: "byte budget after ordinary removals",
            removals: vec!["r".repeat(80_000), "s".repeat(80_000), "t".repeat(80_000)],
            refreshes: vec!["x".repeat(15_000), "y".repeat(15_000)],
            expected: &[TreePart::Delta(3), TreePart::Delta(2)],
        },
        Case {
            name: "group exceeds the byte budget of an empty delta",
            removals: vec![],
            refreshes: vec!["x".repeat(140_000), "y".repeat(140_000)],
            expected: &[TreePart::FullTree { parts: 1 }],
        },
        Case {
            name: "group fills the operation budget exactly",
            removals: vec![],
            refreshes: (0..512)
                .map(|index| format!("refresh-{index:03}"))
                .collect(),
            expected: &[TreePart::Delta(512)],
        },
    ];

    let mut observed = Vec::new();
    let mut expected = Vec::new();
    for case in cases {
        let reports = refresh_after_removals(&case.removals, &case.refreshes).await;
        let mut parts = Vec::new();
        let mut removed_paths = Vec::new();
        for report in &reports {
            match report {
                RunnerFileEvent::FilesChanged { delta } => {
                    parts.push(TreePart::Delta(delta.changes.len()));
                    removed_paths.extend(delta.changes.iter().filter_map(|change| match change {
                        FileTreeChange::Remove { path } => Some(path.as_str()),
                        _ => None,
                    }));
                }
                RunnerFileEvent::FilesSnapshot { tree } => {
                    parts.push(TreePart::FullTree {
                        parts: tree.part.part_count,
                    });
                }
                RunnerFileEvent::ChangesUpdated { .. } => {}
                RunnerFileEvent::FilesUnavailable {} => {
                    panic!("{}: file reports unavailable", case.name)
                }
            }
        }
        let expected_removal_count = case
            .expected
            .iter()
            .map(|part| match part {
                TreePart::Delta(count) => *count,
                TreePart::FullTree { .. } => 0,
            })
            .sum();
        let expected_paths = case
            .removals
            .iter()
            .chain(&case.refreshes)
            .take(expected_removal_count)
            .map(String::as_str);
        observed.push((
            case.name,
            parts,
            removed_paths.into_iter().eq(expected_paths),
        ));
        expected.push((case.name, case.expected.to_vec(), true));
    }
    assert_eq!(observed, expected);
}
