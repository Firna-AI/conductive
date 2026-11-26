//! Serial background reclamation keeps only the published copy and leased copies.

use std::path::PathBuf;

use tokio::fs;

use super::disk::DiskSkills;
use super::error::{ErrorResultExt, Result};
use super::files::{exists, recover_locks, remove, text};

impl DiskSkills {
    pub(super) async fn remove_sessions(&self) -> Result<()> {
        let sessions = self.root.with_file_name("skill-sessions");
        if exists(&sessions).await? {
            let mut entries = fs::read_dir(sessions).await.internal()?;
            while let Some(entry) = entries.next_entry().await.internal()? {
                if entry.file_name().to_string_lossy().starts_with("turn-") {
                    remove(&entry.path()).await?;
                }
            }
        }
        Ok(())
    }

    pub(super) async fn reclaim(&self, repository: &str, retained: &[PathBuf]) -> Result<()> {
        let named = self.named(repository);
        let commits = named.join("commits");
        let current = self.current(repository).await?;
        if exists(&commits).await? {
            let mut entries = fs::read_dir(commits).await.internal()?;
            while let Some(entry) = entries.next_entry().await.internal()? {
                let path = entry.path();
                if !current
                    .iter()
                    .chain(retained)
                    .any(|copy| copy.parent() == Some(path.as_path()))
                {
                    remove(&path).await?;
                }
            }
        }
        let store = named.join("git");
        if !exists(&store).await? {
            return Ok(());
        }
        recover_locks(&store).await?;
        fs::create_dir_all(self.root.join("git-home"))
            .await
            .internal()?;
        let refs = self
            .git(vec![
                "-C".into(),
                text(&store),
                "for-each-ref".into(),
                "--format=%(refname)".into(),
                "refs/skills/".into(),
            ])
            .await?;
        for reference in refs.lines().filter(|name| *name != "refs/skills/published") {
            self.git(vec![
                "-C".into(),
                text(&store),
                "update-ref".into(),
                "-d".into(),
                reference.into(),
            ])
            .await?;
        }
        let mut reference = vec!["-C".into(), text(&store), "update-ref".into()];
        if let Some(commit) = current
            .as_ref()
            .and_then(|path| path.parent())
            .and_then(|path| path.file_name())
        {
            reference.extend([
                "refs/skills/published".into(),
                commit.to_string_lossy().into_owned(),
            ]);
        } else {
            reference.extend(["-d".into(), "refs/skills/published".into()]);
        }
        self.git(reference).await?;
        self.git(vec![
            "-C".into(),
            text(&store),
            "read-tree".into(),
            "--empty".into(),
        ])
        .await?;
        remove(&store.join("FETCH_HEAD")).await?;
        self.git(vec![
            "-C".into(),
            text(&store),
            "gc".into(),
            "--prune=now".into(),
        ])
        .await?;
        Ok(())
    }
}
