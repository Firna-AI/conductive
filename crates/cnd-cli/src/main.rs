//! Composition root for the Conductive command line program.

use std::process::ExitCode;

use clap::Parser;

use crate::cli::Cli;

mod cli;
mod command;
mod error;
mod release;
mod tool_command;
mod update_command;

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_target(false)
        .init();
    let arguments: Vec<String> = std::env::args().skip(1).collect();
    if tool_command::selected(&arguments) {
        return ExitCode::from(tool_command::execute(arguments).await);
    }
    match Cli::parse().execute().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
