//! File response headers and seek-before-stream assembly.

use std::io::SeekFrom;
use std::time::{SystemTime, UNIX_EPOCH};

use hyper::header::{
    ACCEPT_RANGES, CACHE_CONTROL, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, IF_MODIFIED_SINCE,
    LAST_MODIFIED,
};
use hyper::{Method, Request, Response, StatusCode};
use tokio::io::AsyncSeekExt;

use crate::error::{ErrorResultExt, Result};

use super::body::{self, Body};
use super::files::FileContent;
use super::media::content_type;
use super::range::{self, Selection};

pub(super) fn empty(status: StatusCode) -> Response<Body> {
    let mut response = Response::new(body::empty());
    *response.status_mut() = status;
    let headers = response.headers_mut();
    headers.insert(
        CACHE_CONTROL,
        hyper::header::HeaderValue::from_static("no-cache"),
    );
    headers.insert(
        ACCEPT_RANGES,
        hyper::header::HeaderValue::from_static("bytes"),
    );
    headers.insert(CONTENT_LENGTH, hyper::header::HeaderValue::from_static("0"));
    response
}

fn unchanged(request: &Request<()>, modified: SystemTime) -> bool {
    request
        .headers()
        .get(IF_MODIFIED_SINCE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| httpdate::parse_http_date(value).ok())
        .is_some_and(|since| {
            since
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                >= modified
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
        })
}

pub(super) async fn file(
    request: &Request<()>,
    path: &str,
    mut content: FileContent,
) -> Result<Response<Body>> {
    let mut response = empty(StatusCode::OK);
    response.headers_mut().insert(
        LAST_MODIFIED,
        httpdate::fmt_http_date(content.modified)
            .parse()
            .internal()?,
    );
    response
        .headers_mut()
        .insert(CONTENT_TYPE, content_type(path).parse().internal()?);
    if unchanged(request, content.modified) {
        *response.status_mut() = StatusCode::NOT_MODIFIED;
        response.headers_mut().remove(CONTENT_LENGTH);
        return Ok(response);
    }
    let (start, length) = match range::select(request, &content) {
        Selection::Whole => (0, content.size),
        Selection::Partial { start, length } => {
            *response.status_mut() = StatusCode::PARTIAL_CONTENT;
            response.headers_mut().insert(
                CONTENT_RANGE,
                format!("bytes {start}-{}/{}", start + length - 1, content.size)
                    .parse()
                    .internal()?,
            );
            (start, length)
        }
        Selection::Unsatisfiable => {
            *response.status_mut() = StatusCode::RANGE_NOT_SATISFIABLE;
            response.headers_mut().insert(
                CONTENT_RANGE,
                format!("bytes */{}", content.size).parse().internal()?,
            );
            return Ok(response);
        }
    };
    response.headers_mut().insert(CONTENT_LENGTH, length.into());
    if request.method() != Method::HEAD {
        if start != 0 {
            content
                .reader
                .seek(SeekFrom::Start(start))
                .await
                .internal()?;
        }
        *response.body_mut() = body::file(content.reader, length);
    }
    Ok(response)
}
