//! Composition root for the Conductive command line program.

use std::process::ExitCode;

use clap::Parser;

use crate::cli::Cli;

mod cli;
mod command;
mod error;
mod release;
mod update_command;

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_target(false)
        .init();
    match Cli::parse().execute().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
