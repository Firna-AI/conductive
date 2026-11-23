//! Changed files and their HTTP validators over small in-memory chunks.

#![allow(clippy::unwrap_used)]

use std::io::{self, SeekFrom};
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Duration, UNIX_EPOCH};

use http_body_util::BodyExt;
use hyper::{Method, StatusCode};
use tokio::io::{AsyncRead, AsyncSeek, ReadBuf};
use unimock::{Clause, MockFn, matching};

use crate::file_server::files::{Entry, FileContent, FilesMock, FontStylesheet};

use super::FileRequests;
use super::policy_tests::{policy, request};

struct Chunks {
    bytes: &'static [u8],
    size: usize,
}

impl AsyncRead for Chunks {
    fn poll_read(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        buffer: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.size == 0 {
            return Poll::Ready(Err(io::Error::other("unexpected read")));
        }
        let length = self.bytes.len().min(self.size).min(buffer.remaining());
        let (chunk, rest) = self.bytes.split_at(length);
        buffer.put_slice(chunk);
        self.bytes = rest;
        Poll::Ready(Ok(()))
    }
}

impl AsyncSeek for Chunks {
    fn start_seek(self: Pin<&mut Self>, _: SeekFrom) -> io::Result<()> {
        Err(io::Error::other("unexpected seek"))
    }

    fn poll_complete(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<u64>> {
        Poll::Ready(Err(io::Error::other("unexpected seek")))
    }
}

fn open(bytes: &'static [u8], size: usize) -> impl Clause {
    FilesMock::open
        .each_call(matching!(_, _))
        .answers_arc(Arc::new(move |_, _, _| {
            Ok(Entry::File(FileContent {
                size: bytes.len() as u64,
                modified: UNIX_EPOCH + Duration::from_millis(1_000_900),
                etag: "\"disk-version\"".into(),
                reader: Box::new(Chunks { bytes, size }),
            }))
        }))
}

#[tokio::test]
async fn rewrites_only_local_file_prefixes_across_chunks() {
    let input = b"file:////home/x file://LOCALHOST/a FiLe:/x xfile:///a +file:///b a-file:///c v.file:///d 1file:///e file://server/share file://localhost.test/z file:/";
    let output = "/home/x /a /x xfile:///a +file:///b a-file:///c v.file:///d 1file:///e file://server/share file://localhost.test/z file:/";
    for (path, input_chunk) in [("/a.html", 1), ("/a.css", 4), ("/a.svg", 13)] {
        let reply = policy(open(input, input_chunk))
            .respond(request(path))
            .await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            output,
            "{path}"
        );
    }
}

#[tokio::test]
async fn rewrites_slash_and_backslash_prefixes_to_one_leading_slash() {
    for (input, expected) in [
        (r"file:/\evil.com/x.png", "/evil.com/x.png"),
        (r"file:\\\home\x", r"/home\x"),
        (r"file://localhost\x", "/x"),
        (r"file:///\evil.com", "/evil.com"),
        (r"FiLe:\\LOCALHOST/\x", "/x"),
        (r"file:/\file:/x", "/file:/x"),
        (r"file:\\server\share", r"file:\\server\share"),
    ] {
        let reply = policy(open(input.as_bytes(), 1))
            .respond(request("/file.svg"))
            .await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            expected,
            "{input}"
        );
    }
}

#[tokio::test]
async fn leaves_script_bytes_and_text_without_a_local_address_intact() {
    let script = policy(open(b"let url = 'file:///home/x';", 4));
    let reply = script.respond(request("/file.js")).await;
    assert_eq!(reply.headers()["accept-ranges"], "bytes");
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        "let url = 'file:///home/x';"
    );

    let text = policy(open(b"<p>caf\xc3\xa9</p>", 1));
    let reply = text.respond(request("/file.htm")).await;
    assert_eq!(reply.headers()["accept-ranges"], "none");
    assert!(!reply.headers().contains_key("content-length"));
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        "<p>café</p>"
    );
}

