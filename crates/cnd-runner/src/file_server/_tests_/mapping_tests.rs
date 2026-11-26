//! Repository path mapping after the direct lookup.

#![allow(clippy::unwrap_used)]

use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use http_body_util::BodyExt;
use hyper::StatusCode;
use hyper::header::ETAG;
use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::file_server::files::{Entry, FileContent, FilesMock};
use crate::repository::error::Error;

use super::origin_tests::{ORIGIN, origin_request};
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
async fn maps_and_rewrites_with_one_repository_snapshot_and_varies_the_etag() {
    const ADDRESSES: &[u8] =
        b"file:///home/user/code/ciproxy/a.png file:///home/user/code/replacement/a.png";
    let replacement = "/home/user/code/replacement";
    let (move_root, root) = watch::channel(PathBuf::from(REPOSITORY));
    let files = Unimock::new((
        FilesMock::root
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| root.borrow().clone())),
        FilesMock::open
            .each_call(matching!(_, _))
            .answers_arc(Arc::new(move |_, root, path| match path {
                "home/user/code/ciproxy/report.svg" if root == Path::new(REPOSITORY) => {
                    move_root.send_replace(PathBuf::from(replacement));
                    Err(Error::NotFound)
                }
                "report.svg" if root == Path::new(REPOSITORY) => Ok(file(ADDRESSES)),
                "after.svg" if root == Path::new(replacement) => Ok(file(ADDRESSES)),
                _ => Err(Error::NotFound),
            })),
    ));
    let policy = FilePolicy {
        files: Arc::new(files),
    };
    let old = "/home/user/code/ciproxy/report.svg";
    let new = "/home/user/code/replacement/after.svg";
    let before = policy.respond(origin_request(old, &[ORIGIN])).await;
    assert_eq!(before.status(), StatusCode::OK);
    let old_tag = before.headers()[ETAG].clone();
    assert_eq!(
        before.into_body().collect().await.unwrap().to_bytes(),
        format!("{ORIGIN}/home/user/code/ciproxy/a.png file:///home/user/code/replacement/a.png")
    );
    assert_eq!(
        policy.respond(request(old)).await.status(),
        StatusCode::NOT_FOUND
    );
    let after = policy.respond(origin_request(new, &[ORIGIN])).await;
    assert_eq!(after.status(), StatusCode::OK);
    assert_ne!(after.headers()[ETAG], old_tag);
    assert_eq!(
        after.into_body().collect().await.unwrap().to_bytes(),
        format!("file:///home/user/code/ciproxy/a.png {ORIGIN}/home/user/code/replacement/a.png")
    );
}
