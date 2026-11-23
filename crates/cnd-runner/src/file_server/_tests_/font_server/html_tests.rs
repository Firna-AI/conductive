//! Link placement and validators for HTML backed by real font folders.

use std::fs;
use std::path::Path;

use http_body_util::BodyExt;
use hyper::{Method, StatusCode};

use super::font_fixture::regular;
use super::support::{Fixture, STYLESHEET};

fn stylesheet_link() -> String {
    format!("<link rel=\"stylesheet\" href=\"{STYLESHEET}\">")
}

#[tokio::test]
async fn places_the_stylesheet_after_doctypes_or_at_the_start_after_the_bom() {
    let h = Fixture::new();
    fs::write(h.system.join("font.ttf"), regular("Preview")).unwrap();
    let link = stylesheet_link();
    for (before, after) in [
        ("<!doctype html>", "<p>page"),
        ("<!DOCTYPE html>", "<p>page"),
        ("\u{feff}\n\t\x0c <!doctype html>", "<head><style></style>"),
        ("<?xml version='1.0'?>\n<!doctype html>", "<p>page"),
        ("<!--><!---><!-- end --!><!doctype html>", "<p>page"),
        ("<!bogus></?bad><!doctype html>", "<p>page"),
        ("\u{feff}", "\n<!-- a comment --><p>fragment"),
        ("", "text fragment"),
    ] {
        fs::write(h.repository.join("page.html"), format!("{before}{after}")).unwrap();
        let reply = h.get(Path::new("/page.html")).await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            format!("{before}{link}{after}"),
            "{before}{after}"
        );
    }
}

#[tokio::test]
async fn skips_long_or_unclassifiable_prefixes_and_keeps_all_utf16_bytes() {
    let h = Fixture::new();
    fs::write(h.system.join("font.ttf"), regular("Preview")).unwrap();
    let long = format!("{}<!doctype html><p>file:///a", "<!-- skip -->".repeat(650));
    let long_rewritten = format!("{}<!doctype html><p>/a", "<!-- skip -->".repeat(650));
    let incomplete = b"<!-- incomplete file:///a";
    let utf16_le = b"\xff\xfefile:///ab \0";
    let utf16_be = b"\xfe\xfffile:///ab\0 ";
    for (input, expected) in [
        (long.as_bytes(), long_rewritten.as_bytes()),
        (incomplete.as_slice(), b"<!-- incomplete /a".as_slice()),
        (utf16_le.as_slice(), utf16_le.as_slice()),
        (utf16_be.as_slice(), utf16_be.as_slice()),
    ] {
        fs::write(h.repository.join("page.html"), input).unwrap();
        let reply = h.get(Path::new("/page.html")).await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            expected
        );
    }
}

#[tokio::test]
async fn changes_the_html_etag_when_the_first_font_adds_the_link() {
    let h = Fixture::new();
    let html = b"<!doctype html><p>page";
    fs::write(h.repository.join("page.html"), html).unwrap();
    let first = h.get(Path::new("/page.html")).await;
    assert_eq!(first.status(), StatusCode::OK);
    let tag = first.headers()["etag"].to_str().unwrap().to_owned();
    assert_eq!(
        first.into_body().collect().await.unwrap().to_bytes(),
        html.as_slice()
    );

    let font = h.system.join("font.ttf");
    fs::write(&font, regular("Preview")).unwrap();
    let changed = h
        .request(Method::GET, "/page.html", &[("If-None-Match", &tag)])
        .await;
    assert_eq!(changed.status(), StatusCode::OK);
    let changed_tag = changed.headers()["etag"].to_str().unwrap().to_owned();
    assert_ne!(changed_tag, tag);
    assert_eq!(
        changed.into_body().collect().await.unwrap().to_bytes(),
        format!("<!doctype html>{}<p>page", stylesheet_link())
    );

    fs::write(&font, regular("New font with different metadata")).unwrap();
    let same = h
        .request(
            Method::HEAD,
            "/page.html",
            &[("If-None-Match", &changed_tag)],
        )
        .await;
    assert_eq!(same.status(), StatusCode::NOT_MODIFIED);
    fs::remove_file(font).unwrap();
    let no_fonts = h
        .request(
            Method::HEAD,
            "/page.html",
            &[("If-None-Match", &changed_tag)],
        )
        .await;
    assert_eq!(no_fonts.status(), StatusCode::OK);
    assert_eq!(no_fonts.headers()["etag"], tag);
}
