//! Slow private effects cannot hold ordinary port capture or mislabel a log run.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Waker};

use cnd_runner::ports::reporter::{PortScanner, PortScannerMock};
use cnd_runner_interface::ports::ListeningPort;
use cnd_runner_interface::services::control::ServiceControlAction;
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResult};
use unimock::{MockFn, Unimock, matching};

use crate::port_reports::ServicePortScanner;

use super::held::{Gate, HeldLogs, HeldUnits};
use super::support::{Fixture, control};

fn poll<T>(future: Pin<&mut dyn Future<Output = T>>) -> Poll<T> {
    future.poll(&mut Context::from_waker(Waker::noop()))
}

fn original() -> ListeningPort {
    ListeningPort {
        port: 5173,
        name: Some("web".into()),
        folder: Some("app".into()),
        service_id: None,
    }
}

fn scanner(h: &Fixture) -> ServicePortScanner {
    ServicePortScanner {
        scanner: Arc::new(Unimock::new(
            PortScannerMock::scan
                .each_call(matching!())
                .answers(&|_| Ok(vec![original()])),
        )),
        manager: h.manager.clone(),
    }
}

#[tokio::test]
async fn blocked_log_releases_registry_and_rejects_output_from_a_replacement_run() {
    let mut h = Fixture::with(true, true, false);
    let gate = Arc::new(Gate::default());
    h.manager = h.with_effects(|effects| {
        effects.logs = Arc::new(HeldLogs {
            inner: effects.logs.clone(),
            gate: gate.clone(),
        })
    });
    h.world.lock().unwrap().ports = vec![5173];
    let first = h.start("start", "web", "server").await;
    let mut reading = Box::pin(h.manager.call(ServiceLocalRequest::Logs {
        request: ServiceLogRequest {
            request_id: "read".into(),
            target: first.service.target.clone(),
        },
    }));
    assert!(poll(reading.as_mut()).is_pending());
    gate.entered.notified().await;
    let scanner = scanner(&h);
    let mut scanning = Box::pin(scanner.scan());
    let ports = poll(scanning.as_mut());
    assert!(ports.is_ready(), "a log read must not block ordinary ports");
    let Poll::Ready(ports) = ports else {
        panic!("expected ready ports")
    };
    assert_eq!(
        ports.unwrap(),
        vec![ListeningPort {
            service_id: Some(first.service.target.identity.service_id.clone()),
            ..original()
        }]
    );
    let mut restarting = Box::pin(h.manager.call(control(
        "restart",
        first.service.target,
        ServiceControlAction::Restart,
    )));
    assert!(matches!(
        poll(restarting.as_mut()),
        Poll::Ready(Ok(ServiceLocalResponse::Control { .. }))
    ));
    h.world.lock().unwrap().log = b"replacement run output".to_vec();
    gate.release.notify_one();
    let ServiceLocalResponse::Logs { result } = reading.await.unwrap() else {
        panic!("wrong reply")
    };
    assert_eq!(result.result, ServiceRawLogResult::Stale);
    assert_eq!(h.world.lock().unwrap().launched.len(), 2);
}

#[tokio::test]
async fn blocked_control_keeps_ordinary_ports_available_without_repeating_restart() {
    let mut h = Fixture::with(true, false, false);
    let gate = Arc::new(Gate::default());
    h.manager = h.with_effects(|effects| {
        effects.units = Arc::new(HeldUnits {
            inner: effects.units.clone(),
            gate: gate.clone(),
        })
    });
    h.world.lock().unwrap().ports = vec![5173];
    let first = h.start("start", "web", "server").await;
    let request = control(
        "restart",
        first.service.target.clone(),
        ServiceControlAction::Restart,
    );
    let mut restarting = Box::pin(h.manager.call(request.clone()));
    assert!(poll(restarting.as_mut()).is_pending());
    gate.entered.notified().await;
    let scanner = scanner(&h);
    let mut scanning = Box::pin(scanner.scan());
    let ports = poll(scanning.as_mut());
    assert!(ports.is_ready(), "a control must not block ordinary ports");
    let Poll::Ready(ports) = ports else {
        panic!("expected ready ports")
    };
    assert_eq!(ports.unwrap(), vec![original()]);
    gate.release.notify_one();
    let result = restarting.await.unwrap();
    assert_eq!(h.manager.call(request).await.unwrap(), result);
    assert_eq!(
        scanner.scan().await.unwrap()[0].service_id,
        Some(first.service.target.identity.service_id)
    );
    assert_eq!(h.world.lock().unwrap().launched.len(), 2);
}
