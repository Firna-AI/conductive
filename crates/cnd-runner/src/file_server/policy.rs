//! HTTP method, origin, path, index, cache, and range policy.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;

use async_trait::async_trait;
use cnd_runner_interface::file_server::{FILE_SERVER_PORT, FILES_HEADER};
use hyper::header::{ALLOW, HOST, LAST_MODIFIED, LOCATION, UPGRADE};
use hyper::{Method, Request, Response, StatusCode};

use crate::error::{ErrorResultExt, Result};

use super::body::Body;
use super::files::{Entry, FileContent, Files};
use super::{media, path, response, stylesheet};

/// Request boundary shared by the server and policy tests.
#[cfg_attr(test, unimock::unimock(api = FileRequestsMock))]
#[async_trait]
pub trait FileRequests: Send + Sync {
    /// Answer a file request without logging its path.
    async fn respond(&self, request: Request<()>) -> Response<Body>;
}

/// Repository HTTP policy over injected file access.
pub struct FilePolicy {
    /// Safe repository access.
    pub files: Arc<dyn Files>,
}

enum RepositoryEntry {
    File { path: String, content: FileContent },
    Redirect { modified: SystemTime },
}

fn allowed_host(request: &Request<()>) -> bool {
    if request.headers().get_all(HOST).iter().count() != 1 {
        return false;
    }
    request
        .headers()
        .get(HOST)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|host| {
            host == format!("localhost:{FILE_SERVER_PORT}")
                || host == format!("127.0.0.1:{FILE_SERVER_PORT}")
        })
}

fn index_path(path: &str) -> String {
    if path.is_empty() {
        "index.html".into()
    } else {
        format!("{path}/index.html")
    }
}

fn redirect(request: &Request<()>, modified: SystemTime) -> Result<Response<Body>> {
    let mut location = format!("{}/", request.uri().path().replace('\\', "%5C"));
    if let Some(query) = request.uri().query() {
        location.push('?');
        location.push_str(query);
    }
    let mut response = response::empty(StatusCode::FOUND);
    response
        .headers_mut()
        .insert(LOCATION, location.parse().internal()?);
    response.headers_mut().insert(
        LAST_MODIFIED,
        httpdate::fmt_http_date(modified).parse().internal()?,
    );
    Ok(response)
}

impl FilePolicy {
    async fn find(&self, root: &Path, path: &str, trailing: bool) -> Option<RepositoryEntry> {
        let file_path = if trailing {
            index_path(path)
        } else {
            path.into()
        };
        let entry = self.files.open(root, &file_path).await.ok()?;
        match entry {
            Entry::File(content) => Some(RepositoryEntry::File {
                path: file_path,
                content,
            }),
            Entry::Directory if !trailing => {
                let Ok(Entry::File(index)) = self.files.open(root, &index_path(path)).await else {
                    return None;
                };
                Some(RepositoryEntry::Redirect {
                    modified: index.modified,
                })
            }
            Entry::Directory => None,
        }
    }

    async fn read(&self, request: &Request<()>, path: &str) -> Result<Response<Body>> {
        let root = self.files.root();
        let trailing = request.uri().path().ends_with('/');
        if let Some(entry) = self.find(&root, path, trailing).await {
            return entry.respond(request, self.files.as_ref(), root).await;
        }
        let absolute = Path::new("/").join(path);
        if let Some(mapped) = path::strip_folder(&absolute, &root).and_then(Path::to_str)
            && mapped != path
            && let Some(entry) = self.find(&root, mapped, trailing).await
        {
            return entry.respond(request, self.files.as_ref(), root).await;
        }
        if !trailing {
            if absolute == Path::new(stylesheet::ADDRESS) {
                return response::stylesheet(request, self.files.font_stylesheet().await);
            }
            if let Some(font) = self.files.open_font(&absolute).await {
                return response::file(
                    request,
                    media::content_type(path),
                    font,
                    self.files.as_ref(),
                    root,
                )
                .await;
            }
        }
        Ok(response::empty(StatusCode::NOT_FOUND))
    }
}

impl RepositoryEntry {
    async fn respond(
        self,
        request: &Request<()>,
        files: &dyn Files,
        root: PathBuf,
    ) -> Result<Response<Body>> {
        match self {
            Self::File { path, content } => {
                response::file(request, media::content_type(&path), content, files, root).await
            }
            Self::Redirect { modified } => redirect(request, modified),
        }
    }
}

#[async_trait]
impl FileRequests for FilePolicy {
    async fn respond(&self, request: Request<()>) -> Response<Body> {
        if request.headers().contains_key(UPGRADE) {
            return response::empty(StatusCode::BAD_REQUEST);
        }
        if request.method() != Method::GET && request.method() != Method::HEAD {
            let mut response = response::empty(StatusCode::METHOD_NOT_ALLOWED);
            response
                .headers_mut()
                .insert(ALLOW, hyper::header::HeaderValue::from_static("GET, HEAD"));
            return response;
        }
        if !allowed_host(&request)
            || request.headers().get_all(FILES_HEADER).iter().count() != 1
            || request
                .headers()
                .get(FILES_HEADER)
                .is_none_or(|value| value != "1")
        {
            return response::empty(StatusCode::FORBIDDEN);
        }
        let Some(path) = path::decode(request.uri().path()) else {
            return response::empty(StatusCode::NOT_FOUND);
        };
        match self.read(&request, &path).await {
            Ok(response) => response,
            Err(_) => response::empty(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/policy_tests.rs"]
mod policy_tests;

#[cfg(test)]
#[path = "_tests_/mapping_tests.rs"]
mod mapping_tests;

#[cfg(test)]
#[path = "_tests_/origin_tests.rs"]
mod origin_tests;

#[cfg(test)]
#[path = "_tests_/rewrite_tests.rs"]
mod rewrite_tests;
