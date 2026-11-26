//! Credential-free Git children with bounded lifetime and process-group cleanup.

use std::collections::BTreeMap;
use std::ffi::OsString;
use std::process::Stdio;
use std::time::Duration;

use async_trait::async_trait;
use rustix::process::{Pid, Signal, kill_process_group};
use tokio::process::Command;

use super::boundary::{SkillsGit, SkillsGitRequest};
use super::error::{Error, ErrorResultExt, Result};

/// Production Git boundary used only for public skills repositories.
pub struct CleanGit;

struct ProcessGroup(Option<Pid>);
impl Drop for ProcessGroup {
    fn drop(&mut self) {
        if let Some(pid) = self.0 {
            let _ = kill_process_group(pid, Signal::KILL);
        }
    }
}

pub(super) fn command(
    request: &SkillsGitRequest,
    environment: impl Iterator<Item = (OsString, OsString)>,
) -> Command {
    let kept: BTreeMap<_, _> = environment
        .filter(|(name, _)| name == "PATH" || name == "TMPDIR")
        .collect();
    let mut command = Command::new("git");
    command
        .args(["-c", "credential.helper="])
        .args(&request.args)
        .current_dir(&request.home)
        .env_clear()
        .envs(kept)
        .env("HOME", &request.home)
        .env("LC_ALL", "C")
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "")
        .env("SSH_ASKPASS", "")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .process_group(0)
        .kill_on_drop(true);
    command
}

#[async_trait]
impl SkillsGit for CleanGit {
    async fn run(&self, request: SkillsGitRequest) -> Result<String> {
        let child = command(&request, std::env::vars_os()).spawn().internal()?;
        let _group = ProcessGroup(child.id().and_then(|id| Pid::from_raw(id as i32)));
        let output =
            match tokio::time::timeout(Duration::from_secs(30), child.wait_with_output()).await {
                Ok(output) => output.internal()?,
                Err(_) => return Err(Error::Timeout),
            };
        if !output.status.success() {
            return Err(Error::Git {
                code: output.status.code(),
            });
        }
        String::from_utf8(output.stdout).internal()
    }
}

#[cfg(test)]
#[path = "_tests_/git_tests.rs"]
mod git_tests;
