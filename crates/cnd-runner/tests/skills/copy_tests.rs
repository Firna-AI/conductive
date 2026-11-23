//! Complete snapshots survive failed checks and stop/resume of one selection.

#![allow(clippy::unwrap_used)]

use std::path::Path;
use std::sync::atomic::Ordering;

use cnd_runner::skills::error::Error;

use super::support::{Fixture, git};

#[tokio::test]
async fn copies_updates_and_retains_complete_snapshots_after_failed_fetch_and_resume() {
    let h = Fixture::new();
    h.write("skills/alpha/SKILL.md", "Original complete skill");
    h.publish();
    let storage = h.storage();
    assert_eq!(storage.prepare(Some("org/skills")).await.unwrap(), None);
    let original = storage.update("org/skills").await.unwrap().unwrap();
    assert_eq!(
        std::fs::read_to_string(original.join("skills/alpha/SKILL.md")).unwrap(),
        "Original complete skill"
    );
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        original
    );
    assert_eq!(original.file_name(), Some(Path::new("skills").as_os_str()));
    h.write("skills/alpha/SKILL.md", "Updated complete skill");
    h.write(
        "SKILL.md",
        "A root skill is retained, but selection belongs to the helper",
    );
    h.update();
    h.git.fail_checkout.store(true, Ordering::SeqCst);
    assert!(matches!(
        storage.update("org/skills").await,
        Err(Error::Git { code: Some(1) })
    ));
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        original
    );
    h.git.fail_checkout.store(false, Ordering::SeqCst);
    h.git.hold_checkout.store(true, Ordering::SeqCst);
    let copying = storage.clone();
    let update = tokio::spawn(async move { copying.update("org/skills").await });
    h.git.entered.notified().await;
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        original
    );
    assert_eq!(
        std::fs::read_to_string(original.join("skills/alpha/SKILL.md")).unwrap(),
        "Original complete skill"
    );
    h.git.released.send_replace(true);
    h.git.hold_checkout.store(false, Ordering::SeqCst);
    let updated = update.await.unwrap().unwrap().unwrap();
    assert_ne!(original, updated);
    assert_eq!(
        std::fs::read_to_string(updated.join("skills/alpha/SKILL.md")).unwrap(),
        "Updated complete skill"
    );
    storage
        .sweep("org/skills", std::slice::from_ref(&original))
        .await
        .unwrap();
    assert_eq!(
        std::fs::read_to_string(original.join("skills/alpha/SKILL.md")).unwrap(),
        "Original complete skill"
    );
    storage.sweep("org/skills", &[]).await.unwrap();
    assert!(!original.exists());
    assert_eq!(
        storage.update("org/skills").await.unwrap().unwrap(),
        updated
    );
    std::fs::rename(&h.remote, h.remote.with_extension("gone")).unwrap();
    assert!(matches!(
        storage.update("org/skills").await,
        Err(Error::Git { code: Some(128) })
    ));
    let resumed = h.storage();
    assert_eq!(
        resumed.prepare(Some("org/skills")).await.unwrap(),
        Some(updated.clone())
    );
    assert!(matches!(
        resumed.update("org/skills").await,
        Err(Error::Git { code: Some(128) })
    ));
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        updated
    );
    let requests = h.git.requests.lock().unwrap();
    let fetch = requests
        .iter()
        .find(|args| args.iter().any(|arg| arg == "fetch"))
        .unwrap();
    assert_eq!(
        &fetch[2..],
        [
            "fetch",
            "--depth=1",
            "--no-tags",
            "--",
            "https://github.com/org/skills.git",
            "HEAD"
        ]
    );
}

#[tokio::test]
async fn empty_invalid_and_replaced_selections_delete_the_old_copy_before_a_failed_first_fetch() {
    let h = Fixture::new();
    h.write("SKILL.md", "Root skill");
    h.publish();
    for selection in [None, Some("../unsafe"), Some("org/private-or-missing")] {
        let storage = h.storage();
        storage.prepare(Some("org/skills")).await.unwrap();
        let original = storage.update("org/skills").await.unwrap().unwrap();
        assert_eq!(storage.prepare(selection).await.unwrap(), None);
        assert!(!original.exists());
        if selection == Some("org/private-or-missing") {
            assert!(matches!(
                storage.update("org/private-or-missing").await,
                Err(Error::Git { code: Some(128) })
            ));
            assert!(!h.root().join("repository").exists());
            assert_eq!(h.storage().prepare(selection).await.unwrap(), None);
        } else {
            assert!(!h.root().exists());
        }
    }
}

#[tokio::test]
async fn follows_default_branch_head_without_changing_an_existing_snapshot() {
    let h = Fixture::new();
    h.write("SKILL.md", "First branch");
    h.publish();
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    let original = storage.update("org/skills").await.unwrap().unwrap();
    git(&h.source, &["checkout", "-b", "new-default"]);
    h.write("SKILL.md", "New default branch");
    git(&h.source, &["add", "."]);
    git(&h.source, &["commit", "-m", "new default"]);
    git(
        &h.source,
        &[
            "push",
            "--",
            h.remote.to_str().unwrap(),
            "HEAD:refs/heads/new-default",
        ],
    );
    git(
        &h.remote,
        &["symbolic-ref", "HEAD", "refs/heads/new-default"],
    );
    let updated = storage.update("org/skills").await.unwrap().unwrap();
    assert_eq!(
        std::fs::read_to_string(updated.join("SKILL.md")).unwrap(),
        "New default branch"
    );
    assert_eq!(
        std::fs::read_to_string(original.join("SKILL.md")).unwrap(),
        "First branch"
    );
}
