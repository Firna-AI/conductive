//! Time and retry jitter for the connection and request deadlines.

use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

use cnd_host::clock::SystemClock;
use cnd_host::ports::Clock;

/// A wait that ends after the requested duration.
pub type Wait = Pin<Box<dyn Future<Output = ()> + Send>>;

/// Replaceable waits and jitter for the computer.
#[cfg_attr(test, unimock::unimock(api = TimerMock))]
pub trait Timer: Send + Sync {
    /// Begin a wait.
    fn wait(&self, duration: Duration) -> Wait;
    /// Return extra jitter for the given retry delay.
    fn jitter(&self, base: Duration) -> Duration;
}

impl Timer for SystemClock {
    fn wait(&self, duration: Duration) -> Wait {
        Clock::wait(self, duration)
    }

    fn jitter(&self, base: Duration) -> Duration {
        Clock::jitter(self, base)
    }
}
