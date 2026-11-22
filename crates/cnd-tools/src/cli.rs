//! CLI and MCP entry points composed through effect traits.

use std::sync::Arc;

use async_trait::async_trait;
use serde_json::Value;

use cnd_runner_interface::tools::secret_results::RunWithSecretsResult;

use crate::call::{Call, Name};
use crate::cli_parse;
use crate::client::{Client, Configuration, Dispatch};
use crate::environment::Environment;
use crate::error::{Error, ErrorResultExt, Result};
use crate::input;
use crate::lazy_client::EnvironmentClient;
use crate::mcp::{Mcp, Server};
use crate::ports::{Http, Runtime, Streams};
use crate::process::{CommandInput, Process};
use crate::reply::Reply;
use crate::services::tools::{ServiceTools, failed};

/// Complete tool help, available without credentials.
pub const HELP: &str = include_str!("help.txt");

/// Check help without interpreting dash-prefixed session option values as flags.
pub fn help_requested(args: &[String]) -> bool {
    cli_parse::help(args)
}

/// Command and protocol execution boundary.
#[async_trait]
pub trait Program: Send + Sync {
    /// Run a CLI command and return its documented exit status.
    async fn cli(&self, args: &[String]) -> Result<u8>;
    /// Run the stdio protocol through EOF, then finish pending replies.
    async fn mcp(&self) -> Result<u8>;
}

/// Production tool program with injected dependencies.
pub struct ToolProgram {
    client: Arc<dyn Dispatch>,
    runtime: Arc<dyn Runtime>,
    streams: Arc<dyn Streams>,
    services: Option<Arc<dyn ServiceTools>>,
}

impl ToolProgram {
    /// Compose the tool adapters without reading ambient state.
    pub fn new(
        configuration: Configuration,
        http: Arc<dyn Http>,
        runtime: Arc<dyn Runtime>,
        streams: Arc<dyn Streams>,
        process: Arc<dyn Process>,
    ) -> Self {
        Self {
            client: Arc::new(Client::new(
                configuration,
                http,
                Arc::clone(&runtime),
                process,
            )),
            runtime,
            streams,
            services: None,
        }
    }

    /// Resolve remote credentials only at a remote call, so local MCP needs none.
    pub fn with_environment(
        environment: Arc<dyn Environment>,
        http: Arc<dyn Http>,
        runtime: Arc<dyn Runtime>,
        streams: Arc<dyn Streams>,
        process: Arc<dyn Process>,
    ) -> Self {
        Self {
            client: Arc::new(EnvironmentClient {
                environment,
                http,
                runtime: runtime.clone(),
                process,
            }),
            runtime,
            streams,
            services: None,
        }
    }

    /// Add local services without changing the authenticated remote client.
    pub fn with_services(mut self, services: Arc<dyn ServiceTools>) -> Self {
        self.services = Some(services);
        self
    }

    async fn command(&self, args: &[String]) -> Result<u8> {
        if args.first().is_some_and(|group| group == "services") {
            let services = self.services.as_ref().ok_or(Error::Services)?;
            let reply = services.cli(args, &self.runtime.request_id()).await?;
            self.streams
                .stdout(&format!("{}\n", serde_json::to_string(&reply).internal()?))
                .await?;
            return Ok(u8::from(failed(&reply)));
        }
        let mut args = cli_parse::parse(args)?;
        if let Some(path) = args.message_path {
            let text = self.runtime.message(&path).await?;
            args.fields.insert(
                if args.name == Name::SendMessage {
                    "text"
                } else {
                    "firstMessage"
                }
                .into(),
                Value::String(text),
            );
        }
        let mut call = input::parse(args.name, &args.fields, &self.runtime.request_id())?;
        if let Call::RunWithSecrets(_, command) = &mut call
            && let Some(arguments) = args.command
        {
            *command = CommandInput::Inherit(arguments);
        }
        let reply = self.client.execute(call).await?;
        if let Reply::RunWithSecrets(result) = &reply {
            if let RunWithSecretsResult::Completed {
                environment_variables,
                ..
            } = result
            {
                self.streams
                    .stderr(&format!(
                        "environmentVariables: {}\n",
                        serde_json::to_string(environment_variables).internal()?
                    ))
                    .await?;
            }
            if let Some(message) = result.message() {
                self.streams.stderr(&format!("{message}\n")).await?;
            }
            return Ok(result.exit_code());
        }
        self.streams
            .stdout(&format!("{}\n", serde_json::to_string(&reply).internal()?))
            .await?;
        Ok(u8::from(reply.failed()))
    }
}

#[async_trait]
impl Program for ToolProgram {
    async fn cli(&self, args: &[String]) -> Result<u8> {
        if help_requested(args) {
            self.streams.stdout(HELP).await?;
            return Ok(0);
        }
        match self.command(args).await {
            Ok(status) => Ok(status),
            Err(error) => {
                self.streams
                    .stderr(&format!("{}\n", error.message()))
                    .await?;
                Ok(1)
            }
        }
    }
    async fn mcp(&self) -> Result<u8> {
        let server: Box<dyn Mcp> =
            Box::new(Server::new(Arc::clone(&self.client)).with_services(self.services.clone()));
        server
            .serve(Arc::clone(&self.runtime), Arc::clone(&self.streams))
            .await
    }
}

#[cfg(test)]
#[path = "_tests_/cli_tests.rs"]
mod cli_tests;

#[cfg(test)]
#[path = "_tests_/mac_adapter_tests.rs"]
mod mac_adapter_tests;

#[cfg(test)]
#[path = "_tests_/branch_adapter_support.rs"]
mod branch_adapter_support;

#[cfg(test)]
#[path = "_tests_/branch_adapter_tests.rs"]
mod branch_adapter_tests;

#[cfg(test)]
#[path = "_tests_/secrets/mod.rs"]
mod secrets_tests;

#[cfg(test)]
#[path = "_tests_/workspace_tests.rs"]
mod workspace_tests;

#[cfg(test)]
#[path = "_tests_/watch_adapter_tests.rs"]
mod watch_adapter_tests;
