//! File response headers and seek-before-stream assembly.

use std::io::SeekFrom;
use std::path::PathBuf;
use std::time::SystemTime;

use hyper::header::{
    ACCEPT_RANGES, CACHE_CONTROL, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, ETAG, HeaderValue,
    IF_MODIFIED_SINCE, IF_NONE_MATCH, LAST_MODIFIED,
};
use hyper::{Method, Request, Response, StatusCode};
use tokio::io::AsyncSeekExt;

use crate::error::{ErrorResultExt, Result};

use super::body::{self, Body, ChangedDocument};
use super::files::{FileContent, Files, FontStylesheet};
use super::media::CSS;
use super::range::{self, Selection};

/// Make an empty reply with the default file server headers.
pub(super) fn empty(status: StatusCode) -> Response<Body> {
    let mut response = Response::new(body::empty());
    *response.status_mut() = status;
    let headers = response.headers_mut();
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert(ACCEPT_RANGES, HeaderValue::from_static("bytes"));
    headers.insert(CONTENT_LENGTH, HeaderValue::from_static("0"));
    response
}

fn unranged() -> Response<Body> {
    let mut response = empty(StatusCode::OK);
    response
        .headers_mut()
        .insert(ACCEPT_RANGES, HeaderValue::from_static("none"));
    response.headers_mut().remove(CONTENT_LENGTH);
    response
}

fn etag_matches(mut values: &str, etag: &str) -> bool {
    if values.trim() == "*" {
        return true;
    }
    let mut matched = false;
    loop {
        values = values.trim_start_matches([',', ' ', '\t']);
        if values.is_empty() {
            return matched;
        }
        let strong = values.strip_prefix("W/").unwrap_or(values);
        let Some(quoted) = strong.strip_prefix('"') else {
            return false;
        };
        let Some(end) = quoted.find('"') else {
            return false;
        };
        matched |= &strong[..end + 2] == etag;
        values = strong[end + 2..].trim_start_matches([' ', '\t']);
        if !values.is_empty() && !values.starts_with(',') {
            return false;
        }
    }
}

fn unchanged(request: &Request<()>, etag: &str, modified: Option<SystemTime>) -> bool {
    if request.headers().contains_key(IF_NONE_MATCH) {
        return request
            .headers()
            .get_all(IF_NONE_MATCH)
            .iter()
            .filter_map(|value| value.to_str().ok())
            .any(|value| etag_matches(value, etag));
    }
    let Some(modified) = modified else {
        return false;
    };
    request
        .headers()
        .get(IF_MODIFIED_SINCE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| httpdate::parse_http_date(value).ok())
        .is_some_and(|since| since >= modified)
}

/// Build the file reply for the selected media type and request validators.
pub(super) async fn file(
    request: &Request<()>,
    media: &'static str,
    mut content: FileContent,
    files: &dyn Files,
    repository: PathBuf,
) -> Result<Response<Body>> {
    let document = ChangedDocument::prepare(media, files, request.headers(), repository).await;
    let (mut response, etag, date_validator) = match &document {
        Some(document) => (unranged(), document.etag(&content.etag), None),
        None => (
            empty(StatusCode::OK),
            content.etag.clone(),
            Some(content.modified),
        ),
    };
    response
        .headers_mut()
        .insert(ETAG, etag.parse().internal()?);
    response.headers_mut().insert(
        LAST_MODIFIED,
        httpdate::fmt_http_date(content.modified)
            .parse()
            .internal()?,
    );
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static(media));
    if unchanged(request, &etag, date_validator) {
        *response.status_mut() = StatusCode::NOT_MODIFIED;
        response.headers_mut().remove(CONTENT_LENGTH);
        return Ok(response);
    }
    if let Some(document) = document {
        if request.method() != Method::HEAD {
            *response.body_mut() = document.stream(content.reader, content.size);
        }
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

/// Serve the generated stylesheet as one representation without range support.
pub(super) fn stylesheet(request: &Request<()>, content: FontStylesheet) -> Result<Response<Body>> {
    let mut response = unranged();
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static(CSS));
    response
        .headers_mut()
        .insert(ETAG, content.etag.parse().internal()?);
    if unchanged(request, &content.etag, None) {
        *response.status_mut() = StatusCode::NOT_MODIFIED;
    } else {
        response
            .headers_mut()
            .insert(CONTENT_LENGTH, content.text.len().into());
        if request.method() != Method::HEAD {
            *response.body_mut() = body::bytes(content.text);
        }
    }
    Ok(response)
}
