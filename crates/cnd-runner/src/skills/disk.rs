//! Persistent selection cleanup and atomic publication of complete Git snapshots.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use tokio::fs;

use crate::config::is_skills_repository;

use super::boundary::{SkillsGit, SkillsGitRequest, SkillsStorage};
use super::error::{Error, ErrorResultExt, Result};

/// Disk storage for immutable public repository copies outside workspace folders.
pub struct DiskSkills {
    root: PathBuf,
    git: Arc<dyn SkillsGit>,
}

impl DiskSkills {
    /// Compose isolated copy storage under this agent home.
    pub fn new(home: PathBuf, git: Arc<dyn SkillsGit>) -> Self {
        Self {
            root: home.join(".conductive/skills"),
            git,
        }
    }

    async fn git(&self, args: Vec<String>) -> Result<String> {
        self.git
            .run(SkillsGitRequest {
                home: self.root.join("git-home"),
                args,
            })
            .await
    }

    fn named(&self, repository: &str) -> PathBuf {
        self.root.join("repositories").join(repository)
    }

    async fn current(&self, repository: &str) -> Result<Option<PathBuf>> {
        let Some(snapshot) = read_link(&self.root.join("repository")).await? else {
            return Ok(None);
        };
        let commits = self.named(repository).join("commits");
        let commit = snapshot.parent().unwrap_or(Path::new(""));
        if commit.parent() != Some(commits.as_path())
            || snapshot.file_name() != Path::new(repository).file_name()
            || !commit
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(commit_id)
        {
            return Ok(None);
        }
        Ok(exists(&snapshot).await?.then_some(snapshot))
    }
}

#[async_trait]
impl SkillsStorage for DiskSkills {
    async fn prepare(&self, repository: Option<&str>) -> Result<Option<PathBuf>> {
        let repository = repository.filter(|name| is_skills_repository(name));
        let selected = match fs::read_to_string(self.root.join("name")).await {
            Ok(name) => Some(name),
            Err(error) if error.kind() == ErrorKind::NotFound => None,
            Err(error) => return Err(error).internal(),
        };
        if repository.is_none() || selected.as_deref() != repository {
            remove(&self.root).await?;
            if let Some(repository) = repository {
                fs::create_dir_all(&self.root).await.internal()?;
                fs::write(self.root.join("name"), repository)
                    .await
                    .internal()?;
            }
        }
        match repository {
            Some(repository) => self.current(repository).await,
            None => Ok(None),
        }
    }

    async fn update(&self, repository: &str) -> Result<PathBuf> {
        if !is_skills_repository(repository) {
            return Err(Error::InvalidRepository);
        }
        let named = self.named(repository);
        let git = named.join("git");
        let commits = named.join("commits");
        fs::create_dir_all(&commits).await.internal()?;
        fs::create_dir_all(self.root.join("git-home"))
            .await
            .internal()?;
        self.git(vec![
            "init".into(),
            "--bare".into(),
            "--".into(),
            text(&git),
        ])
        .await?;
        self.git(vec![
            "-C".into(),
            text(&git),
            "fetch".into(),
            "--depth=1".into(),
            "--no-tags".into(),
            "--".into(),
            format!("https://github.com/{repository}.git"),
            "HEAD".into(),
        ])
        .await?;
        let commit = self
            .git(vec![
                "-C".into(),
                text(&git),
                "rev-parse".into(),
                "--verify".into(),
                "FETCH_HEAD^{commit}".into(),
            ])
            .await?;
        let commit = commit.trim();
        if !commit_id(commit) {
            return Err(Error::InvalidCommit);
        }
        let complete = commits.join(commit);
        let snapshot = complete.join(
            Path::new(repository)
                .file_name()
                .ok_or(Error::InvalidRepository)?,
        );
        if self.current(repository).await?.as_ref() == Some(&snapshot) {
            return Ok(snapshot);
        }
        if !exists(&snapshot).await? {
            let staging = tempfile::tempdir_in(&commits).internal()?;
            let folder = staging.path().join(
                Path::new(repository)
                    .file_name()
                    .ok_or(Error::InvalidRepository)?,
            );
            fs::create_dir(&folder).await.internal()?;
            self.git(vec![
                "-C".into(),
                text(&git),
                format!("--work-tree={}", folder.display()),
                "checkout".into(),
                "--force".into(),
                commit.into(),
                "--".into(),
                ".".into(),
            ])
            .await?;
            fs::rename(staging.path(), &complete).await.internal()?;
        }
        self.git(vec![
            "-C".into(),
            text(&git),
            "update-ref".into(),
            format!("refs/skills/{commit}"),
            commit.into(),
        ])
        .await?;
        let staging = tempfile::tempdir_in(&self.root).internal()?;
        let link = staging.path().join("repository");
        fs::symlink(&snapshot, &link).await.internal()?;
        fs::rename(&link, self.root.join("repository"))
            .await
            .internal()?;
        Ok(snapshot)
    }
}

fn text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn commit_id(value: &str) -> bool {
    matches!(value.len(), 40 | 64)
        && value
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}

async fn exists(path: &Path) -> Result<bool> {
    match fs::metadata(path).await {
        Ok(metadata) => Ok(metadata.is_dir()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error).internal(),
    }
}

async fn read_link(path: &Path) -> Result<Option<PathBuf>> {
    match fs::read_link(path).await {
        Ok(target) => Ok(Some(target)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error).internal(),
    }
}

async fn remove(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path).await {
        Ok(metadata) if metadata.is_dir() => fs::remove_dir_all(path).await.internal(),
        Ok(_) => fs::remove_file(path).await.internal(),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).internal(),
    }
}
