//! Credential-free host diagnostics with one typed method for each event.

/// Diagnostic effects accept only numeric HTTP and close codes.
#[unimock::unimock(api = DiagnosticsMock)]
pub trait Diagnostics: Send + Sync {
    /// Saved settings became missing or unreadable.
    fn settings_missing(&self);
    /// Both saved settings became available again.
    fn settings_restored(&self);
    /// A connection attempt failed, possibly with an HTTP refusal status.
    fn attempt_failed(&self, status: Option<u16>);
    /// The configured origin does not use TLS.
    fn tls_required(&self);
    /// The peer closed, possibly with a WebSocket close code.
    fn peer_closed(&self, code: Option<u16>);
    /// An inbound frame violated the protocol.
    fn protocol_error(&self);
    /// The peer's welcome was accepted.
    fn welcomed(&self);
    /// The initial hello could not be sent.
    fn hello_failed(&self);
    /// No inbound frame arrived before the inactivity deadline.
    fn inactive(&self);
    /// An established connection failed.
    fn dropped(&self);
}

/// Production diagnostics emitted through the caller's tracing subscriber.
pub struct TracingDiagnostics;

impl Diagnostics for TracingDiagnostics {
    fn settings_missing(&self) {
        tracing::warn!("host settings are missing or unreadable; waiting");
    }

    fn settings_restored(&self) {
        tracing::warn!("host settings are available again");
    }

    fn attempt_failed(&self, status: Option<u16>) {
        if let Some(status) = status {
            tracing::warn!(status, "host WebSocket upgrade refused");
        } else {
            tracing::warn!("host connection attempt failed");
        }
    }

    fn tls_required(&self) {
        tracing::warn!("host connection attempt failed: TLS is required");
    }

    fn peer_closed(&self, code: Option<u16>) {
        if let Some(code) = code {
            tracing::warn!(code, "host peer closed the connection");
        } else {
            tracing::warn!("host peer closed without a close code");
        }
    }

    fn protocol_error(&self) {
        tracing::warn!("host protocol error; closing the connection");
    }

    fn welcomed(&self) {
        tracing::info!("host session welcomed");
    }

    fn hello_failed(&self) {
        tracing::warn!("host session hello could not be sent");
    }

    fn inactive(&self) {
        tracing::warn!("host connection received no frame for 60 seconds");
    }

    fn dropped(&self) {
        tracing::warn!("host connection dropped");
    }
}

#[cfg(test)]
#[path = "_tests_/diagnostics_tests.rs"]
mod tests;
