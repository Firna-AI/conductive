//! Actual private sends preserve documents without numbered replay or stale sockets.

use std::sync::Arc;

use cnd_runner::json::codec;
use cnd_runner::link::connection::SavedRunnerLink;
use cnd_runner::link::ports::{LinkUpdate, RunnerLink};
use cnd_runner::services::sender::{ServiceDocument, ServiceSender};
use cnd_runner_interface::runner_handshake::{RUNNER_EVENT_MAX_BYTES, RunnerToWorkspace};
use cnd_runner_interface::services::control::{
    ServiceControlOutcome, ServiceControlRequest, ServiceControlResult,
};
use cnd_runner_interface::services::logs::{
    ServiceLogRequest, ServiceRawLogResponse, ServiceRawLogResult,
};
use cnd_runner_interface::services::reports::ServiceReport;
use cnd_runner_interface::services::transport::{RunnerServiceCommand, RunnerServiceMessage};
use serde_json::json;

use crate::support::events::title;
use crate::support::fixture::{FixedClock, Fixture};
use crate::support::workspace::{EndpointConnector, request};

fn link(h: &Fixture) -> Arc<dyn RunnerLink> {
    Arc::new(
        SavedRunnerLink::new(
            "workspace".into(),
            "process".into(),
            request(),
            Arc::new(EndpointConnector(h.endpoint.clone())),
            Arc::new(FixedClock),
            h.store.clone(),
            false,
        )
        .with_services(),
    )
}

fn report(revision: u64) -> ServiceReport {
    ServiceReport {
        boot_id: "boot".into(),
        revision,
        services: Vec::new(),
    }
}

fn target() -> cnd_runner_interface::services::process::ServiceTarget {
    serde_json::from_value(json!({"bootId":"boot", "serviceId":"service", "generation":"run"}))
        .unwrap()
}

#[tokio::test]
async fn negotiation_and_reconnect_never_replay_private_traffic_or_retarget_old_replies() {
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.services = Some(true);
    h.connected().await;
    assert_eq!(h.link.service_connection().await, None);
    h.endpoint
        .inject(
            cnd_runner_interface::runner_handshake::WorkspaceToRunner::RunnerServiceCommand(
                RunnerServiceCommand::Report {
                    request_id: "unoffered".into(),
                },
            ),
        )
        .await;
    assert_eq!(h.link.step().await.unwrap(), LinkUpdate::Progress);
    h.link.close().await.unwrap();
    let link = link(&h);
    link.connect().await.unwrap();
    assert_eq!(link.step().await.unwrap(), LinkUpdate::Connected);
    let connection = link.service_connection().await.unwrap();
    let sender = ServiceSender::new(link.clone(), connection);
    assert!(
        sender
            .send(ServiceDocument::Report(report(1)))
            .await
            .unwrap()
    );
    h.endpoint.state.lock().await.drop_next = true;
    link.emit(title("pending"), None).await.unwrap();
    let numbered = h.store.snapshot().await;
    assert_eq!(numbered.next_event_number, 2);
    assert_eq!(numbered.outbox.len(), 1);
    h.endpoint.state.lock().await.services = None;
    link.connect().await.unwrap();
    assert_eq!(link.step().await.unwrap(), LinkUpdate::Connected);
    assert_eq!(link.service_connection().await, None);
    assert!(
        !sender
            .send(ServiceDocument::Report(report(2)))
            .await
            .unwrap()
    );
    assert_eq!(h.store.snapshot().await, numbered);
    h.endpoint.state.lock().await.services = Some(true);
    link.connect().await.unwrap();
    assert_eq!(link.step().await.unwrap(), LinkUpdate::Connected);
    let next = link.service_connection().await.unwrap();
    assert_ne!(next, connection);
    assert!(
        !sender
            .send(ServiceDocument::Report(report(2)))
            .await
            .unwrap()
    );
    assert!(
        ServiceSender::new(link.clone(), next)
            .send(ServiceDocument::Report(report(3)))
            .await
            .unwrap()
    );
    let received = h.endpoint.state.lock().await.received.clone();
    assert_eq!(
        received
            .iter()
            .filter(|message| matches!(message, RunnerToWorkspace::RunnerServiceMessage(_)))
            .count(),
        2
    );
    assert_eq!(h.store.snapshot().await.next_event_number, 2);
    assert_eq!(h.store.snapshot().await.outbox.len(), 0);
    assert_eq!(h.endpoint.state.lock().await.events, numbered.outbox);
    link.close().await.unwrap();
}

