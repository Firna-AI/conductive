//! System waits and capped retry delays with injectable jitter.

use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

use crate::ports::Clock;

/// Native clock. Tests replace the entire boundary.
pub struct SystemClock;

impl Clock for SystemClock {
    fn wait(&self, duration: Duration) -> Pin<Box<dyn Future<Output = ()> + Send>> {
        Box::pin(tokio::time::sleep(duration))
    }

    fn jitter(&self, base: Duration) -> Duration {
        let maximum = base.as_millis() as u64 / 5;
        Duration::from_millis(rand::random::<u64>() % (maximum + 1))
    }
}

/// Pure exponential retry state. A valid welcome resets it.
#[derive(Default)]
pub struct Retry {
    failures: u32,
}

impl Retry {
    /// Take the next base delay, from one through thirty seconds.
    pub fn next_delay(&mut self) -> Duration {
        let seconds = 1_u64.checked_shl(self.failures).unwrap_or(30).min(30);
        self.failures = self.failures.saturating_add(1);
        Duration::from_secs(seconds)
    }

    /// Start again at one second after a welcomed connection.
    pub fn reset(&mut self) {
        self.failures = 0;
    }
}
