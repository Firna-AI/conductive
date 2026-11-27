//! Native isolated shell reads for frozen provider settings and basic user paths.

use std::collections::BTreeMap;
use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};
use std::process::Stdio;

use async_trait::async_trait;
use cnd_runner::config::repository_variable;
use tokio::process::Command;

use crate::environment::Settings;
use crate::error::{Error, ErrorResultExt, Result};

const BASE_PATH: &str = "/home/user/.local/bin:/home/user/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

/// Saved settings are read again after software updates, also on an old computer.
pub struct NativeSettings {
    /// Frozen startup settings. Production uses /run/ascii-secrets/env.sh.
    pub path: PathBuf,
    /// Folder variables from the current workspace's saved repository locations.
    pub repository_folders: PathBuf,
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

fn repository_folders(record: &str) -> BTreeMap<String, String> {
    record
        .lines()
        .filter_map(|line| {
            let (name, path) = line.split_once('=')?;
            (repository_variable(name) && repository_folder(path))
                .then(|| (name.into(), path.into()))
        })
        .collect()
}

fn repository_folder(path: &str) -> bool {
    let Some((parent, name)) = path.rsplit_once('/') else {
        return false;
    };
    let punctuation: &[u8] = match parent {
        "/home/user/code" => b"._-",
        "/home/user/conductive/repositories" => b"._-%~!'()*",
        _ => return false,
    };
    !matches!(name, "" | "." | "..")
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || punctuation.contains(&byte))
}

async fn read_folder_record(path: &Path) -> io::Result<String> {
    if tokio::fs::symlink_metadata(path).await?.is_file() {
        tokio::fs::read_to_string(path).await
    } else {
        Ok(String::new())
    }
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
        let mut values = entries(&output.stdout);
        match read_folder_record(&self.repository_folders).await {
            Ok(record) => values.extend(repository_folders(&record)),
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => tracing::warn!(
                kind = ?error.kind(),
                "The repository folder record could not be read."
            ),
        }
        Ok(values)
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

#[cfg(test)]
#[path = "_tests_/settings_tests.rs"]
mod settings_tests;
