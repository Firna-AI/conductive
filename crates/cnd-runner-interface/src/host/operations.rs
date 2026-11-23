//! Fixed host operations, separate from provider machine lifecycle calls.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::literals::HostStreamPort;

/// Operations accepted by the host program.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all_fields = "camelCase")]
pub enum HostOperation {
    /// Run a command and wait for its result.
    #[serde(rename = "command.run")]
    CommandRun {
        /// Bash command text.
        command: String,
        /// Command time limit, from 1 through 600 seconds.
        timeout_seconds: u32,
    },
    /// Start a command that survives a connection drop.
    #[serde(rename = "command.start")]
    CommandStart {
        /// Bash command text.
        command: String,
    },
    /// Read a started command from byte offsets.
    #[serde(rename = "command.status")]
    CommandStatus {
        /// Non-zero host command identity within the safe integer range.
        #[ts(type = "number")]
        process_id: u64,
        /// First unread stdout byte.
        #[ts(type = "number")]
        stdout_offset: u64,
        /// First unread stderr byte.
        #[ts(type = "number")]
        stderr_offset: u64,
    },
    /// Read metadata, following links.
    #[serde(rename = "file.info")]
    FileInfo {
        /// Absolute path without a NUL byte.
        path: String,
    },
    /// Read a bounded file as base64.
    #[serde(rename = "file.read")]
    FileRead {
        /// Absolute path without a NUL byte.
        path: String,
        /// Maximum raw bytes, at most HOST_FILE_READ_MAX_BYTES.
        #[ts(type = "number")]
        max_bytes: u64,
    },
    /// Open a flow-controlled stream to an allowed loopback port.
    #[serde(rename = "stream.open")]
    StreamOpen {
        /// Stream identity, also used in binary data frames.
        stream_id: u32,
        /// The terminal or preview relay port.
        port: HostStreamPort,
    },
}
