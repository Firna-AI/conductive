//! Complete, rejected, pending, and development releases use the real store reader.

use std::fs;
use std::sync::Arc;

use cnd_cli::runner_update::releases::RunnerReleases;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::ports::{State, Store};
use cnd_runner::update::{ReleaseReadiness, ReleaseStatus};
use tempfile::tempdir;

#[test]
fn only_a_complete_non_rejected_newer_release_is_ready() -> Result<(), Box<dyn std::error::Error>> {
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
    fs::write(store.version_path("0.0.11").join("complete"), [])?;
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
