//! Signed base archives stream to disk, verify the loaded ID, and share imports.

use std::fs;
use std::os::unix::process::ExitStatusExt;
use std::path::Path;
use std::process::ExitStatus;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use cnd_computer::engine::podman::Podman;
use cnd_computer::error::{Error, Result};
use cnd_computer::process::{Invocation, Output, Process};
use cnd_computer::releases::base::BaseImageLoader;
use cnd_computer::releases::http::HttpReleases;
use cnd_computer::releases::journal::LoadJournal;
use cnd_computer::releases::ports::{BaseImages, ImageJournal, Releases};

use super::fixtures::{VERSION, base, serve, signer};

const TAG: &str = "localhost/conductive/base:0.0.42";

#[tokio::test]
async fn invalid_base_signatures_wrong_digests_and_sizes_leave_no_download() {
    let signer = signer();
    for failure in ["missing", "wrong signature", "wrong digest", "wrong size"] {
        let cache = tempfile::tempdir().unwrap();
        let mut base = base(&signer);
        let count = match failure {
            "missing" => {
                base.files.remove(&base.signature_key);
                2
            }
            "wrong signature" => {
                base.files.insert(base.signature_key, (200, vec![0; 64]));
                2
            }
            "wrong digest" => {
                base.files
                    .insert(base.archive_key, (200, vec![0x55; base.archive.len()]));
                3
            }
            _ => {
                base.files.insert(base.archive_key, (200, vec![1; 16]));
                3
            }
        };
        let (server, wire) = serve(base.files, count).await;
        let source = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
        let result = source.base(&server.parse().unwrap(), &base.identity).await;
        assert!(matches!(result, Err(Error::ReleaseInvalid)), "{failure}");
        assert_eq!(fs::read_dir(cache.path()).unwrap().count(), 0);
        assert_eq!(wire.await.unwrap().len(), count);
    }
}

struct EngineCalls {
    commands: Mutex<Vec<String>>,
    archive: Vec<u8>,
    image_id: String,
}

#[async_trait]
impl Process for EngineCalls {
    async fn run(&self, invocation: Invocation) -> Result<Output> {
        let [first, second, ..] = invocation.args.as_slice() else {
            return Err(Error::ProcessFailed);
        };
        let command = format!("{} {}", first.to_string_lossy(), second.to_string_lossy());
        self.commands.lock().unwrap().push(command.clone());
        let (status, stdout) = match command.as_str() {
            "image exists" => (1, String::new()),
            "load --input" => {
                assert_eq!(fs::read(&invocation.args[2]).unwrap(), self.archive);
                (0, format!("Loaded image: {TAG}\n"))
            }
            "image inspect" => (0, self.image_id.clone()),
            _ => (0, String::new()),
        };
        Ok(Output {
            status: ExitStatus::from_raw(status << 8),
            stdout: stdout.into_bytes(),
            stderr: Vec::new(),
        })
    }
}

fn folder_entries(path: &Path) -> Vec<String> {
    fs::read_dir(path)
        .unwrap()
        .map(|item| item.unwrap().file_name().into_string().unwrap())
        .collect()
}

#[tokio::test]
async fn concurrent_requests_share_one_verified_base_import() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let base = base(&signer);
    let (server, wire) = serve(base.files, 3).await;
    let server = server.parse().unwrap();
    let source = Arc::new(HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap());
    let process = Arc::new(EngineCalls {
        commands: Mutex::default(),
        archive: base.archive,
        image_id: base.id,
    });
    let journal = Arc::new(LoadJournal {
        path: cache.path().join("base-loads"),
    });
    let loader = BaseImageLoader::new(
        Arc::new(Podman::new(process.clone())),
        source,
        journal.clone(),
    );
    let (first, second) = tokio::join!(
        loader.ensure(&server, &base.identity),
        loader.ensure(&server, &base.identity)
    );
    assert_eq!(first.ok().as_deref(), Some(TAG));
    assert_eq!(second.ok().as_deref(), Some(TAG));
    assert_eq!(
        *process.commands.lock().unwrap(),
        [
            "image exists",
            "load --input",
            "image inspect",
            &format!("tag {TAG}")
        ]
    );
    assert!(!journal.incomplete(VERSION).unwrap());
    assert_eq!(folder_entries(cache.path()), ["base-loads"]);
    assert_eq!(wire.await.unwrap().len(), 3);
}

#[tokio::test]
async fn mismatching_loaded_id_leaves_an_incomplete_import_for_the_next_request() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let base = base(&signer);
    let (server, wire) = serve(base.files, 3).await;
    let server = server.parse().unwrap();
    let source = Arc::new(HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap());
    let process = Arc::new(EngineCalls {
        commands: Mutex::default(),
        archive: base.archive,
        image_id: "c".repeat(64),
    });
    let journal = Arc::new(LoadJournal {
        path: cache.path().join("base-loads"),
    });
    let loader = BaseImageLoader::new(
        Arc::new(Podman::new(process.clone())),
        source,
        journal.clone(),
    );
    let result = loader.ensure(&server, &base.identity).await;
    assert!(matches!(result, Err(Error::ReleaseInvalid)), "{result:?}");
    assert_eq!(
        *process.commands.lock().unwrap(),
        ["image exists", "load --input", "image inspect"]
    );
    assert!(journal.incomplete(VERSION).unwrap());
    assert_eq!(folder_entries(cache.path()), ["base-loads"]);
    assert_eq!(wire.await.unwrap().len(), 3);
}
