//! File versions and conditional requests across deterministic repository rewrites.

use std::fs::{self, File};
use std::os::unix::fs::MetadataExt;
use std::path::Path;
use std::time::{Duration, Instant, UNIX_EPOCH};

use super::super::support::Fixture;

#[tokio::test]
async fn same_second_and_restored_mtime_rewrites_refresh_equal_length_files() {
    let h = Fixture::new().await;
    h.write("page.html", b"first page");
    h.set_modified("page.html", UNIX_EPOCH + Duration::from_millis(1_000_100));
    let first = h.get("/page.html").await;
    assert_eq!(first.status, 200);
    assert_eq!(first.body, b"first page");
    let first_tag = first
        .headers
        .get("etag")
        .map_or("\"missing\"", String::as_str);

    h.write("page.html", b"fresh page");
    h.set_modified("page.html", UNIX_EPOCH + Duration::from_millis(1_000_900));
    let rewritten = h
        .marked(
            "GET",
            "/page.html",
            &[
                ("If-None-Match", first_tag),
                ("If-Modified-Since", &first.headers["last-modified"]),
            ],
        )
        .await;
    assert_eq!(rewritten.status, 200);
    assert_eq!(rewritten.body, b"fresh page");
    assert_eq!(
        rewritten.headers["last-modified"],
        first.headers["last-modified"]
    );
    assert_ne!(rewritten.headers.get("etag"), first.headers.get("etag"));
    let current_tag = &rewritten.headers["etag"];
    let unchanged = h
        .marked("GET", "/page.html", &[("If-None-Match", current_tag)])
        .await;
    assert_eq!(unchanged.status, 304);
    assert_eq!(&unchanged.headers["etag"], current_tag);
    assert_eq!(unchanged.headers["cache-control"], "no-cache");
    assert!(unchanged.body.is_empty());

    h.write("replacement.html", b"third page");
    h.set_modified(
        "replacement.html",
        UNIX_EPOCH + Duration::from_millis(1_000_900),
    );
    fs::rename(
        h.directory.path().join("replacement.html"),
        h.directory.path().join("page.html"),
    )
    .unwrap();
    let restored = h
        .marked("GET", "/page.html", &[("If-None-Match", current_tag)])
        .await;
    assert_eq!(restored.status, 200);
    assert_eq!(restored.body, b"third page");
    assert_eq!(
        restored.headers["last-modified"],
        rewritten.headers["last-modified"]
    );
    assert_ne!(restored.headers["etag"], *current_tag);

    let current_tag = &restored.headers["etag"];
    let page = h.directory.path().join("page.html");
    let saved = fs::metadata(&page).unwrap();
    later_change_time(h.directory.path(), &saved);
    h.write("page.html", b"saved page");
    h.set_modified("page.html", saved.modified().unwrap());
    let kept = fs::metadata(&page).unwrap();
    assert_eq!(
        (kept.ino(), kept.len(), kept.modified().unwrap()),
        (saved.ino(), saved.len(), saved.modified().unwrap())
    );
    let in_place = h
        .marked("GET", "/page.html", &[("If-None-Match", current_tag)])
        .await;
    assert_eq!(in_place.status, 200);
    assert_eq!(in_place.body, b"saved page");
    assert_ne!(in_place.headers["etag"], *current_tag);
    h.finish().await;
}

/// Waits until a change on the fixture filesystem gets a later change time.
fn later_change_time(directory: &Path, saved: &fs::Metadata) {
    let probe = directory.join(".clock");
    fs::write(&probe, b"").unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        File::options()
            .write(true)
            .open(&probe)
            .unwrap()
            .set_modified(UNIX_EPOCH)
            .unwrap();
        let current = fs::metadata(&probe).unwrap();
        if (current.ctime(), current.ctime_nsec()) > (saved.ctime(), saved.ctime_nsec()) {
            return;
        }
        assert!(Instant::now() < deadline, "the change time did not advance");
    }
}

#[tokio::test]
async fn etag_validation_precedes_dates_and_ranges_for_lists_weak_tags_and_wildcards() {
    let h = Fixture::new().await;
    h.write("video.mp4", b"0123456789");
    h.set_modified("video.mp4", UNIX_EPOCH + Duration::from_millis(1_000_900));
    let first = h.get("/video.mp4").await;
    let etag = first
        .headers
        .get("etag")
        .map_or("\"missing\"", String::as_str);
    for (validator, date, status, body) in [
        (
            etag.to_owned(),
            "Thu, 01 Jan 1970 00:16:39 GMT",
            304,
            b"".as_slice(),
        ),
        (
            format!("W/{etag}"),
            "Thu, 01 Jan 1970 00:16:39 GMT",
            304,
            b"".as_slice(),
        ),
        (
            format!("\"old\", W/{etag}, \"other\""),
            "Thu, 01 Jan 1970 00:16:39 GMT",
            304,
            b"".as_slice(),
        ),
        (
            "*".to_owned(),
            "Thu, 01 Jan 1970 00:16:39 GMT",
            304,
            b"".as_slice(),
        ),
        (
            "\"different\"".to_owned(),
            "Thu, 01 Jan 1970 00:16:41 GMT",
            206,
            b"2345".as_slice(),
        ),
        (
            "invalid".to_owned(),
            "Thu, 01 Jan 1970 00:16:41 GMT",
            206,
            b"2345".as_slice(),
        ),
        (
            format!("\"unterminated, {etag}"),
            "Thu, 01 Jan 1970 00:16:41 GMT",
            206,
            b"2345".as_slice(),
        ),
    ] {
        let response = h
            .marked(
                "GET",
                "/video.mp4",
                &[
                    ("If-None-Match", &validator),
                    ("If-Modified-Since", date),
                    ("Range", "bytes=2-5"),
                ],
            )
            .await;
        assert_eq!(response.status, status, "{validator}");
        assert_eq!(response.body, body, "{validator}");
        assert_eq!(response.headers["etag"], etag, "{validator}");
        assert_eq!(response.headers["cache-control"], "no-cache", "{validator}");
    }
    let repeated = h
        .marked(
            "HEAD",
            "/video.mp4",
            &[("If-None-Match", "\"old\""), ("If-None-Match", etag)],
        )
        .await;
    assert_eq!(repeated.status, 304);
    assert_eq!(repeated.headers["etag"], etag);
    assert!(!repeated.headers.contains_key("content-length"));
    assert!(repeated.body.is_empty());
    h.finish().await;
}
