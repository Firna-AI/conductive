//! Process-wide startup measurements shared by the runtime and report owners.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tokio::time::Instant;

/// Startup milestones recorded by the runtime and its reports.
pub trait StartupLog: Send + Sync {
    /// Record the first successful link connection.
    fn connected(&self);
    /// Record the first valid welcome.
    fn welcomed(&self);
    /// Record the first connection scan, excluding report output and queue waits.
    fn scanned(&self, duration: Duration, file_count: usize);
    /// Record the first successful ready emission.
    fn ready(&self);
}

/// One monotonic origin and one emission flag for each process milestone.
pub struct ProcessStartupLog {
    started: Instant,
    connected: AtomicBool,
    welcomed: AtomicBool,
    scanned: AtomicBool,
    ready: AtomicBool,
}

impl ProcessStartupLog {
    /// Use the runner command's entry time and share this instance across reconnects.
    pub fn new(started: Instant) -> Self {
        Self {
            started,
            connected: AtomicBool::new(false),
            welcomed: AtomicBool::new(false),
            scanned: AtomicBool::new(false),
            ready: AtomicBool::new(false),
        }
    }
}

impl StartupLog for ProcessStartupLog {
    fn connected(&self) {
        if !self.connected.swap(true, Ordering::Relaxed) {
            tracing::info!(
                elapsed_ms = self.started.elapsed().as_millis(),
                "The runner made its first connection."
            );
        }
    }

    fn welcomed(&self) {
        if !self.welcomed.swap(true, Ordering::Relaxed) {
            tracing::info!(
                elapsed_ms = self.started.elapsed().as_millis(),
                "The runner received its first welcome."
            );
        }
    }

    fn scanned(&self, duration: Duration, file_count: usize) {
        if !self.scanned.swap(true, Ordering::Relaxed) {
            tracing::info!(
                duration_ms = duration.as_millis(),
                file_count,
                "The runner finished its first repository scan."
            );
        }
    }

    fn ready(&self) {
        if !self.ready.swap(true, Ordering::Relaxed) {
            tracing::info!(
                elapsed_ms = self.started.elapsed().as_millis(),
                "The runner emitted its first ready event."
            );
        }
    }
}
