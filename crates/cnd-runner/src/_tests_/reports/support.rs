//! Pure snapshots and mocked repository and emission boundaries.

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::file_changes::{
    BranchChangedFile, ChangeKind, ChangedFile, ChangesResponse, ChangesResponseSummary,
};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;
use unimock::{MockFn, Unimock, matching};

use crate::emitter::{EventEmitter, EventEmitterMock};
use crate::reports::files::{FileReporter, FileReports};
use crate::reports::prepare::{ReportFilter, UnfilteredReports};
use crate::reports::selection::ReportLimits;
use crate::repository::service::{Repository, RepositoryMock, RepositorySnapshot};
use crate::state::records::FileRevisions;

pub(super) fn snapshot(paths: Vec<String>) -> RepositorySnapshot {
    RepositorySnapshot {
        entries: paths
            .into_iter()
            .map(|path| FileEntry {
                path,
                display_path: None,
                name: "file".into(),
                kind: FileEntryKind::File,
                change: None,
            })
            .collect(),
        context_only_paths: Default::default(),
        changes: ChangesResponse {
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(3),
            uncommitted_file_count: Some(4),
            files: vec![],
            summary: ChangesResponseSummary {
                files: 0,
                added: 0,
                removed: 0,
            },
            omitted: None,
        },
        identities: BTreeMap::new(),
        read_identities: BTreeMap::new(),
        base_commit: "base".into(),
    }
}

pub(super) fn named_snapshot(paths: &[&str]) -> RepositorySnapshot {
    snapshot(paths.iter().map(|path| (*path).into()).collect())
}

pub(super) fn changed_file(
    path: &str,
    added: u64,
    removed: u64,
    uncommitted: bool,
) -> BranchChangedFile {
    BranchChangedFile {
        changed_file: ChangedFile {
            path: path.into(),
            display_path: None,
            previous_path: None,
            previous_display_path: None,
            change: ChangeKind::Modified,
            added,
            removed,
        },
        uncommitted,
    }
}

type Captured = Arc<Mutex<Vec<(RunnerEvent, Option<String>)>>>;

pub(super) struct Fixture {
    pub files: Arc<dyn FileReports>,
    pub current: Arc<Mutex<Option<RepositorySnapshot>>>,
    pub events: Captured,
}

impl Fixture {
    pub(super) fn new(current: RepositorySnapshot) -> Self {
        Self::with_filter(current, Arc::new(UnfilteredReports))
    }

    pub(super) fn with_filter(current: RepositorySnapshot, filter: Arc<dyn ReportFilter>) -> Self {
        Self::build(current, filter, None, None)
    }

    pub(super) fn with_limits(current: RepositorySnapshot, limits: ReportLimits) -> Self {
        Self::with_filter_and_limits(current, Arc::new(UnfilteredReports), limits)
    }

    pub(super) fn with_filter_and_limits(
        current: RepositorySnapshot,
        filter: Arc<dyn ReportFilter>,
        limits: ReportLimits,
    ) -> Self {
        Self::build(current, filter, Some(limits), None)
    }

    pub(super) fn with_changes_deltas(
        current: RepositorySnapshot,
        filter: Arc<dyn ReportFilter>,
        limits: ReportLimits,
    ) -> Self {
        Self::build(current, filter, Some(limits), Some(1))
    }

    fn build(
        current: RepositorySnapshot,
        filter: Arc<dyn ReportFilter>,
        limits: Option<ReportLimits>,
        generation: Option<u64>,
    ) -> Self {
        let current = Arc::new(Mutex::new(Some(current)));
        let events = Arc::new(Mutex::new(vec![]));
        let captured = events.clone();
        let source = current.clone();
        let repository: Arc<dyn Repository> = Arc::new(Unimock::new(
            RepositoryMock::snapshot
                .each_call(matching!(_))
                .answers_arc(Arc::new(move |_, _| {
                    source
                        .lock()
                        .unwrap()
                        .clone()
                        .ok_or(crate::repository::error::Error::Unavailable)
                })),
        ));
        let emit = EventEmitterMock::emit
            .each_call(matching!(_, _))
            .answers_arc(Arc::new(move |_, events, receipt| {
                captured
                    .lock()
                    .unwrap()
                    .extend(events.into_iter().map(|event| (event, receipt.clone())));
                Ok(())
            }));
        let emitter: Arc<dyn EventEmitter> = Arc::new(match generation {
            Some(generation) => Unimock::new((
                EventEmitterMock::changes_delta_generation
                    .each_call(matching!())
                    .returns(Some(generation)),
                emit,
            )),
            None => Unimock::new(emit),
        });
        let mut reporter = FileReporter::new(
            repository,
            "main".into(),
            emitter,
            filter,
            FileRevisions::default(),
        );
        if let Some(limits) = limits {
            reporter.limits = limits;
        }
        let files: Arc<dyn FileReports> = Arc::new(reporter);
        Self {
            files,
            current,
            events,
        }
    }

    pub(super) fn take(&self) -> Vec<(RunnerEvent, Option<String>)> {
        std::mem::take(&mut *self.events.lock().unwrap())
    }

    pub(super) fn take_reports(&self) -> Vec<RunnerFileEvent> {
        self.take()
            .into_iter()
            .map(|(event, _)| match event {
                RunnerEvent::RunnerFileEvent(report) => report,
                _ => panic!("expected a file report"),
            })
            .collect()
    }
}
