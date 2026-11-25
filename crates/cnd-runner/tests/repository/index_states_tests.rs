//! Conflicts and other supported index states keep complete file reports available.

#![allow(clippy::unwrap_used)]

use std::fs;
use std::process::Command;

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangedFile, ChangesResponse, ChangesResponseSummary,
};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind};

use super::support::Fixture;

#[tokio::test]
async fn unmerged_and_other_index_states_preserve_snapshot_entries_and_changes() {
    let h = Fixture::new().await;
    let child = Fixture::new().await;
    h.write("assumed.txt", b"assumed base\n");
    h.write("skipped.txt", b"skipped base\n");
    h.git(&[
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        child.root.to_str().unwrap(),
        "module",
    ]);
    h.base();
    let base = h.git(&["rev-parse", "HEAD"]).trim().to_owned();
    h.git(&["config", "merge.conflictStyle", "merge"]);
    h.git(&["checkout", "-b", "other"]);
    h.write("README.md", b"first\ntheirs\n");
    h.git(&["commit", "-am", "other"]);
    h.git(&["checkout", "task"]);
    h.write("README.md", b"first\nours\n");
    h.git(&["commit", "-am", "ours"]);
    let merge = Command::new("git")
        .args(["merge", "--no-edit", "other"])
        .current_dir(&h.root)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .unwrap();
    assert_eq!(merge.status.code(), Some(1));
    let unmerged = h.git(&["ls-files", "--unmerged"]);
    assert_eq!(
        unmerged
            .lines()
            .map(|line| line.split_whitespace().nth(2).unwrap())
            .collect::<Vec<_>>(),
        ["1", "2", "3"]
    );
    h.write("a1.txt", b"plain changed\n");
    fs::remove_file(h.root.join("rename me.txt")).unwrap();
    h.write("module/README.md", b"dirty child\n");
    h.write("intent.txt", b"intent\n");
    h.git(&["add", "--intent-to-add", "intent.txt"]);
    h.git(&["update-index", "--skip-worktree", "skipped.txt"]);
    h.git(&["update-index", "--assume-unchanged", "assumed.txt"]);
    h.write("skipped.txt", b"skipped edit\n");
    h.write("assumed.txt", b"assumed edit\n");
    let saved = h.stored_git();
    let snapshot = h.repository.snapshot("main".into()).await;
    assert!(
        snapshot.is_ok(),
        "supported index states must remain scannable: {snapshot:?}"
    );
    let snapshot = snapshot.unwrap();
    let entries = [
        (".gitmodules", FileEntryKind::File, None),
        ("a[1].txt", FileEntryKind::File, None),
        ("a1.txt", FileEntryKind::File, Some(ChangeKind::Modified)),
        (
            "assumed.txt",
            FileEntryKind::File,
            Some(ChangeKind::Modified),
        ),
        ("intent.txt", FileEntryKind::File, Some(ChangeKind::Added)),
        (
            "module",
            FileEntryKind::Directory,
            Some(ChangeKind::Modified),
        ),
        ("README.md", FileEntryKind::File, Some(ChangeKind::Modified)),
        (
            "skipped.txt",
            FileEntryKind::File,
            Some(ChangeKind::Modified),
        ),
    ]
    .into_iter()
    .map(|(path, kind, change)| FileEntry {
        path: path.into(),
        display_path: None,
        name: path.into(),
        kind,
        change,
    })
    .collect::<Vec<_>>();
    assert_eq!(snapshot.entries, entries);
    let files = [
        ("a1.txt", ChangeKind::Modified, 1, 1, true),
        ("assumed.txt", ChangeKind::Modified, 1, 1, false),
        ("intent.txt", ChangeKind::Added, 1, 0, true),
        ("module", ChangeKind::Modified, 0, 0, true),
        ("README.md", ChangeKind::Modified, 5, 1, true),
        ("rename me.txt", ChangeKind::Deleted, 0, 3, true),
        ("skipped.txt", ChangeKind::Modified, 1, 1, false),
    ]
    .into_iter()
    .map(
        |(path, change, added, removed, uncommitted)| BranchChangedFile {
            changed_file: ChangedFile {
                path: path.into(),
                display_path: None,
                previous_path: None,
                previous_display_path: None,
                change,
                added,
                removed,
            },
            uncommitted,
        },
    )
    .collect();
    assert_eq!(
        snapshot.changes,
        ChangesResponse {
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(1),
            uncommitted_file_count: Some(5),
            files,
            summary: ChangesResponseSummary {
                files: 7,
                added: 9,
                removed: 7,
            },
            omitted: None,
        }
    );
    assert_eq!(snapshot.base_commit, base);
    assert_eq!(h.stored_git(), saved);
    assert_eq!(h.git(&["ls-files", "--unmerged"]), unmerged);
}
