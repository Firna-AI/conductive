//! Detached children and status records that survive a socket drop.

use std::io::ErrorKind;
use std::process::Stdio;

use cnd_runner_interface::host::results::{HostCommandState, HostResult};
use tokio::fs::{self, OpenOptions};

use crate::dispatch::SAFE_INTEGER;
use crate::error::{ErrorResultExt, Result};

use super::native::NativeCommands;
use super::output;
use super::process::{self, Group};
use super::records::{self, Exit};

impl NativeCommands {
    pub(super) async fn start_command(&self, text: &str) -> Result<HostResult> {
        records::private_folder(&self.root).await?;
        let (process_id, folder) = loop {
            let id = rand::random::<u64>() & SAFE_INTEGER;
            if id == 0 {
                continue;
            }
            let folder = self.root.join(id.to_string());
            match fs::create_dir(&folder).await {
                Ok(()) => break (id, folder),
                Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
                other => other.internal()?,
            }
        };
        records::private_folder(&folder).await?;
        let stdout = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(folder.join("stdout"))
            .await
            .internal()?
            .into_std()
            .await;
        let stderr = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(folder.join("stderr"))
            .await
            .internal()?
            .into_std()
            .await;
        let (mut child, mut group) = {
            let mut identities = self.active.lock().await;
            let child = process::shell(&self.home, text)
                .stdout(Stdio::from(stdout))
                .stderr(Stdio::from(stderr))
                .spawn()
                .internal()?;
            let group = Group::child(&child)?;
            identities.insert(process_id);
            (child, group)
        };
        let active = self.active.clone();
        tokio::spawn(async move {
            if let Ok(status) = child.wait().await {
                group.disarm();
                let _ = records::finish(
                    &folder,
                    Exit {
                        exit_code: process::exit_code(status),
                        timed_out: None,
                    },
                )
                .await;
            }
            active.lock().await.remove(&process_id);
        });
        Ok(HostResult::CommandStarted { process_id })
    }

    pub(super) async fn read_status(
        &self,
        process_id: u64,
        stdout_offset: u64,
        stderr_offset: u64,
    ) -> Result<HostResult> {
        let folder = self.root.join(process_id.to_string());
        let exit = match fs::read(folder.join("exit.json")).await {
            Ok(bytes) => Some(serde_json::from_slice::<Exit>(&bytes).internal()?),
            Err(error) if error.kind() == ErrorKind::NotFound => None,
            other => {
                other.internal()?;
                None
            }
        };
        let running = exit.is_none() && self.active.lock().await.contains(&process_id);
        let state = if exit.is_some() {
            HostCommandState::Exited
        } else if running {
            HostCommandState::Running
        } else {
            HostCommandState::Lost
        };
        let (stdout, stdout_next_offset, out_more) =
            output::read(&folder.join("stdout"), stdout_offset, !running).await?;
        let (stderr, stderr_next_offset, err_more) =
            output::read(&folder.join("stderr"), stderr_offset, !running).await?;
        Ok(HostResult::CommandStatus {
            process_id,
            state,
            running,
            exit_code: exit.as_ref().map(|exit| exit.exit_code),
            timed_out: exit.and_then(|exit| exit.timed_out),
            stdout,
            stderr,
            stdout_next_offset,
            stderr_next_offset,
            more: out_more || err_more,
        })
    }
}
