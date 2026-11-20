//! HTTP method, origin, path, index, cache, and range policy.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::file_server::{FILE_SERVER_PORT, FILES_HEADER};
use hyper::header::{ALLOW, HOST, LAST_MODIFIED, LOCATION, UPGRADE};
use hyper::{Method, Request, Response, StatusCode};

use crate::error::{ErrorResultExt, Result};

use super::body::Body;
use super::files::{Entry, Files};
use super::{path, response};

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

impl FilePolicy {
    async fn read(&self, request: &Request<()>, path: String) -> Result<Response<Body>> {
        let trailing = request.uri().path().ends_with('/');
        let file_path = if trailing {
            if path.is_empty() {
                "index.html".into()
            } else {
                format!("{path}/index.html")
            }
        } else {
            path
        };
        let entry = match self.files.open(file_path.clone()).await {
            Ok(entry) => entry,
            Err(_) => return Ok(response::empty(StatusCode::NOT_FOUND)),
        };
        match entry {
            Entry::File(content) => response::file(request, &file_path, content).await,
            Entry::Directory if !trailing => {
                let Ok(Entry::File(index)) =
                    self.files.open(format!("{file_path}/index.html")).await
                else {
                    return Ok(response::empty(StatusCode::NOT_FOUND));
                };
                let mut location = format!("{}/", request.uri().path().replace('\\', "%5C"));
                if let Some(query) = request.uri().query() {
                    location.push('?');
                    location.push_str(query);
                }
                let mut redirect = response::empty(StatusCode::FOUND);
                redirect
                    .headers_mut()
                    .insert(LOCATION, location.parse().internal()?);
                redirect.headers_mut().insert(
                    LAST_MODIFIED,
                    httpdate::fmt_http_date(index.modified).parse().internal()?,
                );
                Ok(redirect)
            }
            Entry::Directory => Ok(response::empty(StatusCode::NOT_FOUND)),
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
        match self.read(&request, path).await {
            Ok(response) => response,
            Err(_) => response::empty(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/policy_tests.rs"]
mod policy_tests;
