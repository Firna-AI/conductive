//! Command names and the arguments reserved for their implementations.

use std::ffi::OsString;
use std::fmt;
use std::path::PathBuf;

use clap::{Args, Subcommand};

use crate::disk_command::DiskArgs;
use crate::update_command::UpdateArgs;

/// Command families served by the Conductive program.
#[derive(Debug, Subcommand)]
pub(crate) enum Command {
    /// Run agent sessions through the private SDK helper.
    Runner,
    /// Execute a private service record after the system manager changes user.
    #[command(hide = true)]
    ServiceExec {
        /// Private runtime launch record.
        record: PathBuf,
    },
    /// Relay port previews on the private socket.
    Relay,
    /// Serve workspace tools over MCP.
    Mcp(PendingArgs),
    /// Supply fresh GitHub credentials.
    GitCredential(PendingArgs),
    /// Stage or apply a sandbox software update.
    Update(UpdateArgs),
    /// Set or release the disk hold. Requires root to change the hold.
    Disk(DiskArgs),
    /// Manage workspaces.
    Workspaces(PendingArgs),
    /// Manage sessions.
    Sessions(PendingArgs),
    /// Read messages.
    Messages(PendingArgs),
    /// Manage sections.
    Sections(PendingArgs),
    /// List repositories.
    Repositories(PendingArgs),
    /// List models.
    Models(PendingArgs),
    /// Manage port previews.
    Previews(PendingArgs),
    /// Run a command on a connected Mac.
    Mac(PendingArgs),
    /// List secrets or run a command with approved secrets.
    Secrets(PendingArgs),
    /// Manage services on this cloud computer.
    Services(PendingArgs),
}

impl fmt::Display for Command {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Self::Runner => "runner",
            Self::ServiceExec { .. } => "service-exec",
            Self::Relay => "relay",
            Self::Mcp(_) => "mcp",
            Self::GitCredential(_) => "git-credential",
            Self::Update(_) => "update",
            Self::Disk(_) => "disk",
            Self::Workspaces(_) => "workspaces",
            Self::Sessions(_) => "sessions",
            Self::Messages(_) => "messages",
            Self::Sections(_) => "sections",
            Self::Repositories(_) => "repositories",
            Self::Models(_) => "models",
            Self::Previews(_) => "previews",
            Self::Mac(_) => "mac",
            Self::Secrets(_) => "secrets",
            Self::Services(_) => "services",
        };
        formatter.write_str(name)
    }
}

/// Accept an unfinished command's arguments only to report its unavailability.
#[derive(Debug, Args)]
pub(crate) struct PendingArgs {
    #[arg(trailing_var_arg = true, allow_hyphen_values = true, hide = true)]
    arguments: Vec<OsString>,
}
