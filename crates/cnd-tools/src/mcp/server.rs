//! Concurrent stdio MCP lifecycle and dispatch.

use std::sync::Arc;

use async_trait::async_trait;
use tokio::task::JoinSet;

use crate::client::Dispatch;
use crate::error::{ErrorResultExt, Result};
use crate::input;
use crate::ports::{Runtime, Streams};
use crate::reply::Reply;
use crate::services::tools::ServiceTools;

use super::protocol::{self, Action, Phase, Response};

/// A stdio server that handles independent tool calls concurrently.
#[async_trait]
pub(crate) trait Mcp: Send + Sync {
    async fn serve(&self, runtime: Arc<dyn Runtime>, streams: Arc<dyn Streams>) -> Result<u8>;
}

pub(crate) struct Server {
    client: Arc<dyn Dispatch>,
    services: Option<Arc<dyn ServiceTools>>,
}

impl Server {
    pub(crate) fn new(client: Arc<dyn Dispatch>) -> Self {
        Self {
            client,
            services: None,
        }
    }

    pub(crate) fn with_services(mut self, services: Option<Arc<dyn ServiceTools>>) -> Self {
        self.services = services;
        self
    }
}

#[async_trait]
impl Mcp for Server {
    async fn serve(&self, runtime: Arc<dyn Runtime>, streams: Arc<dyn Streams>) -> Result<u8> {
        let mut phase = Phase::New;
        let mut pending = JoinSet::new();
        let mut failed = false;
        let input_result = loop {
            let line = match streams.line().await {
                Ok(Some(line)) => line,
                Ok(None) => break Ok(()),
                Err(error) => break Err(error),
            };
            match protocol::prepare(&line, &mut phase) {
                Action::Immediate(response) => {
                    if let Some(response) = response
                        && let Err(error) = emit(&*streams, response).await
                    {
                        break Err(error);
                    }
                }
                Action::Tool { id, name, fields } => {
                    let client = Arc::clone(&self.client);
                    let runtime = Arc::clone(&runtime);
                    let streams = Arc::clone(&streams);
                    pending.spawn(async move {
                        let result = match input::parse(name, &fields, &runtime.request_id()) {
                            Ok(call) => client.execute(call).await,
                            Err(error) => Err(error),
                        };
                        let response = match result {
                            Ok(reply) => Response::tool(id, reply),
                            Err(error) => Response::tool_error(id, error.message()),
                        };
                        match emit(&*streams, response).await {
                            Ok(()) => false,
                            Err(_) => {
                                let _ = streams
                                    .stderr("The workspace request failed. Try again.\n")
                                    .await;
                                true
                            }
                        }
                    });
                }
                Action::Services { id, name, fields } => {
                    let services = self.services.clone();
                    let request_id = runtime.request_id();
                    let streams = streams.clone();
                    pending.spawn(async move {
                        let response = match services {
                            Some(services) => match services.mcp(name, fields, &request_id).await {
                                Ok(reply) => Response::tool(id, Reply::Services(reply)),
                                Err(error) => Response::tool_error(id, error.message()),
                            },
                            None => Response::tool_error(id, "The service manager is not available. Try again after the software updates.".into()),
                        };
                        emit(&*streams, response).await.is_err()
                    });
                }
            }
            while let Some(result) = pending.try_join_next() {
                failed |= result.unwrap_or(true);
            }
        };
        while let Some(result) = pending.join_next().await {
            failed |= result.unwrap_or(true);
        }
        input_result?;
        Ok(u8::from(failed))
    }
}

async fn emit(streams: &dyn Streams, response: Response) -> Result<()> {
    streams
        .stdout(&format!(
            "{}\n",
            serde_json::to_string(&response).internal()?
        ))
        .await
}

#[cfg(test)]
#[path = "../_tests_/mcp_tests.rs"]
mod mcp_tests;
