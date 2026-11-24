//! Complete snapshots retain tracked, staged, ignored, link, and submodule results.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::os::unix::fs::symlink;

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangedFile, ChangesResponse, ChangesResponseSummary,
};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind};

use super::support::Fixture;

#[tokio::test]
async fn snapshot_keeps_entries_changes_and_both_identity_maps_for_mixed_git_states() {
    let h = Fixture::new().await;
    let child = Fixture::new().await;
    h.repository.prepare_context().await.unwrap();
    h.write(".context/note.txt", b"private\n");
    symlink(".context/note.txt", h.root.join("link")).unwrap();
    h.git(&[
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        child.root.to_str().unwrap(),
        "module",
    ]);
    h.write(
        ".gitmodules",
        b"[submodule \"module\"]\n\tpath = module\n\turl = ../source\n",
    );
    h.base();
    let base = h.git(&["rev-parse", "HEAD"]).trim().to_owned();
    let module = child.git(&["rev-parse", "HEAD"]).trim().to_owned();
    h.write("README.md", b"first\nchanged\n");
    h.write("staged.txt", b"staged\n");
    h.git(&["add", "staged.txt"]);
    h.write("untracked.txt", b"new\n");
    let saved = h.stored_git();
    let snapshot = h.repository.snapshot("main".into()).await.unwrap();
    let entries = [
        (".context", ".context", FileEntryKind::Directory, None),
        (".context/note.txt", "note.txt", FileEntryKind::File, None),
        (".gitmodules", ".gitmodules", FileEntryKind::File, None),
        ("a[1].txt", "a[1].txt", FileEntryKind::File, None),
        ("a1.txt", "a1.txt", FileEntryKind::File, None),
        ("link", "link", FileEntryKind::File, None),
        ("module", "module", FileEntryKind::Directory, None),
        (
            "README.md",
            "README.md",
            FileEntryKind::File,
            Some(ChangeKind::Modified),
        ),
        ("rename me.txt", "rename me.txt", FileEntryKind::File, None),
        (
            "staged.txt",
            "staged.txt",
            FileEntryKind::File,
            Some(ChangeKind::Added),
        ),
        (
            "untracked.txt",
            "untracked.txt",
            FileEntryKind::File,
            Some(ChangeKind::Untracked),
        ),
    ]
    .into_iter()
    .map(|(path, name, kind, change)| FileEntry {
        path: path.into(),
        display_path: None,
        name: name.into(),
        kind,
        change,
    })
    .collect::<Vec<_>>();
    assert_eq!(snapshot.entries, entries);
    let files = [
        ("README.md", ChangeKind::Modified, 1),
        ("staged.txt", ChangeKind::Added, 0),
        ("untracked.txt", ChangeKind::Untracked, 0),
    ]
    .into_iter()
    .map(|(path, change, removed)| BranchChangedFile {
        changed_file: ChangedFile {
            path: path.into(),
            display_path: None,
            previous_path: None,
            previous_display_path: None,
            change,
            added: 1,
            removed,
        },
        uncommitted: true,
    })
    .collect();
    assert_eq!(
        snapshot.changes,
        ChangesResponse {
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(0),
            uncommitted_file_count: Some(3),
            files,
            summary: ChangesResponseSummary {
                files: 3,
                added: 3,
                removed: 1
            },
            omitted: None,
        }
    );
    let mut identities = BTreeMap::from([
        (
            ".gitmodules".into(),
            "100644 a3c6c2c8600829af59bd929f28fc753c99156688 0\n".into(),
        ),
        (
            "a[1].txt".into(),
            "100644 07179c73e28e670afe4d2d835f5f7f4731173497 0\n".into(),
        ),
        (
            "a1.txt".into(),
            "100644 a94ecb5f06c27407f8763259b496656da587c94d 0\n".into(),
        ),
        (
            "link".into(),
            "120000 29d3be01455e333d5590f513bbc7259615cf0718 0\n".into(),
        ),
        (
            "README.md".into(),
            "100644 3a5634d395ede1140e43582a8e72263b785682cf 0\n".into(),
        ),
        (
            "rename me.txt".into(),
            "100644 4cf5b4f95a347fb3f0d05d3c91ff5b7b95a962b5 0\n".into(),
        ),
        (
            "staged.txt".into(),
            "100644 19d9cc8584ac2c7dcf57d2680375e80f099dc481 0\n".into(),
        ),
        (
            "untracked.txt".into(),
            "100644 3e757656cf36eca53338e520d134963a44f793f8 0\n".into(),
        ),
    ]);
    identities.insert(
        "module".into(),
        format!(
            "160000 {module} 0 668f2eed1334588e8b632cccbf9d652aa31de843d57b5e3eb158eb756986f8f3\n"
        ),
    );
    assert_eq!(snapshot.identities, identities);
    let read_identities = [
        (
            ".context/note.txt",
            "25bc6f78b121a07272cc30e64fcac1bafac8b7fe6c72fdf8526caf15a4c6b7b9",
        ),
        (
            ".gitmodules",
            "f0a914b9fa8bf1b9f0b6a57cf7e20182aad04aae022908fdefd02e67571dab3c",
        ),
        (
            "a[1].txt",
            "05e0839450a75680ab14ec3a9cc1d0002376f0a26ece03f53e23731e4a75327b",
        ),
        (
            "a1.txt",
            "afd5dcc8a1476515af922709b31e2e458657c8d9c9a3f2481b9ebe8d219c6185",
        ),
        (
            "link",
            "25bc6f78b121a07272cc30e64fcac1bafac8b7fe6c72fdf8526caf15a4c6b7b9",
        ),
        (
            "README.md",
            "c93c5d26905645ad0306f063662ec94367dad2011cae9d227dc18af07aad14a3",
        ),
        (
            "rename me.txt",
            "7f7946b46a240869dbb8d8bcd19f7914cba88849b283688894c65d6e96e704c0",
        ),
        (
            "staged.txt",
            "9ac007af3de930baf647288da0c843b26a5f046a3fe1351f1bb039b242d22cdf",
        ),
        (
            "untracked.txt",
            "7aa7a5359173d05b63cfd682e3c38487f3cb4f7f1d60659fe59fab1505977d4c",
        ),
    ]
    .into_iter()
    .map(|(path, identity)| (path.into(), identity.into()))
    .collect::<BTreeMap<_, _>>();
    assert_eq!(snapshot.read_identities, read_identities);
    assert_eq!(snapshot.base_commit, base);
    assert_eq!(h.stored_git(), saved);
}
