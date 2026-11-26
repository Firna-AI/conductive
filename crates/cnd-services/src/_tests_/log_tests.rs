//! Local log reads preserve the complete retained source.

use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResult};

use super::support::Fixture;

#[tokio::test]
async fn local_logs_return_complete_retained_text_without_app_cuts() {
    let h = Fixture::with(false, true, false);
    let service = h.start("start", "web", "server").await;
    let text = "line 🙂 secret\n".repeat(6000);
    h.world.lock().unwrap().log = text.as_bytes().to_vec();
    h.world.lock().unwrap().omitted = true;
    let result = h
        .manager
        .call(ServiceLocalRequest::Logs {
            request: ServiceLogRequest {
                request_id: "read".into(),
                target: service.service.target,
            },
        })
        .await
        .unwrap();
    let result = match result {
        ServiceLocalResponse::Logs { result } => result.result,
        _ => panic!("wrong reply"),
    };
    assert_eq!(
        result,
        ServiceRawLogResult::Ready {
            text,
            omitted: true
        }
    );
}
