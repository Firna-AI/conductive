//! The service environment reads only repository assignments from the folder record.

use std::collections::BTreeMap;

use super::repository_folders;

#[test]
fn reads_folder_variables_and_ignores_unrelated_or_malformed_assignments() {
    let record = "CONDUCTIVE_REPOSITORY_REPO_DIR=/home/user/code/org-repo.2
CONDUCTIVE_REPOSITORY_LEGACY_DIR=/home/user/conductive/repositories/legacy%2Fid
CONDUCTIVE_REPOSITORY_DIR=/home/user/code/other
PATH=/home/user/code/other
CONDUCTIVE_REPOSITORY_NESTED_DIR=/home/user/code/sub/repo
CONDUCTIVE_REPOSITORY_MALFORMED_DIR=/home/user/code/$(false)
";
    assert_eq!(
        repository_folders(record),
        BTreeMap::from([
            (
                "CONDUCTIVE_REPOSITORY_REPO_DIR".into(),
                "/home/user/code/org-repo.2".into()
            ),
            (
                "CONDUCTIVE_REPOSITORY_LEGACY_DIR".into(),
                "/home/user/conductive/repositories/legacy%2Fid".into()
            ),
        ])
    );
}
