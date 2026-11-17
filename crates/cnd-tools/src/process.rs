//! Child execution with secret values confined to its environment.

use std::collections::BTreeMap;
use std::io;
#[cfg(unix)]
use std::os::unix::process::ExitStatusExt;
use std::process::{ExitStatus, Stdio};

use async_trait::async_trait;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::process::Command;

use cnd_runner_interface::tools::secret_results::CommandResult;

use crate::error::{Error, Result};
use crate::secrets::filter::Filter;

/// How to execute a command and deliver its output.
#[derive(Debug, Clone)]
pub enum CommandInput {
    /// Execute these exact arguments with the caller's stdin and filtered output.
    Inherit(Vec<String>),
    /// Run shell text with closed stdin and return filtered stdout and stderr.
    Capture(String),
}

/// Replaceable child process boundary. Values must never enter diagnostics or arguments.
#[cfg_attr(test, unimock::unimock(api = ProcessMock))]
#[async_trait]
pub trait Process: Send + Sync {
    /// Run one command with the supplied environment additions and filter its output.
    async fn run(
        &self,
        command: CommandInput,
        values: BTreeMap<String, String>,
    ) -> Result<CommandResult>;
}

/// Native subprocess and standard stream implementation.
pub struct NativeProcess;

#[async_trait]
impl Process for NativeProcess {
    async fn run(
        &self,
        input: CommandInput,
        values: BTreeMap<String, String>,
    ) -> Result<CommandResult> {
        let (mut command, capture) = match input {
            CommandInput::Inherit(arguments) => {
                let Some((program, arguments)) = arguments.split_first() else {
                    return Err(Error::Command);
                };
                let mut command = Command::new(program);
                command.args(arguments).stdin(Stdio::inherit());
                (command, false)
            }
            CommandInput::Capture(text) => {
                let mut command = Command::new("/bin/sh");
                command.args(["-c", &text]).stdin(Stdio::null());
                (command, true)
            }
        };
        command
            .envs(&values)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(_) => return Err(Error::Command),
        };
        let (Some(mut stdout), Some(mut stderr)) = (child.stdout.take(), child.stderr.take())
        else {
            return Err(Error::Command);
        };
        let mut output = tokio::io::stdout();
        let mut error = tokio::io::stderr();
        let output_writer: Option<&mut (dyn AsyncWrite + Unpin + Send)> =
            if capture { None } else { Some(&mut output) };
        let error_writer: Option<&mut (dyn AsyncWrite + Unpin + Send)> =
            if capture { None } else { Some(&mut error) };
        let (stdout, stderr) = match tokio::try_join!(
            self.drain(&mut stdout, output_writer, &values),
            self.drain(&mut stderr, error_writer, &values),
        ) {
            Ok(output) => output,
            Err(_) => return Err(Error::Command),
        };
        let status = match child.wait().await {
            Ok(status) => status,
            Err(_) => return Err(Error::Command),
        };
        Ok(CommandResult {
            stdout: String::from_utf8_lossy(&stdout).into_owned(),
            stderr: String::from_utf8_lossy(&stderr).into_owned(),
            exit_code: exit_code(status),
        })
    }
}

impl NativeProcess {
    async fn drain(
        &self,
        reader: &mut (dyn AsyncRead + Unpin + Send),
        mut writer: Option<&mut (dyn AsyncWrite + Unpin + Send)>,
        values: &BTreeMap<String, String>,
    ) -> io::Result<Vec<u8>> {
        let mut filter = Filter::new(values.values().map(|value| value.as_bytes().to_vec()));
        let mut captured = Vec::new();
        let mut buffer = [0; 8192];
        loop {
            let length = reader.read(&mut buffer).await?;
            let output = filter.push(&buffer[..length], length == 0);
            if let Some(writer) = &mut writer {
                writer.write_all(&output).await?;
                writer.flush().await?;
            } else {
                captured.extend(output);
            }
            if length == 0 {
                return Ok(captured);
            }
        }
    }
}

fn exit_code(status: ExitStatus) -> u8 {
    if let Some(code) = status.code().and_then(|code| u8::try_from(code).ok()) {
        return code;
    }
    #[cfg(unix)]
    if let Some(code) = status
        .signal()
        .and_then(|signal| u8::try_from(128 + signal).ok())
    {
        return code;
    }
    1
}
