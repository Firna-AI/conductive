//! Repository path mapping after the direct lookup.

#![allow(clippy::unwrap_used)]

use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use http_body_util::BodyExt;
use hyper::StatusCode;
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::file_server::files::{Entry, FileContent, FilesMock};
use crate::repository::error::Error;

use super::policy_tests::{REPOSITORY, policy, request};
use super::{FilePolicy, FileRequests};

fn file(bytes: &'static [u8]) -> Entry {
    Entry::File(FileContent {
        size: bytes.len() as u64,
        modified: UNIX_EPOCH,
        etag: "\"version\"".into(),
        reader: Box::new(Cursor::new(bytes)),
    })
}

#[tokio::test]
async fn maps_absolute_paths_after_missing_or_refused_repository_paths() {
    let policy = policy(FilesMock::open.each_call(matching!(_, _)).answers(
        &|_, _, path| match path {
            ".context/font.woff2" => Ok(file(b"font")),
            "home/user/code/ciproxy/blocked.txt" => Err(Error::Unavailable),
            "blocked.txt" => Ok(file(b"mapped after refusal")),
            "home/user/code/ciproxy/override.txt" => Ok(file(b"direct")),
            "override.txt" => Ok(file(b"mapped")),
            _ => Err(Error::NotFound),
        },
    ));
    for (path, expected) in [
        ("/home/user/code/ciproxy/.context/font.woff2", "font"),
        (
            "/home/user/code/ciproxy/blocked.txt",
            "mapped after refusal",
        ),
        ("/home/user/code/ciproxy/override.txt", "direct"),
    ] {
        let reply = policy.respond(request(path)).await;
        let status = reply.status();
        let body = reply.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(
            (status, body.as_ref()),
            (StatusCode::OK, expected.as_bytes()),
            "{path}"
        );
    }
}

#[tokio::test]
async fn uses_whole_segments_and_applies_file_checks_to_mapped_paths() {
    let policy = policy(FilesMock::open.each_call(matching!(_, _)).answers(
        &|_, _, path| match path {
            "2/file.txt" => Ok(file(b"wrong prefix")),
            ".env" => Err(Error::Unavailable),
            "folder name" => Ok(Entry::Directory),
            "folder name/index.html" => Ok(file(b"index")),
            _ => Err(Error::NotFound),
        },
    ));
    for path in [
        "/home/user/code/ciproxy2/file.txt",
        "/home/user/code/ciproxy/.env",
    ] {
        assert_eq!(
            policy.respond(request(path)).await.status(),
            StatusCode::NOT_FOUND,
            "{path}"
        );
    }
    let reply = policy
        .respond(request("/home/user/code/ciproxy/folder%20name?q=here"))
        .await;
    assert_eq!(reply.status(), StatusCode::FOUND);
    assert_eq!(
        reply.headers()["location"],
        "/home/user/code/ciproxy/folder%20name/?q=here"
    );
}

#[tokio::test]
async fn maps_with_one_repository_snapshot_even_when_the_folder_moves() {
    let replacement = "/home/user/code/replacement";
    let (move_root, root) = watch::channel(PathBuf::from(REPOSITORY));
    let files = Unimock::new((
        FilesMock::root
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| root.borrow().clone())),
        FilesMock::open
            .each_call(matching!(_, _))
            .answers_arc(Arc::new(move |_, root, path| match path {
                "home/user/code/ciproxy/report.txt" if root == Path::new(REPOSITORY) => {
                    move_root.send_replace(PathBuf::from(replacement));
                    Err(Error::NotFound)
                }
                "report.txt" if root == Path::new(REPOSITORY) => Ok(file(b"before the move")),
                "report.txt" if root == Path::new(replacement) => Ok(file(b"after the move")),
                _ => Err(Error::NotFound),
            })),
    ));
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let old = "/home/user/code/ciproxy/report.txt";
    let new = "/home/user/code/replacement/report.txt";
    let before = policy.respond(request(old)).await;
    assert_eq!(before.status(), StatusCode::OK);
    assert_eq!(
        before.into_body().collect().await.unwrap().to_bytes(),
        "before the move"
    );
    assert_eq!(
        policy.respond(request(old)).await.status(),
        StatusCode::NOT_FOUND
    );
    let after = policy.respond(request(new)).await;
    assert_eq!(after.status(), StatusCode::OK);
    assert_eq!(
        after.into_body().collect().await.unwrap().to_bytes(),
        "after the move"
    );
}
