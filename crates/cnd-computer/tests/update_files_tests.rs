//! Program installation, state persistence, and the relative current link.

#![expect(
    clippy::unwrap_used,
    reason = "The temporary installation must be usable."
)]

use std::fs;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::Path;

use cnd_computer::update::disk::InstalledVersions;
use cnd_computer::update::ports::UpdateFiles;
use cnd_computer::update::state::UpdateState;

#[tokio::test]
async fn installs_a_complete_version_and_replaces_current_with_a_relative_link() {
    let root = tempfile::tempdir().unwrap();
    let versions = root.path().join("versions");
    for version in ["0.0.40", "0.0.41"] {
        let version = versions.join(version);
        fs::create_dir_all(&version).unwrap();
        fs::write(version.join("conductive"), b"old").unwrap();
    }
    let current = root.path().join("current");
    symlink("versions/0.0.41", &current).unwrap();
    let files = InstalledVersions {
        directory: root.path().to_owned(),
        executable: Some(versions.join("0.0.41/conductive")),
    };
    assert!(files.is_current().unwrap());
    assert_eq!(files.state().unwrap(), UpdateState::default());
    let archive = root.path().join("checked-program");
    fs::write(&archive, b"verified").unwrap();
    let executable = files.install("0.0.42", &archive).await.unwrap();
    assert_eq!(fs::read(&executable).unwrap(), b"verified");
    assert_eq!(
        fs::metadata(executable).unwrap().permissions().mode() & 0o777,
        0o755
    );
    assert!(files.is_current().unwrap());
    let state = UpdateState {
        previous: Some("0.0.41".into()),
        pending: Some("0.0.42".into()),
        ..UpdateState::default()
    };
    files.save(&state).unwrap();
    files.switch("0.0.42").unwrap();
    files.collect("0.0.42", Some("0.0.41")).unwrap();
    assert_eq!(
        fs::read_link(current).unwrap(),
        Path::new("versions/0.0.42")
    );
    assert_eq!(files.state().unwrap(), state);
    assert!(!files.is_current().unwrap());
    assert!(!versions.join("0.0.40").exists());
    assert_eq!(fs::read_dir(&versions).unwrap().count(), 2);
}
