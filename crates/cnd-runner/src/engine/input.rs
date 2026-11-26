//! Session identity, durable instructions, and turn acceptance.

use std::collections::{BTreeSet, VecDeque};

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::chat_events::{
    AgentChatEvent, AgentChatEventTurnFailedError, TurnEventContext,
};
use cnd_runner_interface::runner_commands::{RunnerMessageDuringTurn, RunnerTurn};
use cnd_runner_interface::sdk_helper_options::ProviderInput;

use crate::error::{Error, Result};
use crate::state::records::SavedSession;

use super::background::Background;
use super::control::Control;
use super::instructions;
use super::output::TurnOutput;
use super::types::{ActiveTurn, Session, identity};

impl Session {
    pub(super) async fn input(
        &mut self,
        input: ProviderInput,
        control: Control,
        received_at: i64,
    ) -> Result<()> {
        let (session_id, turn_id, message) = identity(&input).ok_or(Error::InvalidCommand)?;
        let context = TurnEventContext {
            session_id: session_id.to_owned(),
            turn_id: turn_id.to_owned(),
        };
        if matches!(&input, ProviderInput::Message(_))
            && self
                .active
                .as_ref()
                .is_none_or(|turn| turn.output_context() != context)
        {
            tracing::warn!("The message targets a turn that is not running.");
            return Ok(());
        }
        if self
            .saved
            .as_ref()
            .is_some_and(|s| s.agent != message.choice.agent)
        {
            return self
                .emit(vec![AgentChatEvent::TurnFailed {
                    turn_event_context: context,
                    error: AgentChatEventTurnFailedError {
                        code: "session_agent_mismatch".into(),
                        message: "Start a new session for this agent.".into(),
                    },
                    retry_message_id: message.id.clone(),
                    duration_ms: 0,
                    notice_ids: vec![],
                }])
                .await;
        }
        if matches!(&input, ProviderInput::Turn(_)) && self.active.is_some() {
            return self
                .emit(vec![AgentChatEvent::TurnFailed {
                    turn_event_context: context,
                    error: AgentChatEventTurnFailedError {
                        code: "turn_running".into(),
                        message: "The session already has a running turn.".into(),
                    },
                    retry_message_id: message.id.clone(),
                    duration_ms: 0,
                    notice_ids: vec![],
                }])
                .await;
        }
        let branches = match &input {
            ProviderInput::Turn(RunnerTurn::Turn { branches, .. })
            | ProviderInput::Message(RunnerMessageDuringTurn::Message { branches, .. }) => {
                branches.as_ref()
            }
            ProviderInput::Notice(_) => None,
        };
        let needs_instructions = self.saved.as_ref().is_none_or(|s| s.instructions.is_none());
        if needs_instructions {
            let capabilities = match &input {
                ProviderInput::Turn(RunnerTurn::Turn { capabilities, .. }) => capabilities.as_ref(),
                ProviderInput::Message(_) | ProviderInput::Notice(_) => None,
            };
            let (text, branches) = instructions::build(
                &self.dependencies.configuration,
                branches,
                capabilities,
                &message.choice.agent,
            )?;
            let conversation = self
                .saved
                .as_ref()
                .and_then(|s| s.provider_session_id.clone());
            self.saved = Some(SavedSession {
                session_id: session_id.to_owned(),
                agent: message.choice.agent.clone(),
                provider_session_id: conversation,
                instructions: Some(text),
                instruction_branches: Some(branches),
                instruction_folder: Some(
                    self.dependencies
                        .configuration
                        .cwd
                        .to_string_lossy()
                        .into_owned(),
                ),
            });
        } else if let Some(saved) = &mut self.saved {
            let text = saved.instructions.as_deref().unwrap_or_default();
            let branches = saved
                .instruction_branches
                .clone()
                .flatten()
                .or_else(|| instructions::legacy(text));
            let folder = saved
                .instruction_folder
                .clone()
                .or_else(|| instructions::legacy_folder(text));
            saved.instruction_branches = Some(branches);
            saved.instruction_folder = folder;
        }
        let saved = self.saved.clone().ok_or(Error::InvalidCommand)?;
        if !self
            .dependencies
            .store
            .snapshot()
            .await
            .sessions
            .iter()
            .any(|s| s.session_id == saved.session_id && s.instructions == saved.instructions)
        {
            control.run(self.dependencies.store.remember(saved)).await?;
        }
        if self.active.is_some() {
            return self.steer(input, received_at).await;
        }
        let ProviderInput::Turn(first) = &input else {
            return Ok(());
        };
        self.choice = Some(message.choice.clone());
        let started_at = self.dependencies.clock.now()?;
        let event = AgentChatEvent::TurnStarted {
            turn_event_context: context.clone(),
            sender_id: message.sender.id.clone(),
            choice: message.choice.clone(),
            started_at: Timestamp(started_at),
            message_ids: vec![message.id.clone()],
        };
        self.active = Some(ActiveTurn {
            first: first.clone(),
            control: control.clone(),
            started_at,
            retry_message_id: message.id.clone(),
            message_ids: vec![message.id.clone()],
            resolved: BTreeSet::new(),
            notice_ids: vec![],
            read_notice_ids: BTreeSet::new(),
            waiting: VecDeque::new(),
            helper: None,
            skills_lease: None,
            baseline: None,
            output: TurnOutput::new(context),
            background: (message.choice.agent == Agent::Claude).then(Background::default),
            notes: BTreeSet::new(),
            speed: None,
        });
        self.mailbox.active(true);
        if control.stopped() {
            return Err(Error::Canceled);
        }
        self.emit(vec![event]).await?;
        if control.stopped() {
            return Err(Error::Canceled);
        }
        let repository = self
            .dependencies
            .repositories
            .open(control.repository.clone());
        let baseline = control
            .run(async { repository.checkpoint().await.or(Err(Error::Checkpoint)) })
            .await?;
        if let Some(turn) = &mut self.active {
            turn.baseline = Some(baseline);
        }
        self.start(input).await
    }
}

impl ActiveTurn {
    pub(super) fn output_context(&self) -> TurnEventContext {
        let RunnerTurn::Turn {
            session_id,
            turn_id,
            ..
        } = &self.first;
        TurnEventContext {
            session_id: session_id.clone(),
            turn_id: turn_id.clone(),
        }
    }
}
