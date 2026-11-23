//! Restart recovery and actual terminal outcomes through complete snapshots.

use cnd_runner::json::codec::MAX_SAFE_INTEGER;
use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::services::control::{ServiceControlAction, ServiceControlOutcome};
use cnd_runner_interface::services::local::ServiceLocalResponse;
use cnd_runner_interface::services::process::{ServiceProcessResult, ServiceState};

use super::support::control;
use super::support::{Fixture, ended, start};

#[tokio::test]
async fn reconstruction_reconciles_provisional_start_without_a_second_launch() {
    let h = Fixture::new();
    let original = h.start("start", "web", "server").await;
    let provisional = h.world.lock().unwrap().saved[0].clone();
    {
        let mut world = h.world.lock().unwrap();
        world.registry = Some(provisional);
        world.units.clear();
    }
    let reopened = h.reopen();
    let replay = reopened
        .call(start("start", "web", "changed"))
        .await
        .unwrap();
    let result = match replay {
        ServiceLocalResponse::Start { result, .. } => result,
        _ => panic!("wrong reply"),
    };
    assert_eq!(result.service.target, original.service.target);
    assert_eq!(result.service.status.state, ServiceState::Failed);
    assert_eq!(
        result.service.status.result,
        Some(ServiceProcessResult::StartFailed)
    );
    assert_eq!(h.world.lock().unwrap().launched.len(), 1);
}

#[tokio::test]
async fn restart_recovery_keeps_pending_receipt_without_repeating_launch() {
    let h = Fixture::with(true, false, false);
    let first = h.start("start", "web", "server").await;
    h.manager
        .call(control(
            "restart",
            first.service.target.clone(),
            ServiceControlAction::Restart,
        ))
        .await
        .unwrap();
    {
        let mut world = h.world.lock().unwrap();
        let pending = world.saved.iter().rev().find(|registry| {
            registry.services.values().next().unwrap().generation != first.service.target.identity.generation
                && matches!(registry.receipts.get("restart"), Some(crate::records::Receipt::Control { result }) if result.outcome == ServiceControlOutcome::Unconfirmed)
        }).unwrap().clone();
        world.registry = Some(pending);
    }
    let reopened = h.reopen();
    let replay = reopened
        .call(control(
            "restart",
            first.service.target,
            ServiceControlAction::Restart,
        ))
        .await
        .unwrap();
    assert_eq!(
        serde_json::to_value(replay).unwrap()["result"]["outcome"],
        serde_json::json!({"state":"unconfirmed"})
    );
    assert_eq!(
        reopened.snapshot().await.unwrap().services[0]
            .service
            .status
            .state,
        ServiceState::Running
    );
    assert_eq!(h.world.lock().unwrap().launched.len(), 2);
}

#[tokio::test]
async fn terminal_results_and_end_times_stay_stable_after_reconcile() {
    let h = Fixture::with(true, false, false);
    for name in ["exit", "signal", "oom", "missing"] {
        h.start(name, name, "server").await;
    }
    {
        let mut world = h.world.lock().unwrap();
        let services: Vec<_> = world
            .registry
            .as_ref()
            .unwrap()
            .services
            .values()
            .cloned()
            .collect();
        for service in services {
            match service.name.as_str() {
                "exit" => {
                    world
                        .completed
                        .insert(service.unit, ended(ServiceProcessResult::Exit { code: 0 }));
                }
                "signal" => {
                    world.completed.insert(
                        service.unit,
                        ended(ServiceProcessResult::Signal { signal: 15 }),
                    );
                }
                "oom" => {
                    world.units.get_mut(&service.unit).unwrap().result =
                        Some(ServiceProcessResult::OutOfMemory);
                }
                _ => {
                    world.units.remove(&service.unit);
                }
            }
        }
    }
    let first = h.manager.snapshot().await.unwrap();
    let state = |name: &str| {
        first
            .services
            .iter()
            .find(|entry| entry.service.name == name)
            .unwrap()
            .service
            .status
            .clone()
    };
    assert_eq!(state("exit").state, ServiceState::Ended);
    assert_eq!(state("exit").ended_at, Some(Timestamp(50)));
    assert_eq!(
        state("signal").result,
        Some(ServiceProcessResult::Signal { signal: 15 })
    );
    assert_eq!(state("signal").state, ServiceState::Failed);
    assert_eq!(state("oom").result, Some(ServiceProcessResult::OutOfMemory));
    assert_eq!(
        state("missing").result,
        Some(ServiceProcessResult::StartFailed)
    );
    h.world.lock().unwrap().clock = 100;
    assert_eq!(h.manager.snapshot().await.unwrap(), first);
    assert_eq!(h.world.lock().unwrap().stopped.len(), 1);
    let reopened = h.reopen();
    assert_eq!(reopened.snapshot().await.unwrap(), first);
    let fresh = reopened.fresh_snapshot().await.unwrap();
    assert_eq!(fresh.revision, first.revision + 1);
    assert_eq!(fresh.services, first.services);
    assert_eq!(
        h.world.lock().unwrap().registry.as_ref().unwrap().revision,
        fresh.revision
    );
    let next = h.reopen().fresh_snapshot().await.unwrap();
    assert_eq!(next.revision, fresh.revision + 1);
    assert_eq!(next.services, first.services);
    assert_eq!(h.world.lock().unwrap().launched.len(), 4);
}

#[tokio::test]
async fn new_boot_clears_records_and_wire_revisions_never_overflow() {
    let h = Fixture::new();
    h.start("start", "web", "server").await;
    h.world.lock().unwrap().boot = "new-boot".into();
    let new = h.reopen().snapshot().await.unwrap();
    assert_eq!(new.boot_id, "new-boot");
    assert_eq!(new.services.len(), 0);
    h.world.lock().unwrap().boot = "boot".into();
    h.world.lock().unwrap().registry.as_mut().unwrap().revision = MAX_SAFE_INTEGER;
    let reopened = h.reopen();
    assert_eq!(
        reopened.snapshot().await.unwrap().revision,
        MAX_SAFE_INTEGER
    );
    assert_eq!(
        reopened
            .call(start("overflow", "other", "server"))
            .await
            .err()
            .map(|error| error.to_string().contains("wire number range")),
        Some(true)
    );
    assert_eq!(h.world.lock().unwrap().launched.len(), 1);
}
