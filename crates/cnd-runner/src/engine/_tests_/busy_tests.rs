//! Each independent reason for engine activity blocks an idle update.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::oneshot;
use unimock::{MockFn, Unimock, matching};

use crate::config::{Configuration, ConnectionRequest};
use crate::engine::dependencies::EngineDependencies;
use crate::engine::handler::{AgentEngine, SessionHandle};
use crate::engine::mailbox::Mailbox;
use crate::engine::types::Work;
use crate::filter::service::CredentialFilter;
use crate::runtime::CommandHandler;
use crate::state::records::{RunnerState, SavedTurn};
use crate::state::store::EventStoreMock;

fn engine(state: RunnerState) -> AgentEngine {
    AgentEngine::new(
        EngineDependencies {
            configuration: Configuration {
                workspace_id: "workspace".into(),
                request: ConnectionRequest {
                    url: "wss://machines.test/runner".into(),
                    workspace_token: "token".into(),
                },
                cwd: "/repo".into(),
                home: "/home/user".into(),
                default_branch: "main".into(),
                workspace_branch: None,
                skills_repository: None,
                trusted_skills_repository: None,
                workspace_context: None,
                repository_directories: BTreeMap::new(),
                registered_repository_variables: Default::default(),
                state_path: "/state".into(),
            },
            store: Arc::new(Unimock::new(
                EventStoreMock::snapshot
                    .some_call(matching!())
                    .returns(state),
            )),
            emitter: Arc::new(Unimock::new(())),
            credentials: Arc::new(CredentialFilter::default()),
            helpers: Arc::new(Unimock::new(())),
            repositories: Arc::new(Unimock::new(())),
            clock: Arc::new(Unimock::new(())),
            startup: Arc::new(Unimock::new(())),
            background_limit: Duration::from_secs(100),
        },
        RunnerState::new("stream".into()),
    )
}

fn register(engine: &AgentEngine, mailbox: Mailbox) {
    engine.registry.lock().unwrap().sessions.insert(
        "session".into(),
        SessionHandle {
            mailbox,
            controls: Arc::new(Mutex::new(BTreeMap::new())),
        },
    );
}

#[tokio::test]
async fn an_active_turn_is_busy_without_an_unfinished_saved_record() {
    let engine = engine(RunnerState::new("stream".into()));
    let (mailbox, _receiver) = Mailbox::channel();
    register(&engine, mailbox.clone());
    mailbox.active(true);
    assert!(engine.busy().await.unwrap());
    mailbox.active(false);
    assert!(!engine.busy().await.unwrap());
}

#[tokio::test]
async fn mailbox_work_is_busy_while_queued_and_while_executing() {
    let engine = engine(RunnerState::new("stream".into()));
    let (mailbox, mut receiver) = Mailbox::channel();
    register(&engine, mailbox.clone());
    mailbox.send(Work::Idle(oneshot::channel().0)).unwrap();
    assert!(engine.busy().await.unwrap());
    {
        let _work = receiver.recv().await.unwrap();
        assert!(engine.busy().await.unwrap());
    }
    assert!(!engine.busy().await.unwrap());
}

#[tokio::test]
async fn an_accepted_turn_stays_busy_until_it_has_a_saved_end() {
    for (end, expected) in [(None, true), (Some(2), false)] {
        let mut state = RunnerState::new("stream".into());
        state.turns.push(SavedTurn {
            session_id: "session".into(),
            turn_id: "turn".into(),
            started_at: 0,
            message_ids: vec![],
            start_event_number: Some(1),
            end_event_number: end,
        });
        assert_eq!(engine(state).busy().await.unwrap(), expected, "{end:?}");
    }
}
