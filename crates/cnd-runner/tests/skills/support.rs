//! Local Git transport injected at the skills subprocess boundary.

#![allow(clippy::unwrap_used)]

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use cnd_runner::skills::boundary::{SkillsGit, SkillsGitRequest, SkillsStorage};
use cnd_runner::skills::disk::DiskSkills;
use cnd_runner::skills::error::{Error, Result};
use cnd_runner::skills::git::CleanGit;
use tempfile::TempDir;
use tokio::sync::{Notify, watch};

pub(super) struct LocalGit {
    pub(super) base: PathBuf,
    pub(super) requests: Mutex<Vec<Vec<String>>>,
    pub(super) fail_checkout: AtomicBool,
    pub(super) hold_checkout: AtomicBool,
    pub(super) timeout_fetch: AtomicBool,
    pub(super) entered: Notify,
    pub(super) released: watch::Sender<bool>,
}
#[async_trait]
impl SkillsGit for LocalGit {
    async fn run(&self, mut request: SkillsGitRequest) -> Result<String> {
        self.requests.lock().unwrap().push(request.args.clone());
        if request.args.iter().any(|argument| argument == "fetch")
            && self.timeout_fetch.swap(false, Ordering::SeqCst)
        {
            let store = Path::new(&request.args[1]);
            std::fs::write(store.join("index.lock"), "interrupted index").unwrap();
            std::fs::write(store.join("shallow.lock"), "interrupted fetch").unwrap();
            return Err(Error::Timeout);
        }
        if request
            .args
            .iter()
            .any(|argument| argument == "checkout-index")
        {
            if self.fail_checkout.load(Ordering::SeqCst) {
                return Err(Error::Git { code: Some(1) });
            }
            if self.hold_checkout.load(Ordering::SeqCst) {
                self.entered.notify_one();
                let _ = self
                    .released
                    .subscribe()
                    .wait_for(|released| *released)
                    .await;
            }
        }
        for argument in &mut request.args {
            if let Some(repository) = argument.strip_prefix("https://github.com/") {
                *argument = format!("file://{}/{}", self.base.display(), repository);
            }
        }
        CleanGit.run(request).await
    }
}

pub(super) struct Fixture {
    _directory: TempDir,
    pub(super) home: PathBuf,
    pub(super) source: PathBuf,
    pub(super) remote: PathBuf,
    pub(super) git: Arc<LocalGit>,
}
impl Fixture {
    pub(super) fn new() -> Self {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("source");
        let home = directory.path().join("home");
        let base = directory.path().join("remotes");
        let remote = base.join("org/skills.git");
        std::fs::create_dir_all(&source).unwrap();
        std::fs::create_dir_all(remote.parent().unwrap()).unwrap();
        git(&source, &["init", "--initial-branch=main"]);
        git(&source, &["config", "user.name", "Skills test"]);
        git(&source, &["config", "user.email", "skills@example.test"]);
        Self {
            _directory: directory,
            home,
            source,
            remote,
            git: Arc::new(LocalGit {
                base,
                requests: Mutex::new(vec![]),
                fail_checkout: AtomicBool::new(false),
                hold_checkout: AtomicBool::new(false),
                timeout_fetch: AtomicBool::new(false),
                entered: Notify::new(),
                released: watch::channel(false).0,
            }),
        }
    }
    pub(super) fn write(&self, path: &str, value: &str) {
        let path = self.source.join(path);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, value).unwrap();
    }
    pub(super) fn publish(&self) {
        git(&self.source, &["add", "."]);
        git(&self.source, &["commit", "-m", "skills"]);
        git(
            &self.source,
            &[
                "clone",
                "--bare",
                "--",
                self.source.to_str().unwrap(),
                self.remote.to_str().unwrap(),
            ],
        );
    }
    pub(super) fn update(&self) {
        git(&self.source, &["add", "."]);
        git(&self.source, &["commit", "-m", "new skills"]);
        git(
            &self.source,
            &[
                "push",
                "--",
                self.remote.to_str().unwrap(),
                "HEAD:refs/heads/main",
            ],
        );
    }
    pub(super) fn storage(&self) -> Arc<dyn SkillsStorage> {
        Arc::new(DiskSkills::new(self.home.clone(), self.git.clone()))
    }
    pub(super) fn root(&self) -> PathBuf {
        self.home.join(".conductive/skills")
    }
}

pub(super) fn git(root: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .env_clear()
        .env("PATH", std::env::var_os("PATH").unwrap())
        .env("HOME", root)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "git {args:?}: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).unwrap()
}
