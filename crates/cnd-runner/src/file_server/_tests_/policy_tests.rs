//! HTTP decisions over mocked files, with no physical IO or clock.

#![allow(clippy::unwrap_used, clippy::panic)]

use std::io::Cursor;
use std::sync::Arc;
use std::time::{Duration, UNIX_EPOCH};

use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use unimock::{MockFn, Unimock, matching};

use super::{FilePolicy, FileRequests};
use crate::file_server::files::{Entry, FileContent, FilesMock};

fn request(path: &str) -> Request<()> {
    Request::builder()
        .uri(path)
        .header("Host", "localhost:7683")
        .header("X-Conductive-Files", "1")
        .body(())
        .unwrap()
}

fn content() -> Entry {
    Entry::File(FileContent {
        size: 10,
        modified: UNIX_EPOCH + Duration::from_millis(1_000_900),
        etag: "\"mock-version\"".into(),
        reader: Box::new(Cursor::new(b"0123456789".to_vec())),
    })
}

#[tokio::test]
async fn streams_a_decoded_file_with_web_headers() {
    let files = Unimock::new(FilesMock::open.some_call(matching!(_)).answers(&|_, path| {
        assert_eq!(path, "a b.html");
        Ok(content())
    }));
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let response = policy.respond(request("/a%20b.html?ignored=yes")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers()["content-type"],
        "text/html; charset=utf-8"
    );
    assert_eq!(response.headers()["content-length"], "10");
    assert_eq!(response.headers()["cache-control"], "no-cache");
    assert_eq!(response.headers()["accept-ranges"], "bytes");
    assert_eq!(response.headers()["etag"], "\"mock-version\"");
    assert_eq!(
        response.headers()["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        "0123456789"
    );
}

#[tokio::test]
async fn head_has_the_get_range_headers_without_streaming_content() {
    let files = Unimock::new(
        FilesMock::open
            .some_call(matching!(_))
            .answers(&|_, _| Ok(content())),
    );
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let mut input = request("/page.html");
    *input.method_mut() = hyper::Method::HEAD;
    input
        .headers_mut()
        .insert("Range", "bytes=2-5".parse().unwrap());
    let response = policy.respond(input).await;
    assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
    assert_eq!(response.headers()["content-range"], "bytes 2-5/10");
    assert_eq!(response.headers()["content-length"], "4");
    assert!(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .is_empty()
    );
}

#[tokio::test]
async fn dates_before_the_full_modification_time_do_not_suppress_range_requests() {
    let files = Unimock::new(
        FilesMock::open
            .some_call(matching!(_))
            .answers(&|_, _| Ok(content())),
    );
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let mut input = request("/page.html");
    input.headers_mut().insert(
        "If-Modified-Since",
        "Thu, 01 Jan 1970 00:16:40 GMT".parse().unwrap(),
    );
    input
        .headers_mut()
        .insert("Range", "bytes=100-".parse().unwrap());
    let response = policy.respond(input).await;
    assert_eq!(response.status(), StatusCode::RANGE_NOT_SATISFIABLE);
    assert_eq!(
        response.headers()["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );
    assert_eq!(response.headers()["content-range"], "bytes */10");
    assert!(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .is_empty()
    );
}

#[tokio::test]
async fn directory_redirect_keeps_the_encoded_path_and_query() {
    let files =
        Unimock::new(FilesMock::open.some_call(matching!(_)).answers(
            &|_, path| match path.as_str() {
                "a b" => Ok(Entry::Directory),
                "a b/index.html" => Ok(content()),
                _ => panic!("unexpected repository path"),
            },
        ));
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let response = policy.respond(request("/a%20b?q=%2F")).await;
    assert_eq!(response.status(), StatusCode::FOUND);
    assert_eq!(response.headers()["location"], "/a%20b/?q=%2F");
    assert_eq!(
        response.headers()["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );
}
