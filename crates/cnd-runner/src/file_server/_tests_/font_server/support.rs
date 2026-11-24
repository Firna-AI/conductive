//! HTTP policy with real files in temporary directories.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use cnd_runner::file_server::body::Body;
use cnd_runner::file_server::files::RepositoryFiles;
use cnd_runner::file_server::font_files::PreviewFiles;
use cnd_runner::file_server::policy::{FilePolicy, FileRequests};
use hyper::{Method, Request, Response};
use tempfile::{Builder, TempDir};
use tokio::sync::watch;

/// The address of the system font stylesheet in the files preview.
pub(super) const STYLESHEET: &str = "/__conductive/system-fonts.css";

/// A new repository and two font directories for a test.
pub(super) struct Fixture {
    /// Parent that also holds any test files outside the preview roots.
    pub(super) temp: TempDir,
    /// The first configured font folder.
    pub(super) system: PathBuf,
    /// The second configured font folder.
    pub(super) local: PathBuf,
    /// The repository folder, which takes precedence over font paths.
    pub(super) repository: PathBuf,
    policy: Arc<dyn FileRequests>,
}

impl Fixture {
    /// Use the production file implementation with isolated roots.
    pub(super) fn new() -> Self {
        let temp = Builder::new().prefix("preview-fonts-").tempdir().unwrap();
        let parent = fs::canonicalize(temp.path()).unwrap();
        let system = parent.join("system");
        let local = parent.join("local");
        let repository = parent.join("repository");
        for path in [&system, &local, &repository] {
            fs::create_dir(path).unwrap();
        }
        let (_, root) = watch::channel(repository.clone());
        let files = PreviewFiles::new(
            Arc::new(RepositoryFiles { root }),
            [system.clone(), local.clone()],
        );
        Self {
            temp,
            system,
            local,
            repository,
            policy: Arc::new(FilePolicy {
                files: Arc::new(files),
            }),
        }
    }

    /// Send a marked request at the policy boundary.
    pub(super) async fn request(
        &self,
        method: Method,
        uri: &str,
        headers: &[(&str, &str)],
    ) -> Response<Body> {
        let mut request = Request::builder()
            .method(method)
            .uri(uri)
            .header("Host", "localhost:7683")
            .header("X-Conductive-Files", "1");
        for (name, value) in headers {
            request = request.header(*name, *value);
        }
        self.policy.respond(request.body(()).unwrap()).await
    }

    /// Read the file addressed by an absolute path without special URL characters.
    pub(super) async fn get(&self, path: &Path) -> Response<Body> {
        self.request(Method::GET, path.to_str().unwrap(), &[]).await
    }
}
