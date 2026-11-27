//! Private Node child with bounded JSON framing and process-group cleanup.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::sdk_helper::{HelperOutput, HelperRequest};
use rustix::process::{Pid, Signal, kill_process_group};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, ChildStdout, Command};
use tokio::sync::{Mutex, watch};

use crate::config::Configuration;
use crate::error::{Error, ErrorResultExt, Result};
use crate::json::codec;

use super::boundary::{Helper, HelperEvents, HelperFactory, HelperPort, HelperPorts};
use super::driver::HelperConnection;

/// Pinned paths resolved once by the composition root.
pub struct NodeHelpers {
    /// Private Node binary of the same release.
    pub node: PathBuf,
    /// Helper bundle of that release.
    pub program: PathBuf,
    /// Variables that replace inherited values, such as the folder after a move.
    pub environment: BTreeMap<String, String>,
}

impl NodeHelpers {
    /// The current repository, branches, and folder variables registered by moves.
    pub fn workspace_environment(configuration: &Configuration) -> BTreeMap<String, String> {
        let folder = configuration.cwd.to_string_lossy().into_owned();
        let mut environment = BTreeMap::from([
            ("CONDUCTIVE_REPOSITORY".to_owned(), folder.clone()),
            ("CONDUCTIVE_REPOSITORY_DIR".to_owned(), folder),
            (
                "CONDUCTIVE_DEFAULT_BRANCH".to_owned(),
                configuration.default_branch.clone(),
            ),
        ]);
        if let Some(branch) = &configuration.workspace_branch {
            environment.insert("CONDUCTIVE_WORKSPACE_BRANCH".to_owned(), branch.clone());
        }
        environment.extend(
            configuration
                .repository_directories
                .iter()
                .filter(|(name, _)| {
                    configuration
                        .registered_repository_variables
                        .contains(*name)
                })
                .map(|(name, directory)| (name.clone(), directory.to_string_lossy().into_owned())),
        );
        environment
    }
}

impl HelperPorts for NodeHelpers {
    fn port(&self) -> Result<Arc<dyn HelperPort>> {
        let mut child = Command::new(&self.node)
            .arg(&self.program)
            .envs(&self.environment)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .process_group(0)
            .kill_on_drop(true)
            .spawn()
            .internal()?;
        let input = child.stdin.take().ok_or(Error::HelperExited)?;
        let output = child.stdout.take().ok_or(Error::HelperExited)?;
        let pid = child
            .id()
            .and_then(|id| Pid::from_raw(id as i32))
            .ok_or(Error::HelperExited)?;
        let (terminate, mut stop) = watch::channel(false);
        let (done, exited) = watch::channel(false);
        tokio::spawn(async move {
            tokio::select! {
                _ = child.wait() => {},
                _ = async { let _ = stop.wait_for(|value| *value).await; } => {
                    let _ = kill_process_group(pid, Signal::TERM);
                    if tokio::time::timeout(Duration::from_secs(10), child.wait()).await.is_err() {
                        let _ = kill_process_group(pid, Signal::KILL);
                        let _ = child.wait().await;
                    }
                },
            }
            let _ = kill_process_group(pid, Signal::KILL);
            done.send_replace(true);
        });
        Ok(Arc::new(NodePort {
            input: Mutex::new(input),
            output: Mutex::new(BufReader::new(output)),
            terminate,
            exited,
        }))
    }
}

impl HelperFactory for NodeHelpers {
    fn open(&self, output: Arc<dyn HelperEvents>) -> Result<Arc<dyn Helper>> {
        Ok(Arc::new(HelperConnection::new(self.port()?, output)))
    }
}

struct NodePort {
    input: Mutex<ChildStdin>,
    output: Mutex<BufReader<ChildStdout>>,
    terminate: watch::Sender<bool>,
    exited: watch::Receiver<bool>,
}

#[async_trait]
impl HelperPort for NodePort {
    async fn write(&self, request: HelperRequest) -> Result<()> {
        let mut bytes = codec::encode(&request)?;
        bytes.push(b'\n');
        self.input.lock().await.write_all(&bytes).await.internal()
    }
    async fn read(&self) -> Result<Option<HelperOutput>> {
        let mut output = self.output.lock().await;
        let mut bytes = vec![];
        loop {
            let chunk = output.fill_buf().await.internal()?;
            if chunk.is_empty() {
                return if bytes.is_empty() {
                    Ok(None)
                } else {
                    Err(Error::HelperResponse)
                };
            }
            let newline = chunk.iter().position(|byte| *byte == b'\n');
            let count = newline.map(|index| index + 1).unwrap_or(chunk.len());
            bytes.extend_from_slice(&chunk[..count]);
            output.consume(count);
            if newline.is_some() {
                return Ok(Some(codec::decode(&bytes)?));
            }
        }
    }
    async fn terminate(&self) -> Result<()> {
        self.terminate.send_replace(true);
        self.exited().await
    }
    async fn exited(&self) -> Result<()> {
        let mut exited = self.exited.clone();
        if !*exited.borrow() {
            let _ = exited.wait_for(|value| *value).await;
        }
        Ok(())
    }
}
