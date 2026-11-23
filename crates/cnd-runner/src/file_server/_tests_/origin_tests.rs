//! Changes to file addresses and ETags for an authenticated preview origin.

#![allow(clippy::unwrap_used)]

use cnd_runner_interface::file_server::FILES_ORIGIN_HEADER;
use http_body_util::BodyExt;
use hyper::header::{ETAG, HeaderValue, IF_NONE_MATCH};
use hyper::{Request, StatusCode};

use super::FileRequests;
use super::policy_tests::{policy, request};
use super::rewrite_tests::open;

const ORIGIN: &str = "https://0123456789abcdef0123456789abcdef.conductive.page";
const OTHER_ORIGIN: &str = "https://other-preview.conductive.page";

fn origin_request(path: &str, values: &[&'static str]) -> Request<()> {
    let mut request = request(path);
    for value in values {
        request
            .headers_mut()
            .append(FILES_ORIGIN_HEADER, HeaderValue::from_static(value));
    }
    request
}

#[tokio::test]
async fn rewrites_local_addresses_on_the_preview_origin_across_chunks() {
    for (input, path) in [
        ("file:///home/x", "/home/x"),
        ("FILE:////home/x", "/home/x"),
        ("file://LOCALHOST/a", "/a"),
        ("file:/x", "/x"),
        (r"file:/\example.invalid/x", "/example.invalid/x"),
        (r"file:\\\home\x", r"/home\x"),
        (r"file://localhost\x", "/x"),
        (r"file:///\example.invalid", "/example.invalid"),
        (r"FiLe:\\LOCALHOST/\x", "/x"),
        (r"file:/\file:/x", "/file:/x"),
    ] {
        let reply = policy(open(input.as_bytes(), 1))
            .respond(origin_request("/asset.css", &[ORIGIN]))
            .await;
        assert_eq!(reply.status(), StatusCode::OK, "{input}");
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            format!("{ORIGIN}{path}"),
            "{input}"
        );
    }
}

#[tokio::test]
async fn absent_or_refused_origins_keep_root_relative_addresses_and_etags() {
    let policy = policy(open(b"file:///home/x", 2));
    let fallback = policy.respond(request("/asset.svg")).await;
    assert_eq!(fallback.status(), StatusCode::OK);
    let fallback_tag = fallback.headers()[ETAG].clone();
    assert_eq!(
        fallback.into_body().collect().await.unwrap().to_bytes(),
        "/home/x"
    );

    for values in [
        &["http://preview.conductive.page"][..],
        &["https://preview.conductive.page:443"],
        &["https://preview.conductive.page/asset"],
        &["https://preview.conductive.page/"],
        &["https://Preview.conductive.page"],
        &["https://user@preview.conductive.page"],
        &["https://"],
        &["https://my preview.conductive.page"],
        &["https://preview.conductive.page?query=yes"],
        &["https://preview.conductive.page#fragment"],
        &[ORIGIN, ORIGIN],
        &["https://one.conductive.page, https://two.conductive.page"],
    ] {
        let reply = policy.respond(origin_request("/asset.svg", values)).await;
        assert_eq!(reply.status(), StatusCode::OK, "{values:?}");
        assert_eq!(reply.headers()[ETAG], fallback_tag, "{values:?}");
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            "/home/x",
            "{values:?}"
        );
    }
}

#[tokio::test]
async fn changed_etags_vary_by_origin_and_validate_the_matching_reply() {
    for path in ["/file.html", "/asset.css", "/asset.svg"] {
        let policy = policy(open(b"file:///home/x", 0));
        let relative = policy.respond(request(path)).await;
        let preview = policy.respond(origin_request(path, &[ORIGIN])).await;
        let other = policy.respond(origin_request(path, &[OTHER_ORIGIN])).await;
        let tag = preview.headers()[ETAG].clone();
        assert_ne!(relative.headers()[ETAG], tag, "{path}");
        assert_ne!(other.headers()[ETAG], tag, "{path}");

        let mut matching = origin_request(path, &[ORIGIN]);
        matching.headers_mut().insert(IF_NONE_MATCH, tag.clone());
        let cached = policy.respond(matching).await;
        assert_eq!(cached.status(), StatusCode::NOT_MODIFIED, "{path}");
        assert_eq!(cached.headers()[ETAG], tag, "{path}");
        assert_eq!(
            cached.into_body().collect().await.unwrap().to_bytes(),
            "",
            "{path}"
        );

        let mut different = origin_request(path, &[OTHER_ORIGIN]);
        different.headers_mut().insert(IF_NONE_MATCH, tag);
        assert_eq!(
            policy.respond(different).await.status(),
            StatusCode::OK,
            "{path}"
        );
    }
}
