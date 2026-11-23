//! Read saved credentials through an isolated shell without exporting them.

use std::fmt;
use std::path::PathBuf;
use std::process::Stdio;

use async_trait::async_trait;
use tokio::process::Command;

use crate::error::{ErrorResultExt, Result};
use crate::ports::Configuration;

/// Credentials for one attempt. Debug output never exposes either value.
#[derive(Clone)]
pub struct ConnectionRequest {
    /// HTTPS or WSS machine origin.
    pub origin: String,
    /// Machine bearer token, never placed in the host process environment.
    pub token: String,
}

impl fmt::Debug for ConnectionRequest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("ConnectionRequest { credentials: [hidden] }")
    }
}

/// Native saved-settings boundary.
pub struct SavedConfiguration {
    /// Production uses /run/ascii-secrets/env.sh.
    pub path: PathBuf,
}

#[async_trait]
impl Configuration for SavedConfiguration {
    async fn read(&self) -> Result<Option<ConnectionRequest>> {
        let output = Command::new("/bin/sh")
            .env_clear()
            .args([
                "-c",
                r#"set -e
if [ -r "$1" ]; then
  . "$1"
  printf '%s\000%s\000' "${CONDUCTIVE_MACHINE_ORIGIN-}" "${CONDUCTIVE_MACHINE_TOKEN-}"
fi"#,
                "conductive-host-settings",
            ])
            .arg(&self.path)
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .output()
            .await
            .internal()?;
        if !output.status.success() {
            return Ok(None);
        }
        let mut values = output.stdout.split(|byte| *byte == 0);
        let origin = values
            .next()
            .and_then(|bytes| std::str::from_utf8(bytes).ok());
        let token = values
            .next()
            .and_then(|bytes| std::str::from_utf8(bytes).ok());
        Ok(match (origin, token) {
            (Some(origin), Some(token)) if !origin.is_empty() && !token.is_empty() => {
                Some(ConnectionRequest {
                    origin: origin.into(),
                    token: token.into(),
                })
            }
            _ => None,
        })
    }
}
