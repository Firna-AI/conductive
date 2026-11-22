//! A missing signature or a signature over different bytes cannot stage a release.

use std::collections::HashMap;
use std::sync::Arc;

use cli_release_interface::ReleaseAssetInfo;
use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::error::Error;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::SystemProcesses;
use cnd_release::files::sha256;
use cnd_release::parts::PartsList;
use cnd_release::signature::manifest_signature_key;
use cnd_release::version::{BINARY, LATEST_KEY, TARGET};

use crate::support::{Server, archive, test_signer};

#[tokio::test]
async fn check_refuses_an_unsigned_or_wrongly_signed_release_before_downloading_the_program()
-> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let program = archive(&[(
        BINARY,
        b"#!/bin/sh\ncase \"$1\" in\n--version) echo 'conductive 0.0.3';;\nupdate) echo '{\"schema_version\":1,\"parts\":[]}';;\nesac\n",
    )])?;
    let manifest = serde_json::to_vec_pretty(&ReleaseAssetInfo {
        binary: BINARY.into(),
        version: "0.0.3".into(),
        target: TARGET.into(),
        asset_name: "program.tar.gz".into(),
        download_url: "https://releases.test/program".into(),
        sha256: Some(sha256(&program)),
    })?;
    let mut different_bytes = manifest.clone();
    different_bytes.push(b'\n');
    let wrong_signature = test_signer()?.sign(&different_bytes)?.to_vec();
    let latest_path = format!("/{LATEST_KEY}");
    let signature_path = format!("/{}", manifest_signature_key(&manifest));

    for (signature, expected) in [(None, "missing"), (Some(wrong_signature), "invalid")] {
        let mut responses = HashMap::from([
            (latest_path.clone(), manifest.clone()),
            ("/program".into(), program.clone()),
        ]);
        if let Some(signature) = signature {
            responses.insert(signature_path.clone(), signature);
        }
        let server = Server::start(responses)?;
        let root = tempfile::tempdir()?;
        let disk = Arc::new(DiskStore::new(root.path().to_path_buf()));
        disk.prepare("0.0.2")?;
        disk.complete("0.0.2", &PartsList::new(vec![])?)?;
        let state = State {
            current: Some("0.0.2".into()),
            ..State::default()
        };
        disk.transition(&state)?;
        let engine = Engine {
            store: disk.clone(),
            client: Arc::new(server.client.clone()),
            installer: Arc::new(TarGzBinaryInstaller::new()),
            processes: Arc::new(SystemProcesses),
        };
        let result = engine.check("0.0.2").await;
        let outcome = match &result {
            Err(Error::MissingSignature) => "missing",
            Err(Error::InvalidSignature) => "invalid",
            _ => "unexpected",
        };
        assert_eq!(outcome, expected, "signature check returned {result:?}");
        assert_eq!(
            *server
                .requests
                .lock()
                .map_err(|_| "request lock poisoned")?,
            [latest_path.clone(), signature_path.clone()]
        );
        assert_eq!(disk.state()?, state);
        assert_eq!(disk.versions()?, ["0.0.2"]);
        assert!(!disk.version_path("0.0.3").exists());
        server.finish()?;
    }
    Ok(())
}
