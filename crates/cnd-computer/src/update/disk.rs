//! Atomic update state and version links under the computer user's home folder.

use std::fs::{self, Permissions};
use std::io;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::{Path, PathBuf};

use async_trait::async_trait;
use cnd_release::version::{BINARY, release_version};

use crate::disk::{atomic_write, collect_temporary, collect_versions};
use crate::error::{Error, ErrorResultExt, Result};

use super::ports::UpdateFiles;
use super::state::UpdateState;

/// File layout installed by the own computer install command.
pub struct InstalledVersions {
    /// Folder containing current, versions, and the state file.
    pub directory: PathBuf,
    /// Actual path of the executable at process start.
    pub executable: Option<PathBuf>,
}

#[async_trait]
impl UpdateFiles for InstalledVersions {
    fn current_version(&self) -> Result<Option<String>> {
        let current = match fs::canonicalize(self.directory.join("current")) {
            Ok(current) => current,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(error.into()),
        };
        let versions = fs::canonicalize(self.directory.join("versions"))?;
        let version = current
            .strip_prefix(versions)
            .ok()
            .and_then(Path::to_str)
            .filter(|version| release_version(version).is_ok());
        Ok(version.map(str::to_owned))
    }

    fn runs_version(&self, version: &str) -> Result<bool> {
        let Some(running) = self.executable.as_deref() else {
            return Ok(false);
        };
        match fs::canonicalize(self.program(version)?) {
            Ok(installed) => Ok(installed == fs::canonicalize(running)?),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error.into()),
        }
    }

    fn program(&self, version: &str) -> Result<PathBuf> {
        Ok(self
            .directory
            .join(version_directory(version)?)
            .join(BINARY))
    }

    fn state(&self) -> Result<UpdateState> {
        let path = self.directory.join("update.json");
        match fs::read(path) {
            Ok(bytes) => serde_json::from_slice(&bytes).internal(),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(UpdateState::default()),
            Err(error) => Err(error.into()),
        }
    }

    fn save(&self, state: &UpdateState) -> Result<()> {
        let bytes = serde_json::to_vec(state).internal()?;
        atomic_write(&self.directory.join("update.json"), &bytes)
    }

    async fn install(&self, version: &str, verified_program: &Path) -> Result<PathBuf> {
        let version_directory = version_directory(version)?;
        let target = self.directory.join(version_directory);
        let stage = tempfile::tempdir_in(&self.directory)?;
        let staged_program = stage.path().join(BINARY);
        tokio::fs::copy(verified_program, &staged_program).await?;
        tokio::fs::set_permissions(&staged_program, Permissions::from_mode(0o755)).await?;
        tokio::fs::File::open(&staged_program)
            .await?
            .sync_all()
            .await?;
        match fs::symlink_metadata(&target) {
            Ok(metadata) if metadata.is_dir() => fs::rename(&staged_program, target.join(BINARY))?,
            Ok(_) => return Err(Error::UpdateLocation),
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                fs::rename(stage.path(), &target)?
            }
            Err(error) => return Err(error.into()),
        }
        Ok(target.join(BINARY))
    }

    fn switch(&self, version: &str) -> Result<()> {
        let version = version_directory(version)?;
        let program = self.directory.join(&version).join(BINARY);
        if !fs::symlink_metadata(program)?.is_file() {
            return Err(Error::UpdateLocation);
        }
        let staged = tempfile::tempdir_in(&self.directory)?;
        let link = staged.path().join("current");
        symlink(version, &link)?;
        fs::rename(link, self.directory.join("current"))?;
        Ok(())
    }

    fn collect(&self, keep: &[&str]) -> Result<()> {
        collect_versions(&self.directory.join("versions"), keep)
    }

    fn clear_temporary(&self) -> Result<()> {
        collect_temporary(&self.directory)
    }
}

fn version_directory(version: &str) -> Result<PathBuf> {
    if release_version(version).is_err() {
        return Err(Error::ReleaseInvalid);
    }
    Ok(Path::new("versions").join(version))
}
