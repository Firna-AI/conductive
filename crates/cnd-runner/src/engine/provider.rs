//! Start options and cancelable helper requests preserve original turn authority.

use std::sync::Arc;

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_commands::{RunnerNotice, RunnerTurn};
use cnd_runner_interface::sdk_helper::{HelperModelResult, HelperOutput};
use cnd_runner_interface::sdk_helper_options::{
    HelperCredential, HelperOptions, OrgSkills, ProviderInput, WorkspaceToolContext,
};
use url::Url;

use crate::error::{Error, ErrorResultExt, Result};
use crate::helper::boundary::HelperEvents;

use super::control::Control;
use super::mailbox::Mailbox;
use super::types::{ActiveTurn, Session, Work, identity};

/// An input can be delivered, queued for a handoff, or rejected.
#[derive(PartialEq, Eq)]
pub(super) enum DeliveryOutcome {
    Applied,
    Deferred,
    Rejected,
}

struct ForwardOutput {
    mailbox: Mailbox,
    generation: u64,
    control: Control,
}
impl HelperEvents for ForwardOutput {
    fn output(&self, output: HelperOutput) {
        if !self.control.stopped() {
            let _ = self.mailbox.send(Work::Output(self.generation, output));
        }
    }
}

impl Session {
    pub(super) async fn start(&mut self, input: ProviderInput) -> Result<()> {
        let choice = identity(&input)
            .map(|(_, _, message)| &message.choice)
            .or(self.choice.as_ref())
            .ok_or(Error::InvalidCommand)?
            .clone();
        self.choice = Some(choice.clone());
        self.generation += 1;
        let saved = self.saved.as_ref().ok_or(Error::InvalidCommand)?;
        let turn = self.active.as_mut().ok_or(Error::InvalidCommand)?;
        let control = turn.control.clone();
        let helper = self.dependencies.helpers.open(Arc::new(ForwardOutput {
            mailbox: self.mailbox.clone(),
            generation: self.generation,
            control: control.clone(),
        }))?;
        turn.helper = Some(helper.clone());
        let mut origin = Url::parse(&self.dependencies.configuration.request.url).internal()?;
        if origin.scheme() == "wss" {
            let _ = origin.set_scheme("https");
        }
        origin.set_path("");
        origin.set_query(None);
        origin.set_fragment(None);
        let endpoint = origin
            .join(if saved.agent == Agent::Claude {
                "/v1/model/claude"
            } else {
                "/v1/model/codex"
            })
            .internal()?
            .to_string();
        let RunnerTurn::Turn {
            credential,
            commit_author,
            turn_id,
            ..
        } = &turn.first;
        turn.skills_lease = self.skills.current();
        let options = HelperOptions {
            org_skills: self
                .dependencies
                .configuration
                .skills_repository
                .as_ref()
                .map(|repository| OrgSkills {
                    repository: repository.clone(),
                    trusted_repository: self
                        .dependencies
                        .configuration
                        .trusted_skills_repository
                        .clone(),
                    directory: turn
                        .skills_lease
                        .as_ref()
                        .map(|lease| lease.path().to_string_lossy().into_owned()),
                }),
            cwd: self
                .dependencies
                .configuration
                .cwd
                .to_string_lossy()
                .into_owned(),
            home: self
                .dependencies
                .configuration
                .home
                .to_string_lossy()
                .into_owned(),
            session_id: saved.session_id.clone(),
            endpoint,
            credential: HelperCredential::Gateway {
                credential: credential.clone(),
            },
            commit_author: commit_author.clone(),
            choice,
            conversation_id: saved.provider_session_id.clone(),
            instructions: saved.instructions.clone().unwrap_or_default(),
            instruction_branches: saved.instruction_branches.clone().flatten(),
            instruction_folder: saved.instruction_folder.clone(),
            tools: WorkspaceToolContext {
                machine_origin: origin.origin().ascii_serialization(),
                workspace_token: self
                    .dependencies
                    .configuration
                    .request
                    .workspace_token
                    .clone(),
                turn_id: turn_id.clone(),
            },
            background_note_ids: turn.notes.iter().cloned().collect(),
        };
        control.run(helper.start(options)).await?;
        control.run(helper.send(input.clone())).await?;
        turn.track_notices(&input);
        Ok(())
    }

    pub(super) async fn deliver(&mut self, input: ProviderInput) -> Result<DeliveryOutcome> {
        let turn = self.active.as_mut().ok_or(Error::InvalidCommand)?;
        let helper = turn.helper.clone().ok_or(Error::HelperExited)?;
        if matches!(&input, ProviderInput::Notice(_)) {
            match turn.control.run(helper.send(input.clone())).await {
                Ok(()) => {}
                Err(Error::Canceled) => return Err(Error::Canceled),
                Err(_) => {
                    tracing::warn!("The app note could not reach the agent.");
                    return Ok(DeliveryOutcome::Rejected);
                }
            }
            turn.track_notices(&input);
            return Ok(DeliveryOutcome::Applied);
        }
        let (_, _, message) = identity(&input).ok_or(Error::InvalidCommand)?;
        let id = message.id.clone();
        self.choice = Some(message.choice.clone());
        let result = turn.control.run(helper.model(message.choice.clone())).await;
        if matches!(result, Ok(HelperModelResult::Deferred)) {
            return Ok(DeliveryOutcome::Deferred);
        }
        turn.message_ids.push(id);
        result?;
        turn.control.run(helper.send(input)).await?;
        Ok(DeliveryOutcome::Applied)
    }
}

impl ActiveTurn {
    fn track_notices(&mut self, input: &ProviderInput) {
        let notices = match input {
            ProviderInput::Turn(RunnerTurn::Turn { notices, .. })
            | ProviderInput::Notice(RunnerNotice::Notice { notices, .. }) => notices,
            ProviderInput::Message(_) => return,
        };
        self.notice_ids
            .extend(notices.iter().map(|notice| notice.id.clone()));
    }
}
