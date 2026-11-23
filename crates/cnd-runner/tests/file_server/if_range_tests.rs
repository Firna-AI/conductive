//! Conditional byte ranges over HTTP with fixed file modification times.

use std::time::{Duration, UNIX_EPOCH};

use super::super::support::Fixture;

#[tokio::test]
async fn if_range_after_a_rewrite_returns_the_whole_file_until_the_date_matches() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_000_900));
    let first = h
        .marked("GET", "/video.mp4", &[("Range", "bytes=0-4")])
        .await;
    assert_eq!(first.status, 206);
    assert_eq!(first.body, b"01234");
    assert_eq!(
        first.headers["last-modified"],
        "Thu, 01 Jan 1970 00:16:40 GMT"
    );

    h.write("video.mp4", b"abcdefghij");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_001_900));
    let stale = h
        .marked(
            "GET",
            "/video.mp4",
            &[
                ("Range", "bytes=5-"),
                ("If-Range", &first.headers["last-modified"]),
            ],
        )
        .await;
    assert_eq!(stale.status, 200);
    assert_eq!(stale.body, b"abcdefghij");
    assert_eq!(stale.headers["content-length"], "10");
    assert_eq!(
        stale.headers["last-modified"],
        "Thu, 01 Jan 1970 00:16:41 GMT"
    );
    assert!(!stale.headers.contains_key("content-range"));

    let current = h
        .marked(
            "GET",
            "/video.mp4",
            &[
                ("Range", "bytes=5-"),
                ("If-Range", &stale.headers["last-modified"]),
            ],
        )
        .await;
    assert_eq!(current.status, 206);
    assert_eq!(current.body, b"fghij");
    assert_eq!(current.headers["content-range"], "bytes 5-9/10");
    assert_eq!(current.headers["content-length"], "5");
    h.finish().await;
}

#[tokio::test]
async fn if_range_rejects_unsupported_validators_but_has_no_effect_without_range() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_000_900));
    let date = "Thu, 01 Jan 1970 00:16:40 GMT";
    let current = h.get("/video.mp4").await;
    let etag = current
        .headers
        .get("etag")
        .map_or("\"missing\"", String::as_str);
    let weak = format!("W/{etag}");
    for validators in [
        vec![("If-Range", "\"abc\"")],
        vec![("If-Range", "W/\"abc\"")],
        vec![("If-Range", etag)],
        vec![("If-Range", &weak)],
        vec![("If-Range", "invalid")],
        vec![("If-Range", "")],
        vec![("If-Range", "Thu, 01 Jan 1970 00:16:39 GMT")],
        vec![("If-Range", "Thu, 01 Jan 1970 00:16:41 GMT")],
        vec![("If-Range", date), ("If-Range", date)],
    ] {
        let whole = h.marked("GET", "/video.mp4", &validators).await;
        assert_eq!(whole.status, 200, "{validators:?}");
        assert_eq!(whole.body, b"0123456789", "{validators:?}");
        assert!(
            !whole.headers.contains_key("content-range"),
            "{validators:?}"
        );

        let mut headers = validators.clone();
        headers.push(("Range", "bytes=5-"));
        let response = h.marked("GET", "/video.mp4", &headers).await;
        assert_eq!(response.status, 200, "{validators:?}");
        assert_eq!(response.body, b"0123456789", "{validators:?}");
        assert_eq!(response.headers["content-length"], "10", "{validators:?}");
        assert!(
            !response.headers.contains_key("content-range"),
            "{validators:?}"
        );
        assert_eq!(
            response.headers.get("etag"),
            current.headers.get("etag"),
            "{validators:?}"
        );
    }
    h.finish().await;
}

#[tokio::test]
async fn if_range_mismatch_suppresses_unsatisfiable_ranges_before_selection() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_000_900));
    for range in ["bytes=100-", "bytes=bad"] {
        for (date, expected, body, length, content_range) in [
            (
                "Thu, 01 Jan 1970 00:16:39 GMT",
                200,
                b"0123456789".as_slice(),
                "10",
                None,
            ),
            (
                "Thu, 01 Jan 1970 00:16:40 GMT",
                416,
                b"".as_slice(),
                "0",
                Some("bytes */10"),
            ),
        ] {
            let response = h
                .marked("GET", "/video.mp4", &[("Range", range), ("If-Range", date)])
                .await;
            assert_eq!(response.status, expected, "{range}, {date}");
            assert_eq!(response.body, body, "{range}, {date}");
            assert_eq!(
                response.headers["content-length"], length,
                "{range}, {date}"
            );
            assert_eq!(
                response.headers.get("content-range").map(String::as_str),
                content_range,
                "{range}, {date}"
            );
        }
    }
    h.finish().await;
}

#[tokio::test]
async fn if_range_head_sends_the_headers_of_the_selected_whole_or_partial_get() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_000_900));
    for (date, status, length, content_range) in [
        ("Thu, 01 Jan 1970 00:16:39 GMT", 200, "10", None),
        (
            "Thu, 01 Jan 1970 00:16:40 GMT",
            206,
            "5",
            Some("bytes 5-9/10"),
        ),
    ] {
        let headers = [("Range", "bytes=5-"), ("If-Range", date)];
        let get = h.marked("GET", "/video.mp4", &headers).await;
        let head = h.marked("HEAD", "/video.mp4", &headers).await;
        assert_eq!(head.status, status, "{date}");
        assert_eq!(head.status, get.status, "{date}");
        assert_eq!(head.headers["content-length"], length, "{date}");
        assert_eq!(
            head.headers.get("content-range").map(String::as_str),
            content_range,
            "{date}"
        );
        for name in [
            "content-type",
            "content-length",
            "last-modified",
            "etag",
            "cache-control",
            "accept-ranges",
            "content-range",
        ] {
            assert_eq!(
                head.headers.get(name),
                get.headers.get(name),
                "{name}, {date}"
            );
        }
        assert!(head.body.is_empty(), "{date}");
    }
    h.finish().await;
}
