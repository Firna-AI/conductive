//! Private effects preserve idle progress and always finish current failed reads.

#![allow(clippy::panic)]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use cnd_runner_interface::services::control::{
    ServiceControlAction, ServiceControlOutcome, ServiceControlRequest, ServiceControlResult,
    ServiceFailure,
};
use cnd_runner_interface::services::logs::{
    ServiceLogRequest, ServiceRawLogResponse, ServiceRawLogResult,
};
use cnd_runner_interface::services::reports::ServiceReport;
use cnd_runner_interface::services::transport::{RunnerServiceCommand, RunnerServiceMessage};
use serde_json::json;
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::error::Error;
use crate::link::ports::{LinkUpdate, ServiceConnection};
use crate::runtime::RunExit;
use crate::services::ports::ServiceEffectsMock;

use super::service_support::Held;
use super::support::{Fixture, ready};

fn report(revision: u64) -> ServiceReport {
    ServiceReport {
        boot_id: "boot".into(),
        revision,
        services: Vec::new(),
    }
}
fn request() -> ServiceLogRequest {
    serde_json::from_value(json!({"requestId":"private-read", "target":{"bootId":"boot","serviceId":"web","generation":"run"}})).unwrap()
}
fn command(command: RunnerServiceCommand) -> LinkUpdate {
    LinkUpdate::ServiceCommand {
        connection: ServiceConnection { generation: 1 },
        command,
    }
}

#[tokio::test(start_paused = true)]
async fn blocked_private_logs_do_not_restart_idle_or_delay_swap_and_are_canceled() {
    let entered = Arc::new(Notify::new());
    let canceled = Arc::new(AtomicBool::new(false));
    let source = Arc::new(Held {
        source: Arc::new(Unimock::new(
            ServiceEffectsMock::snapshot
                .each_call(matching!(_))
                .answers(&|_, _| Ok(report(1))),
        )),
        entered: entered.clone(),
        canceled: canceled.clone(),
    });
    let h = Fixture::configured(ready(), Some(source)).await;
    h.tick().await;
    h.input
        .send(command(RunnerServiceCommand::Logs { request: request() }))
        .unwrap();
    entered.notified().await;
    h.tick().await;
    h.tick().await;
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Swap);
    assert!(canceled.load(Ordering::SeqCst));
    assert_eq!(
        *h.order.lock().unwrap(),
        ["close", "shutdown", "persist", "close"]
    );
}

#[tokio::test(start_paused = true)]
async fn failed_private_logs_reply_with_original_request_and_controls_force_a_report() {
    let source = Arc::new(Unimock::new((
        ServiceEffectsMock::snapshot
            .each_call(matching!(_))
            .answers(&|_, _| Ok(report(1))),
        ServiceEffectsMock::logs
            .some_call(matching!(_))
            .returns(Err(Error::Disconnected)),
        ServiceEffectsMock::control
            .some_call(matching!(_))
            .answers(&|_, request| {
                Ok(ServiceControlResult {
                    request,
                    outcome: ServiceControlOutcome::Applied,
                })
            }),
    )));
    let mut h = Fixture::configured(ready(), Some(source)).await;
    let RunnerServiceMessage::ReportPart { .. } = h.services.recv().await.unwrap() else {
        panic!("expected initial report")
    };
    h.input
        .send(command(RunnerServiceCommand::Logs { request: request() }))
        .unwrap();
    let RunnerServiceMessage::LogsPart { request_id, part } = h.services.recv().await.unwrap()
    else {
        panic!("expected failed log response")
    };
    assert_eq!(request_id, "private-read");
    assert_eq!(
        serde_json::from_str::<ServiceRawLogResponse>(&part.text).unwrap(),
        ServiceRawLogResponse {
            request: request(),
            result: ServiceRawLogResult::Failed {
                error: ServiceFailure {
                    code: "service_log_failed".into(),
                    message: "The service log could not load. Try again.".into()
                }
            }
        }
    );
    let control = ServiceControlRequest {
        request_id: "control".into(),
        target: request().target,
        action: ServiceControlAction::Stop,
    };
    h.input
        .send(command(RunnerServiceCommand::Control {
            request: control.clone(),
        }))
        .unwrap();
    let RunnerServiceMessage::ControlResultPart { part, .. } = h.services.recv().await.unwrap()
    else {
        panic!("expected control result")
    };
    assert_eq!(
        serde_json::from_str::<ServiceControlResult>(&part.text).unwrap(),
        ServiceControlResult {
            request: control,
            outcome: ServiceControlOutcome::Applied
        }
    );
    let RunnerServiceMessage::ReportPart { part, .. } = h.services.recv().await.unwrap() else {
        panic!("expected refreshed report")
    };
    assert_eq!(
        serde_json::from_str::<ServiceReport>(&part.text).unwrap(),
        report(1)
    );
    h.tick().await;
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Shutdown);
}

#[tokio::test(start_paused = true)]
async fn independent_observations_publish_changed_no_port_and_empty_catalogues() {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let observed = calls.clone();
    let initial: ServiceReport = serde_json::from_value(json!({"bootId":"boot", "revision":1, "services":[{
        "serviceId":"web", "generation":"run", "name":"web", "program":null,"folder":null,"ports":[],
        "status":{"state":"running","startedAt":0,"endedAt":null,"result":null}
    }]})).unwrap();
    let finished: ServiceReport = serde_json::from_value(json!({"bootId":"boot", "revision":2, "services":[{
        "serviceId":"web", "generation":"run", "name":"web", "program":null,"folder":null,"ports":[],
        "status":{"state":"ended","startedAt":0,"endedAt":1,"result":{"kind":"exit","code":0}}
    }]})).unwrap();
    let samples = [initial.clone(), finished.clone(), report(3)];
    let source = Arc::new(Unimock::new(
        ServiceEffectsMock::snapshot
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, fresh| {
                let mut calls = observed.lock().unwrap();
                calls.push(fresh);
                Ok(samples[(calls.len() - 1).min(2)].clone())
            })),
    ));
    let mut h = Fixture::configured(ready(), Some(source)).await;
    let RunnerServiceMessage::ReportPart {
        transfer_id: first,
        part,
    } = h.services.recv().await.unwrap()
    else {
        panic!("expected first report")
    };
    assert_eq!(
        serde_json::from_str::<ServiceReport>(&part.text).unwrap(),
        initial
    );
    h.tick().await;
    let RunnerServiceMessage::ReportPart {
        transfer_id: second,
        part,
    } = h.services.recv().await.unwrap()
    else {
        panic!("expected changed report")
    };
    assert_ne!(first, second);
    assert_eq!(
        serde_json::from_str::<ServiceReport>(&part.text).unwrap(),
        finished
    );
    h.tick().await;
    let RunnerServiceMessage::ReportPart { part, .. } = h.services.recv().await.unwrap() else {
        panic!("expected empty catalogue")
    };
    assert_eq!(
        serde_json::from_str::<ServiceReport>(&part.text).unwrap(),
        report(3)
    );
    assert_eq!(*calls.lock().unwrap(), [true, false, false]);
    h.stop.send_replace(true);
    assert_eq!(h.running.await.unwrap().unwrap(), RunExit::Shutdown);
}
