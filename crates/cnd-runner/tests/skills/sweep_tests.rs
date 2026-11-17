//! Startup removes unused snapshots, crash leftovers, and obsolete Git objects.

#![allow(clippy::unwrap_used)]

use super::support::{Fixture, git};

#[tokio::test]
async fn restart_keeps_the_current_copy_and_removes_retired_copies_staging_sessions_and_objects() {
    let h = Fixture::new();
    h.write("SKILL.md", "Retired skill");
    h.publish();
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    let retired = storage.update("org/skills").await.unwrap().unwrap();
    let old_commit = git(&h.source, &["rev-parse", "HEAD"]).trim().to_owned();
    h.write("SKILL.md", "Current skill");
    h.update();
    let current = storage.update("org/skills").await.unwrap().unwrap();
    let commit = git(&h.source, &["rev-parse", "HEAD"]).trim().to_owned();
    let commits = current.parent().unwrap().parent().unwrap();
    let store = commits.parent().unwrap().join("git");
    assert_eq!(
        git(&store, &["for-each-ref", "--format=%(refname)"]),
        "refs/skills/published\n"
    );
    let staging = commits.join(".crash-staging");
    std::fs::create_dir(&staging).unwrap();
    std::fs::write(staging.join("partial"), "Incomplete").unwrap();
    let sessions = h.home.join(".conductive/skill-sessions");
    let abandoned = sessions.join("turn-killed");
    std::fs::create_dir_all(&abandoned).unwrap();
    std::fs::create_dir(sessions.join("keep")).unwrap();
    git(
        &store,
        &[
            "update-ref",
            &format!("refs/skills/{old_commit}"),
            &old_commit,
        ],
    );
    assert!(retired.exists());
    assert_eq!(
        h.storage().prepare(Some("org/skills")).await.unwrap(),
        Some(current.clone())
    );
    assert!(!retired.exists());
    assert!(!staging.exists());
    assert!(!abandoned.exists());
    assert!(sessions.join("keep").exists());
    assert_eq!(
        git(&store, &["for-each-ref", "--format=%(refname)"]),
        "refs/skills/published\n"
    );
    assert_eq!(
        git(&store, &["rev-parse", "refs/skills/published"]).trim(),
        commit
    );
    assert_eq!(git(&store, &["ls-files"]), "");
    let objects = git(
        &store,
        &["cat-file", "--batch-check", "--batch-all-objects"],
    );
    assert_eq!(
        objects.lines().find(|line| line.starts_with(&old_commit)),
        None
    );
}

#[tokio::test]
async fn a_repository_without_commits_supplies_no_copy_and_can_later_load_its_first_commit() {
    let h = Fixture::new();
    git(
        &h.source,
        &[
            "init",
            "--bare",
            "--initial-branch=main",
            h.remote.to_str().unwrap(),
        ],
    );
    let storage = h.storage();
    storage.prepare(Some("org/skills")).await.unwrap();
    assert_eq!(storage.update("org/skills").await.unwrap(), None);
    assert_eq!(storage.update("org/skills").await.unwrap(), None);
    assert!(!h.root().join("repository").exists());
    h.write("SKILL.md", "First commit");
    h.update();
    let copy = storage.update("org/skills").await.unwrap().unwrap();
    assert_eq!(
        std::fs::read_to_string(copy.join("SKILL.md")).unwrap(),
        "First commit"
    );
}
