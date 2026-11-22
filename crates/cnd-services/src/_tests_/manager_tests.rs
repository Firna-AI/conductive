//! Exact-name mutations, durable receipts, and owned-port readiness.

use std::sync::Arc;

use cnd_runner_interface::services::control::{ServiceControlAction, ServiceControlOutcome};
use cnd_runner_interface::services::local::{
    ServiceLocalRequest, ServiceLocalResponse, ServicePortWait, ServiceReadiness,
    ServiceStartOutcome,
};
use cnd_runner_interface::services::process::{ServiceProcessResult, ServiceState};

use super::support::{Fixture, control, ended, start};

#[tokio::test]
async fn running_names_stay_unchanged_and_nonrunning_start_replaces_definition() {
    let h = Fixture::new();
    let first = h.start("first", " ", "original").await;
    let repeated = h.start("repeat", " ", "replacement").await;
    assert_eq!(repeated.outcome, ServiceStartOutcome::AlreadyRunning);
    assert_eq!(
        repeated.service.command,
        ["original", "argument with spaces"]
    );
    assert_eq!(repeated.service.target, first.service.target);
    let report = h.manager.snapshot().await.unwrap();
    assert_eq!(
        report.services[0].originating_turn_id.as_deref(),
        Some("turn-first")
    );
    assert_eq!(h.world.lock().unwrap().launched.len(), 1);
    assert_eq!(
        report.services[0].service.folder.as_deref(),
        Some("100%literal")
    );
    h.manager
        .repository("/home/user/code/other".into())
        .await
        .unwrap();
    assert_eq!(
        h.manager.snapshot().await.unwrap().services[0]
            .service
            .folder
            .as_deref(),
        Some("app/100%literal")
    );
    assert!(h.manager.snapshot().await.unwrap().revision > report.revision);
    let unit = h.world.lock().unwrap().launched[0].clone();
    h.world
        .lock()
        .unwrap()
        .completed
        .insert(unit, ended(ServiceProcessResult::Exit { code: 0 }));
    let next = h.start("second", " ", "replacement").await;
    assert_eq!(next.outcome, ServiceStartOutcome::Started);
    assert_eq!(
        next.service.command,
        ["replacement", "argument with spaces"]
    );
    assert_ne!(
        next.service.target.identity.generation,
        first.service.target.identity.generation
    );
    let saved = h.world.lock().unwrap();
    assert_eq!(saved.prepared.len(), 2);
    assert_eq!(
        saved.prepared[1].environment.get("ORG").map(String::as_str),
        Some("frozen")
    );
    assert_eq!(
        saved.prepared[1]
            .environment
            .get("EXPLICIT")
            .map(String::as_str),
        Some("kept")
    );
    assert_eq!(
        saved.prepared[1].definition.folder,
        "/home/user/code/app/100%literal"
    );
    assert_eq!(
        saved
            .registry
            .as_ref()
            .unwrap()
            .services
            .values()
            .next()
            .unwrap()
            .originating_turn_id
            .as_deref(),
        Some("turn-second")
    );
}

#[tokio::test]
async fn controls_stop_once_reject_stale_runs_and_restart_saved_definitions() {
    let h = Fixture::with(true, false, false);
    let first = h.start("start", "", "original").await;
    let stopped = h
        .manager
        .call(control(
            "stop",
            first.service.target.clone(),
            ServiceControlAction::Stop,
        ))
        .await
        .unwrap();
    assert_eq!(h.list().await[0].status.state, ServiceState::Stopped);
    assert_eq!(h.world.lock().unwrap().stopped.len(), 1);
    let reopened = h.reopen();
    let replayed = reopened
        .call(control(
            "stop",
            first.service.target.clone(),
            ServiceControlAction::Stop,
        ))
        .await
        .unwrap();
    assert_eq!(replayed, stopped);
    let restart = reopened
        .call(control(
            "restart",
            first.service.target.clone(),
            ServiceControlAction::Restart,
        ))
        .await
        .unwrap();
    assert_eq!(
        control_outcome(restart.clone()),
        ServiceControlOutcome::Applied
    );
    assert_eq!(
        reopened
            .call(control(
                "restart",
                first.service.target.clone(),
                ServiceControlAction::Restart
            ))
            .await
            .unwrap(),
        restart
    );
    let mut old_boot = first.service.target.clone();
    old_boot.boot_id = "old-boot".into();
    for target in [old_boot, first.service.target.clone()] {
        assert_eq!(
            control_outcome(
                reopened
                    .call(control(
                        &format!("stale-{}", target.boot_id),
                        target,
                        ServiceControlAction::Restart
                    ))
                    .await
                    .unwrap()
            ),
            ServiceControlOutcome::Stale
        );
    }
    let report = reopened.snapshot().await.unwrap();
    assert_eq!(
        report.services[0].originating_turn_id.as_deref(),
        Some("turn-start")
    );
    let world = h.world.lock().unwrap();
    assert_eq!(world.launched.len(), 2);
    assert_eq!(world.stopped.len(), 1);
    assert_eq!(
        world.prepared[1].definition.command,
        ["original", "argument with spaces"]
    );
    assert_eq!(
        world.prepared[1].definition.env,
        world.prepared[0].definition.env
    );
}

