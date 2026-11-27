//! Wire forms for changes deltas and their optional handshake fields.

use cnd_runner_interface::file_changes::BrowserChangesResponse;
use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Value, json};

fn round_trip<T: DeserializeOwned + Serialize>(input: Value) -> Result<Value, String> {
    serde_json::from_value::<T>(input)
        .and_then(serde_json::to_value)
        .map_err(|error| error.to_string())
}

fn assert_changes_delta_round_trip(delta: Value) {
    let event = json!({
        "type": "event",
        "streamId": "stream-1",
        "eventNumber": 12,
        "occurredAt": 1730000000000_u64,
        "event": {"type": "changes.changed", "delta": delta}
    });
    assert_eq!(round_trip::<RunnerToWorkspace>(event.clone()), Ok(event));
}

#[test]
fn changes_delta_round_trips_with_no_rows() {
    assert_changes_delta_round_trip(json!({
        "revision": 2,
        "baseBranch": "main",
        "summary": {"files": 1, "added": 1, "removed": 0},
        "omitted": {"files": 2, "added": 5, "removed": 1},
        "removes": [],
        "upserts": []
    }));
}

#[test]
fn changes_delta_round_trips_removes_and_upserts_with_display_labels() {
    assert_changes_delta_round_trip(json!({
        "revision": 3,
        "baseBranch": "main",
        "displayBaseBranch": "visible-main",
        "unpushedCommits": 2,
        "uncommittedFileCount": 1,
        "summary": {"files": 3, "added": 8, "removed": 5},
        "omitted": {"files": 0, "added": 0, "removed": 0},
        "removes": ["gone.txt"],
        "upserts": [
            {"index": 0, "file": {
                "path": "new.txt", "displayPath": "visible-new.txt",
                "previousPath": "old.txt", "previousDisplayPath": "visible-old.txt",
                "change": "renamed", "added": 2, "removed": 1, "uncommitted": true
            }},
            {"index": 2, "file": {
                "path": "third.txt", "change": "modified",
                "added": 3, "removed": 2, "uncommitted": false
            }}
        ]
    }));
}

fn assert_changes_deltas_capability<T: DeserializeOwned + Serialize>(mut message: Value) {
    assert_eq!(round_trip::<T>(message.clone()), Ok(message.clone()));

    let mut invalid = message.clone();
    invalid["changesDeltas"] = json!("true");
    assert_eq!(round_trip::<T>(invalid), Ok(message.clone()));

    for flag in [true, false] {
        message["changesDeltas"] = json!(flag);
        assert_eq!(round_trip::<T>(message.clone()), Ok(message.clone()));
    }
}

#[test]
fn hello_round_trips_the_optional_changes_deltas_offer() {
    assert_changes_deltas_capability::<RunnerToWorkspace>(json!({
        "type": "hello",
        "protocolVersion": 2,
        "workspaceId": "workspace-1",
        "streamId": "stream-1"
    }));
}

#[test]
fn welcome_round_trips_the_optional_changes_deltas_acceptance() {
    assert_changes_deltas_capability::<WorkspaceToRunner>(json!({
        "type": "welcome",
        "protocolVersion": 2,
        "streamId": "stream-1",
        "confirmedThrough": 12
    }));
}

#[test]
fn browser_changes_round_trips_the_optional_revision() {
    let mut changes = json!({
        "baseBranch": "main",
        "files": [],
        "summary": {"files": 0, "added": 0, "removed": 0}
    });
    assert_eq!(
        round_trip::<BrowserChangesResponse>(changes.clone()),
        Ok(changes.clone())
    );

    changes["revision"] = json!(9007199254740991_u64);
    assert_eq!(
        round_trip::<BrowserChangesResponse>(changes.clone()),
        Ok(changes)
    );
}
