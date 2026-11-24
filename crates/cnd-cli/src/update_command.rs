//! Compose the production update dependencies and expose the subcommands.

use std::path::{PathBuf, absolute};
use std::sync::Arc;

use clap::{Args, Subcommand};
use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::http::release_client;
use cnd_cli::update::ports::UpdateEngine;
use cnd_cli::update::presence::SDK_HELPER_PART;
use cnd_cli::update::process::{SYSTEM_PART, SystemProcesses};
use cnd_cli::update::staging::NODE_PART;
use cnd_release::version::{BASE_URL, DEVELOPMENT_VERSION};

use crate::error::{ErrorResultExt, Result};
use crate::release;

/// Options shared by the software update operations.
#[derive(Debug, Args)]
pub(crate) struct UpdateArgs {
    /// Installation root. Use a separate folder for local verification.
    #[arg(long, default_value = "/opt/conductive", global = true)]
    root: PathBuf,
    /// Release server base URL.
    #[arg(long, default_value = BASE_URL, global = true)]
    server: String,
    #[command(subcommand)]
    operation: Operation,
}

#[derive(Debug, Subcommand)]
enum Operation {
    /// Download a release without changing the active release.
    Check {
        /// Stage the first installed release, even when the bootstrap has its version.
        #[arg(long)]
        bootstrap: bool,
        /// Version to install with the matching digest.
        #[arg(long, requires_all = ["bootstrap", "digest"], value_name = "VERSION")]
        release: Option<String>,
        /// SHA-256 digest of the pinned program archive.
        #[arg(long, requires_all = ["bootstrap", "release"], value_name = "SHA256")]
        digest: Option<String>,
    },
    /// Apply a complete download before services start, and restore its missing parts. Requires root.
    Apply {
        /// Activate this complete release version.
        #[arg(long, value_name = "VERSION")]
        release: Option<String>,
    },
    /// Confirm that the runner has started. Requires root.
    Started,
    /// Print the parts embedded in this executable.
    Parts,
}

pub(crate) async fn execute(args: UpdateArgs) -> Result<()> {
    if matches!(args.operation, Operation::Parts) {
        let parts = release::parts()?;
        if release::VERSION != DEVELOPMENT_VERSION {
            parts
                .require(&[NODE_PART, SDK_HELPER_PART, SYSTEM_PART])
                .internal()?;
        }
        println!("{}", serde_json::to_string(&parts).internal()?);
        return Ok(());
    }
    let engine = Engine {
        store: Arc::new(DiskStore::new(absolute(args.root).internal()?)),
        client: Arc::new(release_client(&args.server).internal()?),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    let engine: &dyn UpdateEngine = &engine;
    match args.operation {
        Operation::Check {
            bootstrap,
            release,
            digest,
        } => {
            if let Some((version, digest)) = release.as_deref().zip(digest.as_deref()) {
                engine.install_pinned(version, digest).await.internal()
            } else if bootstrap {
                engine.install(DEVELOPMENT_VERSION).await.internal()
            } else {
                engine.check(release::VERSION).await.internal()
            }
        }
        Operation::Apply {
            release: Some(version),
        } => engine.apply_pinned(&version).await.internal(),
        Operation::Apply { release: None } => engine.apply().await.internal(),
        Operation::Started => engine.started(release::VERSION).internal(),
        Operation::Parts => Ok(()),
    }
}
