//! Link placement and validators for HTML backed by real font folders.

use std::fs;
use std::path::Path;

use cnd_runner_interface::file_server::FILES_ORIGIN_HEADER;
use http_body_util::BodyExt;
use hyper::{Method, StatusCode};

use super::font_fixture::regular;
use super::support::{Fixture, STYLESHEET};

fn stylesheet_link() -> String {
    format!("<link rel=\"stylesheet\" href=\"{STYLESHEET}\">")
}

#[tokio::test]
async fn puts_the_font_link_and_local_file_address_on_the_preview_origin() {
    let h = Fixture::new();
    fs::write(h.system.join("font.ttf"), regular("Preview")).unwrap();
    let asset = h.repository.join("asset.png");
    let asset = asset.display();
    let page = format!(
        r#"<!doctype html><base href="https://cdn.example.invalid/"><img src="file://{asset}">"#
    );
    fs::write(h.repository.join("page.html"), &page).unwrap();
    let origin = "https://0123456789abcdef0123456789abcdef.conductive.page";
    let reply = h
        .request(
            Method::GET,
            "/page.html",
            &[("X-Conductive-Files-Origin", origin)],
        )
        .await;
    assert_eq!(reply.status(), StatusCode::OK);
    assert_eq!(
        reply.into_body().collect().await.unwrap().to_bytes(),
        format!(
            r#"<!doctype html><link rel="stylesheet" href="{origin}{STYLESHEET}"><base href="https://cdn.example.invalid/"><img src="{origin}{asset}">"#
        )
    );

    let fallback = h.get(Path::new("/page.html")).await;
    assert_eq!(fallback.status(), StatusCode::OK);
    assert_eq!(
        fallback.into_body().collect().await.unwrap().to_bytes(),
        page.replacen(
            "<!doctype html>",
            &format!("<!doctype html>{}", stylesheet_link()),
            1,
        )
    );
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
    let origin = "https://preview.conductive.page";
    let asset = h.repository.join("a").display().to_string();
    let prefix = format!("{}<!doctype html><p>", "<!-- skip -->".repeat(650));
    let long = format!("{prefix}file://{asset}");
    let long_rewritten = format!("{prefix}{origin}{asset}");
    let incomplete = format!("<!-- incomplete file://{asset}");
    let incomplete_rewritten = format!("<!-- incomplete {origin}{asset}");
    let address = format!("file://{asset}");
    let utf16_le = [b"\xff\xfe", address.as_bytes()].concat();
    let utf16_be = [b"\xfe\xff", address.as_bytes()].concat();
    for (input, expected) in [
        (long.as_bytes(), long_rewritten.as_bytes()),
        (incomplete.as_bytes(), incomplete_rewritten.as_bytes()),
        (utf16_le.as_slice(), utf16_le.as_slice()),
        (utf16_be.as_slice(), utf16_be.as_slice()),
    ] {
        fs::write(h.repository.join("page.html"), input).unwrap();
        let reply = h
            .request(Method::GET, "/page.html", &[(FILES_ORIGIN_HEADER, origin)])
            .await;
        assert_eq!(reply.status(), StatusCode::OK);
        assert_eq!(
            reply.into_body().collect().await.unwrap().to_bytes(),
            expected
        );
    }
}

#[tokio::test]
async fn the_first_font_changes_the_html_etag_and_keeps_css_and_svg_etags() {
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
    let mut assets = Vec::new();
    for (path, body) in [
        ("/asset.css", "p { color: blue; }"),
        ("/asset.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"/>"),
    ] {
        fs::write(h.repository.join(path.trim_start_matches('/')), body).unwrap();
        let reply = h.get(Path::new(path)).await;
        assert_eq!(reply.status(), StatusCode::OK, "{path}");
        assets.push((path, reply.headers()["etag"].to_str().unwrap().to_owned()));
    }

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
    for (path, asset_tag) in assets {
        let cached = h
            .request(Method::GET, path, &[("If-None-Match", &asset_tag)])
            .await;
        assert_eq!(cached.status(), StatusCode::NOT_MODIFIED, "{path}");
        assert_eq!(cached.headers()["etag"], asset_tag, "{path}");
    }

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
