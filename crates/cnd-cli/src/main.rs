//! Composition root for the Conductive command line program.

use std::process::ExitCode;

use clap::Parser;

use crate::cli::Cli;

mod cli;
mod command;
mod computer_command;
mod error;
mod host_command;
mod release;
mod runner_command;
mod runner_round;
mod runner_services;
mod runner_start;
mod sandbox_command;
mod service_command;
mod tool_command;
mod update_command;

#[tokio::main]
async fn main() -> ExitCode {
    let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_target(false)
        .init();
    let credential_alias = std::env::args_os().next().is_some_and(|path| {
        std::path::Path::new(&path)
            .file_name()
            .is_some_and(|name| name == "conductive-git-credential")
    });
    let mut arguments: Vec<String> = std::env::args().skip(1).collect();
    if credential_alias {
        arguments.insert(0, "git-credential".into());
    }
    if tool_command::selected(&arguments) {
        return ExitCode::from(tool_command::execute(arguments).await);
    }
    if arguments.first().is_some_and(|arg| arg == "git-credential") {
        return ExitCode::from(
            sandbox_command::credential(arguments.get(1).map(String::as_str).unwrap_or_default())
                .await,
        );
    }
    match Cli::parse().execute().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
