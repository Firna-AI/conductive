//! Per-session state and ordered actor messages.

use std::collections::{BTreeSet, VecDeque};
use std::sync::Arc;

use cnd_runner_interface::agents::AgentChoice;
use cnd_runner_interface::chat_events::TurnSpeed;
use cnd_runner_interface::messages::UserMessage;
use cnd_runner_interface::runner_commands::{RunnerCommand, RunnerMessageDuringTurn, RunnerTurn};
use cnd_runner_interface::sdk_helper::HelperOutput;
use cnd_runner_interface::sdk_helper_options::ProviderInput;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::error::Result;
use crate::helper::boundary::Helper;
use crate::repository::service::Checkpoint;
use crate::skills::boundary::OrgSkills;
use crate::skills::lease::SkillsLease;
use crate::state::records::SavedSession;

use super::background::Background;
use super::control::Control;
use super::dependencies::EngineDependencies;
use super::mailbox::Mailbox;
use super::output::TurnOutput;

pub(super) enum Work {
    Command(Box<RunnerCommand>, i64, Option<JoinHandle<Result<()>>>),
    Output(u64, HelperOutput),
    Idle(oneshot::Sender<()>),
    Shutdown(oneshot::Sender<()>),
}

pub(super) struct ActiveTurn {
    pub(super) first: RunnerTurn,
    pub(super) control: Control,
    pub(super) started_at: i64,
    pub(super) retry_message_id: String,
    pub(super) message_ids: Vec<String>,
    pub(super) resolved: BTreeSet<String>,
    pub(super) notice_ids: Vec<String>,
    pub(super) read_notice_ids: BTreeSet<String>,
    pub(super) waiting: VecDeque<ProviderInput>,
    pub(super) helper: Option<Arc<dyn Helper>>,
    pub(super) skills_lease: Option<SkillsLease>,
    pub(super) baseline: Option<Checkpoint>,
    pub(super) output: TurnOutput,
    pub(super) background: Option<Background>,
    pub(super) notes: BTreeSet<String>,
    pub(super) speed: Option<TurnSpeed>,
}

pub(super) struct Session {
    pub(super) id: String,
    pub(super) dependencies: Arc<EngineDependencies>,
    pub(super) skills: Arc<dyn OrgSkills>,
    pub(super) saved: Option<SavedSession>,
    pub(super) choice: Option<AgentChoice>,
    pub(super) active: Option<ActiveTurn>,
    pub(super) generation: u64,
    pub(super) controls: Arc<std::sync::Mutex<std::collections::BTreeMap<String, Control>>>,
    pub(super) ended: BTreeSet<String>,
    pub(super) mailbox: Mailbox,
}

pub(super) fn identity(input: &ProviderInput) -> Option<(&str, &str, &UserMessage)> {
    match input {
        ProviderInput::Turn(RunnerTurn::Turn {
            session_id,
            turn_id,
            message,
            ..
        }) => Some((session_id, turn_id, message)),
        ProviderInput::Message(RunnerMessageDuringTurn::Message {
            session_id,
            turn_id,
            message,
            ..
        }) => Some((session_id, turn_id, message)),
        ProviderInput::Notice(_) => None,
    }
}

pub(super) enum End {
    Result(
        cnd_runner_interface::provider_events::ProviderResultState,
        Option<cnd_runner_interface::chat_events::TurnEndReason>,
    ),
    Failed(crate::error::Error),
}
