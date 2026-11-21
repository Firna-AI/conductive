//! Restored file times must not hide content changes from a temporary index.

#![allow(clippy::unwrap_used)]

use std::fs::OpenOptions;
use std::time::{Duration, SystemTime};

use cnd_runner_interface::file_changes::ChangeKind;

use super::support::Fixture;

#[tokio::test]
async fn restored_size_and_modification_time_do_not_hide_changed_content() {
    let h = Fixture::new().await;
    h.git(&["config", "core.trustctime", "false"]);
    h.git(&["config", "core.checkstat", "minimal"]);
    let file = OpenOptions::new()
        .write(true)
        .open(h.root.join("README.md"))
        .unwrap();
    let restored = SystemTime::UNIX_EPOCH + Duration::from_secs(1_000_000);
    file.set_modified(restored).unwrap();
    h.git(&["update-index", "--refresh"]);
    let before = h.repository.snapshot("main".into()).await.unwrap();
    let size = file.metadata().unwrap().len();
    h.write("README.md", b"first\nedit\n");
    file.set_modified(restored).unwrap();
    assert_eq!(file.metadata().unwrap().len(), size);
    assert_eq!(file.metadata().unwrap().modified().unwrap(), restored);
    assert_eq!(h.git(&["diff", "--name-only"]), "");
    let saved = h.stored_git();
    let after = h.repository.snapshot("main".into()).await.unwrap();
    assert_eq!(after.changes.files.len(), 1);
    let change = &after.changes.files[0];
    assert_eq!(change.changed_file.path, "README.md");
    assert_eq!(change.changed_file.change, ChangeKind::Modified);
    assert_eq!(
        (change.changed_file.added, change.changed_file.removed),
        (1, 1)
    );
    assert!(!change.uncommitted);
    assert_eq!(after.changes.uncommitted_file_count, Some(0));
    assert_ne!(
        before.identities["README.md"],
        after.identities["README.md"]
    );
    assert_ne!(
        before.read_identities["README.md"],
        after.read_identities["README.md"]
    );
    assert_eq!(h.stored_git(), saved);
}
