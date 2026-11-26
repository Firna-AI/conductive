//! One local call path for CLI and MCP, with generation-bound named controls.

use async_trait::async_trait;
use cnd_runner_interface::services::control::{
    ServiceControlOutcome, ServiceControlRequest, ServiceControlResult, ServiceFailure,
};
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::logs::ServiceLogRequest;
use serde_json::{Map, Value};

use crate::error::{Error, Result};

use super::cli;
use super::input::{self, Intent};
use super::tools::{LocalServices, ServiceName, ServiceTools};

#[async_trait]
impl ServiceTools for LocalServices {
    async fn cli(&self, args: &[String], request_id: &str) -> Result<ServiceLocalResponse> {
        self.execute(cli::parse(args, request_id, &*self.context)?)
            .await
    }

    async fn mcp(
        &self,
        name: ServiceName,
        fields: Map<String, Value>,
        request_id: &str,
    ) -> Result<ServiceLocalResponse> {
        self.execute(input::parse(name, fields, request_id, &*self.context)?)
            .await
    }
}

impl LocalServices {
    async fn execute(&self, intent: Intent) -> Result<ServiceLocalResponse> {
        let (name, request_id, action) = match intent {
            Intent::Start(request) => {
                return self.send(ServiceLocalRequest::Start { request }).await;
            }
            Intent::List(request_id) => {
                return self.send(ServiceLocalRequest::List { request_id }).await;
            }
            Intent::Control {
                name,
                request_id,
                action,
            } => (name, request_id, Some(action)),
            Intent::Logs { name, request_id } => (name, request_id, None),
        };
        let catalogue = self
            .send(ServiceLocalRequest::List {
                request_id: format!("{request_id}:list"),
            })
            .await?;
        let ServiceLocalResponse::List { services, .. } = catalogue else {
            return Err(Error::Services);
        };
        let Some(service) = services.into_iter().find(|service| service.name == name) else {
            return Ok(ServiceLocalResponse::Error {
                request_id,
                error: ServiceFailure {
                    code: "service_not_found".into(),
                    message: "The service was not found. Check the list and try again.".into(),
                },
            });
        };
        if let Some(action) = action {
            let request = ServiceControlRequest {
                request_id,
                target: service.target,
                action,
            };
            return Ok(
                match self
                    .client
                    .call(ServiceLocalRequest::Control {
                        request: request.clone(),
                    })
                    .await
                {
                    Ok(reply) => reply,
                    Err(_) => ServiceLocalResponse::Control {
                        result: ServiceControlResult {
                            request,
                            outcome: ServiceControlOutcome::Unconfirmed,
                        },
                    },
                },
            );
        }
        self.send(ServiceLocalRequest::Logs {
            request: ServiceLogRequest {
                request_id,
                target: service.target,
            },
        })
        .await
    }

    async fn send(&self, request: ServiceLocalRequest) -> Result<ServiceLocalResponse> {
        match self.client.call(request).await {
            Ok(reply) => Ok(reply),
            Err(_) => Err(Error::Services),
        }
    }
}
