//! App notes share ordered steering without taking a member's identity.

use cnd_runner_interface::provider_events::ProviderResultState;
use cnd_runner_interface::runner_commands::RunnerNotice;
use cnd_runner_interface::sdk_helper_options::ProviderInput;

use crate::error::Result;

use super::background::InputKind;
use super::provider::DeliveryOutcome;
use super::types::Session;

impl Session {
    pub(super) async fn notice(&mut self, notice: RunnerNotice, received_at: i64) -> Result<()> {
        let RunnerNotice::Notice {
            session_id,
            turn_id,
            notices,
            ..
        } = &notice;
        if notices.is_empty()
            || self.active.as_ref().is_none_or(|turn| {
                let context = turn.output_context();
                context.session_id != *session_id || context.turn_id != *turn_id
            })
        {
            return Ok(());
        }
        self.steer(ProviderInput::Notice(notice), received_at).await
    }

    pub(super) async fn steer(&mut self, input: ProviderInput, received_at: i64) -> Result<()> {
        let Some(turn) = &mut self.active else {
            return Ok(());
        };
        if turn.control.stopped() {
            return Ok(());
        }
        let was_waiting = turn.background.as_ref().is_some_and(|b| b.waiting);
        let kind = match &input {
            ProviderInput::Turn(_) | ProviderInput::Message(_) => InputKind::Member,
            ProviderInput::Notice(_) => InputKind::Notice,
        };
        let outcome = if turn.waiting.is_empty() {
            self.deliver(input.clone()).await?
        } else {
            DeliveryOutcome::Deferred
        };
        if outcome == DeliveryOutcome::Rejected {
            return Ok(());
        }
        if let Some(turn) = &mut self.active {
            if let Some(background) = &mut turn.background {
                background.input(kind, received_at, self.dependencies.background_limit);
            }
            if outcome == DeliveryOutcome::Deferred {
                turn.waiting.push_back(input);
            }
        }
        if was_waiting && outcome == DeliveryOutcome::Deferred {
            self.result(ProviderResultState::Finished, vec![], None, false)
                .await?;
        }
        Ok(())
    }
}
