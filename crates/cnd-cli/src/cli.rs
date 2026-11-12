//! Parse commands without reading runtime credentials.

use clap::Parser;

use crate::command::Command;
use crate::error::{Error, Result};

/// Arguments for the Conductive program.
#[derive(Debug, Parser)]
#[command(
    name = "conductive",
    version,
    about = "Conductive cloud computer commands"
)]
pub(crate) struct Cli {
    #[command(subcommand)]
    command: Command,
}

impl Cli {
    /// Return an explicit error for commands that are not available yet.
    pub(crate) fn execute(self) -> Result<()> {
        Err(Error::NotAvailable {
            command: self.command,
        })
    }
}

#[cfg(test)]
#[path = "_tests_/cli_tests.rs"]
mod cli_tests;
