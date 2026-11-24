//! Text messages in each direction of a computer connection.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::literals::ComputerProtocolVersion;
use super::operations::ComputerOperation;
use super::results::ComputerResult;

/// Resources that the computer reports at each connection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ComputerResources {
    /// Number of available virtual CPUs.
    pub cpus: u32,
    /// Available memory in bytes within the JavaScript safe integer range.
    #[ts(type = "number")]
    pub memory_bytes: u64,
    /// Operating system and architecture description.
    pub system: String,
}

/// Messages sent by the computer to its object.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ComputerToWorker {
    /// First message, with a numeric version that permits future announcements.
    Hello {
        /// Announced computer protocol version.
        computer_protocol_version: u32,
        /// Installed Conductive release version.
        program_version: String,
        /// Resources of the server.
        resources: ComputerResources,
    },
    /// Compact JSON ping for the hibernation auto response.
    Ping,
    /// Complete result of one request.
    Reply {
        /// Request identity, also used in binary message parts.
        request_id: u32,
        /// Fixed operation result.
        result: ComputerResult,
    },
}

/// Messages sent by the object to the computer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum WorkerToComputer {
    /// Accept the supported computer protocol version.
    Welcome {
        /// Exact supported version.
        computer_protocol_version: ComputerProtocolVersion,
    },
    /// Compact JSON hibernation auto response.
    Pong,
    /// One fixed container operation.
    Request {
        /// Request identity, also used in binary message parts.
        request_id: u32,
        /// Operation and its arguments.
        operation: ComputerOperation,
    },
}
