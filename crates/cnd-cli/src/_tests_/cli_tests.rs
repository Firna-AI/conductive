//! Command boundary tests for unavailable functionality.

use clap::Parser;

use crate::cli::Cli;
use crate::command::Command;
use crate::error::Error;

#[tokio::test]
async fn relay_command_with_arguments_reports_unavailable() -> Result<(), clap::Error> {
    let cli = Cli::try_parse_from(["conductive", "relay", "--port", "7682"])?;

    let error = cli.execute().await.err();
    assert!(matches!(
        error,
        Some(Error::NotAvailable {
            command: Command::Relay(_),
        })
    ));
    assert_eq!(
        error.map(|error| error.to_string()),
        Some("[cnd-cli/command] relay is not available yet".to_owned())
    );
    Ok(())
}
