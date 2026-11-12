//! Parse commands without reading runtime credentials.

use clap::Parser;

use crate::command::Command;
use crate::error::{Error, Result};
use crate::release;
use crate::update_command;

/// Arguments for the Conductive program.
#[derive(Debug, Parser)]
#[command(
    name = "conductive",
    version = release::VERSION,
    about = "Conductive cloud computer commands"
)]
pub(crate) struct Cli {
    #[command(subcommand)]
    command: Command,
}

impl Cli {
    /// Run supported commands and report unavailable command families.
    pub(crate) async fn execute(self) -> Result<()> {
        let _parts = release::parts()?;
        if let Command::Update(arguments) = self.command {
            return update_command::execute(arguments).await;
        }
        Err(Error::NotAvailable {
            command: self.command,
        })
    }
}

#[cfg(test)]
#[path = "_tests_/cli_tests.rs"]
mod cli_tests;
