//! Font fallback, case-insensitive extensions, and literal path containment.

use std::fs;
use std::os::unix::fs::symlink;
use std::path::Path;

use http_body_util::BodyExt;
use hyper::StatusCode;

use super::support::Fixture;

#[tokio::test]
async fn serves_regular_fonts_by_extension_and_checks_links_across_font_folders() {
    let h = Fixture::new();
    let regular = h.system.join("font.ttf");
    let uppercase = h.local.join("font.WOFF2");
    let linked = h.system.join("alias.woff2");
    fs::write(&regular, b"regular").unwrap();
    fs::write(&uppercase, b"uppercase").unwrap();
    symlink(&uppercase, &linked).unwrap();

    for (path, media, contents) in [
        (regular, "font/ttf", "regular"),
        (uppercase, "font/woff2", "uppercase"),
        (linked, "font/woff2", "uppercase"),
    ] {
        let response = h.get(&path).await;
        assert_eq!(response.status(), StatusCode::OK, "{path:?}");
        assert_eq!(response.headers()["content-type"], media);
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            contents
        );
    }
}

#[tokio::test]
async fn leaves_an_absolute_path_to_the_repository_when_it_has_a_file() {
    let h = Fixture::new();
    let system = h.system.join("font.otf");
    fs::write(&system, b"system").unwrap();
    let repository = h.repository.join(system.strip_prefix("/").unwrap());
    fs::create_dir_all(repository.parent().unwrap()).unwrap();
    fs::write(repository, b"repository").unwrap();
    let response = h.get(&system).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        "repository"
    );
}

#[tokio::test]
async fn refuses_dot_segments_other_extensions_and_fonts_reached_through_links_outside() {
    let h = Fixture::new();
    let home = h.temp.path().join("home");
    fs::create_dir(&home).unwrap();
    fs::write(home.join("private.ttf"), b"outside").unwrap();
    let escape = h.system.join("escape.ttf");
    symlink(home.join("private.ttf"), &escape).unwrap();
    let neighboring = h.system.with_file_name("system2");
    fs::create_dir(&neighboring).unwrap();
    fs::write(neighboring.join("neighbor.ttf"), b"neighbor").unwrap();
    let linked_neighbor = h.system.join("neighbor.ttf");
    symlink(neighboring.join("neighbor.ttf"), &linked_neighbor).unwrap();

    let dot_folder = h.system.join(".hidden");
    fs::create_dir(&dot_folder).unwrap();
    let dot_font = dot_folder.join("font.ttf");
    fs::write(&dot_font, b"hidden").unwrap();
    let linked_dot_font = h.system.join("hidden.ttf");
    symlink(&dot_font, &linked_dot_font).unwrap();
    let other_extension = h.system.join("font.ttc");
    fs::write(&other_extension, b"other").unwrap();
    let directory = h.system.join("directory.ttf");
    fs::create_dir(&directory).unwrap();

    fs::remove_dir(&h.local).unwrap();
    symlink(&home, &h.local).unwrap();
    for path in [
        escape,
        linked_neighbor,
        h.local.join("private.ttf"),
        dot_font,
        linked_dot_font,
        other_extension,
        directory,
    ] {
        assert_eq!(
            h.get(Path::new(&path)).await.status(),
            StatusCode::NOT_FOUND,
            "{path:?}"
        );
    }
}
