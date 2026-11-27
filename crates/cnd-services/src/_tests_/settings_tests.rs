//! The service environment reads only repository assignments from the folder record.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::fs::{self, Permissions};
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use crate::environment::Settings;

use super::NativeSettings;

fn settings(directory: &Path) -> NativeSettings {
    let path = directory.join("env.sh");
    fs::write(
        &path,
        "ORG_SETTING='saved value'\nPATH=/saved/bin\nCONDUCTIVE_REPOSITORY_DIR=/home/user/code/start\nCONDUCTIVE_REPOSITORY_ORG_DIR=../org\n",
    )
    .unwrap();
    NativeSettings {
        path,
        repository_folders: directory.join("repository-folders"),
    }
}

fn assert_saved_settings(values: &BTreeMap<String, String>) {
    for (name, value) in [
        ("ORG_SETTING", "saved value"),
        ("PATH", "/saved/bin"),
        ("CONDUCTIVE_REPOSITORY_DIR", "/home/user/code/start"),
        ("CONDUCTIVE_REPOSITORY_ORG_DIR", "../org"),
    ] {
        assert_eq!(values.get(name).map(String::as_str), Some(value), "{name}");
    }
}

#[tokio::test]
async fn reads_folder_variables_and_ignores_unrelated_or_malformed_assignments() {
    let directory = tempfile::tempdir().unwrap();
    let settings = settings(directory.path());
    let record = "CONDUCTIVE_REPOSITORY_REPO_DIR=/home/user/code/org-repo.2
CONDUCTIVE_REPOSITORY_LEGACY_DIR=/home/user/conductive/repositories/legacy%2Fid
CONDUCTIVE_REPOSITORY_DIR=/home/user/code/other
PATH=/home/user/code/other
CONDUCTIVE_REPOSITORY_NESTED_DIR=/home/user/code/sub/repo
CONDUCTIVE_REPOSITORY_MALFORMED_DIR=/home/user/code/$(false)
";
    fs::write(&settings.repository_folders, record).unwrap();
    let values = settings.frozen().await.unwrap();
    assert_saved_settings(&values);
    assert_eq!(
        values["CONDUCTIVE_REPOSITORY_REPO_DIR"],
        "/home/user/code/org-repo.2"
    );
    assert_eq!(
        values["CONDUCTIVE_REPOSITORY_LEGACY_DIR"],
        "/home/user/conductive/repositories/legacy%2Fid"
    );
    assert!(!values.contains_key("CONDUCTIVE_REPOSITORY_NESTED_DIR"));
    assert!(!values.contains_key("CONDUCTIVE_REPOSITORY_MALFORMED_DIR"));
}

#[tokio::test]
async fn keeps_saved_settings_when_the_folder_record_is_missing() {
    let directory = tempfile::tempdir().unwrap();
    let values = settings(directory.path()).frozen().await.unwrap();

    assert_saved_settings(&values);
    assert!(!values.contains_key("CONDUCTIVE_REPOSITORY_REPO_DIR"));
}

#[tokio::test]
async fn keeps_saved_settings_when_the_folder_record_cannot_be_read() {
    let directory = tempfile::tempdir().unwrap();
    let settings = settings(directory.path());
    // Invalid UTF-8 also causes a read error for a privileged test process.
    fs::write(
        &settings.repository_folders,
        b"CONDUCTIVE_REPOSITORY_REPO_DIR=/home/user/code/repo\n\xff",
    )
    .unwrap();
    fs::set_permissions(&settings.repository_folders, Permissions::from_mode(0o000)).unwrap();

    let values = settings.frozen().await.unwrap();
    assert_saved_settings(&values);
    assert!(!values.contains_key("CONDUCTIVE_REPOSITORY_REPO_DIR"));
}
