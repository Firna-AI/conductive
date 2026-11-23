//! Changed files and their HTTP validators over small in-memory chunks.

#![allow(clippy::unwrap_used)]

use std::io::{self, SeekFrom};
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Duration, UNIX_EPOCH};

use bytes::Bytes;
use http_body_util::BodyExt;
use hyper::{Method, StatusCode};
use tokio::io::{AsyncRead, AsyncSeek, ReadBuf};
use unimock::{Clause, MockFn, matching};

use crate::file_server::files::{Entry, FileContent, FilesMock, FontStylesheet};

use super::FileRequests;
use super::origin_tests::{ORIGIN, origin_request};
use super::policy_tests::{policy, request};

struct Chunks {
    bytes: Bytes,
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
        buffer.put_slice(&self.bytes.split_to(length));
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

/// Return the mock file in chunks of at most the given size.
pub(super) fn open(bytes: &[u8], size: usize) -> impl Clause {
    let bytes = Bytes::copy_from_slice(bytes);
    FilesMock::open
        .each_call(matching!(_, _))
        .answers_arc(Arc::new(move |_, _, _| {
            Ok(Entry::File(FileContent {
                size: bytes.len() as u64,
                modified: UNIX_EPOCH + Duration::from_millis(1_000_900),
                etag: "\"disk-version\"".into(),
                reader: Box::new(Chunks {
                    bytes: bytes.clone(),
                    size,
                }),
            }))
        }))
}

#[tokio::test]
async fn rewrites_only_local_addresses_with_a_served_path_across_chunks() {
    let unchanged = concat!(
        "xfile:///home/user/code/ciproxy/a +file:///home/user/code/ciproxy/b ",
        "a-file:///home/user/code/ciproxy/c v.file:///home/user/code/ciproxy/d ",
        "1file:///home/user/code/ciproxy/e file://server/home/user/code/ciproxy/f ",
        "file://localhost.test/home/user/code/ciproxy/g ",
        r"file:\\server\home\user\code\ciproxy\h ",
        "file:///etc/passwd file:///home/user/code/ciproxy2/x file:///&#47;evil.com/x file:/",
    );
    let input = format!("file:////home/user/code/ciproxy/x {unchanged}");
    let output = format!("{ORIGIN}/home/user/code/ciproxy/x {unchanged}");
    for (path, input_chunk) in [("/a.html", 1), ("/a.css", 4), ("/a.svg", 13)] {
        let reply = policy(open(input.as_bytes(), input_chunk))
            .respond(origin_request(path, &[ORIGIN]))
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
async fn leaves_an_overlong_prefix_unchanged_and_rewrites_the_next_address() {
    let long = format!("file:{}home/user/code/ciproxy/a.png", "/".repeat(1024));
    let input = format!("{long} file:///usr/share/fonts/b.otf");
    let expected = format!("{long} {ORIGIN}/usr/share/fonts/b.otf");
    for input_chunk in [1, input.len()] {
        let reply = policy(open(input.as_bytes(), input_chunk))
            .respond(origin_request("/file.svg", &[ORIGIN]))
            .await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            expected,
            "chunk size {input_chunk}"
        );
    }
}

#[tokio::test]
async fn keeps_file_text_in_inline_script_syntax() {
    let input = b"<script>const filters = {file:/[.]pdf$/}; const isLocal = /^file:/i;</script>";
    let reply = policy(open(input, 1))
        .respond(origin_request("/file.html", &[ORIGIN]))
        .await;
    assert_eq!(reply.status(), StatusCode::OK);
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        input.as_slice()
    );
}

#[tokio::test]
async fn leaves_script_bytes_and_text_without_a_local_address_intact() {
    let input = b"let url = 'file:///home/user/code/ciproxy/x';";
    let script = policy(open(input, 4));
    let script_request = origin_request("/file.js", &[ORIGIN]);
    let reply = script.respond(script_request).await;
    assert_eq!(reply.headers()["accept-ranges"], "bytes");
    assert_eq!(reply.headers()["etag"], "\"disk-version\"");
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        input.as_slice()
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
    let policy = policy(open(b"file:///home/user/code/ciproxy/x", 3));
    let mut input = origin_request("/file.css", &[ORIGIN]);
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
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        format!("{ORIGIN}/home/user/code/ciproxy/x")
    );
}

#[tokio::test]
async fn a_lone_modification_date_does_not_validate_a_changed_body() {
    let source = b"file:///home/user/code/ciproxy/x";
    let policy = policy(open(source, 3));
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
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        source.as_slice()
    );
}

#[tokio::test]
async fn css_and_svg_get_head_and_304_skip_the_font_stylesheet() {
    let policy = policy((
        open(b"file:///usr/share/fonts/x.otf", 3),
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
        let get = policy.respond(origin_request(path, &[ORIGIN])).await;
        assert_eq!(get.status(), StatusCode::OK, "{path}");
        let tag = get.headers()["etag"].clone();

        let mut head = origin_request(path, &[ORIGIN]);
        *head.method_mut() = Method::HEAD;
        let head = policy.respond(head).await;
        assert_eq!(head.status(), StatusCode::OK, "{path}");
        assert_eq!(head.headers()["etag"], tag, "{path}");

        let mut conditional = origin_request(path, &[ORIGIN]);
        conditional.headers_mut().insert("If-None-Match", tag);
        let unchanged = policy.respond(conditional).await;
        assert_eq!(unchanged.status(), StatusCode::NOT_MODIFIED, "{path}");
    }
}

#[tokio::test]
async fn head_and_matching_etag_use_changed_headers_without_reading_the_file() {
    let policy = policy(open(b"<p>page", 0));
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
