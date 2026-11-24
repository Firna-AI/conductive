//! Types, validators, streaming sizes, ranges, and HEAD over HTTP.

use std::fs::{self, File};
use std::time::{Duration, UNIX_EPOCH};

use super::support::Fixture;

#[path = "cache_tests.rs"]
mod cache_tests;
#[path = "if_range_tests.rs"]
mod if_range_tests;

#[tokio::test]
async fn uses_fixed_case_insensitive_web_types_with_an_octet_stream_fallback() {
    let h = Fixture::new().await;
    for (extension, expected) in [
        ("HTML", "text/html; charset=utf-8"),
        ("htm", "text/html; charset=utf-8"),
        ("css", "text/css; charset=utf-8"),
        ("js", "text/javascript; charset=utf-8"),
        ("mjs", "text/javascript; charset=utf-8"),
        ("json", "application/json; charset=utf-8"),
        ("map", "application/json; charset=utf-8"),
        ("svg", "image/svg+xml; charset=utf-8"),
        ("png", "image/png"),
        ("jpg", "image/jpeg"),
        ("jpeg", "image/jpeg"),
        ("gif", "image/gif"),
        ("webp", "image/webp"),
        ("avif", "image/avif"),
        ("ico", "image/x-icon"),
        ("woff", "font/woff"),
        ("woff2", "font/woff2"),
        ("ttf", "font/ttf"),
        ("otf", "font/otf"),
        ("wasm", "application/wasm"),
        ("mp4", "video/mp4"),
        ("webm", "video/webm"),
        ("mp3", "audio/mpeg"),
        ("wav", "audio/wav"),
        ("txt", "text/plain; charset=utf-8"),
        ("md", "text/markdown; charset=utf-8"),
        ("xml", "application/xml; charset=utf-8"),
        ("pdf", "application/pdf"),
        ("unknown", "application/octet-stream"),
    ] {
        let name = format!("file.{extension}");
        h.write(&name, b"content");
        let response = h.get(&format!("/{name}")).await;
        assert_eq!(response.status, 200, "{name}");
        assert_eq!(response.headers["content-type"], expected, "{name}");
    }
    h.finish().await;
}

#[tokio::test]
async fn date_fallback_keeps_full_precision_and_head_sends_headers_without_a_body() {
    let h = Fixture::new().await;
    h.write("page.txt", b"body");
    File::options()
        .write(true)
        .open(h.directory.path().join("page.txt"))
        .unwrap()
        .set_modified(UNIX_EPOCH + Duration::from_millis(1_000_900))
        .unwrap();
    let get = h.get("/page.txt").await;
    let head = h.marked("HEAD", "/page.txt", &[]).await;
    assert_eq!(get.status, 200);
    assert_eq!(get.headers["cache-control"], "no-cache");
    assert_eq!(
        get.headers["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );
    assert_eq!(get.headers["accept-ranges"], "bytes");
    assert_eq!(head.status, get.status);
    for name in [
        "content-type",
        "content-length",
        "last-modified",
        "cache-control",
        "accept-ranges",
    ] {
        assert_eq!(head.headers[name], get.headers[name], "{name}");
    }
    assert!(head.body.is_empty());
    for (date, expected) in [
        ("Thu, 01 Jan 1970 00:16:39 GMT", 200),
        ("Thu, 01 Jan 1970 00:16:40 GMT", 200),
        ("Thu, 01 Jan 1970 00:16:41 GMT", 304),
        ("invalid", 200),
    ] {
        let response = h
            .marked("GET", "/page.txt", &[("If-Modified-Since", date)])
            .await;
        assert_eq!(response.status, expected, "{date}");
    }
    assert_eq!(head.headers["etag"], get.headers["etag"]);
    h.finish().await;
}

#[tokio::test]
async fn serves_single_ranges_and_head_ranges_and_falls_back_for_multiple_ranges() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    for (range, expected, content_range) in [
        ("bytes=0-3", "0123", "bytes 0-3/10"),
        ("bytes=7-", "789", "bytes 7-9/10"),
        ("bytes=-4", "6789", "bytes 6-9/10"),
        ("bytes=7-50", "789", "bytes 7-9/10"),
        ("bytes=-50", "0123456789", "bytes 0-9/10"),
    ] {
        let response = h.marked("GET", "/video.mp4", &[("Range", range)]).await;
        assert_eq!(response.status, 206, "{range}");
        assert_eq!(response.headers["content-range"], content_range, "{range}");
        assert_eq!(
            response.headers["content-length"],
            expected.len().to_string()
        );
        assert_eq!(response.body, expected.as_bytes(), "{range}");
    }
    let head = h
        .marked("HEAD", "/video.mp4", &[("Range", "bytes=3-5")])
        .await;
    assert_eq!(head.status, 206);
    assert_eq!(head.headers["content-range"], "bytes 3-5/10");
    assert_eq!(head.headers["content-length"], "3");
    assert!(head.body.is_empty());
    for range in [
        "bytes=10-",
        "bytes=5-2",
        "bytes=-0",
        "bytes=bad",
        "bytes=999999999999999999999999999-",
    ] {
        let response = h.marked("GET", "/video.mp4", &[("Range", range)]).await;
        assert_eq!(response.status, 416, "{range}");
        assert_eq!(response.headers["content-range"], "bytes */10");
        assert!(response.body.is_empty());
    }
    let multiple = h
        .marked("GET", "/video.mp4", &[("Range", "bytes=0-1,5-6")])
        .await;
    assert_eq!(
        (multiple.status, multiple.body),
        (200, b"0123456789".to_vec())
    );
    assert!(!multiple.headers.contains_key("content-range"));
    h.write("empty.txt", b"");
    assert_eq!(h.get("/empty.txt").await.status, 200);
    let empty = h
        .marked("GET", "/empty.txt", &[("Range", "bytes=0-")])
        .await;
    assert_eq!(empty.status, 416);
    assert_eq!(empty.headers["content-range"], "bytes */0");
    h.finish().await;
}

#[tokio::test]
async fn streams_files_larger_than_the_file_tab_limit_and_refuses_a_busy_bind() {
    let h = Fixture::new().await;
    let file = File::create(h.directory.path().join("large.bin")).unwrap();
    file.set_len(5 * 1024 * 1024 + 1).unwrap();
    let response = h.get("/large.bin").await;
    assert_eq!(response.status, 200);
    assert_eq!(response.body.len(), 5 * 1024 * 1024 + 1);
    assert_eq!(response.headers["content-length"], "5242881");
    assert!(
        cnd_runner::file_server::listener::LoopbackListener::bind(h.address.port())
            .await
            .is_err()
    );
    fs::remove_file(h.directory.path().join("large.bin")).unwrap();
    h.finish().await;
}
