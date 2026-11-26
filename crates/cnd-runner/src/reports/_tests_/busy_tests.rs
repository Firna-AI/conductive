//! Report activity and the next handler both prevent an idle release change.

#![allow(clippy::unwrap_used)]

use std::sync::{Arc, Mutex};

use cnd_runner_interface::runner_commands::{
    RunnerCommand, RunnerControlCommand, RunnerReportKind, RunnerReportRefresh,
};
use tokio::sync::oneshot;
use unimock::{MockFn, Unimock, matching};

use crate::reports::files::FileReportsMock;
use crate::reports::handler::{ReportCommandHandler, ReportDependencies};
use crate::reports::prepare::UnfilteredReports;
use crate::runtime::{CommandHandler, CommandHandlerMock};

fn handler(next: Unimock, files: Unimock) -> ReportCommandHandler {
    ReportCommandHandler::new(
        ReportDependencies {
            files: Arc::new(files),
            ports: None,
            skills: None,
            emitter: Arc::new(Unimock::new(())),
            link: Arc::new(Unimock::new(())),
            store: Arc::new(Unimock::new(())),
            clock: Arc::new(Unimock::new(())),
            filter: Arc::new(UnfilteredReports),
            watches: None,
            next: Arc::new(next),
        },
        vec![],
    )
}

#[tokio::test]
async fn busy_includes_queued_reports_and_delegates_to_the_turn_handler() {
    let (release, waiting) = oneshot::channel();
    let waiting = Mutex::new(Some(waiting));
    let handler = handler(
        Unimock::new((
            CommandHandlerMock::busy.stub(|each| {
                each.call(matching!())
                    .answers(&|_| Ok(true))
                    .once()
                    .then()
                    .answers(&|_| Ok(false));
            }),
            CommandHandlerMock::shutdown
                .some_call(matching!())
                .returns(Ok(())),
        )),
        Unimock::new((
            FileReportsMock::refresh
                .some_call(matching!(_, _, _))
                .answers_arc(Arc::new(move |_, _, _, _| {
                    let waiting = waiting.lock().unwrap().take().unwrap();
                    Box::pin(async move {
                        waiting.await.unwrap();
                        Ok(())
                    })
                })),
            FileReportsMock::close.some_call(matching!()).returns(()),
        )),
    );
    assert!(handler.busy().await.unwrap());
    handler
        .command(RunnerCommand::RunnerControlCommand(
            RunnerControlCommand::RunnerReportRefresh(RunnerReportRefresh::ReportRefresh {
                command_id: "refresh".into(),
                kind: RunnerReportKind::FilesSnapshot,
            }),
        ))
        .unwrap();
    assert!(handler.busy().await.unwrap());
    release.send(()).unwrap();
    handler.shutdown().await.unwrap();
    assert!(!handler.busy().await.unwrap());
}

#[tokio::test]
async fn busy_includes_initial_reports_before_their_future_is_polled() {
    let handler = handler(
        Unimock::new((
            CommandHandlerMock::connected
                .some_call(matching!())
                .answers(&|_| Box::pin(async { Ok(()) })),
            CommandHandlerMock::busy
                .some_call(matching!())
                .returns(Ok(false)),
        )),
        Unimock::new(
            FileReportsMock::refresh
                .some_call(matching!(_, _, _))
                .answers(&|_, _, _, _| Box::pin(std::future::pending())),
        ),
    );
    {
        let _initial = handler.connected();
        assert!(handler.busy().await.unwrap());
    }
    assert!(!handler.busy().await.unwrap());
}
