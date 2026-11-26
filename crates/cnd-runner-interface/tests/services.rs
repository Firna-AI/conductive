//! Selected reports, local private input, and explicit app reply states.

use cnd_runner_interface::json::decoder::decode;
use cnd_runner_interface::ports::ListeningPort;
use cnd_runner_interface::services::app::{ServiceCatalogue, ServiceCatalogueSnapshot};
use cnd_runner_interface::services::control::{
    ServiceControlAction, ServiceControlOutcome, ServiceControlRequest, ServiceControlResult,
};
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::process::{ServiceIdentity, ServiceTarget};
use cnd_runner_interface::services::reports::ServiceReport;
use serde_json::json;

#[test]
fn selected_reports_keep_complete_labels_and_provenance_without_definitions()
-> serde_json::Result<()> {
    let expected = json!({
        "bootId": "boot", "revision": 9,
        "services": [{
            "serviceId": "service", "generation": "run", "name": " Exact name 🙂 ",
            "program": "a-selected-program-label-longer-than-forty-characters run",
            "folder": "project/a-complete-folder-label-that-is-longer-than-the-display-cut-and-must-reach-the-worker-before-the-worker-applies-its-filter-and-cut",
            "status": {
                "state": "failed", "startedAt": 1_795_132_800_000_i64,
                "endedAt": 1_795_132_800_010_i64, "result": { "kind": "out_of_memory" },
            },
            "ports": [], "originatingTurnId": "turn",
        }],
    });
    let mut input = expected.clone();
    input["services"][0]["command"] = json!(["npm", "run", "dev", "private-argument"]);
    input["services"][0]["env"] = json!({ "EXPLICIT_VALUE": "private-value" });
    let report: ServiceReport = decode(&serde_json::to_vec(&input)?)?;
    assert_eq!(serde_json::to_value(report)?, expected);
    Ok(())
}

#[test]
fn local_start_keeps_explicit_values_out_of_printable_results() -> serde_json::Result<()> {
    let input = json!({
        "type": "start",
        "request": {
            "requestId": "start", "name": " exact name ",
            "definition": {
                "command": ["npm", "run", "dev", "argument with spaces"],
                "folder": "/home/user/code/project", "env": { "EXPLICIT_VALUE": "private-value" },
            },
            "waitForPort": { "kind": "port", "port": 5173 },
            "originatingTurnId": "turn",
        },
    });
    let request: ServiceLocalRequest = decode(&serde_json::to_vec(&input)?)?;
    assert_eq!(serde_json::to_value(request)?, input);
    let expected = json!({
        "type": "start", "requestId": "start",
        "result": {
            "service": {
                "target": { "bootId": "boot", "serviceId": "service", "generation": "run" },
                "name": " exact name ", "command": ["npm", "run", "old", "argument with spaces"],
                "folder": "/home/user/code/original",
                "status": { "state": "running", "startedAt": 1_795_132_800_000_i64, "endedAt": null, "result": null },
                "ports": [5173],
            },
            "outcome": "already_running", "readiness": { "state": "ready", "port": 5173 },
        },
    });
    let mut supplied = expected.clone();
    supplied["result"]["service"]["env"] = json!({ "EXPLICIT_VALUE": "private-value" });
    let reply: ServiceLocalResponse = decode(&serde_json::to_vec(&supplied)?)?;
    assert_eq!(serde_json::to_value(reply)?, expected);
    Ok(())
}

#[test]
fn control_receipts_keep_observed_identity_and_lost_reply_outcomes() -> serde_json::Result<()> {
    let request = ServiceControlRequest {
        request_id: "request".into(),
        target: ServiceTarget {
            boot_id: "boot".into(),
            identity: ServiceIdentity {
                service_id: "service".into(),
                generation: "observed-run".into(),
            },
        },
        action: ServiceControlAction::Restart,
    };
    for (outcome, state) in [
        (ServiceControlOutcome::Applied, "applied"),
        (ServiceControlOutcome::Unchanged, "unchanged"),
        (ServiceControlOutcome::Stale, "stale"),
        (ServiceControlOutcome::Unconfirmed, "unconfirmed"),
        (ServiceControlOutcome::ComputerStopped, "computer_stopped"),
    ] {
        let result = ServiceControlResult {
            request: request.clone(),
            outcome,
        };
        let expected = json!({
            "request": {
                "requestId": "request", "action": "restart",
                "target": { "bootId": "boot", "serviceId": "service", "generation": "observed-run" },
            },
            "outcome": { "state": state },
        });
        assert_eq!(serde_json::to_value(&result)?, expected);
        let decoded: ServiceControlResult = decode(&serde_json::to_vec(&expected)?)?;
        assert_eq!(decoded, result);
    }
    Ok(())
}

#[test]
fn catalogue_distinguishes_unsupported_stopped_and_supported_empty() -> serde_json::Result<()> {
    for (catalogue, expected) in [
        (
            ServiceCatalogue::Unsupported,
            json!({ "state": "unsupported" }),
        ),
        (ServiceCatalogue::Stopped, json!({ "state": "stopped" })),
        (
            ServiceCatalogue::Ready {
                snapshot: ServiceCatalogueSnapshot {
                    boot_id: "boot".into(),
                    revision: 9,
                    services: vec![],
                },
            },
            json!({ "state": "ready", "snapshot": { "bootId": "boot", "revision": 9, "services": [] } }),
        ),
    ] {
        assert_eq!(serde_json::to_value(&catalogue)?, expected);
        let decoded: ServiceCatalogue = decode(&serde_json::to_vec(&expected)?)?;
        assert_eq!(decoded, catalogue);
    }
    Ok(())
}

#[test]
fn port_ownership_is_additive_and_absent_for_legacy_reports() -> serde_json::Result<()> {
    for input in [
        json!({ "port": 5173, "name": "npm run", "folder": null }),
        json!({ "port": 5173, "name": "npm run", "folder": null, "serviceId": "service" }),
    ] {
        let port: ListeningPort = decode(&serde_json::to_vec(&input)?)?;
        assert_eq!(serde_json::to_value(port)?, input);
    }
    Ok(())
}
