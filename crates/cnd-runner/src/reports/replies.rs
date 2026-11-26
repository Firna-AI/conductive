//! Filter direct read results before sending them outside the numbered outbox.

use std::sync::Arc;

use cnd_runner_interface::runner_files::RunnerFileCommand;
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::runner_skills::{RunnerReadSkill, RunnerSkillResult};

use crate::error::Result;
use crate::skills::read;

use super::handler::ReportDependencies;

impl ReportDependencies {
    pub(super) async fn reply_file(self: Arc<Self>, command: RunnerFileCommand) {
        let response = self.files.request(command).await;
        let response = self
            .filter
            .response(response)
            .map(RunnerToWorkspace::RunnerFileResponse);
        self.reply(response).await;
    }

    pub(super) async fn reply_skill(self: Arc<Self>, command: RunnerReadSkill) {
        let RunnerReadSkill::Read {
            request_id,
            agent,
            name,
            max_bytes,
        } = command;
        let result = match &self.skills {
            Some(skills) => skills.read(agent, name, max_bytes).await,
            None => read::unavailable(),
        };
        let response = self
            .filter
            .skill_response(RunnerSkillResult::Read {
                request_id: request_id.clone(),
                result,
            })
            .unwrap_or_else(|_| {
                tracing::warn!("The runner could not filter the skill read.");
                RunnerSkillResult::Read {
                    request_id,
                    result: read::unavailable(),
                }
            });
        self.reply(Ok(RunnerToWorkspace::RunnerSkillResult(response)))
            .await;
    }

    async fn reply(&self, response: Result<RunnerToWorkspace>) {
        let result = match response {
            Ok(response) => self.link.reply(response).await,
            Err(error) => Err(error),
        };
        if result.is_err() {
            tracing::warn!("The runner command could not finish.");
        }
    }
}

#[cfg(test)]
#[path = "_tests_/replies_tests.rs"]
mod replies_tests;
