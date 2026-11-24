//! Command entry point for local release file creation.

use std::env;
use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand};
use cnd_release::container_base::container_base_manifest_key;
use cnd_release::error::{Error, Result};
use cnd_release::files::{DiskReleaseFiles, ReleaseFiles};
use cnd_release::parts::{Part, PartsList};
use cnd_release::signature::ReleaseSigner;
use cnd_release::version::is_newer;

#[derive(Parser)]
#[command(about = "Write Conductive release files without uploading them")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Write the typed parts file to embed in the program.
    Parts {
        /// Repeat with a name, absolute HTTPS URL, and SHA-256 digest.
        #[arg(long, num_args = 3, value_names = ["NAME", "URL", "SHA256"], required = true)]
        part: Vec<String>,
        #[arg(long)]
        output: PathBuf,
    },
    /// Package a program and sign its release with CONDUCTIVE_RELEASE_SIGNING_KEY.
    Package {
        #[arg(long)]
        version: String,
        #[arg(long)]
        program: PathBuf,
        #[arg(long)]
        parts: PathBuf,
        #[arg(long)]
        output: PathBuf,
    },
    /// Sign a container base image with CONDUCTIVE_RELEASE_SIGNING_KEY.
    ContainerBase {
        #[arg(long, value_name = "V")]
        version: String,
        #[arg(long, value_name = "D")]
        digest: String,
        #[arg(long, value_name = "PATH")]
        archive: PathBuf,
        #[arg(long, value_name = "ID")]
        image_id: String,
        #[arg(long, value_name = "DIR")]
        output: PathBuf,
    },
    /// Print true only when candidate metadata is newer than current metadata.
    Newer {
        #[arg(long)]
        candidate: PathBuf,
        #[arg(long)]
        current: PathBuf,
    },
}

fn execute(command: Command, files: &dyn ReleaseFiles) -> Result<()> {
    match command {
        Command::Parts { part, output } => {
            let parts = part
                .as_chunks::<3>()
                .0
                .iter()
                .map(|entry| Part {
                    name: entry[0].clone(),
                    url: entry[1].clone(),
                    sha256: entry[2].clone(),
                })
                .collect();
            files.write_parts(&output, &PartsList::new(parts)?)?;
        }
        Command::Package {
            version,
            program,
            parts,
            output,
        } => {
            let signer = publish_signer()?;
            let parts = files.read_parts(&parts)?;
            let metadata = files.package(&version, &program, &parts, &output, &signer)?;
            println!("{}", metadata.download_url);
        }
        Command::ContainerBase {
            version,
            digest,
            archive,
            image_id,
            output,
        } => {
            let signer = publish_signer()?;
            let manifest = files
                .write_container_base(&version, &digest, &archive, &image_id, &output, &signer)?;
            println!(
                "{}",
                container_base_manifest_key(&manifest.release.version, &manifest.release.digest)?
            );
        }
        Command::Newer { candidate, current } => {
            println!(
                "{}",
                is_newer(
                    &files.read_metadata(&candidate)?,
                    &files.read_metadata(&current)?
                )?
            );
        }
    }
    Ok(())
}

fn publish_signer() -> Result<ReleaseSigner> {
    let key = match env::var("CONDUCTIVE_RELEASE_SIGNING_KEY") {
        Ok(key) if !key.trim().is_empty() => key,
        _ => return Err(Error::MissingSigningKey),
    };
    ReleaseSigner::for_publish(&key)
}

fn main() -> ExitCode {
    match execute(Cli::parse().command, &DiskReleaseFiles) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
