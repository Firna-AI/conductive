//! Complete, rejected, pending, and development releases, and releases that lack a part, use the real store reader.

use std::fs;
use std::sync::Arc;

use cnd_cli::runner_update::releases::RunnerReleases;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::ports::{State, Store};
use cnd_release::parts::{Part, PartsList};
use cnd_runner::update::{ReleaseReadiness, ReleaseStatus};
use tempfile::tempdir;

#[test]
fn only_a_complete_non_rejected_newer_release_with_its_parts_is_ready()
-> Result<(), Box<dyn std::error::Error>> {
    let root = tempdir()?;
    let store = Arc::new(DiskStore::new(root.path().into()));
    for version in ["0.0.8", "0.0.9", "0.0.10", "0.0.11"] {
        fs::create_dir_all(store.version_path(version))?;
    }
    for version in ["0.0.8", "0.0.9", "0.0.10"] {
        fs::write(store.version_path(version).join("complete"), [])?;
    }
    store.reject("0.0.10")?;
    store.transition(&State {
        current: Some("0.0.9".into()),
        ..State::default()
    })?;
    let releases = RunnerReleases {
        store: store.clone(),
        running_version: "0.0.9".into(),
    };
    assert_eq!(
        releases.status()?,
        ReleaseStatus {
            newer_available: false,
            confirmed: true
        }
    );
    let helper = Part {
        name: "sdk-helper".into(),
        url: "https://releases.test/sdk-helper".into(),
        sha256: "a".repeat(64),
    };
    fs::write(
        store.version_path("0.0.11").join("parts.json"),
        serde_json::to_vec(&PartsList::new(vec![helper.clone()])?)?,
    )?;
    fs::write(store.version_path("0.0.11").join("complete"), [])?;
    assert!(
        !releases.status()?.newer_available,
        "an idle install offered a release that lacks a part"
    );
    let part = root.path().join("parts").join(&helper.sha256);
    fs::create_dir_all(&part)?;
    fs::write(part.join("sdk-helper.mjs"), [])?;
    fs::write(part.join("complete"), [])?;
    assert_eq!(
        releases.status()?,
        ReleaseStatus {
            newer_available: true,
            confirmed: true
        }
    );
    store.transition(&State {
        current: Some("0.0.9".into()),
        pending: Some("0.0.9".into()),
        ..State::default()
    })?;
    assert!(!releases.status()?.confirmed);
    store.transition(&State {
        current: Some("0.0.11".into()),
        ..State::default()
    })?;
    assert!(!releases.status()?.confirmed);
    Ok(())
}
