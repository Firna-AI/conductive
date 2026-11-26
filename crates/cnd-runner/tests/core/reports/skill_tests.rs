//! Full skill reports precede readiness and survive refresh, replay, and restart.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner::emitter::SavingEmitter;
use cnd_runner::error::Result;
use cnd_runner::reports::prepare::UnfilteredReports;
use cnd_runner::skills::boundary::{SkillReports, SkillScanner};
use cnd_runner::skills::reporter::SkillReporter;
use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner::{RunnerEvent, RunnerReady};
use cnd_runner_interface::runner_commands::RunnerReportKind;
use cnd_runner_interface::runner_handshake::RunnerEventEnvelope;
use cnd_runner_interface::runner_skills::SkillReadOutcome;
use cnd_runner_interface::skills::{AgentSkill, HelperSkillLists, RunnerSkillsUpdated, SkillEntry};

use crate::support::fixture::{self, Fixture};

use super::support;

struct Scanner;
#[async_trait]
impl SkillScanner for Scanner {
    async fn scan(&self, _: bool) -> Result<HelperSkillLists> {
        Ok(HelperSkillLists {
            claude: vec![SkillEntry {
                skill: AgentSkill {
                    name: "plans".into(),
                    description: "Write plans.".into(),
                    manual_only: Some(true),
                },
                path: "/private/plans/SKILL.md".into(),
                org: None,
            }],
            codex: vec![],
        })
    }
    async fn read(&self, _: Agent, _: SkillEntry, _: u64) -> SkillReadOutcome {
        unreachable!("report-only scanner")
    }

    async fn close(&self) {}
}

fn expected() -> RunnerEvent {
    RunnerEvent::RunnerSkillsUpdated(RunnerSkillsUpdated::SkillsUpdated {
        claude: vec![AgentSkill {
            name: "plans".into(),
            description: "Write plans.".into(),
            manual_only: Some(true),
        }],
        codex: vec![],
    })
}

fn reporter(h: &Fixture) -> Arc<dyn SkillReports> {
    Arc::new(SkillReporter::new(
        Arc::new(Scanner),
        Arc::new(SavingEmitter::new(h.link.clone())),
        Arc::new(UnfilteredReports),
    ))
}

#[tokio::test]
async fn skills_precede_ready_and_refresh_requests_save_one_answer_per_id_across_restarts() {
    let h = Fixture::new().await;
    h.connected().await;
    let skills = reporter(&h);
    let files = support::files(&h, support::source(vec![]), None, None).await;
    let (handler, _) = support::handler_with_skills(&h, files, Some(skills.clone())).await;
    handler.connected().await.unwrap();
    h.link.close().await.unwrap();
    h.connected().await;
    handler.connected().await.unwrap();
    let events: Vec<_> = h
        .store
        .snapshot()
        .await
        .outbox
        .into_iter()
        .map(|RunnerEventEnvelope::Event { event, .. }| event)
        .collect();
    assert_eq!(
        &events[events.len() - 2..],
        &[
            expected(),
            RunnerEvent::RunnerReady(RunnerReady::RunnerReady {})
        ]
    );
    let repair = support::refresh(RunnerReportKind::SkillsUpdated, "skills-repair");
    handler.command(repair.clone()).unwrap();
    handler.command(repair.clone()).unwrap();
    skills.refresh(false, None).await.unwrap();
    handler.shutdown().await.unwrap();
    let reopened = fixture::open(h.disk.clone()).await;
    let saved = reopened.snapshot().await;
    assert_eq!(saved.reports.commands, ["skills-repair"]);
    assert_eq!(
        saved
            .outbox
            .iter()
            .filter(|RunnerEventEnvelope::Event { event, .. }| event == &expected())
            .count(),
        2
    );
    assert_eq!(
        h.endpoint
            .state
            .lock()
            .await
            .events
            .iter()
            .filter(|RunnerEventEnvelope::Event { event, .. }| event == &expected())
            .count(),
        3
    );
    let files = support::files(&h, support::source(vec![]), None, None).await;
    let (restarted, _) = support::handler_with_skills(&h, files, Some(reporter(&h))).await;
    restarted.command(repair).unwrap();
    restarted.shutdown().await.unwrap();
    assert_eq!(
        h.store.snapshot().await.next_event_number,
        saved.next_event_number
    );
}

#[tokio::test]
async fn unconfirmed_skills_replay_and_latest_report_survives_confirmation_and_reopened_state() {
    let h = Fixture::new().await;
    h.connected().await;
    let skills = reporter(&h);
    h.link.close().await.unwrap();
    skills
        .refresh(true, Some("skills-repair".into()))
        .await
        .unwrap();
    let reopened = fixture::open(h.disk.clone()).await;
    let saved = reopened.snapshot().await;
    assert_eq!(saved.reports.commands, ["skills-repair"]);
    assert_eq!(
        saved
            .outbox
            .last()
            .map(|RunnerEventEnvelope::Event { event, .. }| event.clone()),
        Some(expected())
    );
    h.connected().await;
    assert_eq!(
        h.endpoint
            .state
            .lock()
            .await
            .events
            .last()
            .map(|RunnerEventEnvelope::Event { event, .. }| event.clone()),
        Some(expected())
    );
    reopened.confirm(saved.next_event_number - 1).await.unwrap();
    let confirmed = fixture::open(h.disk.clone()).await;
    assert_eq!(confirmed.snapshot().await.outbox, vec![]);
    confirmed
        .refresh_report(
            RunnerReportKind::SkillsUpdated,
            "retained-skills".into(),
            100,
            Arc::new(UnfilteredReports),
        )
        .await
        .unwrap();
    assert_eq!(
        confirmed
            .snapshot()
            .await
            .outbox
            .last()
            .map(|RunnerEventEnvelope::Event { event, .. }| event.clone()),
        Some(expected())
    );
    skills.close().await;
}
