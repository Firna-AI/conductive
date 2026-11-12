//! Check and apply against real files, subprocesses, archives, and local HTTP.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use std::collections::HashMap;
use std::fs;
use std::sync::Arc;

use cli_release_interface::ReleaseAssetInfo;
use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::SystemProcesses;
use cnd_release::files::sha256;
use cnd_release::parts::{Part, PartsList};

mod support;
use support::{Server, archive};

#[tokio::test]
async fn check_then_apply_preserves_running_files_and_supports_fallback() {
    let root = tempfile::tempdir().unwrap();
    let mut responses = HashMap::new();
    let mut parts = Vec::new();
    for (name, file, bytes) in [
        ("runner", "runner/main.mjs", b"runner bytes".to_vec()),
        (
            "node",
            "node-v24-linux-x64/bin/node",
            b"node bytes".to_vec(),
        ),
        (
            "system",
            "install-system.sh",
            format!(
                "#!/bin/sh\ntouch '{}'\n",
                root.path().join("installed").display()
            )
            .into_bytes(),
        ),
    ] {
        let bytes = archive(&[(file, &bytes)]);
        parts.push(Part {
            name: name.into(),
            url: format!("https://releases.test/{name}"),
            sha256: sha256(&bytes),
        });
        responses.insert(format!("/{name}"), bytes);
    }
    let parts = PartsList::new(parts).unwrap();
    let executable = format!(
        "#!/bin/sh\ncase \"$1\" in\n--version) echo 'conductive 0.0.3';;\nupdate) cat <<'PARTS'\n{}\nPARTS\n;;\nesac\n",
        serde_json::to_string(&parts).unwrap()
    );
    let program = archive(&[("conductive", executable.as_bytes())]);
    let metadata = ReleaseAssetInfo {
        binary: "conductive".into(),
        version: "0.0.3".into(),
        target: "x86_64-unknown-linux-musl".into(),
        asset_name: "program.tar.gz".into(),
        download_url: "https://releases.test/program".into(),
        sha256: Some(sha256(&program)),
    };
    responses.insert(
        "/releases/latest/conductive/x86_64-unknown-linux-musl".into(),
        serde_json::to_vec(&metadata).unwrap(),
    );
    responses.insert("/program".into(), program);
    let server = Server::start(responses, 5);
    let disk = Arc::new(DiskStore::new(root.path().to_path_buf()));
    let engine = Engine {
        store: disk.clone(),
        client: Arc::new(server.client.clone()),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    let engine: &dyn UpdateEngine = &engine;
    engine.check("0.0.1").await.unwrap();
    assert_eq!(disk.versions().unwrap(), vec!["0.0.3"]);
    assert_eq!(disk.state().unwrap(), State::default());
    assert!(!root.path().join("installed").exists());
    assert_eq!(
        fs::read(disk.version_path("0.0.3").join("node/bin/node")).unwrap(),
        b"node bytes"
    );
    disk.prepare("0.0.9").unwrap();
    disk.prepare("0.0.1").unwrap();
    disk.complete("0.0.1", &parts).unwrap();
    disk.transition(&State {
        current: Some("0.0.1".into()),
        ..State::default()
    })
    .unwrap();
    let original = fs::read(disk.version_path("0.0.1").join("conductive")).unwrap();
    {
        let _download = disk.lock().unwrap().unwrap();
        assert!(disk.lock().unwrap().is_none());
        engine.apply().unwrap();
        assert_eq!(
            disk.state().unwrap(),
            State {
                current: Some("0.0.3".into()),
                previous: Some("0.0.1".into()),
                pending: Some("0.0.3".into()),
            }
        );
        assert!(root.path().join("installed").exists());
        assert_eq!(
            fs::read(disk.version_path("0.0.1").join("conductive")).unwrap(),
            original
        );
        engine.started().unwrap();
        assert_eq!(disk.state().unwrap().pending, None);
    }
    fs::create_dir_all(disk.version_path("incomplete")).unwrap();
    engine.started().unwrap();
    assert!(!disk.version_path("incomplete").exists());
    assert_eq!(disk.versions().unwrap().len(), 2);
    disk.transition(&State {
        current: Some("0.0.3".into()),
        previous: Some("0.0.1".into()),
        pending: Some("0.0.3".into()),
    })
    .unwrap();
    engine.apply().unwrap();
    assert_eq!(
        disk.state().unwrap(),
        State {
            current: Some("0.0.1".into()),
            previous: None,
            pending: None
        }
    );
    assert_eq!(disk.versions().unwrap(), vec!["0.0.1"]);
    assert_eq!(server.requests.lock().unwrap().len(), 5);
    server.finish();
}
