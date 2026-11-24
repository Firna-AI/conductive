//! Typed events with no credentials, peer text, or operation arguments.

use cnd_runner_interface::computer::results::ComputerErrorCode;

/// Diagnostic effects for the computer service.
#[cfg_attr(test, unimock::unimock(api = DiagnosticsMock))]
pub trait Diagnostics: Send + Sync {
    /// Saved settings became missing or unreadable.
    fn settings_missing(&self);
    /// Saved settings became available again.
    fn settings_restored(&self);
    /// The server resource report could not be read.
    fn resources_unavailable(&self);
    /// A WebSocket upgrade failed, possibly with an HTTP status.
    fn attempt_failed(&self, status: Option<u16>);
    /// The Worker refused the saved credential.
    fn new_code_needed(&self);
    /// The computer could not write its initial hello.
    fn hello_failed(&self);
    /// The Worker sent a valid welcome.
    fn welcomed(&self);
    /// The peer closed the connection with an optional numeric code.
    fn peer_closed(&self, code: Option<u16>);
    /// The peer violated the computer protocol.
    fn protocol_error(&self);
    /// The connection received no frame within the allowed interval.
    fn inactive(&self);
    /// The established connection failed.
    fn dropped(&self);
    /// A request reached its local deadline.
    fn request_timed_out(&self);
    /// An operation returned a fixed error code.
    fn operation_failed(&self, code: ComputerErrorCode);
    /// Shell-incompatible environment names were omitted.
    fn environment_omitted(&self, count: usize);
    /// Cleanup of a failed create could not remove its container.
    fn create_cleanup_failed(&self);
    /// Cleanup could not stop a container after a failed start.
    fn start_cleanup_failed(&self);
    /// Cleanup could not resume the container after an image save.
    fn save_cleanup_failed(&self);
    /// Startup could not recover all paused containers.
    fn pause_recovery_failed(&self);
    /// The running binary cannot participate in automatic updates.
    fn update_location(&self);
    /// An update check, installation, or state write did not complete.
    fn update_failed(&self);
    /// A verified candidate is ready for its first trial start.
    fn update_trial_staged(&self);
    /// The confirmed release could not execute the trial.
    fn update_exec_failed(&self);
    /// The trial did not confirm within its allowed starts.
    fn update_refused(&self);
}

/// Production tracing events.
pub struct TracingDiagnostics;

impl Diagnostics for TracingDiagnostics {
    fn settings_missing(&self) {
        tracing::warn!("Computer settings are missing or unreadable. Waiting for enrollment.");
    }

    fn settings_restored(&self) {
        tracing::info!("Computer settings are available.");
    }

    fn resources_unavailable(&self) {
        tracing::warn!("Could not read the computer resources.");
    }

    fn attempt_failed(&self, status: Option<u16>) {
        tracing::warn!(status, "Could not open the computer connection.");
    }

    fn new_code_needed(&self) {
        tracing::warn!(
            "The saved computer token was refused. Use New code in the app to enroll again."
        );
    }

    fn hello_failed(&self) {
        tracing::warn!("Could not send the computer hello.");
    }

    fn welcomed(&self) {
        tracing::info!("The computer connection is ready.");
    }

    fn peer_closed(&self, code: Option<u16>) {
        tracing::info!(code, "The Worker closed the computer connection.");
    }

    fn protocol_error(&self) {
        tracing::warn!("The Worker sent an invalid computer message.");
    }

    fn inactive(&self) {
        tracing::warn!("The computer connection received no frame for 60 seconds.");
    }

    fn dropped(&self) {
        tracing::warn!("The computer connection ended.");
    }

    fn request_timed_out(&self) {
        tracing::warn!("A computer operation reached its deadline.");
    }

    fn operation_failed(&self, code: ComputerErrorCode) {
        tracing::warn!(?code, "A computer operation failed.");
    }

    fn environment_omitted(&self, count: usize) {
        tracing::warn!(
            count,
            "Skipped environment names that the shell cannot load."
        );
    }

    fn create_cleanup_failed(&self) {
        tracing::warn!("Could not remove a failed container create.");
    }

    fn start_cleanup_failed(&self) {
        tracing::warn!("Could not stop the container after a failed start.");
    }

    fn save_cleanup_failed(&self) {
        tracing::warn!("Could not resume the container after an image save.");
    }

    fn pause_recovery_failed(&self) {
        tracing::warn!("Could not resume all paused containers at startup.");
    }

    fn update_location(&self) {
        tracing::warn!("Run the installed Conductive program to use automatic updates.");
    }

    fn update_failed(&self) {
        tracing::warn!("A computer software update step failed.");
    }

    fn update_trial_staged(&self) {
        tracing::info!("A verified computer release is ready for a trial. Restarting.");
    }

    fn update_exec_failed(&self) {
        tracing::warn!("Could not start the trial release. Using the confirmed release.");
    }

    fn update_refused(&self) {
        tracing::warn!(
            "The trial release did not confirm after five tries. Using the confirmed release."
        );
    }
}
