//! Sequential private documents with a captured accepted connection generation.

use std::sync::Arc;

use cnd_runner_interface::services::control::ServiceControlResult;
use cnd_runner_interface::services::logs::ServiceRawLogResponse;
use cnd_runner_interface::services::reports::ServiceReport;
use tokio::sync::Mutex;

use crate::error::{Error, ErrorResultExt, Result};
use crate::json::codec;
use crate::link::ports::{RunnerLink, ServiceConnection};

use super::parts::{Header, Parts};

/// A complete typed document. None of these values enters the event store.
pub enum ServiceDocument {
    /// Full selected catalogue.
    Report(ServiceReport),
    /// Output-free receipt for an explicit control.
    Control(ServiceControlResult),
    /// Complete retained runtime source or its typed failure.
    Logs(ServiceRawLogResponse),
}

/// One sender per accepted connection. Its lock keeps duplicate keys consecutive.
pub struct ServiceSender {
    link: Arc<dyn RunnerLink>,
    connection: ServiceConnection,
    sequence: Mutex<u64>,
}

impl ServiceSender {
    /// Capture the link and its accepted connection before asynchronous work.
    pub fn new(link: Arc<dyn RunnerLink>, connection: ServiceConnection) -> Self {
        Self {
            link,
            connection,
            sequence: Mutex::new(0),
        }
    }

    /// Send all parts directly. False means this connection is no longer accepted.
    pub async fn send(&self, document: ServiceDocument) -> Result<bool> {
        let mut sequence = self.sequence.lock().await;
        *sequence = sequence.checked_add(1).ok_or(Error::InvalidNumber)?;
        let (header, bytes) = match document {
            ServiceDocument::Report(value) => (
                Header::Report(format!("{}-{}", self.connection.generation, sequence)),
                codec::encode(&value)?,
            ),
            ServiceDocument::Control(value) => (
                Header::Control(value.request.request_id.clone()),
                codec::encode(&value)?,
            ),
            ServiceDocument::Logs(value) => (
                Header::Logs(value.request.request_id.clone()),
                codec::encode(&value)?,
            ),
        };
        let mut parts = Parts::new(header, String::from_utf8(bytes).internal()?);
        while let Some(part) = parts.next()? {
            if !self.link.service_reply(self.connection, part).await? {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
