//! Command boundary tests for unavailable functionality.

use clap::Parser;

use crate::cli::Cli;
use crate::command::Command;
use crate::error::Error;

#[test]
fn workspace_command_with_arguments_reports_unavailable() -> Result<(), clap::Error> {
    let cli = Cli::try_parse_from([
        "conductive",
        "workspaces",
        "list",
        "--owner",
        "member-id",
        "--limit",
        "20",
    ])?;

    let error = cli.execute().err();
    assert!(matches!(
        error,
        Some(Error::NotAvailable {
            command: Command::Workspaces(_),
        })
    ));
    assert_eq!(
        error.map(|error| error.to_string()),
        Some("[cnd-cli/command] workspaces is not available yet".to_owned())
    );
    Ok(())
}
