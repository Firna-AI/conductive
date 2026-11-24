//! Argument vectors and engine response handling for local Podman.

use std::ffi::OsString;
use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::computer::operations::ComputerRelease;
use cnd_runner_interface::computer::results::ContainerState;
use serde::Deserialize;

use crate::error::Error;
use crate::process::{Input, Invocation, Output, Process};
use crate::settings::ServerUrl;

use super::error::{EngineError, EngineErrorResultExt, EngineResult};
use super::ports::{Engine, EnvironmentWrite};
use super::scripts::SET_ENVIRONMENT;

/// Native Podman client. Each operation runs a separate cancellable command.
pub struct Podman {
    pub(super) process: Arc<dyn Process>,
}

impl Podman {
    /// Use the injected native command runner to find Podman on PATH.
    pub fn new(process: Arc<dyn Process>) -> Self {
        Self { process }
    }

    pub(super) async fn run(
        &self,
        args: impl IntoIterator<Item = impl Into<OsString>>,
        input: Input,
    ) -> EngineResult<Output> {
        let mut invocation = Invocation::new("podman", args);
        invocation.input = input;
        match self.process.run(invocation).await {
            Err(Error::NoSpace) => Err(EngineError::NoSpace),
            result => result.internal(),
        }
    }

    pub(super) async fn checked(
        &self,
        args: impl IntoIterator<Item = impl Into<OsString>>,
        input: Input,
    ) -> EngineResult<Output> {
        let output = self.run(args, input).await?;
        if output.status.success() {
            Ok(output)
        } else {
            Err(classify(&output.stderr))
        }
    }
}

#[async_trait]
impl Engine for Podman {
    async fn inspect(&self, name: &str) -> EngineResult<ContainerState> {
        let target = container(name);
        let output = match self
            .checked(["container", "inspect", &target], Input::Closed)
            .await
        {
            Err(EngineError::NotFound) => return Ok(ContainerState::Missing),
            result => result?,
        };
        let states: Vec<Inspect> = serde_json::from_slice(&output.stdout).internal()?;
        match states.as_slice() {
            [entry] if entry.state.status == "running" => Ok(ContainerState::Running),
            [_] => Ok(ContainerState::Stopped),
            [] => Ok(ContainerState::Missing),
            _ => Err(EngineError::Failed),
        }
    }

    async fn image_exists(&self, image: &str) -> EngineResult<bool> {
        let output = self.run(["image", "exists", image], Input::Closed).await?;
        match output.status.code() {
            Some(0) => Ok(true),
            Some(1) => Ok(false),
            _ => Err(classify(&output.stderr)),
        }
    }

    async fn create(
        &self,
        name: &str,
        image: &str,
        cpus: u32,
        memory_bytes: u64,
    ) -> EngineResult<()> {
        let cpus = cpus.to_string();
        let bytes = memory_bytes.to_string();
        self.checked(
            [
                "create",
                "--name",
                &container(name),
                "--label",
                &format!("build.conductive.container={name}"),
                "--systemd=always",
                "--cpus",
                &cpus,
                "--memory",
                &bytes,
                "--memory-swap",
                &bytes,
                "--volume",
                "/tmp",
                image,
            ],
            Input::Closed,
        )
        .await?;
        Ok(())
    }

    async fn start(&self, name: &str) -> EngineResult<()> {
        self.checked(["start", &container(name)], Input::Closed)
            .await?;
        Ok(())
    }

    fn write_environment<'a>(&'a self, name: &'a str, contents: Vec<u8>) -> EnvironmentWrite<'a> {
        Box::pin(async move {
            self.checked(exec_args(name, SET_ENVIRONMENT), Input::Bytes(contents))
                .await?;
            Ok(())
        })
    }

    async fn stop(&self, name: &str) -> EngineResult<()> {
        self.checked(["stop", "--time", "30", &container(name)], Input::Closed)
            .await?;
        Ok(())
    }

    async fn remove(&self, name: &str) -> EngineResult<()> {
        self.checked(
            ["rm", "--force", "--volumes", "--ignore", &container(name)],
            Input::Closed,
        )
        .await?;
        Ok(())
    }

    async fn save(&self, name: &str, image: &str) -> EngineResult<()> {
        self.checked(
            ["commit", "--pause=true", &container(name), image],
            Input::Closed,
        )
        .await?;
        Ok(())
    }

    async fn load(&self, archive: &Path, image_id: &str, tag: &str) -> EngineResult<()> {
        self.load_image(archive, image_id, tag).await
    }

    async fn bootstrap(
        &self,
        name: &str,
        program: &Path,
        release: &ComputerRelease,
        server: &ServerUrl,
    ) -> EngineResult<()> {
        self.bootstrap_release(name, program, release, server).await
    }
}

pub(super) fn exec_args(name: &str, script: &str) -> Vec<OsString> {
    [
        "exec",
        "--interactive",
        "--user",
        "root",
        &container(name),
        "/bin/sh",
        "-c",
        script,
    ]
    .into_iter()
    .map(OsString::from)
    .collect()
}

fn container(name: &str) -> String {
    format!("conductive-{name}")
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Inspect {
    state: InspectState,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InspectState {
    status: String,
}

fn classify(stderr: &[u8]) -> EngineError {
    let message = String::from_utf8_lossy(stderr).to_ascii_lowercase();
    if message.contains("no space left on device") || message.contains("disk quota exceeded") {
        EngineError::NoSpace
    } else if message.contains("already exists")
        || (message.contains("container name") && message.contains("is already in use"))
    {
        EngineError::AlreadyExists
    } else if message.contains("no such container")
        || message.contains("no such image")
        || message.contains("no container with name or id")
        || message.contains("image not known")
    {
        EngineError::NotFound
    } else {
        EngineError::Failed
    }
}
