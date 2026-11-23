//! Font metadata, stylesheet validators, and cache refresh through HTTP policy.

use std::fs::{self, File};
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::symlink;
use std::path::Path;
use std::time::UNIX_EPOCH;

use cnd_runner_interface::file_server::FILES_ORIGIN_HEADER;
use http_body_util::BodyExt;
use hyper::{Method, StatusCode};

use super::font_fixture::{SfntFormat, font, italic_cff_tables, regular, regular_tables, sfnt};
use super::support::{Fixture, STYLESHEET};

async fn stylesheet(h: &Fixture) -> String {
    let reply = h.get(Path::new(STYLESHEET)).await;
    assert_eq!(reply.status(), StatusCode::OK);
    String::from_utf8(reply.into_body().collect().await.unwrap().to_bytes().into()).unwrap()
}

#[tokio::test]
async fn emits_static_italic_and_variable_faces_for_distinct_localized_families() {
    let h = Fixture::new();
    let static_font = h.system.join("regular.ttf");
    fs::write(
        &static_font,
        font(
            &[
                (1, "Preview"),
                (16, "Preview Text"),
                (1, "Preview"),
                (1, "見本"),
            ],
            500,
            4,
            0,
            &[],
        ),
    )
    .unwrap();
    let italic = h.local.join("italic.OTF");
    fs::write(&italic, sfnt(SfntFormat::Cff, italic_cff_tables("Italic"))).unwrap();
    let variable = h.local.join("variable.ttf");
    fs::write(
        &variable,
        font(
            &[(1, "Variable")],
            400,
            5,
            0,
            &[(*b"wght", [100, 400, 900]), (*b"wdth", [75, 100, 125])],
        ),
    )
    .unwrap();
    let sheet = stylesheet(&h).await;
    assert_eq!(sheet.matches("@font-face").count(), 5);
    for (name, descriptors, path) in [
        (
            "Preview",
            "font-weight: 500; font-style: normal; font-stretch: 87.5%;",
            &static_font,
        ),
        (
            "Preview Text",
            "font-weight: 500; font-style: normal; font-stretch: 87.5%;",
            &static_font,
        ),
        (
            "見本",
            "font-weight: 500; font-style: normal; font-stretch: 87.5%;",
            &static_font,
        ),
        (
            "Italic",
            "font-weight: 700; font-style: italic; font-stretch: 100%;",
            &italic,
        ),
        (
            "Variable",
            "font-weight: 100 900; font-style: normal; font-stretch: 75% 125%;",
            &variable,
        ),
    ] {
        assert!(
            sheet.contains(&format!(
                "font-family: \"{name}\"; {descriptors} src: url(\"{}\");",
                path.display()
            )),
            "{sheet}"
        );
    }
}

