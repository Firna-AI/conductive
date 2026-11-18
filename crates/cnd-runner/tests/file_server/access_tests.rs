//! Methods, private request headers, and repository path containment.

use std::fs;
use std::os::unix::fs::symlink;

use rustix::fs::{CWD, Mode, mkfifoat};

use super::support::Fixture;

#[tokio::test]
async fn requires_private_host_mark_and_read_methods_and_refuses_upgrades() {
    let h = Fixture::new().await;
    h.write("page.html", b"page");
    for method in [
        "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "CONNECT", "TRACE",
    ] {
        let response = h.marked(method, "/page.html", &[]).await;
        assert_eq!(response.status, 405, "{method}");
        assert_eq!(response.headers["allow"], "GET, HEAD");
    }
    for headers in [
        vec![("Host", "attacker.test:7683"), ("X-Conductive-Files", "1")],
        vec![("Host", "localhost"), ("X-Conductive-Files", "1")],
        vec![("Host", "localhost:7683")],
        vec![("Host", "localhost:7683"), ("X-Conductive-Files", "0")],
        vec![("Host", "localhost:7683"), ("X-Conductive-Files", "1, 1")],
        vec![("X-Conductive-Files", "1")],
    ] {
        assert_eq!(
            h.request("GET", "/page.html", &headers).await.status,
            403,
            "{headers:?}"
        );
    }
    assert_eq!(
        h.marked("GET", "/page.html", &[("Upgrade", "websocket")])
            .await
            .status,
        400
    );
    let response = h
        .request(
            "GET",
            "/page.html",
            &[("Host", "127.0.0.1:7683"), ("X-Conductive-Files", "1")],
        )
        .await;
    assert_eq!((response.status, response.body), (200, b"page".to_vec()));
    h.finish().await;
}

#[tokio::test]
async fn rejects_unsafe_paths_dot_files_and_escaping_or_hidden_link_targets() {
    let h = Fixture::new().await;
    let outside = tempfile::tempdir().unwrap();
    fs::write(outside.path().join("private.txt"), b"secret").unwrap();
    h.write(".env", b"secret");
    h.write(".git/config", b"secret");
    h.write(".context/report.html", b"report");
    h.write("space + % café.html", b"encoded");
    mkfifoat(
        CWD,
        h.directory.path().join("pipe"),
        Mode::RUSR | Mode::WUSR,
    )
    .unwrap();
    symlink(outside.path(), h.directory.path().join("escape")).unwrap();
    symlink(".env", h.directory.path().join("config.txt")).unwrap();
    symlink(".git", h.directory.path().join("metadata")).unwrap();
    symlink(
        ".context/report.html",
        h.directory.path().join("report.html"),
    )
    .unwrap();
    for path in [
        "/.env",
        "/config.txt",
        "/.git/config",
        "/metadata/config",
        "/escape/private.txt",
        "/%2e%2e/private.txt",
        "/%2E/page.html",
        "/%2Fetc/passwd",
        "/%00",
        "/%ff",
        "/%",
        "/%2",
        "/%gg",
        "/.git%2fconfig",
        "/a//b",
        "//",
        "/.git/../page.html",
        "/missing.txt",
        "/pipe",
    ] {
        assert_eq!(h.get(path).await.status, 404, "{path}");
    }
    for (path, expected) in [
        ("/.context/report.html", "report"),
        ("/report.html", "report"),
        (
            "/space%20%2B%20%25%20caf%C3%A9.html?query=ignored",
            "encoded",
        ),
    ] {
        let response = h.get(path).await;
        assert_eq!(
            (response.status, response.body),
            (200, expected.as_bytes().to_vec()),
            "{path}"
        );
    }
    h.finish().await;
}

#[tokio::test]
async fn serves_indexes_redirects_directories_and_never_lists_them() {
    let h = Fixture::new().await;
    h.write("index.html", b"root");
    h.write("folder name/index.html", b"nested");
    h.write("\\evil.example/index.html", b"local");
    h.write("empty/readme.txt", b"no index");
    assert_eq!(h.get("//").await.status, 404);
    for (path, expected) in [("/", "root"), ("/folder%20name/", "nested")] {
        let response = h.get(path).await;
        assert_eq!(
            (response.status, response.body),
            (200, expected.as_bytes().to_vec())
        );
    }
    let redirect = h.get("/folder%20name?query=%2F").await;
    assert_eq!(redirect.status, 302);
    assert_eq!(redirect.headers["location"], "/folder%20name/?query=%2F");
    let backslash = h.get("/\\evil.example").await;
    assert_eq!(backslash.status, 302);
    assert_eq!(backslash.headers["location"], "/%5Cevil.example/");
    assert_eq!(h.get("/empty/").await.status, 404);
    assert_eq!(h.get("/empty").await.status, 404);
    assert_eq!(h.get("/index.html/").await.status, 404);
    h.finish().await;
}
