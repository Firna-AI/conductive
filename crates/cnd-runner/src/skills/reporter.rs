//! Ordered discovery and durable emission with current private Codex paths.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};

use async_trait::async_trait;
use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_skills::SkillReadOutcome;
use cnd_runner_interface::skills::{HelperSkillLists, RunnerSkillsUpdated, SkillInput};
use futures_util::future::BoxFuture;
use tokio::sync::Mutex;

use crate::emitter::EventEmitter;
use crate::error::{Error, Result};
use crate::reports::prepare::ReportFilter;
use crate::reports::queue::SerialQueue;

use super::boundary::{SkillInputs, SkillReports, SkillScanner};
use super::{prepare, read};

#[derive(Default)]
struct History {
    source: Option<HelperSkillLists>,
    last: Option<RunnerSkillsUpdated>,
}

/// Rust owns the report lifetime. Scanner metadata and paths stay in memory.
#[derive(Clone)]
pub struct SkillReporter {
    scanner: Arc<dyn SkillScanner>,
    emitter: Arc<dyn EventEmitter>,
    filter: Arc<dyn ReportFilter>,
    history: Arc<Mutex<History>>,
    inputs: Arc<RwLock<Vec<SkillInput>>>,
    queue: Arc<SerialQueue>,
    stopped: Arc<AtomicBool>,
    queued: Arc<AtomicBool>,
}

impl SkillReporter {
    /// Compose before the first connection with the shared credential filter.
    pub fn new(
        scanner: Arc<dyn SkillScanner>,
        emitter: Arc<dyn EventEmitter>,
        filter: Arc<dyn ReportFilter>,
    ) -> Self {
        Self {
            scanner,
            emitter,
            filter,
            history: Arc::new(Mutex::new(History::default())),
            inputs: Arc::new(RwLock::new(vec![])),
            queue: Arc::new(SerialQueue::default()),
            stopped: Arc::new(AtomicBool::new(false)),
            queued: Arc::new(AtomicBool::new(false)),
        }
    }

    async fn scan(&self, full: bool, command_id: Option<String>) -> Result<()> {
        let mut history = self.history.lock().await;
        if self.stopped.load(Ordering::Acquire) {
            return Ok(());
        }
        match self.scanner.scan(full).await {
            Ok(lists) => history.source = Some(lists),
            Err(_) if history.source.is_some() => {
                tracing::warn!(
                    "The skill lists could not update. The report keeps the last lists."
                );
            }
            Err(error) => return Err(error),
        }
        if self.stopped.load(Ordering::Acquire) {
            return Ok(());
        }
        let lists = history.source.as_ref().ok_or(Error::HelperResponse)?;
        let report = prepare::report(lists, self.filter.as_ref())?;
        let RunnerSkillsUpdated::SkillsUpdated { codex, .. } = &report;
        let inputs = codex
            .iter()
            .filter_map(|skill| {
                lists
                    .codex
                    .iter()
                    .find(|entry| entry.skill.name == skill.name)
                    .map(|entry| SkillInput {
                        name: skill.name.clone(),
                        path: entry.path.clone(),
                    })
            })
            .collect();
        *self.inputs.write().or(Err(Error::InvalidCommand))? = inputs;
        if full || history.last.as_ref() != Some(&report) {
            self.emitter
                .emit(
                    vec![RunnerEvent::RunnerSkillsUpdated(report.clone())],
                    command_id,
                )
                .await?;
            history.last = Some(report);
        }
        Ok(())
    }
}

impl SkillInputs for SkillReporter {
    fn current(&self) -> Result<Vec<SkillInput>> {
        Ok(self.inputs.read().or(Err(Error::InvalidCommand))?.clone())
    }
}

#[async_trait]
impl SkillReports for SkillReporter {
    fn refresh(&self, full: bool, command_id: Option<String>) -> BoxFuture<'static, Result<()>> {
        let changed = !full && command_id.is_none();
        if changed && self.queued.swap(true, Ordering::AcqRel) {
            return Box::pin(async { Ok(()) });
        }
        let reporter = self.clone();
        self.queue.run(async move {
            if changed {
                reporter.queued.store(false, Ordering::Release);
            }
            reporter.scan(full, command_id).await
        })
    }

    async fn read(&self, agent: Agent, name: String, max_bytes: u64) -> SkillReadOutcome {
        let skill = {
            let history = self.history.lock().await;
            history.source.as_ref().and_then(|lists| {
                let entries = match agent {
                    Agent::Claude => &lists.claude,
                    Agent::Codex => &lists.codex,
                };
                entries
                    .iter()
                    .find(|entry| entry.skill.name == name)
                    .cloned()
            })
        };
        match skill {
            Some(skill) => self.scanner.read(agent, skill, max_bytes).await,
            None => read::not_found(),
        }
    }

    async fn close(&self) {
        self.stopped.store(true, Ordering::Release);
        self.scanner.close().await;
        let _ = self.queue.run(async { Ok(()) }).await;
    }
}

#[cfg(test)]
#[path = "_tests_/reporter_tests.rs"]
mod reporter_tests;
