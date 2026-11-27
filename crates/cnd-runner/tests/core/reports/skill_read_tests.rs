//! Skill commands use the requested agent's latest list and reply outside the outbox.

use std::collections::BTreeMap;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner::emitter::SavingEmitter;
use cnd_runner::error::Result;
use cnd_runner::filter::service::{CredentialFilter, Credentials};
use cnd_runner::link::ports::LinkUpdate;
use cnd_runner::reports::handler::{ReportCommandHandler, ReportDependencies};
use cnd_runner::runtime::CommandHandler;
use cnd_runner::skills::boundary::{SkillReports, SkillScanner};
use cnd_runner::skills::reporter::SkillReporter;
use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerControlCommand};
use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use cnd_runner_interface::runner_skills::{
    RunnerReadSkill, RunnerSkillError, RunnerSkillResult, SkillReadOutcome,
};
use cnd_runner_interface::skills::{AgentSkill, HelperSkillLists, SkillEntry};
use cnd_runner_interface::wire::{WireFalse, WireTrue};
use tokio::sync::mpsc;

use crate::support::fixture::{FixedClock, Fixture};

use super::support::{Next, files, source};

const CLAUDE: &str = "/repo/.claude/skills/review/SKILL.md";
const CODEX: &str = "/repo/.agents/skills/review/SKILL.md";

struct Scanner;

#[async_trait]
impl SkillScanner for Scanner {
    async fn scan(&self, _: bool) -> Result<HelperSkillLists> {
        fn entry(name: &str, path: &str) -> SkillEntry {
            SkillEntry {
                skill: AgentSkill {
                    name: name.into(),
                    description: "Review a change.".into(),
                    manual_only: None,
                },
                path: path.into(),
                org: None,
            }
        }
        Ok(HelperSkillLists {
            claude: vec![
                entry("review", CLAUDE),
                entry("claude-only", "/repo/.claude/skills/claude-only/SKILL.md"),
            ],
            codex: vec![entry("review", CODEX)],
        })
    }

    async fn read(&self, _: Agent, skill: SkillEntry, _: u64) -> SkillReadOutcome {
        let text = match skill.path.as_str() {
            CLAUDE => "Claude text with workspace-token.",
            CODEX => "Codex text.",
            _ => "The wrong skill was selected.",
        };
        SkillReadOutcome::Success {
            ok: WireTrue,
            text: text.into(),
        }
    }

    async fn close(&self) {}
}

#[tokio::test]
async fn reads_only_the_named_agents_skill_and_sends_filtered_unnumbered_results() {
    let h = Fixture::new().await;
    h.connected().await;
    let filter = Arc::new(CredentialFilter::default());
    filter.add("workspace-token".into()).unwrap();
    let emitter = Arc::new(SavingEmitter::new(h.link.clone()));
    let skills = Arc::new(SkillReporter::new(
        Arc::new(Scanner),
        emitter.clone(),
        filter.clone(),
    ));
    skills.refresh(true, None).await.unwrap();
    let before = h.store.snapshot().await;
    let (send, mut forwarded) = mpsc::unbounded_channel();
    let handler = ReportCommandHandler::new(
        ReportDependencies {
            files: files(&h, source(vec![]), None, None).await,
            ports: None,
            skills: Some(skills),
            emitter,
            link: h.link.clone(),
            store: h.store.clone(),
            clock: Arc::new(FixedClock),
            filter,
            watches: None,
            next: Arc::new(Next(send)),
        },
        vec![],
    );
    for (id, agent, name) in [
        ("claude", Agent::Claude, "review"),
        ("codex", Agent::Codex, "review"),
        ("unknown", Agent::Claude, "unknown"),
        ("other-agent", Agent::Codex, "claude-only"),
    ] {
        let request = RunnerReadSkill::Read {
            request_id: id.into(),
            agent,
            name: name.into(),
            max_bytes: 1_048_576,
        };
        h.endpoint
            .inject(WorkspaceToRunner::RunnerCommand(Box::new(
                RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerReadSkill(request)),
            )))
            .await;
        let LinkUpdate::Command(command) = h.link.step().await.unwrap() else {
            panic!("expected a skill command");
        };
        handler.command(*command).unwrap();
    }
    handler.shutdown().await.unwrap();

    let results = h
        .endpoint
        .state
        .lock()
        .await
        .received
        .iter()
        .filter_map(|message| match message {
            RunnerToWorkspace::RunnerSkillResult(RunnerSkillResult::Read {
                request_id,
                result,
            }) => Some((request_id.clone(), result.clone())),
            _ => None,
        })
        .collect::<BTreeMap<_, _>>();
    let missing = SkillReadOutcome::Failure {
        ok: WireFalse,
        error: RunnerSkillError::NotFound {
            message: "The skill was not found.".into(),
        },
    };
    assert_eq!(
        results,
        BTreeMap::from([
            (
                "claude".into(),
                SkillReadOutcome::Success {
                    ok: WireTrue,
                    text: "Claude text with [redacted].".into(),
                },
            ),
            (
                "codex".into(),
                SkillReadOutcome::Success {
                    ok: WireTrue,
                    text: "Codex text.".into(),
                },
            ),
            ("unknown".into(), missing.clone()),
            ("other-agent".into(), missing),
        ])
    );
    assert_eq!(forwarded.try_recv(), Err(mpsc::error::TryRecvError::Empty));
    let after = h.store.snapshot().await;
    assert_eq!(after.outbox, before.outbox);
    assert_eq!(after.next_event_number, before.next_event_number);
}