#[tokio::test]
async fn serves_whole_changed_body_with_range_and_if_range() {
    let policy = policy(open(b"file:///x", 3));
    let mut input = request("/file.css");
    input
        .headers_mut()
        .insert("Range", "bytes=0-3".parse().unwrap());
    input
        .headers_mut()
        .insert("If-Range", "Thu, 01 Jan 1970 00:16:40 GMT".parse().unwrap());
    let reply = policy.respond(input).await;
    assert_eq!(reply.status(), StatusCode::OK);
    assert_eq!(reply.headers()["accept-ranges"], "none");
    assert!(!reply.headers().contains_key("content-range"));
    assert!(!reply.headers().contains_key("content-length"));
    assert_eq!(reply.into_body().collect().await.unwrap().to_bytes(), "/x");
}

#[tokio::test]
async fn a_lone_modification_date_does_not_validate_a_changed_body() {
    let policy = policy(open(b"file:///x", 3));
    let mut input = request("/file.svg");
    input.headers_mut().insert(
        "If-Modified-Since",
        "Thu, 01 Jan 1970 00:16:41 GMT".parse().unwrap(),
    );
    let reply = policy.respond(input).await;
    assert_eq!(reply.status(), StatusCode::OK);
    assert_eq!(
        reply.headers()["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );
    assert_eq!(reply.into_body().collect().await.unwrap().to_bytes(), "/x");
}

#[tokio::test]
async fn css_and_svg_get_head_and_304_skip_the_font_stylesheet() {
    let policy = policy((
        open(b"file:///x", 3),
        FilesMock::font_stylesheet
            .each_call(matching!())
            .returns(FontStylesheet::new("@font-face {}".into()))
            .once(),
    ));
    let html = policy.respond(request("/file.html")).await;
    assert_eq!(html.status(), StatusCode::OK);
    let html = html.into_body().collect().await.unwrap().to_bytes();
    assert!(html.starts_with(b"<link rel=\"stylesheet\""));

    for path in ["/file.css", "/file.svg"] {
        let get = policy.respond(request(path)).await;
        assert_eq!(get.status(), StatusCode::OK, "{path}");
        let tag = get.headers()["etag"].clone();

        let mut head = request(path);
        *head.method_mut() = Method::HEAD;
        let head = policy.respond(head).await;
        assert_eq!(head.status(), StatusCode::OK, "{path}");
        assert_eq!(head.headers()["etag"], tag, "{path}");

        let mut conditional = request(path);
        conditional.headers_mut().insert("If-None-Match", tag);
        let unchanged = policy.respond(conditional).await;
        assert_eq!(unchanged.status(), StatusCode::NOT_MODIFIED, "{path}");
    }
}

#[tokio::test]
async fn head_and_matching_etag_use_changed_headers_without_reading_the_file() {
    let policy = policy(open(b"file:///x", 0));
    let mut head = request("/file.html");
    *head.method_mut() = Method::HEAD;
    let head = policy.respond(head).await;
    assert_eq!(head.status(), StatusCode::OK);
    let validator = head.headers()["etag"].clone();
    assert_ne!(validator, "\"disk-version\"");
    assert_eq!(head.headers()["accept-ranges"], "none");
    assert!(!head.headers().contains_key("content-length"));

    let mut conditional = request("/file.html");
    conditional
        .headers_mut()
        .insert("If-None-Match", validator.clone());
    let unchanged = policy.respond(conditional).await;
    assert_eq!(unchanged.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(unchanged.headers()["etag"], validator);
    assert_eq!(unchanged.headers()["accept-ranges"], "none");
    assert!(!unchanged.headers().contains_key("content-length"));
    assert_eq!(head.into_body().collect().await.unwrap().to_bytes(), "");
    assert_eq!(
        unchanged.into_body().collect().await.unwrap().to_bytes(),
        ""
    );
}
