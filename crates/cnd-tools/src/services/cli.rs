//! CLI-only service flags and literal argv after the command separator.

use std::collections::BTreeMap;

use clap::{Args, Parser, Subcommand};
use cnd_runner_interface::services::control::ServiceControlAction;
use cnd_runner_interface::services::local::{
    ServiceDefinition, ServicePortWait, ServiceStartRequest,
};

use crate::error::{Error, InputError, Result};

use super::input::Intent;
use super::tools::LocalContext;

#[derive(Parser)]
#[command(name = "conductive services")]
struct Cli {
    #[command(subcommand)]
    command: Verb,
}

#[derive(Subcommand)]
enum Verb {
    Start(Start),
    List,
    Stop(Named),
    Restart(Named),
    Logs(Named),
}

#[derive(Args)]
struct Start {
    #[arg(long, allow_hyphen_values = true)]
    name: String,
    #[arg(long = "env", allow_hyphen_values = true)]
    values: Vec<String>,
    #[arg(long, num_args = 0..=1, default_missing_value = "first")]
    wait_for_port: Option<String>,
    #[arg(long, allow_hyphen_values = true)]
    request_id: Option<String>,
    #[arg(last = true, required = true)]
    command: Vec<String>,
}

#[derive(Args)]
struct Named {
    #[arg(long, allow_hyphen_values = true)]
    name: String,
    #[arg(long, allow_hyphen_values = true)]
    request_id: Option<String>,
}

pub(super) fn parse(args: &[String], id: &str, context: &dyn LocalContext) -> Result<Intent> {
    let input = match Cli::try_parse_from(
        std::iter::once("conductive services").chain(args.iter().skip(1).map(String::as_str)),
    ) {
        Ok(value) => value,
        Err(_) => return Err(Error::Input(InputError::ServiceOptions)),
    };
    Ok(match input.command {
        Verb::Start(input) => {
            let mut env = BTreeMap::new();
            for value in input.values {
                let Some((name, value)) = value.split_once('=') else {
                    return Err(Error::Input(InputError::ServiceOptions));
                };
                env.insert(name.into(), value.into());
            }
            let wait_for_port = match input.wait_for_port.as_deref() {
                None => None,
                Some("first") => Some(ServicePortWait::First),
                Some(value) => match value.parse::<u16>() {
                    Ok(port) => Some(ServicePortWait::Port { port }),
                    Err(_) => return Err(Error::Input(InputError::Port)),
                },
            };
            Intent::Start(ServiceStartRequest {
                request_id: input.request_id.unwrap_or_else(|| id.into()),
                name: input.name,
                definition: ServiceDefinition {
                    command: input.command,
                    folder: context.folder()?,
                    env,
                },
                originating_turn_id: context.turn_id(),
                wait_for_port,
            })
        }
        Verb::List => Intent::List(id.into()),
        Verb::Stop(input) => Intent::Control {
            name: input.name,
            action: ServiceControlAction::Stop,
            request_id: input.request_id.unwrap_or_else(|| id.into()),
        },
        Verb::Restart(input) => Intent::Control {
            name: input.name,
            action: ServiceControlAction::Restart,
            request_id: input.request_id.unwrap_or_else(|| id.into()),
        },
        Verb::Logs(input) => Intent::Logs {
            name: input.name,
            request_id: input.request_id.unwrap_or_else(|| id.into()),
        },
    })
}

pub(crate) fn help(args: &[String]) -> bool {
    let mut index = 1;
    while index < args.len() {
        match args[index].as_str() {
            "--" => return false,
            "--help" => return true,
            "--name" | "--env" | "--request-id" => index += 2,
            _ => index += 1,
        }
    }
    false
}
