//! Linux boot identity, opaque run IDs, and monotonic readiness polling.

use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use cnd_runner_interface::api::Timestamp;
use tokio::time::Instant;
use uuid::Uuid;

use crate::error::{ErrorResultExt, Result};
use crate::ports::Runtime;

/// Native runtime effects, independent of agent turns and idle policy.
pub struct NativeRuntime {
    origin: Instant,
}

impl Default for NativeRuntime {
    fn default() -> Self {
        Self {
            origin: Instant::now(),
        }
    }
}

#[async_trait]
impl Runtime for NativeRuntime {
    fn now(&self) -> Timestamp {
        Timestamp(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64,
        )
    }

    fn monotonic(&self) -> u64 {
        self.origin.elapsed().as_millis() as u64
    }

    fn wait(&self) -> Pin<Box<dyn Future<Output = ()> + Send>> {
        Box::pin(tokio::time::sleep(Duration::from_millis(100)))
    }

    fn identity(&self) -> String {
        Uuid::new_v4().to_string()
    }

    async fn boot_id(&self) -> Result<String> {
        Ok(tokio::fs::read_to_string("/proc/sys/kernel/random/boot_id")
            .await
            .internal()?
            .trim()
            .into())
    }
}
