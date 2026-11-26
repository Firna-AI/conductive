//! Persistent selection cleanup and atomic publication of complete Git snapshots.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use tokio::fs;

use crate::config::is_skills_repository;

use super::boundary::{SkillsGit, SkillsGitRequest, SkillsStorage};
use super::error::{Error, ErrorResultExt, Result};
use super::files::{commit_id, exists, read_link, recover_locks, remove, text};
use super::links::close_snapshot;

/// Disk storage for immutable public repository copies outside workspace folders.
pub struct DiskSkills {
    pub(super) root: PathBuf,
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

    pub(super) async fn git(&self, args: Vec<String>) -> Result<String> {
        self.git
            .run(SkillsGitRequest {
                home: self.root.join("git-home"),
                args,
            })
            .await
    }

    pub(super) fn named(&self, repository: &str) -> PathBuf {
        self.root.join("repositories").join(repository)
    }

    pub(super) async fn current(&self, repository: &str) -> Result<Option<PathBuf>> {
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

    async fn publish(&self, snapshot: &Path) -> Result<()> {
        let staging = tempfile::tempdir_in(&self.root).internal()?;
        let link = staging.path().join("repository");
        fs::symlink(snapshot, &link).await.internal()?;
        fs::rename(&link, self.root.join("repository"))
            .await
            .internal()
    }
}

#[async_trait]
impl SkillsStorage for DiskSkills {
    async fn prepare(&self, repository: Option<&str>) -> Result<Option<PathBuf>> {
        self.remove_sessions().await?;
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
        let Some(repository) = repository else {
            return Ok(None);
        };
        let current = self.current(repository).await?;
        if let Some(current) = &current {
            close_snapshot(current).await?;
        }
        self.sweep(repository, &[]).await?;
        Ok(current)
    }

    async fn update(&self, repository: &str) -> Result<Option<PathBuf>> {
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
        recover_locks(&git).await?;
        self.git(vec![
            "init".into(),
            "--bare".into(),
            "--".into(),
            text(&git),
        ])
        .await?;
        let url = format!("https://github.com/{repository}.git");
        match self
            .git(vec![
                "-C".into(),
                text(&git),
                "ls-remote".into(),
                "--exit-code".into(),
                "--".into(),
                url.clone(),
                "HEAD".into(),
            ])
            .await
        {
            Err(Error::Git { code: Some(2) }) => {
                remove(&self.root.join("repository")).await?;
                return Ok(None);
            }
            result => {
                result?;
            }
        }
        self.git(vec![
            "-C".into(),
            text(&git),
            "fetch".into(),
            "--depth=1".into(),
            "--no-tags".into(),
            "--".into(),
            url,
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
        let name = Path::new(repository)
            .file_name()
            .ok_or(Error::InvalidRepository)?;
        let snapshot = complete.join(name);
        if !exists(&snapshot).await? {
            let staging = tempfile::tempdir_in(&commits).internal()?;
            let folder = staging.path().join(name);
            fs::create_dir(&folder).await.internal()?;
            self.git(vec![
                "-C".into(),
                text(&git),
                "read-tree".into(),
                commit.into(),
            ])
            .await?;
            self.git(vec![
                "-C".into(),
                text(&git),
                format!("--work-tree={}", folder.display()),
                "checkout-index".into(),
                "--all".into(),
                "--force".into(),
            ])
            .await?;
            close_snapshot(&folder).await?;
            fs::rename(staging.path(), &complete).await.internal()?;
        }
        self.git(vec![
            "-C".into(),
            text(&git),
            "update-ref".into(),
            "refs/skills/published".into(),
            commit.into(),
        ])
        .await?;
        self.publish(&snapshot).await?;
        Ok(Some(snapshot))
    }

    async fn sweep(&self, repository: &str, retained: &[PathBuf]) -> Result<()> {
        if !is_skills_repository(repository) {
            return Err(Error::InvalidRepository);
        }
        self.reclaim(repository, retained).await
    }
}
