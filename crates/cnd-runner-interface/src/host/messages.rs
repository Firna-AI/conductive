//! Text messages in each direction of a host connection.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::literals::HostProtocolVersion;
use super::operations::HostOperation;
use super::results::HostResult;

/// Host messages sent to the machine object.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum HostToWorker {
    /// First message, with a numeric version that permits future announcements.
    #[serde(rename = "hello")]
    Hello {
        /// Announced host protocol version.
        host_protocol_version: u32,
        /// Installed Conductive release version.
        program_version: String,
    },
    /// Exact compact JSON ping for the hibernation auto response.
    #[serde(rename = "ping")]
    Ping,
    /// Complete result of one request.
    #[serde(rename = "reply")]
    Reply {
        /// Request identity, also used in binary message parts.
        request_id: u32,
        /// Typed operation result.
        result: HostResult,
    },
    /// End only the sending direction of a stream.
    #[serde(rename = "stream.end")]
    StreamEnd {
        /// Stream identity.
        stream_id: u32,
    },
    /// Close both directions of a stream.
    #[serde(rename = "stream.close")]
    StreamClose {
        /// Stream identity.
        stream_id: u32,
    },
    /// Return credit after handing received bytes to the local socket.
    #[serde(rename = "stream.credit")]
    StreamCredit {
        /// Stream identity.
        stream_id: u32,
        /// Additional byte credit.
        bytes: u32,
    },
}

/// Machine object messages sent to the host program.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum WorkerToHost {
    /// Accept only the current host protocol version.
    #[serde(rename = "welcome")]
    Welcome {
        /// The supported version literal.
        host_protocol_version: HostProtocolVersion,
    },
    /// Exact compact JSON hibernation auto response.
    #[serde(rename = "pong")]
    Pong,
    /// One fixed operation.
    #[serde(rename = "request")]
    Request {
        /// Request identity, also used in binary message parts.
        request_id: u32,
        /// Operation and its arguments.
        operation: HostOperation,
    },
    /// End only the sending direction of a stream.
    #[serde(rename = "stream.end")]
    StreamEnd {
        /// Stream identity.
        stream_id: u32,
    },
    /// Close both directions of a stream.
    #[serde(rename = "stream.close")]
    StreamClose {
        /// Stream identity.
        stream_id: u32,
    },
    /// Return credit after handing received bytes to the caller.
    #[serde(rename = "stream.credit")]
    StreamCredit {
        /// Stream identity.
        stream_id: u32,
        /// Additional byte credit.
        bytes: u32,
    },
}
