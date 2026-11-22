//! Native isolated shell reads for frozen provider settings and basic user paths.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::process::Stdio;

use async_trait::async_trait;
use tokio::process::Command;

use crate::environment::Settings;
use crate::error::{Error, ErrorResultExt, Result};

const BASE_PATH: &str = "/home/user/.local/bin:/home/user/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

/// Saved settings are read again after software updates, also on an old computer.
pub struct NativeSettings {
    /// Frozen startup settings. Production uses /run/ascii-secrets/env.sh.
    pub path: PathBuf,
}

fn shell(program: &str) -> Command {
    let mut command = Command::new(program);
    command
        .env_clear()
        .env("HOME", "/home/user")
        .env("USER", "user")
        .env("LOGNAME", "user")
        .env("SHELL", "/bin/bash")
        .env("PATH", BASE_PATH)
        .current_dir("/")
        .stdin(Stdio::null())
        .stderr(Stdio::null());
    command
}

fn entries(bytes: &[u8]) -> BTreeMap<String, String> {
    bytes
        .split(|byte| *byte == 0)
        .filter_map(|entry| {
            let text = String::from_utf8_lossy(entry);
            text.split_once('=')
                .map(|(name, value)| (name.into(), value.into()))
        })
        .collect()
}

#[async_trait]
impl Settings for NativeSettings {
    async fn frozen(&self) -> Result<BTreeMap<String, String>> {
        let output = Command::new("/bin/sh")
            .env_clear()
            .current_dir("/")
            .args([
                "-c",
                "set -e; set -a; if [ -r \"$1\" ]; then . \"$1\"; fi; exec /usr/bin/env -0",
                "conductive-service-settings",
            ])
            .arg(&self.path)
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .output()
            .await
            .internal()?;
        if !output.status.success() {
            return Err(Error::internal_message(
                "frozen service settings could not load",
            ));
        }
        Ok(entries(&output.stdout))
    }

    async fn basic(&self) -> Result<BTreeMap<String, String>> {
        let output = shell("/bin/bash")
            .args(["--login", "-c", "exec /usr/bin/env -0"])
            .output()
            .await
            .internal()?;
        if !output.status.success() {
            return Err(Error::internal_message(
                "basic service settings could not load",
            ));
        }
        Ok(entries(&output.stdout)
            .into_iter()
            .filter(|(name, _)| {
                matches!(
                    name.as_str(),
                    "HOME" | "USER" | "LOGNAME" | "SHELL" | "PATH" | "LANG" | "TMPDIR"
                ) || name.starts_with("LC_")
            })
            .collect())
    }
}