#[tokio::test]
async fn escapes_names_and_font_urls_and_keeps_only_usable_family_names() {
    let h = Fixture::new();
    let path = h.system.join("face #?%.ttf");
    let long_name = "a".repeat(257);
    let data = font(
        &[(1, "a\"\\\n\u{1f}\u{7f}\0b"), (16, ""), (1, &long_name)],
        400,
        5,
        0,
        &[],
    );
    fs::write(&path, &data).unwrap();
    let encoded = format!("{}/face%20%23%3F%25.ttf", h.system.display());
    let sheet = stylesheet(&h).await;
    assert_eq!(sheet.matches("@font-face").count(), 1);
    assert!(
        sheet.contains(r#"font-family: "a\"\\\a \1f \7f �b";"#),
        "{sheet}"
    );
    assert!(
        sheet.contains(&format!("src: url(\"{encoded}\");")),
        "{sheet}"
    );
    let reply = h.request(Method::GET, &encoded, &[]).await;
    assert_eq!(reply.status(), StatusCode::OK);
    assert_eq!(reply.into_body().collect().await.unwrap().to_bytes(), data);
}

#[tokio::test]
async fn omits_broken_oversized_hidden_and_non_utf8_fonts_and_never_walks_folder_links() {
    let h = Fixture::new();
    fs::write(h.system.join("broken.ttf"), b"malformed").unwrap();
    let mut big = regular_tables("Too large");
    let (_, name) = big.iter_mut().find(|(tag, _)| tag == b"name").unwrap();
    name.resize(256 * 1024 + 1, 0);
    fs::write(h.system.join("big.ttf"), sfnt(SfntFormat::TrueType, big)).unwrap();
    fs::write(h.system.join(".hidden.ttf"), regular("Hidden")).unwrap();
    fs::write(
        h.system.join(std::ffi::OsStr::from_bytes(b"name\xff.ttf")),
        regular("Non-UTF-8"),
    )
    .unwrap();
    fs::write(h.system.join("not-indexed.woff2"), regular("WOFF2")).unwrap();
    let folder = h.system.join("real");
    fs::create_dir(&folder).unwrap();
    fs::write(folder.join("font.ttf"), regular("Included")).unwrap();
    symlink(&folder, h.local.join("alias")).unwrap();
    symlink(folder.join("font.ttf"), h.local.join("alias.ttf")).unwrap();
    let home = h.temp.path().join("home");
    fs::create_dir(&home).unwrap();
    let outside = home.join("private.ttf");
    fs::write(&outside, regular("Outside font")).unwrap();
    symlink(&outside, h.local.join("outside.ttf")).unwrap();
    let sheet = stylesheet(&h).await;
    assert!(!sheet.contains("Outside font"), "{sheet}");
    assert!(!sheet.contains("/outside.ttf"), "{sheet}");
    assert_eq!(sheet.matches("@font-face").count(), 2, "{sheet}");
    assert_eq!(
        sheet.matches("font-family: \"Included\"").count(),
        2,
        "{sheet}"
    );
    assert!(sheet.contains("/real/font.ttf"));
    assert!(sheet.contains("/alias.ttf"));
    assert!(!sheet.contains("/alias/font.ttf"));
}

#[tokio::test]
async fn omits_a_font_with_valid_names_and_a_missing_required_table() {
    let h = Fixture::new();
    let mut font = regular_tables("Missing post");
    font.retain(|(tag, _)| tag != b"post");
    fs::write(
        h.system.join("missing.ttf"),
        sfnt(SfntFormat::TrueType, font),
    )
    .unwrap();
    let mut no_glyphs = italic_cff_tables("Missing glyphs");
    no_glyphs.retain(|(tag, _)| tag != b"CFF ");
    fs::write(
        h.system.join("no-glyphs.otf"),
        sfnt(SfntFormat::Cff, no_glyphs),
    )
    .unwrap();
    assert_eq!(stylesheet(&h).await, "");
}

#[tokio::test]
async fn omits_fonts_when_hmtx_or_loca_cannot_hold_the_declared_records() {
    let h = Fixture::new();
    for (tag, family, filename) in [
        (b"hmtx", "Short metrics", "metrics.ttf"),
        (b"loca", "Short offsets", "offsets.ttf"),
    ] {
        let mut font = regular_tables(family);
        let (_, data) = font.iter_mut().find(|(table, _)| table == tag).unwrap();
        data.pop().unwrap();
        fs::write(h.system.join(filename), sfnt(SfntFormat::TrueType, font)).unwrap();
    }
    assert_eq!(stylesheet(&h).await, "");
}

#[tokio::test]
async fn validates_the_stylesheet_body_and_lets_a_repository_stylesheet_win() {
    let h = Fixture::new();
    fs::write(h.system.join("font.ttf"), regular("Preview")).unwrap();
    let get = h
        .request(
            Method::GET,
            STYLESHEET,
            &[
                ("Range", "bytes=0-2"),
                ("If-Modified-Since", "Thu, 01 Jan 2099 00:00:00 GMT"),
            ],
        )
        .await;
    assert_eq!(get.status(), StatusCode::OK);
    assert_eq!(get.headers()["content-type"], "text/css; charset=utf-8");
    assert_eq!(get.headers()["cache-control"], "no-cache");
    assert_eq!(get.headers()["accept-ranges"], "none");
    assert!(!get.headers().contains_key("content-range"));
    let etag = get.headers()["etag"].to_str().unwrap().to_owned();
    let head = h.request(Method::HEAD, STYLESHEET, &[]).await;
    assert_eq!(head.status(), StatusCode::OK);
    assert_eq!(head.headers(), get.headers());
    assert_eq!(head.into_body().collect().await.unwrap().to_bytes(), "");
    let matching = h
        .request(
            Method::GET,
            STYLESHEET,
            &[
                ("If-None-Match", &etag),
                (FILES_ORIGIN_HEADER, "https://preview.conductive.page"),
            ],
        )
        .await;
    assert_eq!(matching.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(matching.headers()["etag"], etag);
    assert_eq!(matching.into_body().collect().await.unwrap().to_bytes(), "");
    assert!(
        get.into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .starts_with(b"@font-face")
    );

    let repository_file = h.repository.join(STYLESHEET.trim_start_matches('/'));
    fs::create_dir_all(repository_file.parent().unwrap()).unwrap();
    fs::write(repository_file, b"body { color: green; }").unwrap();
    assert_eq!(stylesheet(&h).await, "body { color: green; }");
}

#[tokio::test]
async fn refreshes_on_install_same_mtime_replacement_and_removal() {
    let h = Fixture::new();
    assert_eq!(stylesheet(&h).await, "");
    let font = h.system.join("font.ttf");
    let staged = h.system.join(".staged.ttf");
    for (path, family) in [(&font, "First face"), (&staged, "Other face")] {
        fs::write(path, regular(family)).unwrap();
        File::options()
            .write(true)
            .open(path)
            .unwrap()
            .set_modified(UNIX_EPOCH)
            .unwrap();
    }
    let first = h.get(Path::new(STYLESHEET)).await;
    let tag = first.headers()["etag"].to_str().unwrap().to_owned();
    let contents = first.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&contents).contains("First face"));

    fs::rename(staged, &font).unwrap();
    let next = h
        .request(Method::GET, STYLESHEET, &[("If-None-Match", &tag)])
        .await;
    assert_eq!(next.status(), StatusCode::OK);
    assert_ne!(next.headers()["etag"], tag);
    let contents = next.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&contents).contains("Other face"));
    fs::remove_file(font).unwrap();
    assert_eq!(stylesheet(&h).await, "");
}
