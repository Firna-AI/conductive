//! Independent computer protocol version, path, and transport limits.

use crate::host::limits;

/// Current computer protocol version.
pub const COMPUTER_PROTOCOL_VERSION: u8 = 1;
/// Computer enrollment and WebSocket route.
pub const COMPUTER_PATH: &str = "/v1/computer";
/// Maximum complete request JSON bytes.
pub const COMPUTER_REQUEST_MAX_BYTES: usize = limits::HOST_REQUEST_MAX_BYTES;
/// Maximum complete reply JSON bytes.
pub const COMPUTER_REPLY_MAX_BYTES: usize = limits::HOST_REPLY_MAX_BYTES;
/// Maximum payload bytes in one binary message part.
pub const COMPUTER_MESSAGE_PART_BYTES: usize = limits::HOST_MESSAGE_PART_BYTES;
/// Maximum requests awaiting a reply on one connection.
pub const COMPUTER_MAX_PENDING_REQUESTS: usize = limits::HOST_MAX_PENDING_REQUESTS;
/// A new connection replaced this connection.
pub const COMPUTER_CLOSE_REPLACED: u16 = limits::HOST_CLOSE_REPLACED;
/// The computer token was revoked.
pub const COMPUTER_CLOSE_REVOKED: u16 = limits::HOST_CLOSE_TOKEN_CHANGED;
/// The computer announced an unsupported protocol version.
pub const COMPUTER_CLOSE_UNSUPPORTED_VERSION: u16 = limits::HOST_CLOSE_UNSUPPORTED_VERSION;
/// Interval between computer ping messages.
pub const COMPUTER_PING_SECONDS: u64 = limits::HOST_PING_SECONDS;
