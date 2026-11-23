//! Closed snapshots, total tree exports, and recovery from interrupted Git work.

#![allow(clippy::unwrap_used)]

use std::os::unix::fs::symlink;
use std::sync::atomic::Ordering;

use cnd_runner::skills::error::Error;
use tracing::instrument::WithSubscriber;

#[path = "../../src/skills/_tests_/warnings.rs"]
mod warnings;

use super::support::Fixture;
use warnings::Warnings;

#[tokio::test]
async fn removes_escaping_and_dangling_links_and_keeps_links_inside_the_snapshot() {
    let h = Fixture::new();
    h.write("skills/alpha/SKILL.md", "Closed skill");
    h.write("support/data", "In-copy support file");
    std::fs::create_dir_all(&h.home).unwrap();
    std::fs::write(h.home.join("outside"), "Outside sentinel").unwrap();
    let skill = h.source.join("skills/alpha");
    symlink(h.home.join("outside"), skill.join("escaping")).unwrap();
    symlink(&h.home, skill.join("outside-directory")).unwrap();
    symlink("missing", skill.join("dangling")).unwrap();
    symlink("../../support/data", skill.join("inside")).unwrap();
    symlink("../../support", skill.join("directory")).unwrap();
    h.publish();
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    let warnings = Warnings::default();
    let copy = storage
        .update("org/skills")
        .with_subscriber(warnings.clone())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(*warnings.0.lock().unwrap(), 1);
    let skill = copy.join("skills/alpha");
    for removed in ["escaping", "outside-directory", "dangling"] {
        assert!(
            std::fs::symlink_metadata(skill.join(removed)).is_err(),
            "{removed} must not reach an agent"
        );
    }
    assert_eq!(
        std::fs::read_to_string(skill.join("inside")).unwrap(),
        "In-copy support file"
    );
    assert_eq!(
        std::fs::read_to_string(skill.join("directory/data")).unwrap(),
        "In-copy support file"
    );
    assert_eq!(
        std::fs::read_link(skill.join("inside")).unwrap(),
        std::path::PathBuf::from("../../support/data")
    );
}

#[tokio::test]
async fn exports_removed_files_and_a_commit_with_an_empty_tree() {
    let h = Fixture::new();
    h.write("SKILL.md", "Root skill");
    h.write("removed", "Old support file");
    h.publish();
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    let first = storage.update("org/skills").await.unwrap().unwrap();
    std::fs::remove_file(h.source.join("removed")).unwrap();
    h.update();
    let next = storage.update("org/skills").await.unwrap().unwrap();
    assert_ne!(first, next);
    assert!(!next.join("removed").exists());
    std::fs::remove_file(h.source.join("SKILL.md")).unwrap();
    h.update();
    let empty = storage.update("org/skills").await;
    assert!(empty.is_ok(), "empty tree must publish: {empty:?}");
    let empty = empty.unwrap().unwrap();
    assert_ne!(next, empty);
    assert_eq!(std::fs::read_dir(&empty).unwrap().count(), 0);
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        empty
    );
}

#[tokio::test]
async fn recovers_when_a_timed_out_git_call_leaves_index_and_shallow_locks() {
    let h = Fixture::new();
    h.write("SKILL.md", "Original");
    h.publish();
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    let first = storage.update("org/skills").await.unwrap().unwrap();
    h.write("SKILL.md", "After interruption");
    h.update();
    h.git.timeout_fetch.store(true, Ordering::SeqCst);
    assert!(matches!(
        storage.update("org/skills").await,
        Err(Error::Timeout)
    ));
    assert_eq!(
        std::fs::read_link(h.root().join("repository")).unwrap(),
        first
    );
    let recovered = storage.update("org/skills").await;
    assert!(recovered.is_ok(), "stale locks must recover: {recovered:?}");
    let recovered = recovered.unwrap().unwrap();
    assert_eq!(
        std::fs::read_to_string(recovered.join("SKILL.md")).unwrap(),
        "After interruption"
    );
}
