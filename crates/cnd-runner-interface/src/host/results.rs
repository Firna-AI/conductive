//! Typed host results and fixed error codes without machine error text.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// State of a detached command record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum HostCommandState {
    /// The command is still running.
    Running,
    /// The command has a recorded exit.
    Exited,
    /// The record or its child is no longer available.
    Lost,
}

/// File content always uses base64 on the host connection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
pub enum HostFileEncoding {
    /// Raw bytes encoded as base64.
    #[serde(rename = "base64")]
    Base64,
}

/// Fixed host errors that the Worker maps to caller-safe messages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum HostErrorCode {
    /// Invalid arguments or unsupported input.
    InvalidRequest,
    /// File or record not found.
    NotFound,
    /// The sandbox user cannot access the path.
    PermissionDenied,
    /// A file read named a directory.
    IsDirectory,
    /// The command output exceeds its reply budget.
    OutputTooLarge,
    /// The permitted local port did not accept the connection.
    PortUnavailable,
    /// The host has no capacity for another operation.
    Busy,
    /// An unhandled failure, with no machine error text.
    Internal,
}

/// Results of the fixed operations on the host connection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all_fields = "camelCase")]
pub enum HostResult {
    /// Completed synchronous command, including a possible timeout.
    #[serde(rename = "command.result")]
    CommandResult {
        /// Null after a command timeout.
        exit_code: Option<i32>,
        /// Standard output.
        stdout: String,
        /// Standard error.
        stderr: String,
        /// Whether the command reached its time limit.
        timed_out: bool,
    },
    /// Started detached command.
    #[serde(rename = "command.started")]
    CommandStarted {
        /// Non-zero random identity below 2^53.
        #[ts(type = "number")]
        process_id: u64,
    },
    /// Bounded output and the next byte offsets of a detached command.
    #[serde(rename = "command.status")]
    CommandStatus {
        /// Detached command identity.
        #[ts(type = "number")]
        process_id: u64,
        /// Current record state.
        state: HostCommandState,
        /// Whether the command is running.
        running: bool,
        /// Null while running or lost.
        exit_code: Option<i32>,
        /// Null when no timeout outcome is available.
        timed_out: Option<bool>,
        /// Stdout from the requested offset, ending at a UTF-8 boundary.
        stdout: String,
        /// Stderr from the requested offset, ending at a UTF-8 boundary.
        stderr: String,
        /// First unread stdout byte after this reply.
        #[ts(type = "number")]
        stdout_next_offset: u64,
        /// First unread stderr byte after this reply.
        #[ts(type = "number")]
        stderr_next_offset: u64,
        /// More output remains after this reply.
        more: bool,
    },
    /// Metadata of a file or directory, following links.
    #[serde(rename = "file.info")]
    FileInfo {
        /// Requested absolute path.
        path: String,
        /// Size in bytes within the safe integer range.
        #[ts(type = "number")]
        size_bytes: u64,
        /// Whether the path names a directory.
        is_directory: bool,
    },
    /// Complete bounded file contents.
    #[serde(rename = "file.content")]
    FileContent {
        /// Requested absolute path.
        path: String,
        /// Raw file size in bytes.
        #[ts(type = "number")]
        size_bytes: u64,
        /// The base64 literal.
        encoding: HostFileEncoding,
        /// Base64 file bytes.
        content: String,
    },
    /// File size exceeds the caller's raw byte limit.
    #[serde(rename = "file.too_large")]
    FileTooLarge {
        /// Raw file size in bytes.
        #[ts(type = "number")]
        size_bytes: u64,
        /// Requested raw byte limit.
        #[ts(type = "number")]
        limit_bytes: u64,
    },
    /// The local socket is ready.
    #[serde(rename = "stream.opened")]
    StreamOpened {
        /// Opened stream identity.
        stream_id: u32,
    },
    /// A fixed error code with no free text.
    #[serde(rename = "error")]
    Error {
        /// Caller-safe error category.
        code: HostErrorCode,
    },
}