#[tokio::test]
async fn private_sender_counts_large_escaped_headers_and_preserves_complete_unicode_documents() {
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.services = Some(true);
    let link = link(&h);
    link.connect().await.unwrap();
    link.step().await.unwrap();
    let sender = ServiceSender::new(link.clone(), link.service_connection().await.unwrap());
    let mut catalogue: ServiceReport = serde_json::from_value(json!({"bootId":"boot","revision":1,"services":[{
        "serviceId":"service","generation":"run","name":"\u{01}\"\\🦀".repeat(90_000),"program":null,"folder":null,"status":{"state":"ended","startedAt":0,"endedAt":1,"result":{"kind":"exit","code":0}},"ports":[]
    }]})).unwrap();
    let control = ServiceControlResult {
        request: ServiceControlRequest {
            request_id: "\n".repeat(480_000),
            target: target(),
            action: cnd_runner_interface::services::control::ServiceControlAction::Stop,
        },
        outcome: ServiceControlOutcome::Unchanged,
    };
    let logs = ServiceRawLogResponse {
        request: ServiceLogRequest {
            request_id: "logs".into(),
            target: target(),
        },
        result: ServiceRawLogResult::Ready {
            text: "\u{00}\"\\🙂\n".repeat(90_000),
            omitted: true,
        },
    };
    let sent = sender
        .send(ServiceDocument::Report(catalogue.clone()))
        .await;
    assert!(
        matches!(sent, Ok(true)),
        "the full report must fit its encoded parts: {sent:?}"
    );
    assert!(
        sender
            .send(ServiceDocument::Control(control.clone()))
            .await
            .unwrap()
    );
    assert!(
        sender
            .send(ServiceDocument::Logs(logs.clone()))
            .await
            .unwrap()
    );
    let received = h.endpoint.state.lock().await.received.clone();
    let mut sources = [String::new(), String::new(), String::new()];
    let mut counts = [0_u64; 3];
    let mut finals = [0; 3];
    for message in received {
        let RunnerToWorkspace::RunnerServiceMessage(message) = message else {
            continue;
        };
        assert!(
            codec::encode(&RunnerToWorkspace::RunnerServiceMessage(message.clone()))
                .unwrap()
                .len()
                <= RUNNER_EVENT_MAX_BYTES as usize
        );
        let (index, part) = match message {
            RunnerServiceMessage::ReportPart { part, .. } => (0, part),
            RunnerServiceMessage::ControlResultPart { request_id, part } => {
                assert_eq!(request_id, control.request.request_id);
                (1, part)
            }
            RunnerServiceMessage::LogsPart { request_id, part } => {
                assert_eq!(request_id, "logs");
                (2, part)
            }
        };
        counts[index] += 1;
        assert_eq!(part.part_number, counts[index]);
        finals[index] += usize::from(part.final_part);
        sources[index].push_str(&part.text);
    }
    assert!(counts.iter().all(|count| *count > 1));
    assert_eq!(finals, [1, 1, 1]);
    assert_eq!(
        serde_json::from_str::<ServiceReport>(&sources[0]).unwrap(),
        catalogue
    );
    assert_eq!(
        serde_json::from_str::<ServiceControlResult>(&sources[1]).unwrap(),
        control
    );
    assert_eq!(
        serde_json::from_str::<ServiceRawLogResponse>(&sources[2]).unwrap(),
        logs
    );
    catalogue.services.clear();
    assert!(
        sender
            .send(ServiceDocument::Report(catalogue))
            .await
            .unwrap()
    );
    assert_eq!(h.store.snapshot().await.next_event_number, 1);
    assert_eq!(h.store.snapshot().await.outbox.len(), 0);
    link.close().await.unwrap();
}
