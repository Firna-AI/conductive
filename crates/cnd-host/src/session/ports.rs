//! Established-session boundary used by the reconnect loop.

use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::watch;

use crate::ports::Socket;

/// One connection's outcome, without errors that can expose credentials.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct SessionExit {
    /// A welcome resets exponential retry state even if the socket then drops.
    pub welcomed: bool,
    /// The peer's close code, when present.
    pub close_code: Option<u16>,
}

/// Serves one established connection and releases its streams before return.
#[cfg_attr(test, unimock::unimock(api = SessionMock))]
#[async_trait]
pub trait Session: Send + Sync {
    /// Send hello, await welcome, then serve operations until stop or drop.
    async fn serve(
        &self,
        socket: Arc<dyn Socket>,
        version: &str,
        shutdown: watch::Receiver<bool>,
    ) -> SessionExit;
}
