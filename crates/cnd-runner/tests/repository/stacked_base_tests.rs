//! A running reporter follows a fetched base move and excludes merged work.

#![expect(
    clippy::unwrap_used,
    reason = "Repository setup and report failures must fail the test"
)]

use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use cnd_runner::emitter::EventEmitter;
use cnd_runner::error::Result;
use cnd_runner::reports::files::{FileReporter, FileReports};
use cnd_runner::reports::prepare::UnfilteredReports;
use cnd_runner::state::records::FileRevisions;
use cnd_runner_interface::file_tree::RunnerFileEvent;
use cnd_runner_interface::runner::RunnerEvent;

use super::support::Fixture;

#[derive(Default)]
struct Events(Mutex<Vec<RunnerEvent>>);

#[async_trait]
impl EventEmitter for Events {
    async fn emit(&self, events: Vec<RunnerEvent>, _: Option<String>) -> Result<()> {
        self.0.lock().unwrap().extend(events);
        Ok(())
    }
}

#[tokio::test]
async fn fetched_base_move_updates_live_changes_and_merge_base_diffs() {
    let h = Fixture::new().await;
    h.write("carry.txt", b"original\n");
    h.base();
    h.write("feature.txt", b"merged feature\n");
    h.git(&["add", "feature.txt"]);
    h.git(&["commit", "-m", "feature"]);
    let feature = h.git(&["rev-parse", "HEAD"]).trim().to_string();
    h.git(&["branch", "feature/review"]);
    h.git(&["update-ref", "refs/remotes/origin/feature/review", "HEAD"]);
    h.write("workspace.txt", b"workspace work\n");
    h.git(&["add", "workspace.txt"]);
    h.git(&["commit", "-m", "workspace"]);
    let head = h.git(&["rev-parse", "HEAD"]);
    h.git(&["checkout", "main"]);
    h.git(&["merge", "--no-ff", "-m", "merge feature", "feature/review"]);
    let merged = h.git(&["rev-parse", "HEAD"]).trim().to_string();
    h.git(&["checkout", "task"]);
    h.git(&["config", "branch.task.gh-merge-base", "feature/review"]);
    h.write("carry.txt", b"kept work\n");
    let events = Arc::new(Events::default());
    let reporter = FileReporter::new(
        h.repository.clone(),
        "feature/review".into(),
        events.clone(),
        Arc::new(UnfilteredReports),
        FileRevisions::default(),
    );
    reporter.refresh(true, None, None).await.unwrap();
    let before = h
        .repository
        .snapshot("feature/review".into())
        .await
        .unwrap();
    assert_eq!(before.changes.base_branch, "feature/review");
    assert_eq!(before.base_commit, feature);
    events.0.lock().unwrap().clear();

    h.git(&["update-ref", "refs/remotes/origin/main", &merged]);
    h.git(&["config", "branch.task.gh-merge-base", "main"]);
    h.git(&[
        "symbolic-ref",
        "refs/remotes/origin/HEAD",
        "refs/remotes/origin/main",
    ]);
    reporter.refresh(false, None, None).await.unwrap();
    {
        let emitted = events.0.lock().unwrap();
        let changes = emitted
            .iter()
            .filter_map(|event| match event {
                RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }) => {
                    Some(changes)
                }
                _ => None,
            })
            .collect::<Vec<_>>();
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].changes_response.base_branch, "main");
        assert_eq!(
            changes[0]
                .changes_response
                .files
                .iter()
                .map(|file| file.changed_file.path.as_str())
                .collect::<Vec<_>>(),
            ["carry.txt", "workspace.txt"]
        );
    }
    let snapshot = h.repository.snapshot("trunk".into()).await.unwrap();
    assert_eq!(snapshot.base_commit, feature);
    assert_eq!(snapshot.changes.base_branch, "main");
    let carried = h
        .repository
        .diff("carry.txt".into(), "trunk".into())
        .await
        .unwrap();
    assert_eq!(carried.base_branch, "main");
    assert_eq!(carried.old_content.as_deref(), Some("original\n"));
    assert_eq!(carried.new_content.as_deref(), Some("kept work\n"));
    let diff = h
        .repository
        .diff("feature.txt".into(), "feature/review".into())
        .await
        .unwrap();
    assert_eq!(diff.base_branch, "main");
    assert_eq!(diff.old_content.as_deref(), Some("merged feature\n"));
    assert_eq!(diff.new_content.as_deref(), Some("merged feature\n"));
    assert_eq!(diff.patch, "");
    assert_eq!(h.git(&["rev-parse", "HEAD"]), head);
}
