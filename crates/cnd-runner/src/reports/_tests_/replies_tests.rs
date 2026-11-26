//! Direct skill reads return a public failure if filtering fails.

#![expect(clippy::unwrap_used, reason = "The test stops on failed commands.")]

use std::sync::{Arc, Mutex};

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::file_tree::RunnerFileEvent;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerControlCommand};
use cnd_runner_interface::runner_files::RunnerFileResponse;
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::runner_skills::{
    RunnerReadSkill, RunnerSkillError, RunnerSkillResult, SkillReadOutcome,
};
use cnd_runner_interface::wire::{WireFalse, WireTrue};
use unimock::{MockFn, Unimock, matching};

use crate::error::{Error, Result};
use crate::link::ports::RunnerLinkMock;
use crate::reports::files::FileReportsMock;
use crate::reports::handler::{ReportCommandHandler, ReportDependencies};
use crate::reports::prepare::ReportFilter;
use crate::runtime::{CommandHandler, CommandHandlerMock};
use crate::skills::boundary::SkillReportsMock;

struct FailingSkillFilter;

impl ReportFilter for FailingSkillFilter {
    fn file_report(&self, event: RunnerFileEvent) -> Result<RunnerFileEvent> {
        Ok(event)
    }

    fn report(&self, event: RunnerEvent) -> Result<RunnerEvent> {
        Ok(event)
    }

    fn response(&self, response: RunnerFileResponse) -> Result<RunnerFileResponse> {
        Ok(response)
    }

    fn skill_response(&self, _: RunnerSkillResult) -> Result<RunnerSkillResult> {
        Err(Error::InvalidCommand)
    }
}

#[tokio::test]
async fn skill_read_replies_unavailable_when_credential_filter_fails() {
    let replies = Arc::new(Mutex::new(Vec::new()));
    let sent = replies.clone();
    let handler = ReportCommandHandler::new(
        ReportDependencies {
            files: Arc::new(Unimock::new(
                FileReportsMock::close.some_call(matching!()).returns(()),
            )),
            ports: None,
            skills: Some(Arc::new(Unimock::new((
                SkillReportsMock::read
                    .some_call(matching!(Agent::Claude, "review", 100))
                    .returns(SkillReadOutcome::Success {
                        ok: WireTrue,
                        text: "Private test content.".into(),
                    }),
                SkillReportsMock::close.some_call(matching!()).returns(()),
            )))),
            emitter: Arc::new(Unimock::new(())),
            link: Arc::new(Unimock::new(
                RunnerLinkMock::reply
                    .each_call(matching!(_))
                    .answers_arc(Arc::new(move |_, reply| {
                        sent.lock().unwrap().push(reply);
                        Ok(())
                    })),
            )),
            store: Arc::new(Unimock::new(())),
            clock: Arc::new(Unimock::new(())),
            filter: Arc::new(FailingSkillFilter),
            watches: None,
            next: Arc::new(Unimock::new(
                CommandHandlerMock::shutdown
                    .some_call(matching!())
                    .returns(Ok(())),
            )),
        },
        vec![],
    );
    handler
        .command(RunnerCommand::RunnerControlCommand(
            RunnerControlCommand::RunnerReadSkill(RunnerReadSkill::Read {
                request_id: "read-123".into(),
                agent: Agent::Claude,
                name: "review".into(),
                max_bytes: 100,
            }),
        ))
        .unwrap();
    handler.shutdown().await.unwrap();

    assert_eq!(
        *replies.lock().unwrap(),
        vec![RunnerToWorkspace::RunnerSkillResult(
            RunnerSkillResult::Read {
                request_id: "read-123".into(),
                result: SkillReadOutcome::Failure {
                    ok: WireFalse,
                    error: RunnerSkillError::Unavailable {
                        message: "The skill could not be read.".into(),
                    },
                },
            }
        )]
    );
}
