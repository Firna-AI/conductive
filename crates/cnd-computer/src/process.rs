//! Cancelable subprocess calls with separate arguments and bounded output.

use std::ffi::OsString;
use std::io;
use std::path::PathBuf;
use std::process::{ExitStatus, Stdio};

use async_trait::async_trait;
use tokio::fs::File;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWriteExt};
use tokio::process::{ChildStdin, Command};

use crate::error::{Error, Result};

const OUTPUT_LIMIT: u64 = 1024 * 1024;

/// Standard input for a subprocess.
pub enum Input {
    /// Read end of /dev/null.
    Closed,
    /// Bytes written to a pipe owned by this invocation.
    Bytes(Vec<u8>),
    /// File streamed into the command through standard input.
    File(PathBuf),
}

/// One native program invocation.
pub struct Invocation {
    /// Executable name or path.
    pub program: OsString,
    /// Argument vector, with one entry per argument.
    pub args: Vec<OsString>,
    /// Contents for standard input.
    pub input: Input,
}

impl Invocation {
    /// Prepare a command with closed standard input.
    pub fn new(
        program: impl Into<OsString>,
        args: impl IntoIterator<Item = impl Into<OsString>>,
    ) -> Self {
        Self {
            program: program.into(),
            args: args.into_iter().map(Into::into).collect(),
            input: Input::Closed,
        }
    }
}

/// Bounded output and exit status of a subprocess.
pub struct Output {
    /// Child exit status.
    pub status: ExitStatus,
    /// Standard output, captured as bytes.
    pub stdout: Vec<u8>,
    /// Standard error, captured as bytes.
    pub stderr: Vec<u8>,
}

/// Native program runner used by the production computer.
pub struct NativeProcess;

/// Start and wait for a local program.
#[cfg_attr(test, unimock::unimock(api = ProcessMock))]
#[async_trait]
pub trait Process: Send + Sync {
    /// Run the child and capture its output. Cancellation ends the child.
    async fn run(&self, invocation: Invocation) -> Result<Output>;
}

#[async_trait]
impl Process for NativeProcess {
    async fn run(&self, invocation: Invocation) -> Result<Output> {
        let (stdin, bytes) = match invocation.input {
            Input::Closed => (Stdio::null(), None),
            Input::Bytes(bytes) => (Stdio::piped(), Some(bytes)),
            Input::File(path) => {
                let file = File::open(path).await?.into_std().await;
                (Stdio::from(file), None)
            }
        };
        let mut command = Command::new(invocation.program);
        command
            .args(invocation.args)
            .env("LC_ALL", "C")
            .kill_on_drop(true)
            .stdin(stdin)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let mut child = command.spawn()?;
        let stdout = child.stdout.take().ok_or(Error::ProcessFailed)?;
        let stderr = child.stderr.take().ok_or(Error::ProcessFailed)?;
        let stdin = child.stdin.take();
        let (status, stdout, stderr, written) = tokio::try_join!(
            async { Ok(child.wait().await?) },
            capture(stdout),
            capture(stderr),
            async { Ok(write_input(stdin, bytes).await) },
        )?;
        if status.success() {
            written?;
        }
        Ok(Output {
            status,
            stdout,
            stderr,
        })
    }
}

async fn write_input(stdin: Option<ChildStdin>, bytes: Option<Vec<u8>>) -> io::Result<()> {
    if let (Some(mut stdin), Some(bytes)) = (stdin, bytes) {
        stdin.write_all(&bytes).await?;
        stdin.shutdown().await?;
    }
    Ok(())
}

async fn capture(stream: impl AsyncRead + Unpin) -> Result<Vec<u8>> {
    let mut bytes = Vec::new();
    stream
        .take(OUTPUT_LIMIT + 1)
        .read_to_end(&mut bytes)
        .await?;
    if bytes.len() as u64 > OUTPUT_LIMIT {
        return Err(Error::ProcessFailed);
    }
    Ok(bytes)
}