#[tokio::test]
async fn failed_restart_keeps_diagnostics_and_failed_saves_prevent_effects() {
    let h = Fixture::with(true, false, false);
    let first = h.start("start", "web", "original").await;
    h.world.lock().unwrap().fail_save = true;
    assert_eq!(
        h.manager
            .call(control(
                "unsaved",
                first.service.target.clone(),
                ServiceControlAction::Stop
            ))
            .await
            .err()
            .map(|value| value.to_string()),
        Some("[cnd-services/units] the service operation failed".into())
    );
    h.world.lock().unwrap().fail_save = false;
    assert_eq!(h.list().await[0].status.state, ServiceState::Running);
    assert_eq!(h.world.lock().unwrap().stopped.len(), 0);
    h.world.lock().unwrap().fail_launch = true;
    let result = control_outcome(
        h.manager
            .call(control(
                "restart",
                first.service.target,
                ServiceControlAction::Restart,
            ))
            .await
            .unwrap(),
    );
    assert_eq!(
        serde_json::to_value(result).unwrap()["error"]["code"],
        "service_restart_failed"
    );
    let after = h.list().await;
    assert_eq!(after[0].status.state, ServiceState::Failed);
    assert_eq!(
        after[0].status.result,
        Some(ServiceProcessResult::StartFailed)
    );
}

#[tokio::test]
async fn readiness_wait_uses_owned_ports_and_timeout_keeps_running() {
    let h = Fixture::with(false, false, true);
    let mut request = start("wait", "web", "server");
    if let ServiceLocalRequest::Start { request } = &mut request {
        request.wait_for_port = Some(ServicePortWait::Port { port: 5173 });
    }
    let after_wait = h.world.clone();
    h.world.lock().unwrap().on_wait = Some(Arc::new(move || {
        after_wait.lock().unwrap().ports = vec![5173];
    }));
    let reply = start_result(h.manager.call(request).await.unwrap());
    assert_eq!(reply.readiness, ServiceReadiness::Ready { port: 5173 });
    assert_eq!(h.world.lock().unwrap().waits, 1);
    assert_eq!(
        h.world.lock().unwrap().scans.last().map(String::as_str),
        Some("/system.slice/conductive-project-id-1-id-2.service")
    );
    h.world.lock().unwrap().on_wait = None;
    let mut request = start("timeout", "other", "server");
    if let ServiceLocalRequest::Start { request } = &mut request {
        request.wait_for_port = Some(ServicePortWait::Port { port: 3000 });
    }
    let reply = start_result(h.manager.call(request).await.unwrap());
    assert_eq!(reply.readiness, ServiceReadiness::NotConfirmed);
    assert_eq!(reply.service.status.state, ServiceState::Running);
    assert_eq!(h.world.lock().unwrap().waits, 4);
    assert_eq!(h.world.lock().unwrap().stopped, Vec::<String>::new());
}

fn control_outcome(reply: ServiceLocalResponse) -> ServiceControlOutcome {
    match reply {
        ServiceLocalResponse::Control { result } => result.outcome,
        _ => panic!("wrong reply"),
    }
}

fn start_result(
    reply: ServiceLocalResponse,
) -> cnd_runner_interface::services::local::ServiceStartResult {
    match reply {
        ServiceLocalResponse::Start { result, .. } => result,
        _ => panic!("wrong reply"),
    }
}
