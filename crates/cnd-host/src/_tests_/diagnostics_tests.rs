//! Only this test reaches production tracing call sites in the host library tests.

use crate::diagnostics::{Diagnostics, TracingDiagnostics};
use crate::test_diagnostics::Logs;

#[test]
fn production_diagnostics_preserve_text_levels_codes_and_exclude_token_parts() {
    let logs = Logs::default();
    let diagnostics: &dyn Diagnostics = &TracingDiagnostics;
    tracing::dispatcher::with_default(&logs.subscriber(), || {
        diagnostics.settings_missing();
        diagnostics.settings_restored();
        diagnostics.attempt_failed(Some(401));
        diagnostics.attempt_failed(None);
        diagnostics.tls_required();
        diagnostics.peer_closed(Some(4001));
        diagnostics.peer_closed(None);
        diagnostics.protocol_error();
        diagnostics.welcomed();
        diagnostics.hello_failed();
        diagnostics.inactive();
        diagnostics.dropped();
    });
    let output = logs.text();
    assert_eq!(
        output.lines().map(str::trim).collect::<Vec<_>>(),
        [
            "WARN host settings are missing or unreadable; waiting",
            "WARN host settings are available again",
            "WARN host WebSocket upgrade refused status=401",
            "WARN host connection attempt failed",
            "WARN host connection attempt failed: TLS is required",
            "WARN host peer closed the connection code=4001",
            "WARN host peer closed without a close code",
            "WARN host protocol error; closing the connection",
            "INFO host session welcomed",
            "WARN host session hello could not be sent",
            "WARN host connection received no frame for 60 seconds",
            "WARN host connection dropped",
        ]
    );
    let object = "0123456789abcdef".repeat(4);
    let secret = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
    let token = format!("cndm1.{object}.{secret}");
    for private in [
        token.as_str(),
        "cndm1",
        object.as_str(),
        secret,
        "Bearer",
        "Authorization",
    ] {
        assert!(
            !output.contains(private),
            "diagnostics contain private request data"
        );
    }
}
