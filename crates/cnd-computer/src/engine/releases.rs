//! Native import and pinned bootstrap operations for verified releases.

use std::ffi::OsString;
use std::path::Path;

use cnd_runner_interface::computer::operations::ComputerRelease;

use crate::process::Input;
use crate::settings::ServerUrl;

use super::error::{EngineError, EngineResult};
use super::podman::{Podman, exec_args};
use super::scripts::{APPLY_BOOTSTRAP, COPY_BOOTSTRAP};

impl Podman {
    pub(super) async fn load_image(
        &self,
        archive: &Path,
        image_id: &str,
        tag: &str,
    ) -> EngineResult<()> {
        let output = self
            .checked(
                [
                    OsString::from("load"),
                    OsString::from("--input"),
                    archive.as_os_str().to_owned(),
                ],
                Input::Closed,
            )
            .await?;
        let output_text = String::from_utf8_lossy(&output.stdout);
        let mut names = output_text
            .lines()
            .filter_map(|line| {
                line.strip_prefix("Loaded image: ")
                    .or_else(|| line.strip_prefix("Loaded image(s): "))
            })
            .flat_map(str::split_ascii_whitespace);
        let name = names.next().ok_or(EngineError::Failed)?;
        if names.next().is_some() {
            return Err(EngineError::ImageIdMismatch);
        }
        let inspected = self
            .checked(
                ["image", "inspect", "--format", "{{.Id}}", "--", name],
                Input::Closed,
            )
            .await?;
        let id = String::from_utf8_lossy(&inspected.stdout);
        let id = id.trim();
        let expected = image_id
            .strip_prefix("sha256:")
            .ok_or(EngineError::ImageIdMismatch)?;
        if id.strip_prefix("sha256:").unwrap_or(id) != expected {
            return Err(EngineError::ImageIdMismatch);
        }
        self.checked(["tag", name, tag], Input::Closed).await?;
        Ok(())
    }

    pub(super) async fn bootstrap_release(
        &self,
        name: &str,
        program: &Path,
        release: &ComputerRelease,
        server: &ServerUrl,
    ) -> EngineResult<()> {
        self.checked(
            exec_args(name, COPY_BOOTSTRAP),
            Input::File(program.to_owned()),
        )
        .await?;
        let mut args = exec_args(name, APPLY_BOOTSTRAP);
        args.extend(
            [
                "conductive-bootstrap",
                &release.version,
                &release.digest,
                server.as_str(),
            ]
            .into_iter()
            .map(OsString::from),
        );
        self.checked(args, Input::Closed).await?;
        Ok(())
    }
}
