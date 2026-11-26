//! Ownership extends existing port rows and cannot suppress an ordinary report.

use std::sync::Arc;

use cnd_runner::ports::reporter::{PortScanner, PortScannerMock};
use cnd_runner_interface::ports::ListeningPort;
use cnd_runner_interface::services::reports::ServiceReport;
use serde_json::json;
use unimock::{MockFn, Unimock, matching};

use crate::error::Error;
use crate::manager::state::ServiceManagerMock;
use crate::port_reports::ServicePortScanner;

#[tokio::test]
async fn owned_ports_keep_labels_and_service_errors_preserve_ordinary_ports() {
    let port = ListeningPort {
        port: 5173,
        name: Some("complete program label".into()),
        folder: Some("folder".into()),
        service_id: None,
    };
    let original = port.clone();
    let report: ServiceReport = serde_json::from_value(json!({
        "bootId":"boot", "revision":1, "services":[{
            "serviceId":"service","generation":"run","name":"web","program":null,"folder":null,"ports":[5173],
            "status":{"state":"running","startedAt":0,"endedAt":null,"result":null}
        }]
    })).unwrap();
    let mock = Arc::new(Unimock::new((
        PortScannerMock::scan
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(vec![port.clone()]))),
        ServiceManagerMock::try_snapshot.stub(|each| {
            each.call(matching!())
                .answers_arc(Arc::new(move |_| Ok(Some(report.clone()))))
                .once()
                .then()
                .answers(&|_| Err(Error::Unit));
        }),
    )));
    let scanner: Arc<dyn PortScanner> = Arc::new(ServicePortScanner {
        scanner: mock.clone(),
        manager: mock,
    });
    assert_eq!(
        scanner.scan().await.unwrap(),
        [ListeningPort {
            service_id: Some("service".into()),
            ..original.clone()
        }]
    );
    assert_eq!(scanner.scan().await.unwrap(), [original]);
}
