//! Private sends cannot escape the generation that accepted their request.

use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::services::transport::RunnerServiceMessage;

use crate::error::Result;

use super::connection::SavedRunnerLink;
use super::ports::ServiceConnection;

impl SavedRunnerLink {
    pub(super) async fn accepted_services(&self) -> Option<ServiceConnection> {
        let active = self.connection.lock().await;
        (active.welcomed && active.services).then_some(ServiceConnection {
            generation: active.generation,
        })
    }

    pub(super) async fn send_service(
        &self,
        connection: ServiceConnection,
        message: RunnerServiceMessage,
    ) -> Result<bool> {
        let socket = {
            let active = self.connection.lock().await;
            if active.generation != connection.generation || !active.welcomed || !active.services {
                return Ok(false);
            }
            active.socket.clone()
        };
        let Some(socket) = socket else {
            return Ok(false);
        };
        if socket
            .send(&RunnerToWorkspace::RunnerServiceMessage(message))
            .await
            .is_err()
        {
            self.disconnect(connection.generation).await;
            return Ok(false);
        }
        Ok(true)
    }
}
