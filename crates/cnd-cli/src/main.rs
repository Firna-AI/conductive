//! Composition root for the Conductive command line program.

use std::process::ExitCode;

use clap::Parser;

use crate::cli::Cli;

mod cli;
mod command;
mod error;
mod release;

fn main() -> ExitCode {
    match Cli::parse().execute() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
