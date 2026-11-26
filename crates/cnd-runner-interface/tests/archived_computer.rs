//! Optional archived computer evidence preserves older workspace records.

use serde_json::json;

use cnd_runner_interface::tools::workspace_types::Workspace;

#[test]
fn workspace_keeps_archived_computer_and_omits_it_for_older_records()
-> Result<(), serde_json::Error> {
    let older = json!({
        "id": "workspace-1", "number": 1, "link": "https://app.conductive.test/workspace-1",
        "orgId": "org-1", "repositoryId": "repository-1", "sectionId": "general", "parentId": null,
        "owner": {"id":"member-1", "githubLogin":"member", "displayName":null, "avatarUrl":null},
        "name": "Saved work", "branch": "member/saved-work",
        "choice": {"agent":"claude", "model":"test-model", "effort":"high", "fast":false},
        "state": "archived", "github": null,
        "createdAt": 1, "updatedAt": 2, "archivedAt": 2, "restoreUntil": null
    });
    let mut current = older.clone();
    current["archivedComputer"] = json!({"state":"may-exist", "restoreUntil":1_209_600_002});
    let mut future = older.clone();
    future["archivedComputer"] = json!({"state":"future-state", "restoreUntil":1_209_600_002});
    let mut malformed = older.clone();
    malformed["archivedComputer"] = json!({"state":"deleted", "restoreUntil":"unknown"});
    for (input, expected) in [
        (current.clone(), current),
        (older.clone(), older.clone()),
        (future, older.clone()),
        (malformed, older),
    ] {
        let workspace: Workspace = serde_json::from_value(input.clone())?;
        assert_eq!(serde_json::to_value(workspace)?, expected);
    }
    Ok(())
}
