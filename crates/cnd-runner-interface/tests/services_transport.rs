//! Private services retain complete documents outside the numbered protocol.

use cnd_runner_interface::json::decoder::decode;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_commands::RunnerCommand;
use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use cnd_runner_interface::services::reports::ServiceReport;
use serde_json::{Value, error::Category, json};

#[test]
fn service_capabilities_preserve_version_two_and_omit_absent_support() -> serde_json::Result<()> {
    for capability in [None, Some(false), Some(true)] {
        let mut hello = json!({
            "type": "hello", "protocolVersion": 2,
            "workspaceId": "workspace", "streamId": "stream",
        });
        let mut welcome = json!({
            "type": "welcome", "protocolVersion": 2,
            "streamId": "stream", "confirmedThrough": 7,
        });
        for input in [&mut hello, &mut welcome] {
            if let Some(services) = capability {
                input["services"] = json!(services);
            }
        }
        let hello_message: RunnerToWorkspace = decode(&serde_json::to_vec(&hello)?)?;
        let welcome_message: WorkspaceToRunner = decode(&serde_json::to_vec(&welcome)?)?;
        assert_eq!(serde_json::to_value(hello_message)?, hello);
        assert_eq!(serde_json::to_value(welcome_message)?, welcome);
    }
    Ok(())
}

#[test]
fn service_traffic_stays_outside_numbered_events_and_chat_commands() -> serde_json::Result<()> {
    let report = json!({
        "type": "services.report.part", "transferId": "transfer",
        "part": { "partNumber": 1, "finalPart": true, "text": "{\"bootId\":\"boot\",\"revision\":9,\"services\":[]}" },
    });
    let message: RunnerToWorkspace = decode(&serde_json::to_vec(&report)?)?;
    assert_eq!(serde_json::to_value(message)?, report);
    assert_eq!(
        serde_json::from_value::<RunnerEvent>(report.clone())
            .err()
            .map(|error| error.classify()),
        Some(Category::Data)
    );
    let numbered = json!({
        "type": "event", "streamId": "stream", "eventNumber": 8,
        "occurredAt": 1_795_132_800_000_i64, "event": report,
    });
    assert_eq!(
        decode::<RunnerToWorkspace>(&serde_json::to_vec(&numbered)?)
            .err()
            .map(|error| error.classify()),
        Some(Category::Data)
    );
    let control = json!({
        "type": "services.control",
        "request": {
            "requestId": "control", "action": "restart",
            "target": { "bootId": "boot", "serviceId": "service", "generation": "run" },
        },
    });
    let command: WorkspaceToRunner = decode(&serde_json::to_vec(&control)?)?;
    assert_eq!(serde_json::to_value(command)?, control);
    assert_eq!(
        serde_json::from_value::<RunnerCommand>(control)
            .err()
            .map(|error| error.classify()),
        Some(Category::Data)
    );
    Ok(())
}

#[test]
fn private_parts_preserve_json_fragments_until_complete_text_is_parsed() -> serde_json::Result<()> {
    let fragments = [
        r#"{"bootId":"boot","revision":9,"services":[{"serviceId":"service","generation":"run","name":"prefix\nsec"#,
        r#"ret-\uD83D\uDE42","program":"npm run","folder":"project","status":{"state":"running","startedAt":1795132800000,"endedAt":null,"result":null},"ports":[5173]}]}"#,
    ];
    let mut complete = String::new();
    for (index, fragment) in fragments.iter().enumerate() {
        let input = json!({
            "type": "services.report.part", "transferId": "transfer",
            "part": { "partNumber": index + 1, "finalPart": index == 1, "text": fragment },
        });
        let message: RunnerToWorkspace = decode(&serde_json::to_vec(&input)?)?;
        let output = serde_json::to_value(message)?;
        assert_eq!(output, input);
        complete.push_str(output["part"]["text"].as_str().unwrap_or_default());
    }
    let report: ServiceReport = decode(complete.as_bytes())?;
    let output = serde_json::to_value(report)?;
    assert_eq!(output["services"][0]["name"], "prefix\nsecret-🙂");
    assert_eq!(output["bootId"], "boot");
    assert_eq!(output["revision"], 9);
    assert_eq!(output["services"][0]["ports"], Value::from(vec![5173]));
    Ok(())
}
